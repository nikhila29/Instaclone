const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const requireLogin = require('../middleware/requireLogin')
const Story = mongoose.model("Story")
const User = mongoose.model("User")

const AUTHOR_FIELDS = "_id name username pic"

router.post('/story',requireLogin,(req,res)=>{
    const {photo,caption} = req.body
    if(!photo){
        return res.status(422).json({error:"a story needs an image"})
    }
    new Story({photo,caption:caption || "",postedBy:req.user._id})
    .save()
    //mongoose 6 removed execPopulate; populate() on a document returns a promise
    .then(story=>story.populate("postedBy",AUTHOR_FIELDS))
    .then(story=>res.json({story}))
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not add your story"})
    })
})

/*
 * Stories from the people this user follows, plus their own, grouped one
 * bucket per author — which is how the row above the feed is drawn.
 * Mongo expires the documents after 24 hours on its own.
 */
router.get('/stories',requireLogin,(req,res)=>{
    const authors = [...(req.user.following || []),req.user._id]
    Story.find({postedBy:{$in:authors}})
    .populate("postedBy",AUTHOR_FIELDS)
    .sort('createdAt')
    .then(stories=>{
        const buckets = new Map()
        stories.forEach(story=>{
            //a deleted author leaves the reference dangling
            if(!story.postedBy){
                return
            }
            const key = story.postedBy._id.toString()
            if(!buckets.has(key)){
                buckets.set(key,{user:story.postedBy,stories:[],seen:true})
            }
            const bucket = buckets.get(key)
            bucket.stories.push(story)
            if(!(story.seenBy || []).some(id=>id.toString() === req.user._id.toString())){
                bucket.seen = false
            }
        })
        const groups = [...buckets.values()]
        //your own ring first, then unseen ones, so there is something to open
        groups.sort((a,b)=>{
            const mine = (group)=>group.user._id.toString() === req.user._id.toString() ? 0 : 1
            return mine(a) - mine(b) || Number(a.seen) - Number(b.seen)
        })
        res.json({groups})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not load stories"})
    })
})

router.put('/story/:id/seen',requireLogin,(req,res)=>{
    Story.findByIdAndUpdate(req.params.id,{
        $addToSet:{seenBy:req.user._id}
    },{new:true})
    .then(story=>{
        if(!story){
            return res.status(404).json({error:"story not found"})
        }
        res.json({_id:story._id,seenBy:story.seenBy.length})
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not mark that story seen"})
    })
})

router.delete('/story/:id',requireLogin,(req,res)=>{
    Story.findById(req.params.id)
    .then(story=>{
        if(!story){
            return res.status(404).json({error:"story not found"})
        }
        if(story.postedBy.toString() !== req.user._id.toString() && !req.user.isAdmin){
            return res.status(403).json({error:"you can only delete your own story"})
        }
        return story.remove().then(()=>res.json({_id:req.params.id}))
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not delete that story"})
    })
})

module.exports = router
