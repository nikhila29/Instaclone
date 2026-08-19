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
mongoose.connection.on('connected',()=>{
    console.log("conneted to mongo yeahhoo")
})
mongoose.connection.on('error',(err)=>{
    console.log("err connecting",err)
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
    app.use(express.static('instaclone-frontend/build'))
    const path = require('path')
    app.get("*",(req,res)=>{
        res.sendFile(path.resolve(__dirname,'instaclone-frontend','build','index.html'))
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