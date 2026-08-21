const mongoose = require('mongoose')

/*
 * Admin data access and the rules that go with it. Nothing here knows about
 * req, res or status codes — it takes plain values and returns plain values, so
 * it can be called from a route, a script or a test.
 *
 * The models are registered by app.js before any route is required, which is
 * why they can be looked up at load time.
 */
const Post = mongoose.model("Post")
const User = mongoose.model("User")

const EMPTY_COUNTS = {posts:0,likesReceived:0,commentsReceived:0,commentsMade:0,likesGiven:0}

//walks every post once and tallies engagement per user id
const engagementByUser = (posts)=>{
    const stats = {}
    const bump = (userId,field,by)=>{
        if(!userId){
            return
        }
        const key = userId.toString()
        if(!stats[key]){
            stats[key] = {...EMPTY_COUNTS}
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
    return stats
}

//one row per account, safe to send to the browser
const toRow = (user,counts)=>({
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
})

//every user with the engagement numbers the admin screen shows
const listUsersWithStats = async ()=>{
    const [users,posts] = await Promise.all([
        //password is read only to report whether one is set; the hash never reaches a row
        User.find().sort('-createdAt').lean(),
        Post.find().select("postedBy likes comments createdAt").lean()
    ])
    const stats = engagementByUser(posts)
    return users.map(user=>toRow(user,stats[user._id.toString()] || {...EMPTY_COUNTS}))
}

const listPostsByUser = (userId)=>
    Post.find({postedBy:userId})
    .populate("postedBy","_id name username pic")
    .populate("comments.postedBy","_id name username pic")
    .sort('-createdAt')

const findUser = (userId)=>User.findById(userId)

/*
 * Removes the account and everything pointing at it. Returns false when there
 * was no such user, so the caller can answer 404 without looking twice.
 */
const deleteUserAndTraces = async (userId)=>{
    const user = await findUser(userId)
    if(!user){
        return false
    }
    await Promise.all([
        Post.deleteMany({postedBy:userId}),
        //their likes and comments live inside other people's posts
        Post.updateMany({},{$pull:{likes:userId}}),
        Post.updateMany({},{$pull:{comments:{postedBy:userId}}}),
        //and their id sits in other people's follower lists
        User.updateMany({},{$pull:{followers:userId,following:userId}})
    ])
    await User.deleteOne({_id:userId})
    return true
}

module.exports = {listUsersWithStats,listPostsByUser,deleteUserAndTraces}
