const mongoose = require('mongoose')
const {notifyOnce,notify,clearNotification} = require('../lib/notify')

const Post = mongoose.model("Post")
const User = mongoose.model("User")

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

const listVisiblePosts = async (viewer)=>{
    const authorIds = await visibleAuthorIds(viewer)
    return withAuthors(Post.find({postedBy:{$in:authorIds}})).sort('-createdAt')
}

//posts from the people this user follows
const listFollowingPosts = (viewer)=>
    withAuthors(Post.find({postedBy:{$in:viewer.following}})).sort('-createdAt')

const listPostsByUser = (userId)=>
    withAuthors(Post.find({postedBy:userId})).sort('-createdAt')

const listSavedPosts = async (viewer)=>{
    const authorIds = await visibleAuthorIds(viewer)
    return withAuthors(Post.find({
        _id:{$in:viewer.saved || []},
        //a bookmark must not keep showing a post that has since gone private
        postedBy:{$in:authorIds}
    })).sort('-createdAt')
}

const createPost = ({title,body,photos,author})=>{
    author.password = undefined
    return new Post({
        title,
        body,
        //the first image is the cover, used by the profile grid and older posts
        photo:photos[0],
        photos,
        postedBy:author
    }).save()
}

const setSaved = async (userId,postId,save)=>{
    const change = save ? {$addToSet:{saved:postId}} : {$pull:{saved:postId}}
    const user = await User.findByIdAndUpdate(userId,change,{new:true}).select("saved")
    return user ? user.saved : []
}

/*
 * These three return null when there is no such post, so the caller can answer
 * 404. Reading a field off a missing document used to throw inside a mongoose
 * callback, and that surfaced as an unhandled 'error' event which took the
 * whole process down.
 */
const likePost = async (postId,userId)=>{
    //addToSet, not push, so liking twice cannot double-count
    const post = await Post.findByIdAndUpdate(postId,{$addToSet:{likes:userId}},{new:true})
        .populate("likes","_id name username")
    if(!post){
        return null
    }
    //tell the author, once per person per post
    notifyOnce({user:post.postedBy,actor:userId,type:"like",post:post._id})
    return post
}

const unlikePost = async (postId,userId)=>{
    const post = await Post.findByIdAndUpdate(postId,{$pull:{likes:userId}},{new:true})
        .populate("likes","_id name username")
    if(!post){
        return null
    }
    //taking the like back also takes the notification back
    clearNotification({user:post.postedBy,actor:userId,type:"like",post:post._id})
    return post
}

const addComment = async (postId,userId,text)=>{
    const post = await withAuthors(
        Post.findByIdAndUpdate(postId,{$push:{comments:{text,postedBy:userId}}},{new:true})
    )
    if(!post){
        return null
    }
    notify({
        user:post.postedBy && post.postedBy._id,
        actor:userId,
        type:"comment",
        post:post._id,
        text
    })
    return post
}

const findPostWithAuthor = (postId)=>Post.findOne({_id:postId}).populate("postedBy","_id")

const removePost = async (post)=>{
    const removed = await post.remove()
    //drop it from everyone's bookmarks as well
    await User.updateMany({},{$pull:{saved:post._id}})
    return removed
}

module.exports = {
    AUTHOR_FIELDS,
    listVisiblePosts,
    listFollowingPosts,
    listPostsByUser,
    listSavedPosts,
    createPost,
    setSaved,
    likePost,
    unlikePost,
    addComment,
    findPostWithAuthor,
    removePost
}
