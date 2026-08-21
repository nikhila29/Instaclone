const mongoose = require('mongoose')
const {notify,notifyOnce,convertNotification,clearNotification} = require('../lib/notify')

const Post = mongoose.model("Post")
const User = mongoose.model("User")

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

const relationshipTo = (target,viewer)=>({
    isSelf:sameId(target._id,viewer._id),
    isFollowing:(target.followers || []).some(id=>sameId(id,viewer._id)),
    hasRequested:(target.followRequests || []).some(id=>sameId(id,viewer._id))
})

/*
 * The profile payload. A locked profile still reports its post count, because
 * instagram shows the number while withholding the photos.
 */
const getProfile = async (userId,viewer)=>{
    const user = await User.findOne({_id:userId}).select("-password")
    if(!user){
        return null
    }
    const relationship = relationshipTo(user,viewer)
    if(!canSeeContent(user,viewer)){
        const postCount = await Post.countDocuments({postedBy:userId})
        return {user,posts:[],postCount,locked:true,relationship}
    }
    const posts = await Post.find({postedBy:userId})
        .populate("postedBy","_id name username pic")
        //the profile popup shows comments, so their authors must come through too
        .populate("comments.postedBy","_id name username pic")
        .sort('-createdAt')
    return {user,posts,postCount:posts.length,locked:false,relationship}
}

//"followers" or "following" behind the counts on a profile
const getConnections = async (userId,field,viewer)=>{
    const user = await User.findById(userId).populate(field,PUBLIC_FIELDS)
    if(!user){
        return {notFound:true}
    }
    if(!canSeeContent(user,viewer)){
        return {locked:true}
    }
    return {users:user[field]}
}

const findById = (userId)=>User.findById(userId)

/*
 * Following a public account is immediate. A private one gets a request, which
 * is why the result says which of the two happened.
 */
const follow = async (targetId,viewerId)=>{
    const target = await User.findById(targetId)
    if(!target){
        return {notFound:true}
    }
    const alreadyFollowing = (target.followers || []).some(id=>sameId(id,viewerId))
    if(target.isPrivate && !alreadyFollowing){
        await User.findByIdAndUpdate(target._id,{$addToSet:{followRequests:viewerId}},{new:true})
        const me = await User.findById(viewerId).select("-password")
        //one row per person, however many times they re-request
        notifyOnce({user:target._id,actor:viewerId,type:"follow_request"})
        return {me,requested:true}
    }
    await User.findByIdAndUpdate(target._id,{$addToSet:{followers:viewerId}},{new:true})
    const me = await User.findByIdAndUpdate(viewerId,{$addToSet:{following:target._id}},{new:true}).select("-password")
    notifyOnce({user:target._id,actor:viewerId,type:"follow"})
    return {me,requested:false}
}

const unfollow = async (targetId,viewerId)=>{
    const target = await User.findByIdAndUpdate(targetId,{
        //pull from both, so this also cancels a pending request
        $pull:{followers:viewerId,followRequests:viewerId}
    },{new:true})
    if(!target){
        return {notFound:true}
    }
    const me = await User.findByIdAndUpdate(viewerId,{$pull:{following:targetId}},{new:true}).select("-password")
    //unfollowing withdraws the follow and request notifications
    clearNotification({user:targetId,actor:viewerId,type:{$in:["follow","follow_request"]}})
    return {me}
}

/*
 * Drops someone from my followers. They keep no access to a private account,
 * so this is the mirror of them unfollowing me.
 */
const removeFollower = async (followerId,viewerId)=>{
    const me = await User.findByIdAndUpdate(viewerId,{
        $pull:{followers:followerId,followRequests:followerId}
    },{new:true}).select("-password")
    if(!me){
        return {notFound:true}
    }
    await User.findByIdAndUpdate(followerId,{$pull:{following:viewerId}})
    //their "started following you" row no longer reflects anything
    clearNotification({user:viewerId,actor:followerId,type:{$in:["follow","follow_request"]}})
    return {me}
}

//people waiting for me to approve them
const listFollowRequests = async (viewerId)=>{
    const me = await User.findById(viewerId).populate("followRequests",PUBLIC_FIELDS)
    return me ? (me.followRequests || []) : []
}

const approveRequest = async (requesterId,viewerId)=>{
    const me = await User.findById(viewerId)
    if(!me || !(me.followRequests || []).some(id=>sameId(id,requesterId))){
        return {noRequest:true}
    }
    const updated = await User.findByIdAndUpdate(viewerId,{
        $pull:{followRequests:requesterId},
        $addToSet:{followers:requesterId}
    },{new:true}).select("-password")
    await User.findByIdAndUpdate(requesterId,{$addToSet:{following:viewerId}})
    //they are a follower now, so my row becomes "started following you"
    //— which is the row that offers Follow back
    convertNotification({user:viewerId,actor:requesterId,from:"follow_request",to:"follow"})
    notify({user:requesterId,actor:viewerId,type:"follow_accepted"})
    return {updated}
}

const denyRequest = async (requesterId,viewerId)=>{
    const updated = await User.findByIdAndUpdate(viewerId,{
        $pull:{followRequests:requesterId}
    },{new:true}).select("-password")
    clearNotification({user:viewerId,actor:requesterId,type:"follow_request"})
    return updated
}

const setPrivacy = async (viewerId,isPrivate)=>{
    const me = await User.findById(viewerId)
    //going public accepts everyone who was still waiting
    const pending = isPrivate || !me ? [] : (me.followRequests || [])
    let updated = await User.findByIdAndUpdate(viewerId,{
        $set:{isPrivate},
        ...(pending.length ? {$addToSet:{followers:{$each:pending}}} : {})
    },{new:true}).select("-password")
    if(pending.length){
        await User.updateMany({_id:{$in:pending}},{$addToSet:{following:viewerId}})
        updated = await User.findByIdAndUpdate(viewerId,{$set:{followRequests:[]}},{new:true}).select("-password")
    }
    return updated
}

const updatePicture = (viewerId,pic)=>
    User.findByIdAndUpdate(viewerId,{$set:{pic}},{new:true})

/*
 * People to offer in the share sheet: everyone you follow and everyone who
 * follows you first, then the rest, so the list is never empty.
 */
const listPeople = async (viewer)=>{
    const close = new Set([
        ...(viewer.following || []).map(id=>id.toString()),
        ...(viewer.followers || []).map(id=>id.toString())
    ])
    const users = await User.find({_id:{$ne:viewer._id}}).select(PUBLIC_FIELDS).limit(60)
    const rank = (user)=>close.has(user._id.toString()) ? 0 : 1
    users.sort((a,b)=>rank(a) - rank(b) || (a.username || "").localeCompare(b.username || ""))
    return {
        users,
        //the sheet groups them under a heading
        closeCount:users.filter(user=>close.has(user._id.toString())).length
    }
}

const search = (query)=>{
    //escape regex metacharacters — an unescaped "(" makes new RegExp throw
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")
    //match anywhere in the handle or name, so "rahul" finds "Rahul Pammina"
    const anywhere = new RegExp(escaped,"i")
    return User.find({$or:[
        {username:{$regex:anywhere}},
        {name:{$regex:anywhere}},
        {email:{$regex:new RegExp("^"+escaped,"i")}}
    ]})
    .select(PUBLIC_FIELDS)
    .limit(20)
}

module.exports = {
    PUBLIC_FIELDS,
    sameId,
    getProfile,
    getConnections,
    findById,
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
