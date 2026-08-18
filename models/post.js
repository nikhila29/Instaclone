const mongoose = require('mongoose')
const {ObjectId} = mongoose.Schema.Types
const postSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    body:{
        type:String,
        required:true
    },
    //photo stays the cover image so older posts keep working everywhere
    photo:{
        type:String,
        required:true
    },
    //every image in the post, cover included — one entry for a single-image post
    photos:[{type:String}],
    likes:[{type:ObjectId,ref:"User"}],
    comments:[{
        text:String,
        postedBy:{type:ObjectId,ref:"User"},
        //older comments predate this field; the client falls back to the
        //timestamp inside the comment's own _id
        createdAt:{type:Date,default:Date.now}
    }],
    postedBy:{
       type:ObjectId,
       ref:"User"
    }
},{timestamps:true})

mongoose.model("Post",postSchema)