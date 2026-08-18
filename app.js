require('dotenv').config()
const express = require('express')
const app = express()
var cors = require('cors')
const mongoose  = require('mongoose')
const PORT = process.env.PORT || 3003
const {MONGOURI} = require('./config/keys')


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

app.listen(PORT,()=>{
    console.log("server is running on",PORT)
})