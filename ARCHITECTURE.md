# Architecture and file guide

How Instaclone is put together, and what every file is for. The README covers
what the app does and how to run it; this document covers how it works.

- [The shape of the app](#the-shape-of-the-app)
- [How a request travels](#how-a-request-travels)
- [Backend, file by file](#backend-file-by-file)
- [Frontend, file by file](#frontend-file-by-file)
- [Data model](#data-model)
- [Rules the code follows](#rules-the-code-follows)
- [Environment variables](#environment-variables)
- [Adding to the app](#adding-to-the-app)

## The shape of the app

Two programs. A React single-page app in `instaclone-frontend/`, and an
Express API at the repository root. In development they run on separate ports
(3000 and 3003) and the React dev server proxies API calls to the API; in
production the API also serves the built React bundle.

```
browser
  │  fetch (JSON over HTTP)          websocket (socket.io)
  ▼                                   ▼
routes/*.js  ──►  controllers/*.js  ──►  services/*.js  ──►  models/*.js  ──►  MongoDB
   url map        validation, status      queries, rules       schemas
                                              │
                                              └──► lib/realtime.js  ──►  connected browsers
```

The three backend layers each have one job:

| Layer | Owns | Never does |
|---|---|---|
| `routes/` | url → middleware → handler | queries, validation, status codes |
| `controllers/` | request validation, status codes, error replies | database access |
| `services/` | queries, business rules, notifications, socket pushes | touching `req` or `res` |

The payoff: a service can be called from a script or a test, because it takes
plain values and returns plain values. When something is missing it returns
`null` or a flag such as `{notFound:true}` — deciding that this means "404" is
the controller's job, because "not found" is an HTTP idea.

## How a request travels

**Liking a post.** `PUT /like` with `{postId}`.

1. `routes/post.js` matches the url and runs `requireLogin`, which verifies the
   JWT and puts the user document on `req.user`.
2. `controllers/postController.js` checks `postId` is present — without it the
   request stops here with `422`.
3. `services/postService.js` runs the update with `$addToSet`, so liking twice
   cannot double-count, and returns `null` if no such post exists.
4. The service calls `notifyOnce` from `lib/notify.js`, which writes one
   notification row per person per post and pushes a `notification` event over
   the websocket.
5. The controller answers `404` if the service returned `null`, otherwise the
   updated post as JSON.

**Sending a message.** `POST /messages/:userId` with `{text}`.

The controller rejects empty text and messaging yourself. The service saves the
row, then calls `emitToUser` twice: once for the recipient, so an open thread
updates immediately, and once for the sender, so a second tab of theirs shows
the message too. The HTTP response is the saved message; the live update is the
socket event.

## Backend, file by file

### Entry point and configuration

| File | What it is |
|---|---|
| `app.js` | Boots everything: loads `.env`, connects Mongoose, registers the models, mounts every router, serves the React build in production, wraps Express in an HTTP server so socket.io can share the port. Refuses to start with a clear message when `MONGOURI` is unset or the port is busy. |
| `config/keys.js` | Picks `prod.js` or `dev.js` from `NODE_ENV`. Every other file reads config through this. |
| `config/dev.js` | Local values, read from `.env`. Git-ignored — create it from the README before first run. |
| `config/prod.js` | The same keys read from real environment variables, for a deployed host. |
| `vercel.json` | Tells Vercel to build one Node function from `app.js`, include the React build output, and route every path to it. |

### Middleware

| File | What it is |
|---|---|
| `middleware/requireLogin.js` | Verifies the `Authorization: Bearer <jwt>` header, loads the user and puts it on `req.user`. Answers `401` when the header is missing or the token is bad. Every protected route uses it. |
| `middleware/requireAdmin.js` | Runs after `requireLogin` and answers `403` unless `req.user.isAdmin`. Used only by the admin routes. |

### Shared libraries

| File | What it is |
|---|---|
| `lib/notify.js` | Writing notifications. `notify` adds one, `notifyOnce` avoids duplicates when the same person likes and unlikes repeatedly, `convertNotification` turns an approved follow request into "started following you", `clearNotification` withdraws a row when the action is undone. Never lets a notification failure break the request that caused it. |
| `lib/realtime.js` | The socket.io server. Verifies the JWT during the handshake, so an unauthenticated socket is refused rather than connected, then puts each user in a room named after their id. `emitToUser` sends to that room, which reaches every tab that person has open. Relays typing events. |
| `lib/usernames.js` | Handles `@handles`: `isValidUsername`, `normalise`, `toSlug`, and `uniqueUsername`, which builds a free handle from a name or email. |

### Routes, controllers and services

Each domain has the same three files. The route file is the index of urls.

| Domain | Endpoints | Notes |
|---|---|---|
| `auth` | `POST /signup`, `/signin`, `/google-login`, `/reset-password`, `/new-password` | The only routes without `requireLogin`. The service holds password hashing, Google token verification, and the reset email. `/google-login` both signs in and, on a first visit, creates the account — and links it to an existing email account. |
| `post` | `GET /allpost`, `/getsubpost`, `/mypost`, `/saved`; `POST /createpost`; `PUT /save`, `/unsave`, `/like`, `/unlike`, `/comment`; `DELETE /deletepost/:postId` | Every feed is filtered to authors the viewer may see, so a private account's posts stay hidden. Deleting also removes the post from everyone's bookmarks. Owner-or-admin rule on delete. |
| `user` | `GET /user/:id`, `/user/:id/followers`, `/user/:id/following`, `/follow-requests`, `/people`; `PUT /follow`, `/unfollow`, `/remove-follower`, `/approve-request`, `/deny-request`, `/privacy`, `/updatepic`; `POST /search-users` | Following a public account is immediate; a private one gets a request. A locked profile still reports its post count, matching Instagram. Turning your account public accepts everyone who was waiting. |
| `message` | `POST /share`, `GET /conversations`, `GET /messages/:userId`, `POST /messages/:userId` | Sharing a post is a message with a post attached. Opening a thread marks it read and tells the other side over the socket. |
| `notification` | `GET /notifications`, `PUT /notifications/read` | Returns the list plus an unread count, skipping rows whose actor or post has since been deleted. |
| `story` | `POST /story`, `GET /stories`, `PUT /story/:id/seen`, `DELETE /story/:id` | `/stories` groups stories one bucket per author, own ring first, then unseen. MongoDB deletes stories 24 hours after posting through a TTL index. |
| `upload` | `POST /cloudinary-signature` | Hands the browser a one-off signature so it uploads straight to Cloudinary. The API secret only ever computes the signature and never reaches the response. No `requireLogin`, because signup uploads a picture before the account exists — the folder is chosen server side either way. |
| `admin` | `GET /admin/users`, `/admin/user/:id/posts`; `DELETE /admin/user/:id` | The user list walks every post once to tally engagement per account. Deleting an account also removes its posts, its likes and comments inside other people's posts, and its id from every follower list. An admin cannot delete themselves. |

### Scripts

Run these by hand with `node scripts/<name>.js`; none of them are part of the server.

| File | What it does |
|---|---|
| `scripts/seed-demo.js` | Creates the demo accounts and their posts. |
| `scripts/seed-posts-for.js` | Adds posts to one named account. |
| `scripts/seed-engagement-for.js` | Adds likes and comments to one account's posts. |
| `scripts/backfill-usernames.js` | Gives handles to accounts created before usernames existed. |
| `scripts/fix-avatars.js` | Replaces broken profile picture urls with the built-in default. |
| `scripts/generate-icons.js` | Writes the favicon and app icons. |

## Frontend, file by file

### Shell and state

| File | What it is |
|---|---|
| `src/index.js` | Mounts React and wraps the app in the Google sign-in provider. |
| `src/App.js` | Holds the user state in a Context with `useReducer`, restores the stored session on load, sends signed-out visitors to `/signin`, and declares every route. |
| `src/reducers/userReducer.js` | The actions the app dispatches: `USER`, `CLEAR`, `UPDATE`, `UPDATEPIC`, `PRIVACY`, `SAVED`. |
| `src/App.css` | The whole stylesheet. Colours are CSS custom properties defined light-first and swapped under `prefers-color-scheme: dark`, which is why the app follows the system theme. |
| `src/index.css` | Page-level resets only. |

### Helpers

| File | What it is |
|---|---|
| `src/socket.js` | One websocket per tab, opened on demand and reused. Sends the JWT in the handshake, reconnects a limited number of times so a host without websocket support degrades quietly, and exposes `useSocketEvent` for components and `emitTyping` for the composer. In development it connects straight to port 3003, because the React dev server cannot upgrade a websocket through its proxy. |
| `src/uploadImage.js` | Asks the API for a Cloudinary signature, then uploads the file directly to Cloudinary and returns the hosted url. |
| `src/timeAgo.js` | Turns a date into `2m`, `4h`, `3d`. Falls back to the timestamp inside a document id for rows saved before the date field existed. |
| `src/components/icons.js` | The inline SVG icons — heart, comment, share, bookmark — so the feed does not depend on an icon font. |

### Shared components

| File | What it is |
|---|---|
| `components/Sidebar.js` | The navigation: a labelled column on wide screens, icons only on medium, a bottom bar on phones, all from CSS. Holds the search panel and the unread badges, which update on socket events and are also polled as a fallback. |
| `components/PostCard.js` | One feed post: images, like, comment, share, save, delete, and the comment box. |
| `components/PostImages.js` | The swipeable image strip for posts with several photos. |
| `components/PostGrid.js` | The three-column grid used on profiles and Saved. |
| `components/PostModal.js` | The popup a grid post opens into, with all its likes and comments. |
| `components/Stories.js` | The ring of circles above the feed plus the full-screen viewer, with progress bars, tap-through and delete. |
| `components/ShareModal.js` | The share sheet: who to send a post to, with followers and people you follow first. |
| `components/NotificationsPanel.js` | The panel behind the heart: likes, comments, follow requests and accepted requests, grouped by age, with Confirm, Delete and Follow back. |
| `components/UserListModal.js` | The popup behind the follower and following counts. On your own lists each row offers Unfollow or Remove; other people's lists are read-only. |
| `components/Avatar.js` | A profile picture that falls back to the default when the url is missing or broken. |
| `components/PasswordField.js` | A password input with the eye that reveals it. |
| `components/GoogleAuthButton.js` | The Google button, shared by Sign in and Sign up. Says so plainly when no client id is configured. |

### Screens

| File | Route | What it is |
|---|---|---|
| `screens/Home.js` | `/` | The main feed, with the stories row above it. |
| `screens/SubscribesUserPosts.js` | `/myfollowingpost` | Posts from the people you follow. |
| `screens/Profile.js` | `/profile` | Your own profile: counts, photo upload, Posts and Saved tabs. |
| `screens/UserProfile.js` | `/profile/:userid` | Somebody else's profile, including the locked view for a private account. |
| `screens/CreatePost.js` | `/create` | New post: pick up to ten images, add a title and body. |
| `screens/Messages.js` | `/messages` | The inbox: conversations on the left, the open thread on the right, with live delivery, a typing indicator and a Seen marker. |
| `screens/Saved.js` | `/saved` | Your bookmarks. |
| `screens/Settings.js` | `/settings` | Account privacy and Log out. |
| `screens/Admin.js` | `/admin` | Every account with its engagement numbers; expand a user's posts, delete a post or an account. Admins only. |
| `screens/Signin.js` | `/signin` | Email and password, or Google. |
| `screens/Signup.js` | `/signup` | New account, with an optional profile picture. |
| `screens/Reset.js` | `/reset` | Asks for the reset email. |
| `screens/Newpassword.js` | `/reset/:token` | Sets a new password from the emailed link. |

`App.test.js`, `setupTests.js`, `reportWebVitals.js` and `serviceWorker.js` are
Create React App scaffolding and are not used by any feature.

## Data model

| Collection | Fields |
|---|---|
| `users` | `name`, `username`, `email`, `password`, `googleId`, `isAdmin`, `isPrivate`, `resetToken`, `expireToken`, `pic`, `followers`, `following`, `followRequests`, `saved` |
| `posts` | `title`, `body`, `photo` (the cover), `photos`, `likes`, `comments`, `postedBy` |
| `stories` | `photo`, `caption`, `postedBy`, `seenBy` — expired by MongoDB after 24 hours |
| `notifications` | `user` (who receives it), `actor` (who caused it), `type`, `post`, `text`, `read` |
| `messages` | `from`, `to`, `text`, `post`, `read` |

A password account has `password` and no `googleId`; a Google account is the
reverse; signing in with Google on an address that already has a password
account links the two, so it can have both.

## Rules the code follows

- **Validate in the controller.** A missing id never reaches a query. Before
  this, `PUT /like` with no `postId` made Mongoose return `null`, the callback
  read a field off it, and the throw inside a Mongoose callback surfaced as an
  unhandled `'error'` event that stopped the whole process.
- **Services return values, not responses.** `null` or `{notFound:true}` for
  missing rows; the controller maps that to a status code.
- **`async`/`await` with `try`/`catch`** everywhere, no promise chains.
- **`$addToSet`, not `$push`,** for likes, followers and bookmarks, so a
  double click cannot record something twice.
- **Privacy is enforced server side.** Feeds, follower lists and profiles all
  ask whether the viewer may see the account; the client is never trusted with it.
- **Secrets stay on the server.** The Cloudinary secret only computes an upload
  signature, and `googleId` and the password hash never appear in a response —
  the admin screen receives the booleans `usesGoogle` and `hasPassword` instead.
- **Socket failures are never fatal.** Every emit is wrapped, so a websocket
  problem cannot break the HTTP request that triggered it.

## Environment variables

`.env` at the repository root, git-ignored, loaded by `app.js`:

| Name | Used for |
|---|---|
| `MONGOURI` | MongoDB connection string |
| `JWT_SECRET` | Signs login tokens. Changing it signs everybody out |
| `GOOGLE_CLIENT_ID` | Verifies Google sign-in tokens |
| `ADMIN_EMAILS` | Comma separated; these addresses become admins on sign-up |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` | Image uploads |
| `SENDGRID_API`, `EMAIL` | Password-reset email and the link inside it |

The frontend needs `REACT_APP_GOOGLE_CLIENT_ID` in `instaclone-frontend/.env`.
It is read at build time, so it must be set before `npm run build`, and a
deployed host needs it as a build variable. `REACT_APP_SOCKET_URL` optionally
points the websocket at an API on another host.

A deployed host has no `.env`, so the same names must be set in its own
environment settings.

## Adding to the app

**A new endpoint.** Add the query to the domain's service, the validation and
status codes to its controller, and one line to its route file. If it belongs to
a new domain, add three files with matching names.

**A new screen.** Add the component under `components/screens/`, a `<Route>` in
`App.js`, and a link in `Sidebar.js`.

**Something that must appear without a reload.** Emit from the service with
`emitToUser`, and subscribe in the component with `useSocketEvent`.

`npm start` at the root runs the API under nodemon, which watches the whole
repository except `instaclone-frontend` — so a new backend folder is picked up
without touching the script. It pins Node 22 with `--exec`, which the API needs:
a `jsonwebtoken` dependency uses `SlowBuffer`, removed from Node after 22, so a
newer binary cannot start the server at all. `app.js` checks for this on the
first line and exits with an explanation.
