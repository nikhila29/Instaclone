const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const requireLogin = require('../middleware/requireLogin')
const Notification = mongoose.model("Notification")

const ACTOR_FIELDS = "_id name username pic"

router.get('/notifications',requireLogin,(req,res)=>{
    Notification.find({user:req.user._id})
    .populate("actor",ACTOR_FIELDS)
    .populate("post","_id photo")
    .sort('-createdAt')
    .limit(50)
    .then(notifications=>{
        //a deleted account or post leaves a dangling reference
        const usable = notifications.filter(item=>item.actor)
        res.json({
            notifications:usable,
            unread:usable.filter(item=>!item.read).length
        })
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load notifications"})
    })
})

router.put('/notifications/read',requireLogin,(req,res)=>{
    Notification.updateMany({user:req.user._id,read:false},{$set:{read:true}})
    .then(()=>res.json({read:true}))
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not mark them read"})
    })
})

module.exports = router
