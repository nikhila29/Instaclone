/*
 * jsonwebtoken reaches buffer-equal-constant-time, which uses SlowBuffer —
 * removed from node after 22. Running this on a newer node dies with an
 * unhelpful "Cannot read properties of undefined" from inside node_modules,
 * so say what is wrong instead. `npm start` pins the right binary.
 */
if(!require('buffer').SlowBuffer){
    console.log(`node ${process.version} cannot run this project: a jsonwebtoken dependency needs SlowBuffer, which this version removed.`)
    console.log("run `npm start`, which pins node 22, or switch with `nvm use 22`")
    process.exit(1)
}

require('dotenv').config()
const express = require('express')
const app = express()
var cors = require('cors')
const mongoose  = require('mongoose')
const PORT = process.env.PORT || 3003
const {MONGOURI} = require('./config/keys')


/*
 * Without this a missing connection string surfaces as a mongoose stack trace
 * deep inside node_modules. On a host like Vercel the values come from the
 * project's environment variables, not from the git-ignored .env file.
 */
if(!MONGOURI){
    console.log("MONGOURI is not set — add it to this environment's variables (on Vercel: Project → Settings → Environment Variables), then redeploy")
    process.exit(1)
}

mongoose.connect(MONGOURI,{
    useNewUrlParser:true,
    useUnifiedTopology: true

})
/*
 * The driver reconnects on its own whenever the link drops. Only logging the
 * connect made a dropped link invisible and every reconnect look like a fresh
 * start, so the drop is logged too and repeats are counted.
 */
let mongoConnects = 0
mongoose.connection.on('connected',()=>{
    mongoConnects++
    console.log(mongoConnects === 1
        ? "conneted to mongo yeahhoo"
        : `re-connected to mongo (connection #${mongoConnects}) — the link had dropped`)
})
mongoose.connection.on('disconnected',()=>{
    console.log("lost the mongo connection — the driver will retry")
})
mongoose.connection.on('error',(err)=>{
    console.log("err connecting",err.message)
})

require('./models/user')
require('./models/post')
require('./models/story')
require('./models/notification')
require('./models/message')

app.use(express.json())
app.use(cors())
app.use(require('./routes/auth'))
app.use(require('./routes/post'))
app.use(require('./routes/user'))
app.use(require('./routes/admin'))
app.use(require('./routes/upload'))
app.use(require('./routes/story'))
app.use(require('./routes/notification'))
app.use(require('./routes/message'))


if(process.env.NODE_ENV=="production"){
    const path = require('path')
    //resolved from this file, not the working directory — a host may start the
    //process from somewhere else, and then every asset silently returns index.html
    const buildDir = path.resolve(__dirname,'instaclone-frontend','build')
    app.use(express.static(buildDir))
    app.get("*",(req,res)=>{
        res.sendFile(path.resolve(buildDir,'index.html'))
    })
}

//socket.io needs the raw http server, so express is wrapped rather than
//calling app.listen directly
const http = require('http')
const server = http.createServer(app)
require('./lib/realtime').init(server)

//a busy port otherwise prints ten lines of node internals instead of the cause
server.on('error',err=>{
    if(err.code === 'EADDRINUSE'){
        console.log(`port ${PORT} is already in use — stop the other server first`)
        process.exit(1)
    }
    throw err
})

server.listen(PORT,()=>{
    console.log("server is running on",PORT)
})