# Instaclone

An Instagram clone built as a MERN full-stack app — a React single-page frontend talking to an Express/MongoDB REST API with JWT authentication.

## Features

- Sign up / sign in with hashed passwords and JWT sessions
- Sign in with Google — the first Google sign-in creates the account, and signing in with Google on an email that already has a password account links the two
- Admin accounts, flagged automatically for the emails listed in `ADMIN_EMAILS` — admins get an **Admin** page listing every user with their signup date, sign-in method and engagement counts, can expand any user's posts, and can delete any post or whole account
- Forgot password → reset link over email, then set a new password
- Create posts with an image, title and body
- Home feed of all posts, plus a "following" feed of subscribed users only
- Like / unlike and comment on posts
- Delete your own posts
- Follow / unfollow users, view your own profile and other users' profiles
- Update your profile picture
- Search users by name
- Direct messages and post sharing, delivered in real time over a websocket — a new message appears in an open conversation immediately, with a typing indicator and a "Seen" marker, and the sidebar badges update the moment something happens

## Tech stack

**Frontend** (`instaclone-frontend/`)

| Tech | Use |
|---|---|
| React 17 | UI, function components with Hooks |
| Create React App (react-scripts 4) | Build tooling / dev server |
| React Router v5 | Client-side routing |
| Context API + `useReducer` | Global auth/user state (`src/reducers/userReducer.js`) |
| `@react-oauth/google` | Google Sign-In button and ID token retrieval |
| Materialize CSS | Styling, cards, modals, toasts |
| Fetch API | Calls to the backend REST API |
| `socket.io-client` | Live messages, typing indicators and badge updates (`src/socket.js`) |
| `web-vitals` | Performance metrics scaffold from CRA |

**Backend** (repo root)

| Tech | Use |
|---|---|
| Node.js + Express 4 | REST API server |
| MongoDB + Mongoose 6 | Data store and schemas (`models/user.js`, `models/post.js`) |
| JSON Web Token (`jsonwebtoken`) | Auth tokens, verified in `middleware/requireLogin.js` |
| `socket.io` | Websocket server (`lib/realtime.js`); the JWT is checked during the handshake and each user joins a room named after their id |
| `google-auth-library` | Verifies Google ID tokens server-side on `/google-login` |
| `dotenv` | Loads the root `.env` |
| bcrypt | Password hashing |
| crypto | Random password-reset tokens |
| Nodemailer + SendGrid transport | Password-reset emails |
| CORS | Cross-origin requests from the React dev server |
| nodemon | Auto-restart in development |

**External services**

| Service | Use |
|---|---|
| MongoDB (local or Atlas) | Database |
| Cloudinary | Image hosting — the browser uploads directly, the API stores the returned URL |
| SendGrid | Transactional email for password reset (optional in dev) |

## Prerequisites

- **Node.js 18–22.** This is an older stack and it does **not** run on Node 24+ (see [Troubleshooting](#troubleshooting)). Verified working on Node 22.
- **MongoDB** running locally, or a MongoDB Atlas connection string.
- A **Cloudinary** account if you want image uploads to work, and a **SendGrid** API key if you want password-reset emails.

## Clone the repo

```bash
git clone https://github.com/nikhila29/Instaclone.git
```

```bash
cd Instaclone
```

## Install dependencies

Backend (from the repo root):

```bash
npm install
```

Frontend:

```bash
npm install --prefix instaclone-frontend
```

## Configure

The backend reads its secrets from `config/keys.js`, which loads `config/dev.js` in development and `config/prod.js` (environment variables) in production. `config/dev.js` is git-ignored, so create it yourself:

```js
// config/dev.js
module.exports = {
    MONGOURI: "mongodb://127.0.0.1:27017/instaclone",
    JWT_SECRET: "any-random-secret-string",
    SENDGRID_API: "your-sendgrid-api-key",
    EMAIL: "http://localhost:3000"
}
```

- `MONGOURI` — local MongoDB as above, or your Atlas connection string.
- `JWT_SECRET` — any random string; it signs and verifies the login tokens.
- `SENDGRID_API` — leave as `""` if you don't need password-reset emails.
- `EMAIL` — base URL used in the reset link sent by email.

### Google sign-in

Google sign-in needs the same client id in two places, because Create React App only reads a `.env` inside its own folder and only exposes variables prefixed with `REACT_APP_`. A Google client id is public by design — it ships inside the browser bundle — but the file also holds `ADMIN_EMAILS`, so `.env` is git-ignored.

`.env` at the repo root, read by the API:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
ADMIN_EMAILS=first@example.com,second@example.com
```

`instaclone-frontend/.env`, read by the React app at build time:

```
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), the OAuth client's **Authorized JavaScript origins** must list `http://localhost:3000` for local development, or the button refuses to render.

Anyone whose email appears in `ADMIN_EMAILS` gets `isAdmin: true` on their account — set when the account is created and re-checked on every Google sign-in, so adding an email to the list promotes that user the next time they sign in with Google. Admins see a shield icon in the navbar linking to `/admin`.

Admin rights are enforced on the server by `middleware/requireAdmin.js` on every admin request; the `isAdmin` flag in the browser only decides what UI is shown. That does mean an already–signed-in admin must sign out and back in before the shield icon appears, since the flag is read from the stored session.

**Restart both dev servers after editing either `.env`** — neither Express nor Create React App picks up env changes while running.

If you are using local MongoDB installed with Homebrew, start it first:

```bash
brew services start mongodb-community
```

## Run the app

Two servers, two terminals.

**1. API server** — from the repo root, on port 3003:

```bash
npm start
```

`start` runs the API under **nodemon**, which restarts Node whenever a backend file
changes — Node reads your code once at startup, so without a watcher every backend
edit needs a manual restart before the new routes exist. nodemon is therefore a
regular dependency, not a dev-only one.

The script carries two flags worth knowing about:

- `--watch app.js --watch routes …` — only the API's own folders. Left unrestricted,
  nodemon watches the whole repo including `instaclone-frontend`, so every React
  save would pointlessly restart the API.
- `--exec /usr/local/bin/node` — pins Node 22. `bcrypt` is a native module built for
  that ABI and will not load on a newer default `node`, and this saves typing a
  `PATH=` prefix every time.

Use `npm run serve` for a plain `node app.js` with no watcher — that is what you
want in production.

**2. React app** — port 3000, which proxies API calls to port 3003:

```bash
npm start --prefix instaclone-frontend
```

Open <http://localhost:3000>.

The frontend's `start` and `build` scripts already set `NODE_OPTIONS=--openssl-legacy-provider`, which Node 17 and newer need here — see [Troubleshooting](#troubleshooting).

**On ports:** the API defaults to 3003 rather than the usual 5000 because macOS AirPlay Receiver occupies 5000. The frontend's `"proxy"` in `instaclone-frontend/package.json` must always match the API port.

## Production build

`app.js` serves the built React app when `NODE_ENV=production`:

```bash
npm run build --prefix instaclone-frontend
```

```bash
NODE_ENV=production node app.js
```

In production, `config/prod.js` reads `MONGOURI`, `JWT_SEC`, `SENDGRID_API` and `EMAIL` from environment variables instead of `config/dev.js`.

## API routes

All routes marked 🔒 require an `Authorization: Bearer <jwt>` header.

| Method | Route | Description |
|---|---|---|
| POST | `/signup` | Register a new user |
| POST | `/signin` | Log in, returns JWT + user |
| POST | `/google-login` | Verify a Google ID token, create or link the account, returns JWT + user |
| POST | `/reset-password` | Email a password-reset link |
| POST | `/new-password` | Set a new password using the token |
| GET | `/allpost` 🔒 | All posts (home feed) |
| GET | `/getsubpost` 🔒 | Posts from users you follow |
| GET | `/mypost` 🔒 | Your own posts |
| POST | `/createpost` 🔒 | Create a post |
| PUT | `/like` · `/unlike` 🔒 | Like / unlike a post |
| PUT | `/comment` 🔒 | Comment on a post |
| DELETE | `/deletepost/:postId` 🔒 | Delete your own post, or any post if you are an admin |
| GET | `/user/:id` 🔒 | A user's profile and posts |
| PUT | `/follow` · `/unfollow` 🔒 | Follow / unfollow a user |
| PUT | `/updatepic` 🔒 | Update profile picture |
| POST | `/search-users` 🔒 | Search users by email |
| GET | `/admin/users` 🛡 | Every user with counts, signup date and sign-in method |
| GET | `/admin/user/:id/posts` 🛡 | One user's posts |
| DELETE | `/admin/user/:id` 🛡 | Delete an account, its posts, and its likes/comments/follows |

🛡 = admin only (`requireLogin` + `requireAdmin`).

## Project structure

```
Instaclone/
├── app.js                   # Express app entry point
├── config/
│   ├── keys.js              # Picks dev or prod config
│   ├── dev.js               # Local secrets (git-ignored, create it yourself)
│   └── prod.js              # Reads from environment variables
├── models/                  # Mongoose schemas: user, post
├── routes/                  # auth, post, user routes
├── middleware/
│   └── requireLogin.js      # JWT verification
└── instaclone-frontend/
    ├── public/
    └── src/
        ├── App.js           # Routes + UserContext provider
        ├── components/
        │   ├── Navbar.js
        │   └── screens/     # Home, Signin, Signup, Profile, CreatePost, ...
        └── reducers/
            └── userReducer.js
```

## Troubleshooting

**`Error: Cannot find module './dev'`** — you haven't created `config/dev.js`. See [Configure](#configure).

**`error:0308010C:digital envelope routines::unsupported`** when starting the React app — webpack 4 (bundled with react-scripts 4) uses a hash algorithm that OpenSSL 3 rejects. The `start` and `build` scripts set `NODE_OPTIONS=--openssl-legacy-provider` to work around it; if you run `react-scripts` directly, pass that variable yourself.

**`TypeError: Cannot read properties of undefined (reading 'prototype')` in `buffer-equal-constant-time`** when starting the API — `jsonwebtoken@8` pulls in a package that uses `SlowBuffer`, which was removed in Node 24. Run the backend on Node 18–22, or upgrade `jsonwebtoken`.

**`Error: listen EADDRINUSE` on macOS** — AirPlay Receiver occupies port 5000, which is why the API defaults to 3003. If 3003 is busy too, run the API elsewhere:

```bash
PORT=4000 npm run watch
```

and change `"proxy"` in `instaclone-frontend/package.json` to the same port.

**`npm start` in the frontend fails with `could not determine executable to run`** — `node_modules/.bin` was not created because the frontend's `package.json` used to list `npm` itself as a dependency, which makes npm skip bin-linking for the whole tree. That entry has been removed; if you still hit it, delete `node_modules` and `package-lock.json` and reinstall.

**Images don't upload** — `CreatePost.js`, `Profile.js` and `Signup.js` post to a hard-coded Cloudinary cloud name and the `insta-clone` upload preset. Replace those with your own Cloudinary cloud name and unsigned upload preset.

**Messages arrive only after a reload.** The websocket is not connecting. In development the React dev server cannot upgrade a websocket through its proxy, so the browser connects straight to the API on port 3003 — that port has to be reachable, and the API has to be the current code (restart it after pulling). If the API runs somewhere else, point the client at it with `REACT_APP_SOCKET_URL` in `instaclone-frontend/.env` and restart the dev server. A browser console warning of `WebSocket connection to 'ws://localhost:3000/socket.io/...' failed` means the client is still trying to go through the proxy.
