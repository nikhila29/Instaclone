const mongoose = require('mongoose')
const {ObjectId} = mongoose.Schema.Types
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    //the @handle shown around the app; unique and always lowercase
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        minlength:3,
        maxlength:30,
        match:/^[a-z0-9._]+$/
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    password:{
        type:String,
        //accounts created through Google sign-in never set a password
        required:function(){ return !this.googleId }
    },
    googleId:{
        type:String,
        default:undefined
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    //a private account's posts and lists are only visible to approved followers
    isPrivate:{
        type:Boolean,
        default:false
    },
    resetToken:String,
    expireToken:Date,
    pic:{
     type:String,
     //inline so the fallback avatar never depends on an external image host
     default:"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23efefef'/><circle cx='50' cy='38' r='18' fill='%23b9b9b9'/><path d='M18 92a32 32 0 0 1 64 0z' fill='%23b9b9b9'/></svg>"
    },
    followers:[{type:ObjectId,ref:"User"}],
    following:[{type:ObjectId,ref:"User"}],
    //people waiting to be approved as followers of this private account
    followRequests:[{type:ObjectId,ref:"User"}],
    saved:[{type:ObjectId,ref:"Post"}]
},{timestamps:true})

mongoose.model("User",userSchema)
