const mongoose = require('mongoose')
const {emitToUser} = require('../lib/realtime')

const Message = mongoose.model("Message")
const User = mongoose.model("User")

const PERSON_FIELDS = "_id name username pic"
const POST_FIELDS = "_id photo title"

const sameId = (a,b)=>a && b && a.toString() === b.toString()

//sharing a post is a message with a post attached, to one or more people
const sharePost = async ({postId,recipients,text,senderId})=>{
    const rows = recipients
        .filter(id=>!sameId(id,senderId))
        .map(id=>({from:senderId,to:id,post:postId,text:text || ""}))
    if(rows.length === 0){
        return {noRecipients:true}
    }
    const created = await Message.insertMany(rows)
    //push the shared post into any open Messages screen
    const full = await Message.find({_id:{$in:created.map(row=>row._id)}})
        .populate("from",PERSON_FIELDS)
        .populate("post",POST_FIELDS)
    full.forEach(message=>emitToUser(message.to,'message',{message}))
    return {sent:created.length}
}

//everyone this user has exchanged messages with, newest first
const listConversations = async (viewerId)=>{
    const messages = await Message.find({$or:[{from:viewerId},{to:viewerId}]})
        .populate("from",PERSON_FIELDS)
        .populate("to",PERSON_FIELDS)
        .populate("post",POST_FIELDS)
        .sort('-createdAt')
    const threads = new Map()
    let unread = 0
    messages.forEach(message=>{
        const other = sameId(message.from._id,viewerId) ? message.to : message.from
        if(!other){
            return
        }
        const key = other._id.toString()
        if(!threads.has(key)){
            threads.set(key,{user:other,last:message,unread:0})
        }
        if(!message.read && sameId(message.to._id,viewerId)){
            threads.get(key).unread++
            unread++
        }
    })
    return {conversations:[...threads.values()],unread}
}

//one thread; opening it marks their messages read
const openThread = async (otherId,viewerId)=>{
    const messages = await Message.find({
        $or:[
            {from:viewerId,to:otherId},
            {from:otherId,to:viewerId}
        ]
    })
    .populate("from",PERSON_FIELDS)
    .populate("post",POST_FIELDS)
    .sort('createdAt')
    await Message.updateMany({from:otherId,to:viewerId,read:false},{$set:{read:true}})
    const person = await User.findById(otherId).select(PERSON_FIELDS)
    if(!person){
        return {notFound:true}
    }
    //tell them their messages to me have been read
    emitToUser(otherId,'read',{by:viewerId})
    return {user:person,messages}
}

const sendMessage = async (toId,fromId,text)=>{
    const saved = await new Message({from:fromId,to:toId,text:text.trim()}).save()
    const message = await saved.populate("from",PERSON_FIELDS)
    emitToUser(toId,'message',{message})
    //so a second tab of mine shows what I just sent
    emitToUser(fromId,'message',{message,mine:true})
    return message
}

module.exports = {sameId,sharePost,listConversations,openThread,sendMessage}
