const userService = require('../services/userService')

const getProfile = async (req,res)=>{
    try{
        const profile = await userService.getProfile(req.params.id,req.user)
        if(!profile){
            return res.status(404).json({error:"User not found"})
        }
        res.json(profile)
    }catch(err){
        //an id that is not a valid ObjectId lands here, and "not found" fits it
        res.status(404).json({error:"User not found"})
    }
}

//one handler for both /followers and /following
const getConnections = (field)=>async (req,res)=>{
    try{
        const result = await userService.getConnections(req.params.id,field,req.user)
        if(result.notFound){
            return res.status(404).json({error:"User not found"})
        }
        if(result.locked){
            return res.status(403).json({error:"This account is private"})
        }
        res.json({users:result.users})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load that list"})
    }
}

const follow = async (req,res)=>{
    const {followId} = req.body
    if(!followId){
        return res.status(422).json({error:"followId is required"})
    }
    if(userService.sameId(followId,req.user._id)){
        return res.status(422).json({error:"you cannot follow yourself"})
    }
    try{
        const result = await userService.follow(followId,req.user._id)
        if(result.notFound){
            return res.status(404).json({error:"User not found"})
        }
        res.json({...result.me.toObject(),requested:result.requested})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not follow that user"})
    }
}

const unfollow = async (req,res)=>{
    const {unfollowId} = req.body
    if(!unfollowId){
        return res.status(422).json({error:"unfollowId is required"})
    }
    try{
        const result = await userService.unfollow(unfollowId,req.user._id)
        //either the target or my own record was missing; before this the
        //request simply hung with no reply at all
        if(result.notFound || !result.me){
            return res.status(404).json({error:"User not found"})
        }
        res.json({...result.me.toObject(),requested:false})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not unfollow that user"})
    }
}

const removeFollower = async (req,res)=>{
    const {userId} = req.body
    if(!userId){
        return res.status(422).json({error:"userId is required"})
    }
    try{
        const result = await userService.removeFollower(userId,req.user._id)
        if(result.notFound){
            return res.status(404).json({error:"User not found"})
        }
        res.json(result.me)
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not remove that follower"})
    }
}

const listFollowRequests = async (req,res)=>{
    try{
        const users = await userService.listFollowRequests(req.user._id)
        res.json({users})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load your requests"})
    }
}

const approveRequest = async (req,res)=>{
    const {userId} = req.body
    if(!userId){
        return res.status(422).json({error:"userId is required"})
    }
    try{
        const result = await userService.approveRequest(userId,req.user._id)
        if(result.noRequest){
            return res.status(404).json({error:"no request from that user"})
        }
        res.json(result.updated)
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not approve that request"})
    }
}

const denyRequest = async (req,res)=>{
    const {userId} = req.body
    if(!userId){
        return res.status(422).json({error:"userId is required"})
    }
    try{
        const updated = await userService.denyRequest(userId,req.user._id)
        res.json(updated)
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not deny that request"})
    }
}

const setPrivacy = async (req,res)=>{
    try{
        const updated = await userService.setPrivacy(req.user._id,!!req.body.isPrivate)
        res.json(updated)
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not change your privacy setting"})
    }
}

const updatePicture = async (req,res)=>{
    const {pic} = req.body
    if(!pic){
        return res.status(422).json({error:"pic canot post"})
    }
    try{
        const updated = await userService.updatePicture(req.user._id,pic)
        res.json(updated)
    }catch(err){
        console.log(err)
        res.status(422).json({error:"pic canot post"})
    }
}

const listPeople = async (req,res)=>{
    try{
        const result = await userService.listPeople(req.user)
        res.json(result)
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load people"})
    }
}

const search = async (req,res)=>{
    const {query} = req.body
    //an empty query would match every user, so return nothing instead
    if(!query){
        return res.json({user:[]})
    }
    try{
        const user = await userService.search(query)
        res.json({user})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"search failed"})
    }
}

module.exports = {
    getProfile,
    getFollowers:getConnections("followers"),
    getFollowing:getConnections("following"),
    follow,
    unfollow,
    removeFollower,
    listFollowRequests,
    approveRequest,
    denyRequest,
    setPrivacy,
    updatePicture,
    listPeople,
    search
}
