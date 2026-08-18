const mongoose = require('mongoose')
const {ObjectId} = mongoose.Schema.Types

/*
 * One row in the notifications panel: someone did something to you.
 * `actor` is who did it, `user` is who hears about it.
 */
const notificationSchema = new mongoose.Schema({
    user:{type:ObjectId,ref:"User",required:true},
    actor:{type:ObjectId,ref:"User",required:true},
    type:{
        type:String,
        required:true,
        enum:["like","comment","follow","follow_request","follow_accepted"]
    },
    post:{type:ObjectId,ref:"Post"},
    //a copy of the comment, so the row still reads well if it is deleted later
    text:{type:String,default:""},
    read:{type:Boolean,default:false}
},{timestamps:true})

//the panel always reads newest first, per recipient
notificationSchema.index({user:1,createdAt:-1})

mongoose.model("Notification",notificationSchema)
