const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const requireLogin = require('../middleware/requireLogin')
const requireAdmin = require('../middleware/requireAdmin')
const Post = mongoose.model("Post")
const User = mongoose.model("User")


//every user with the engagement numbers the admin screen shows
router.get('/admin/users',requireLogin,requireAdmin,(req,res)=>{
    Promise.all([
        //password is read only to report whether one is set; the hash is never put in a row
        User.find().sort('-createdAt').lean(),
        Post.find().select("postedBy likes comments createdAt").lean()
    ])
    .then(([users,posts])=>{
        const stats = {}
        const bump = (userId,field,by)=>{
            if(!userId){
                return
            }
            const key = userId.toString()
            if(!stats[key]){
                stats[key] = {posts:0,likesReceived:0,commentsReceived:0,commentsMade:0,likesGiven:0}
            }
            stats[key][field] += by
        }
        posts.forEach(post=>{
            bump(post.postedBy,"posts",1)
            bump(post.postedBy,"likesReceived",post.likes.length)
            bump(post.postedBy,"commentsReceived",post.comments.length)
            post.likes.forEach(likedBy=>bump(likedBy,"likesGiven",1))
            post.comments.forEach(comment=>bump(comment.postedBy,"commentsMade",1))
        })
        const rows = users.map(user=>{
            const key = user._id.toString()
            const counts = stats[key] || {posts:0,likesReceived:0,commentsReceived:0,commentsMade:0,likesGiven:0}
            return {
                _id:user._id,
                name:user.name,
                username:user.username,
                email:user.email,
                isPrivate:!!user.isPrivate,
                pic:user.pic,
                isAdmin:!!user.isAdmin,
                //googleId is never sent to the client, only whether the account uses google
                usesGoogle:!!user.googleId,
                hasPassword:!!user.password,
                //older accounts predate timestamps, so fall back to the id's own timestamp
                joinedAt:user.createdAt || new mongoose.Types.ObjectId(user._id).getTimestamp(),
                followers:user.followers.length,
                following:user.following.length,
                ...counts
            }
        })
        res.json({users:rows})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load users"})
    })
})


router.get('/admin/user/:id/posts',requireLogin,requireAdmin,(req,res)=>{
    Post.find({postedBy:req.params.id})
    .populate("postedBy","_id name username pic")
    .populate("comments.postedBy","_id name username pic")
    .sort('-createdAt')
    .then(posts=>{
        res.json({posts})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load that user's posts"})
    })
})


//removes the account and everything pointing at it
router.delete('/admin/user/:id',requireLogin,requireAdmin,(req,res)=>{
    const userId = req.params.id
    if(userId.toString() === req.user._id.toString()){
        return res.status(422).json({error:"you cannot delete your own admin account"})
    }
    User.findById(userId)
    .then(user=>{
        if(!user){
            return res.status(404).json({error:"User not found"})
        }
        return Promise.all([
            Post.deleteMany({postedBy:userId}),
            //their likes and comments live inside other people's posts
            Post.updateMany({},{$pull:{likes:userId}}),
            Post.updateMany({},{$pull:{comments:{postedBy:userId}}}),
            //and their id sits in other people's follower lists
            User.updateMany({},{$pull:{followers:userId,following:userId}})
        ])
        .then(()=>User.deleteOne({_id:userId}))
        .then(()=>{
            res.json({message:"user deleted",_id:userId})
        })
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not delete that user"})
    })
})


module.exports = router
