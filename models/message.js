const mongoose = require('mongoose')
const {ObjectId} = mongoose.Schema.Types

/*
 * One direct message. A message can carry text, a shared post, or both —
 * sharing a post is just a message whose `post` is set.
 */
const messageSchema = new mongoose.Schema({
    from:{type:ObjectId,ref:"User",required:true},
    to:{type:ObjectId,ref:"User",required:true},
    text:{type:String,default:""},
    post:{type:ObjectId,ref:"Post"},
    read:{type:Boolean,default:false}
},{timestamps:true})

//threads are read newest-last between one pair of people
messageSchema.index({from:1,to:1,createdAt:1})
messageSchema.index({to:1,read:1})

mongoose.model("Message",messageSchema)
