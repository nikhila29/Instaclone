const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const requireLogin  = require('../middleware/requireLogin')
const Post =  mongoose.model("Post")
const User = mongoose.model("User")
const {notifyOnce,notify,clearNotification} = require('../lib/notify')

const AUTHOR_FIELDS = "_id name username pic"

//attach the standard populates every feed needs
const withAuthors = (query)=>query
    .populate("postedBy",AUTHOR_FIELDS)
    .populate("comments.postedBy",AUTHOR_FIELDS)
    //liker names drive the "Liked by … and N others" line
    .populate("likes","_id name username")

/*
 * Posts by private accounts are only visible to the people they approved, so
 * every feed is limited to authors the viewer is allowed to see.
 */
const visibleAuthorIds = (viewer)=>User.find({
    $or:[
        {isPrivate:false},
        {_id:viewer._id},
        {followers:viewer._id}
    ]
}).distinct('_id')


router.get('/allpost',requireLogin,(req,res)=>{
    visibleAuthorIds(req.user)
    .then(authorIds=>withAuthors(Post.find({postedBy:{$in:authorIds}})).sort('-createdAt'))
    .then((posts)=>{
        res.json({posts})
    }).catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load posts"})
    })

})

router.get('/getsubpost',requireLogin,(req,res)=>{
    //posts from the people this user follows
    withAuthors(Post.find({postedBy:{$in:req.user.following}}))
    .sort('-createdAt')
    .then(posts=>{
        res.json({posts})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load posts"})
    })
})

router.post('/createpost',requireLogin,(req,res)=>{
    const {title,body,pic,pics} = req.body
    //pics is the multi-image form; pic is kept so older clients still work
    const photos = (Array.isArray(pics) && pics.length ? pics : [pic]).filter(Boolean)
    if(!title || !body || photos.length === 0){
      return  res.status(422).json({error:"Plase add all the fields"})
    }
    if(photos.length > 10){
      return res.status(422).json({error:"a post can hold at most 10 images"})
    }
    req.user.password = undefined
    const post = new Post({
        title,
        body,
        //the first image is the cover, used by the profile grid and older posts
        photo:photos[0],
        photos,
        postedBy:req.user
    })
    post.save().then(result=>{
        res.json({post:result})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not create post"})
    })
})

router.get('/mypost',requireLogin,(req,res)=>{
    withAuthors(Post.find({postedBy:req.user._id}))
    .sort('-createdAt')
    .then(mypost=>{
        res.json({mypost})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load your posts"})
    })
})

//posts this user bookmarked
router.get('/saved',requireLogin,(req,res)=>{
    visibleAuthorIds(req.user)
    .then(authorIds=>withAuthors(Post.find({
        _id:{$in:req.user.saved || []},
        //a bookmark must not keep showing a post that has since gone private
        postedBy:{$in:authorIds}
    })).sort('-createdAt'))
    .then(posts=>{
        res.json({posts})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load saved posts"})
    })
})

router.put('/save',requireLogin,(req,res)=>{
    User.findByIdAndUpdate(req.user._id,{
        $addToSet:{saved:req.body.postId}
    },{new:true}).select("saved")
    .then(user=>res.json({saved:user.saved}))
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not save that post"})
    })
})

router.put('/unsave',requireLogin,(req,res)=>{
    User.findByIdAndUpdate(req.user._id,{
        $pull:{saved:req.body.postId}
    },{new:true}).select("saved")
    .then(user=>res.json({saved:user.saved}))
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not remove that post"})
    })
})

router.put('/like',requireLogin,(req,res)=>{
    //addToSet, not push, so liking twice cannot double-count
    Post.findByIdAndUpdate(req.body.postId,{
        $addToSet:{likes:req.user._id}
    },{
        new:true
    })
    .populate("likes","_id name username")
    .exec((err,result)=>{
        if(err){
            return res.status(422).json({error:err})
        }
        //tell the author, once per person per post
        notifyOnce({user:result.postedBy,actor:req.user._id,type:"like",post:result._id})
        res.json(result)
    })
})
router.put('/unlike',requireLogin,(req,res)=>{
    Post.findByIdAndUpdate(req.body.postId,{
        $pull:{likes:req.user._id}
    },{
        new:true
    })
    .populate("likes","_id name username")
    .exec((err,result)=>{
        if(err){
            return res.status(422).json({error:err})
        }
        //taking the like back also takes the notification back
        clearNotification({user:result.postedBy,actor:req.user._id,type:"like",post:result._id})
        res.json(result)
    })
})


router.put('/comment',requireLogin,(req,res)=>{
    const comment = {
        text:req.body.text,
        postedBy:req.user._id
    }
    Post.findByIdAndUpdate(req.body.postId,{
        $push:{comments:comment}
    },{
        new:true
    })
    .populate("comments.postedBy",AUTHOR_FIELDS)
    .populate("postedBy",AUTHOR_FIELDS)
    .populate("likes","_id name username")
    .exec((err,result)=>{
        if(err){
            return res.status(422).json({error:err})
        }
        notify({
            user:result.postedBy && result.postedBy._id,
            actor:req.user._id,
            type:"comment",
            post:result._id,
            text:req.body.text
        })
        res.json(result)
    })
})

router.delete('/deletepost/:postId',requireLogin,(req,res)=>{
    Post.findOne({_id:req.params.postId})
    .populate("postedBy","_id")
    .exec((err,post)=>{
        if(err){
            return res.status(422).json({error:err})
        }
        if(!post){
            return res.status(404).json({error:"post not found"})
        }
        //admins can remove anyone's post; everyone else only their own
        const isOwner = post.postedBy._id.toString() === req.user._id.toString()
        if(!isOwner && !req.user.isAdmin){
            return res.status(403).json({error:"you can only delete your own posts"})
        }
        post.remove()
        .then(result=>{
            //drop it from everyone's bookmarks as well
            return User.updateMany({},{$pull:{saved:post._id}}).then(()=>res.json(result))
        }).catch(err=>{
            console.log(err)
            res.status(500).json({error:"could not delete post"})
        })
    })
})

module.exports = router
