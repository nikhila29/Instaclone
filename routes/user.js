const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const requireLogin  = require('../middleware/requireLogin')
const Post =  mongoose.model("Post")
const User = mongoose.model("User")
const {notify,clearNotification} = require('../lib/notify')

//what other people are allowed to see about a user
const PUBLIC_FIELDS = "_id name username pic isPrivate"

const sameId = (a,b)=>a && b && a.toString() === b.toString()

/*
 * A private account's posts, followers and following are only visible to
 * itself and to the followers it has approved.
 */
const canSeeContent = (target,viewer)=>{
    if(!target.isPrivate){
        return true
    }
    if(sameId(target._id,viewer._id)){
        return true
    }
    return (target.followers || []).some(id=>sameId(id,viewer._id))
}


router.get('/user/:id',requireLogin,(req,res)=>{
    User.findOne({_id:req.params.id})
    .select("-password")
    .then(user=>{
         if(!user){
             return res.status(404).json({error:"User not found"})
         }
         const isSelf = sameId(user._id,req.user._id)
         const isFollowing = (user.followers || []).some(id=>sameId(id,req.user._id))
         const hasRequested = (user.followRequests || []).some(id=>sameId(id,req.user._id))
         const relationship = {isSelf,isFollowing,hasRequested}

         if(!canSeeContent(user,req.user)){
             //the header stays visible, including the post count — only the
             //photos themselves are withheld
             return Post.countDocuments({postedBy:req.params.id})
                 .then(postCount=>res.json({user,posts:[],postCount,locked:true,relationship}))
         }
         Post.find({postedBy:req.params.id})
         .populate("postedBy","_id name username pic")
         //the profile popup shows comments, so their authors must come through too
         .populate("comments.postedBy","_id name username pic")
         .sort('-createdAt')
         .exec((err,posts)=>{
             if(err){
                 return res.status(422).json({error:err})
             }
             res.json({user,posts,postCount:posts.length,locked:false,relationship})
         })
    }).catch(err=>{
        return res.status(404).json({error:"User not found"})
    })
})


//the follower/following lists behind the counts on a profile
const sendUserList = (field)=>(req,res)=>{
    User.findById(req.params.id)
    .populate(field,PUBLIC_FIELDS)
    .then(user=>{
        if(!user){
            return res.status(404).json({error:"User not found"})
        }
        if(!canSeeContent(user,req.user)){
            return res.status(403).json({error:"This account is private"})
        }
        res.json({users:user[field]})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load that list"})
    })
}
router.get('/user/:id/followers',requireLogin,sendUserList("followers"))
router.get('/user/:id/following',requireLogin,sendUserList("following"))


router.put('/follow',requireLogin,(req,res)=>{
    if(!req.body.followId){
        return res.status(422).json({error:"followId is required"})
    }
    if(sameId(req.body.followId,req.user._id)){
        return res.status(422).json({error:"you cannot follow yourself"})
    }
    User.findById(req.body.followId)
    .then(target=>{
        if(!target){
            return res.status(404).json({error:"User not found"})
        }
        //a private account has to approve the follow first
        if(target.isPrivate && !(target.followers || []).some(id=>sameId(id,req.user._id))){
            return User.findByIdAndUpdate(target._id,{
                $addToSet:{followRequests:req.user._id}
            },{new:true})
            .then(()=>User.findById(req.user._id).select("-password"))
            .then(me=>{
                notify({user:target._id,actor:req.user._id,type:"follow_request"})
                res.json({...me.toObject(),requested:true})
            })
        }
        return User.findByIdAndUpdate(target._id,{
            $addToSet:{followers:req.user._id}
        },{new:true})
        .then(()=>User.findByIdAndUpdate(req.user._id,{
            $addToSet:{following:target._id}
        },{new:true}).select("-password"))
        .then(me=>{
            notify({user:target._id,actor:req.user._id,type:"follow"})
            res.json({...me.toObject(),requested:false})
        })
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not follow that user"})
    })
})

router.put('/unfollow',requireLogin,(req,res)=>{
    if(!req.body.unfollowId){
        return res.status(422).json({error:"unfollowId is required"})
    }
    User.findByIdAndUpdate(req.body.unfollowId,{
        //pull from both, so this also cancels a pending request
        $pull:{followers:req.user._id,followRequests:req.user._id}
    },{new:true})
    .then(target=>{
        if(!target){
            return res.status(404).json({error:"User not found"})
        }
        return User.findByIdAndUpdate(req.user._id,{
            $pull:{following:req.body.unfollowId}
        },{new:true}).select("-password")
    })
    .then(me=>{
        if(me){
            //unfollowing withdraws the follow and request notifications
            clearNotification({user:req.body.unfollowId,actor:req.user._id,type:{$in:["follow","follow_request"]}})
            res.json({...me.toObject(),requested:false})
        }
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not unfollow that user"})
    })
})


//people waiting for me to approve them
router.get('/follow-requests',requireLogin,(req,res)=>{
    User.findById(req.user._id)
    .populate("followRequests",PUBLIC_FIELDS)
    .then(me=>{
        res.json({users:me.followRequests || []})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load your requests"})
    })
})

router.put('/approve-request',requireLogin,(req,res)=>{
    const {userId} = req.body
    if(!userId){
        return res.status(422).json({error:"userId is required"})
    }
    User.findById(req.user._id)
    .then(me=>{
        if(!(me.followRequests || []).some(id=>sameId(id,userId))){
            return res.status(404).json({error:"no request from that user"})
        }
        return User.findByIdAndUpdate(req.user._id,{
            $pull:{followRequests:userId},
            $addToSet:{followers:userId}
        },{new:true}).select("-password")
        .then(updated=>User.findByIdAndUpdate(userId,{
            $addToSet:{following:req.user._id}
        }).then(()=>{
            //the request row becomes an "accepted" row for the requester
            clearNotification({user:req.user._id,actor:userId,type:"follow_request"})
            notify({user:userId,actor:req.user._id,type:"follow_accepted"})
            res.json(updated)
        }))
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not approve that request"})
    })
})

router.put('/deny-request',requireLogin,(req,res)=>{
    const {userId} = req.body
    if(!userId){
        return res.status(422).json({error:"userId is required"})
    }
    User.findByIdAndUpdate(req.user._id,{
        $pull:{followRequests:userId}
    },{new:true}).select("-password")
    .then(updated=>{
        clearNotification({user:req.user._id,actor:userId,type:"follow_request"})
        res.json(updated)
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not deny that request"})
    })
})


router.put('/privacy',requireLogin,(req,res)=>{
    const isPrivate = !!req.body.isPrivate
    const update = {$set:{isPrivate}}
    User.findById(req.user._id)
    .then(me=>{
        //going public accepts everyone who was still waiting
        const pending = isPrivate ? [] : (me.followRequests || [])
        return User.findByIdAndUpdate(req.user._id,{
            ...update,
            ...(pending.length ? {$addToSet:{followers:{$each:pending}},$unset:{}} : {})
        },{new:true}).select("-password")
        .then(updated=>{
            if(!pending.length){
                return updated
            }
            return User.updateMany({_id:{$in:pending}},{$addToSet:{following:req.user._id}})
                .then(()=>User.findByIdAndUpdate(req.user._id,{$set:{followRequests:[]}},{new:true}).select("-password"))
        })
    })
    .then(updated=>res.json(updated))
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not change your privacy setting"})
    })
})


router.put('/updatepic',requireLogin,(req,res)=>{
    User.findByIdAndUpdate(req.user._id,{$set:{pic:req.body.pic}},{new:true},
        (err,result)=>{
         if(err){
             return res.status(422).json({error:"pic canot post"})
         }
         res.json(result)
    })
})



/*
 * People to offer in the share sheet: everyone you follow and everyone who
 * follows you first, then the rest, so the list is never empty.
 */
router.get('/people',requireLogin,(req,res)=>{
    const close = new Set([
        ...(req.user.following || []).map(id=>id.toString()),
        ...(req.user.followers || []).map(id=>id.toString())
    ])
    User.find({_id:{$ne:req.user._id}})
    .select(PUBLIC_FIELDS)
    .limit(60)
    .then(users=>{
        const rank = (user)=>close.has(user._id.toString()) ? 0 : 1
        users.sort((a,b)=>rank(a) - rank(b) || (a.username || "").localeCompare(b.username || ""))
        res.json({
            users,
            //the sheet groups them under a heading
            closeCount:users.filter(user=>close.has(user._id.toString())).length
        })
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load people"})
    })
})


router.post('/search-users',requireLogin,(req,res)=>{
    const query = req.body.query
    //an empty query would match every user, so return nothing instead
    if(!query){
        return res.json({user:[]})
    }
    //escape regex metacharacters — an unescaped "(" makes new RegExp throw
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")
    //match anywhere in the handle or name, so "rahul" finds "Rahul Pammina"
    const anywhere = new RegExp(escaped,"i")
    User.find({$or:[
        {username:{$regex:anywhere}},
        {name:{$regex:anywhere}},
        {email:{$regex:new RegExp("^"+escaped,"i")}}
    ]})
    .select(PUBLIC_FIELDS)
    .limit(20)
    .then(user=>{
        res.json({user})
    }).catch(err=>{
        console.log(err)
        res.status(500).json({error:"search failed"})
    })

})



module.exports = router
