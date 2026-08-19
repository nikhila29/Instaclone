const jwt = require('jsonwebtoken')
const {JWT_SECRET} = require('../config/keys')

/*
 * The websocket layer. Every signed-in browser joins a room named after its
 * user id, so sending to one person is a single emit to that room — and a
 * person with two tabs open gets it in both.
 */
let io = null

const init = (server)=>{
    const {Server} = require('socket.io')
    io = new Server(server,{
        //the React dev server runs on another port during development
        cors:{origin:true,credentials:true}
    })

    io.use((socket,next)=>{
        const token = socket.handshake.auth && socket.handshake.auth.token
        if(!token){
            return next(new Error("unauthorised"))
        }
        jwt.verify(token,JWT_SECRET,(err,payload)=>{
            if(err){
                return next(new Error("unauthorised"))
            }
            socket.userId = payload._id
            next()
        })
    })

    io.on('connection',socket=>{
        socket.join(socket.userId.toString())
        socket.on('typing',({to,typing})=>{
            //relayed straight through; nothing is stored
            if(to){
                socket.to(to.toString()).emit('typing',{from:socket.userId,typing:!!typing})
            }
        })
    })

    return io
}

//never let a websocket problem break the HTTP request that triggered it
const emitToUser = (userId,event,payload)=>{
    if(!io || !userId){
        return
    }
    try{
        io.to(userId.toString()).emit(event,payload)
    }catch(err){
        console.log("emit failed:",err.message)
    }
}

module.exports = {init,emitToUser}
