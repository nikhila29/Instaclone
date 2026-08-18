const mongoose = require('mongoose')

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
    const existing = await Notification.findOne({user,actor,type,post}).catch(()=>null)
    if(existing){
        return existing
    }
    return notify({user,actor,type,post})
}

const clearNotification = (filter)=>{
    const Notification = mongoose.model("Notification")
    return Notification.deleteMany(filter).catch(()=>null)
}

module.exports = {notify,notifyOnce,clearNotification}
