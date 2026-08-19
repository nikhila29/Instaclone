const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const requireLogin = require('../middleware/requireLogin')
const Message = mongoose.model("Message")
const User = mongoose.model("User")
const {emitToUser} = require('../lib/realtime')

const PERSON_FIELDS = "_id name username pic"
const POST_FIELDS = "_id photo title"

const sameId = (a,b)=>a && b && a.toString() === b.toString()

//sharing a post is a message with a post attached, to one or more people
router.post('/share',requireLogin,(req,res)=>{
    const {postId,userIds,text} = req.body
    const recipients = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean)
    if(!postId || recipients.length === 0){
        return res.status(422).json({error:"pick at least one person"})
    }
    const rows = recipients
        .filter(id=>!sameId(id,req.user._id))
        .map(id=>({from:req.user._id,to:id,post:postId,text:text || ""}))
    if(rows.length === 0){
        return res.status(422).json({error:"you cannot share with yourself"})
    }
    Message.insertMany(rows)
    .then(created=>{
        res.json({sent:created.length})
        //push the shared post into any open Messages screen
        return Message.find({_id:{$in:created.map(row=>row._id)}})
            .populate("from",PERSON_FIELDS)
            .populate("post",POST_FIELDS)
            .then(full=>full.forEach(message=>emitToUser(message.to,'message',{message})))
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not share that post"})
    })
})

//everyone this user has exchanged messages with, newest first
router.get('/conversations',requireLogin,(req,res)=>{
    Message.find({$or:[{from:req.user._id},{to:req.user._id}]})
    .populate("from",PERSON_FIELDS)
    .populate("to",PERSON_FIELDS)
    .populate("post",POST_FIELDS)
    .sort('-createdAt')
    .then(messages=>{
        const threads = new Map()
        let unread = 0
        messages.forEach(message=>{
            const other = sameId(message.from._id,req.user._id) ? message.to : message.from
            if(!other){
                return
            }
            const key = other._id.toString()
            if(!threads.has(key)){
                threads.set(key,{user:other,last:message,unread:0})
            }
            if(!message.read && sameId(message.to._id,req.user._id)){
                threads.get(key).unread++
                unread++
            }
        })
        res.json({conversations:[...threads.values()],unread})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load your messages"})
    })
})

//one thread; opening it marks their messages read
router.get('/messages/:userId',requireLogin,(req,res)=>{
    const other = req.params.userId
    Message.find({
        $or:[
            {from:req.user._id,to:other},
            {from:other,to:req.user._id}
        ]
    })
    .populate("from",PERSON_FIELDS)
    .populate("post",POST_FIELDS)
    .sort('createdAt')
    .then(messages=>
        Message.updateMany({from:other,to:req.user._id,read:false},{$set:{read:true}})
            .then(()=>User.findById(other).select(PERSON_FIELDS))
            .then(person=>{
                if(!person){
                    return res.status(404).json({error:"User not found"})
                }
                res.json({user:person,messages})
                //tell them their messages to me have been read
                emitToUser(other,'read',{by:req.user._id})
            })
    )
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load that conversation"})
    })
})

router.post('/messages/:userId',requireLogin,(req,res)=>{
    const {text} = req.body
    if(!text || !text.trim()){
        return res.status(422).json({error:"write something first"})
    }
    if(sameId(req.params.userId,req.user._id)){
        return res.status(422).json({error:"you cannot message yourself"})
    }
    new Message({from:req.user._id,to:req.params.userId,text:text.trim()})
    .save()
    .then(message=>message.populate("from",PERSON_FIELDS))
    .then(message=>{
        res.json({message})
        emitToUser(req.params.userId,'message',{message})
        //so a second tab of mine shows what I just sent
        emitToUser(req.user._id,'message',{message,mine:true})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not send that message"})
    })
})

module.exports = router
