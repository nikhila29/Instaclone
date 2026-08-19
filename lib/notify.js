const mongoose = require('mongoose')
const {emitToUser} = require('./realtime')

/*
 * Records a notification. Never notifies you about your own actions, and
 * never lets a notification failure break the request that triggered it.
 */
const notify = ({user,actor,type,post,text})=>{
    const Notification = mongoose.model("Notification")
    if(!user || !actor || user.toString() === actor.toString()){
        return Promise.resolve(null)
    }
    return Notification.create({user,actor,type,post,text:text || ""})
        .then(row=>{
            //the heart badge updates without waiting for the next poll
            emitToUser(user,'notification',{type})
            return row
        })
        .catch(err=>{
            console.log("notification failed:",err.message)
            return null
        })
}

//liking then unliking then liking again should not stack up rows
const notifyOnce = async ({user,actor,type,post})=>{
    const Notification = mongoose.model("Notification")
    if(!user || !actor || user.toString() === actor.toString()){
        return null
    }
    //follow rows carry no post, and {post: undefined} would match nothing
    const filter = post ? {user,actor,type,post} : {user,actor,type}
    const existing = await Notification.findOne(filter).catch(()=>null)
    if(existing){
        return existing
    }
    return notify({user,actor,type,post})
}

/*
 * Turns an existing row into another kind, keeping its place in the list.
 * Approving a request makes it read "started following you", which is what it
 * now is — and that row carries the Follow back button.
 */
const convertNotification = async ({user,actor,from,to})=>{
    const Notification = mongoose.model("Notification")
    const existing = await Notification.findOne({user,actor,type:from}).catch(()=>null)
    if(existing){
        existing.type = to
        return existing.save().catch(()=>null)
    }
    return notify({user,actor,type:to})
}

const clearNotification = (filter)=>{
    const Notification = mongoose.model("Notification")
    return Notification.deleteMany(filter).catch(()=>null)
}

module.exports = {notify,notifyOnce,convertNotification,clearNotification}
