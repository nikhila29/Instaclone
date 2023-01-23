const mongoose = require('mongoose')
const {ObjectId} = mongoose.Schema.Types
//https://res.cloudinary.com/bnp/image/upload/v1635240378/sample.jpg
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    resetToken:String,
    expireToken:Date,
    pic:{
     type:String,
     default:"https://res.cloudinary.com/bnp/image/upload/v1586197723/noimage_d4ipmd.pnghttps://res.cloudinary.com/bnp/image/upload/v1635240378/sample.jpg"
    },
    followers:[{type:ObjectId,ref:"User"}],
    following:[{type:ObjectId,ref:"User"}]
})

mongoose.model("User",userSchema)