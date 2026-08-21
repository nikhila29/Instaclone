const mongoose = require('mongoose')

const Story = mongoose.model("Story")

const AUTHOR_FIELDS = "_id name username pic"

const createStory = async ({photo,caption,authorId})=>{
    const story = await new Story({photo,caption:caption || "",postedBy:authorId}).save()
    //mongoose 6 removed execPopulate; populate() on a document returns a promise
    return story.populate("postedBy",AUTHOR_FIELDS)
}

/*
 * Stories from the people this user follows, plus their own, grouped one
 * bucket per author — which is how the row above the feed is drawn.
 * Mongo expires the documents after 24 hours on its own.
 */
const listGroupedFor = async (viewer)=>{
    const authors = [...(viewer.following || []),viewer._id]
    const stories = await Story.find({postedBy:{$in:authors}})
        .populate("postedBy",AUTHOR_FIELDS)
        .sort('createdAt')
    const mine = viewer._id.toString()
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
        if(!(story.seenBy || []).some(id=>id.toString() === mine)){
            bucket.seen = false
        }
    })
    const groups = [...buckets.values()]
    //your own ring first, then unseen ones, so there is something to open
    groups.sort((a,b)=>{
        const isMine = (group)=>group.user._id.toString() === mine ? 0 : 1
        return isMine(a) - isMine(b) || Number(a.seen) - Number(b.seen)
    })
    return groups
}

const markSeen = (storyId,viewerId)=>
    Story.findByIdAndUpdate(storyId,{$addToSet:{seenBy:viewerId}},{new:true})

const findById = (storyId)=>Story.findById(storyId)

const removeStory = (story)=>story.remove()

module.exports = {createStory,listGroupedFor,markSeen,findById,removeStory}
