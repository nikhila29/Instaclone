const storyService = require('../services/storyService')

const create = async (req,res)=>{
    const {photo,caption} = req.body
    if(!photo){
        return res.status(422).json({error:"a story needs an image"})
    }
    try{
        const story = await storyService.createStory({photo,caption,authorId:req.user._id})
        res.json({story})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not add your story"})
    }
}

const feed = async (req,res)=>{
    try{
        const groups = await storyService.listGroupedFor(req.user)
        res.json({groups})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load stories"})
    }
}

const markSeen = async (req,res)=>{
    try{
        const story = await storyService.markSeen(req.params.id,req.user._id)
        if(!story){
            return res.status(404).json({error:"story not found"})
        }
        res.json({_id:story._id,seenBy:story.seenBy.length})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not mark that story seen"})
    }
}

const remove = async (req,res)=>{
    try{
        const story = await storyService.findById(req.params.id)
        if(!story){
            return res.status(404).json({error:"story not found"})
        }
        //admins can remove anyone's story; everyone else only their own
        if(story.postedBy.toString() !== req.user._id.toString() && !req.user.isAdmin){
            return res.status(403).json({error:"you can only delete your own story"})
        }
        await storyService.removeStory(story)
        res.json({_id:req.params.id})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not delete that story"})
    }
}

module.exports = {create,feed,markSeen,remove}
