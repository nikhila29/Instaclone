const mongoose = require('mongoose')

const Notification = mongoose.model("Notification")

const ACTOR_FIELDS = "_id name username pic"

const listFor = async (userId)=>{
    const notifications = await Notification.find({user:userId})
        .populate("actor",ACTOR_FIELDS)
        .populate("post","_id photo")
        .sort('-createdAt')
        .limit(50)
    //a deleted account or post leaves a dangling reference
    const usable = notifications.filter(item=>item.actor)
    return {
        notifications:usable,
        unread:usable.filter(item=>!item.read).length
    }
}

const markAllRead = (userId)=>
    Notification.updateMany({user:userId,read:false},{$set:{read:true}})

module.exports = {listFor,markAllRead}
