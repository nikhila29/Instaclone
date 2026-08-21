const notificationService = require('../services/notificationService')

const list = async (req,res)=>{
    try{
        const result = await notificationService.listFor(req.user._id)
        res.json(result)
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load notifications"})
    }
}

const markRead = async (req,res)=>{
    try{
        await notificationService.markAllRead(req.user._id)
        res.json({read:true})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not mark them read"})
    }
}

module.exports = {list,markRead}
