const messageService = require('../services/messageService')

const share = async (req,res)=>{
    const {postId,userIds,text} = req.body
    const recipients = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean)
    if(!postId || recipients.length === 0){
        return res.status(422).json({error:"pick at least one person"})
    }
    try{
        const result = await messageService.sharePost({postId,recipients,text,senderId:req.user._id})
        if(result.noRecipients){
            return res.status(422).json({error:"you cannot share with yourself"})
        }
        res.json({sent:result.sent})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not share that post"})
    }
}

const listConversations = async (req,res)=>{
    try{
        const result = await messageService.listConversations(req.user._id)
        res.json(result)
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load your messages"})
    }
}

const openThread = async (req,res)=>{
    try{
        const result = await messageService.openThread(req.params.userId,req.user._id)
        if(result.notFound){
            return res.status(404).json({error:"User not found"})
        }
        res.json({user:result.user,messages:result.messages})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load that conversation"})
    }
}

const send = async (req,res)=>{
    const {text} = req.body
    if(!text || !text.trim()){
        return res.status(422).json({error:"write something first"})
    }
    if(messageService.sameId(req.params.userId,req.user._id)){
        return res.status(422).json({error:"you cannot message yourself"})
    }
    try{
        const message = await messageService.sendMessage(req.params.userId,req.user._id,text)
        res.json({message})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not send that message"})
    }
}

module.exports = {share,listConversations,openThread,send}
