const mongoose = require('mongoose')
const {ObjectId} = mongoose.Schema.Types

const storySchema = new mongoose.Schema({
    photo:{
        type:String,
        required:true
    },
    caption:{
        type:String,
        default:""
    },
    postedBy:{
        type:ObjectId,
        ref:"User",
        required:true
    },
    seenBy:[{type:ObjectId,ref:"User"}]
},{timestamps:true})

//mongo deletes the document 24 hours after it was created, so stories expire
//without any cleanup job of our own
storySchema.index({createdAt:1},{expireAfterSeconds:60 * 60 * 24})

mongoose.model("Story",storySchema)
