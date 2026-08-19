import {useEffect} from 'react'
import {io} from 'socket.io-client'

/*
 * One websocket for the whole tab, opened on demand and reused.
 * The JWT is sent in the handshake, so the server knows who is connecting
 * without any of it being guessable from the client.
 */
let socket = null
let socketToken = null

/*
 * In development the React server (3000) cannot upgrade a websocket through
 * its proxy, so the socket talks to the API port directly. In production both
 * are the same origin and no url is needed.
 */
const socketUrl = ()=>{
    if(process.env.REACT_APP_SOCKET_URL){
        return process.env.REACT_APP_SOCKET_URL
    }
    if(process.env.NODE_ENV === "development"){
        return `${window.location.protocol}//${window.location.hostname}:3003`
    }
    return undefined
}

export const getSocket = ()=>{
    const token = localStorage.getItem("jwt")
    if(!token){
        return null
    }
    //signing in as somebody else must not keep the old connection
    if(socket && socketToken !== token){
        closeSocket()
    }
    if(!socket){
        socketToken = token
        socket = io(socketUrl(),{
            auth:{token},
            transports:["websocket","polling"],
            //a serverless host cannot hold a websocket open; give up rather than
            //retry forever, and let the 30 second poll keep the badges honest
            reconnectionAttempts:5
        })
    }
    return socket
}

export const closeSocket = ()=>{
    if(socket){
        socket.disconnect()
    }
    socket = null
    socketToken = null
}

//subscribe for as long as the component is mounted
export const useSocketEvent = (event,handler,deps=[])=>{
    useEffect(()=>{
        const live = getSocket()
        if(!live){
            return
        }
        live.on(event,handler)
        return ()=>live.off(event,handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },deps)
}

export const emitTyping = (to,typing)=>{
    const live = getSocket()
    if(live){
        live.emit('typing',{to,typing})
    }
}
