const postService = require('../services/postService')

/*
 * Every handler validates its input first, then calls the service. A missing
 * postId now stops here with 422 instead of reaching mongoose, where a null
 * result used to crash the process.
 */
const listFeed = async (req,res)=>{
    try{
        const posts = await postService.listVisiblePosts(req.user)
        res.json({posts})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load posts"})
    }
}

const listFollowingFeed = async (req,res)=>{
    try{
        const posts = await postService.listFollowingPosts(req.user)
        res.json({posts})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load posts"})
    }
}

const createPost = async (req,res)=>{
    const {title,body,pic,pics} = req.body
    //pics is the multi-image form; pic is kept so older clients still work
    const photos = (Array.isArray(pics) && pics.length ? pics : [pic]).filter(Boolean)
    if(!title || !body || photos.length === 0){
        return res.status(422).json({error:"Plase add all the fields"})
    }
    if(photos.length > 10){
        return res.status(422).json({error:"a post can hold at most 10 images"})
    }
    try{
        const post = await postService.createPost({title,body,photos,author:req.user})
        res.json({post})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not create post"})
    }
}

const listMyPosts = async (req,res)=>{
    try{
        const mypost = await postService.listPostsByUser(req.user._id)
        res.json({mypost})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load your posts"})
    }
}

const listSaved = async (req,res)=>{
    try{
        const posts = await postService.listSavedPosts(req.user)
        res.json({posts})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load saved posts"})
    }
}

const save = async (req,res)=>{
    const {postId} = req.body
    if(!postId){
        return res.status(422).json({error:"postId is required"})
    }
    try{
        const saved = await postService.setSaved(req.user._id,postId,true)
        res.json({saved})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not save that post"})
    }
}

const unsave = async (req,res)=>{
    const {postId} = req.body
    if(!postId){
        return res.status(422).json({error:"postId is required"})
    }
    try{
        const saved = await postService.setSaved(req.user._id,postId,false)
        res.json({saved})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not remove that post"})
    }
}

const like = async (req,res)=>{
    const {postId} = req.body
    if(!postId){
        return res.status(422).json({error:"postId is required"})
    }
    try{
        const post = await postService.likePost(postId,req.user._id)
        if(!post){
            return res.status(404).json({error:"post not found"})
        }
        res.json(post)
    }catch(err){
        console.log(err)
        res.status(422).json({error:"could not like that post"})
    }
}

const unlike = async (req,res)=>{
    const {postId} = req.body
    if(!postId){
        return res.status(422).json({error:"postId is required"})
    }
    try{
        const post = await postService.unlikePost(postId,req.user._id)
        if(!post){
            return res.status(404).json({error:"post not found"})
        }
        res.json(post)
    }catch(err){
        console.log(err)
        res.status(422).json({error:"could not unlike that post"})
    }
}

const comment = async (req,res)=>{
    const {postId,text} = req.body
    if(!postId){
        return res.status(422).json({error:"postId is required"})
    }
    if(!text || !text.trim()){
        return res.status(422).json({error:"write something first"})
    }
    try{
        const post = await postService.addComment(postId,req.user._id,text)
        if(!post){
            return res.status(404).json({error:"post not found"})
        }
        res.json(post)
    }catch(err){
        console.log(err)
        res.status(422).json({error:"could not add that comment"})
    }
}

const deletePost = async (req,res)=>{
    try{
        const post = await postService.findPostWithAuthor(req.params.postId)
        if(!post){
            return res.status(404).json({error:"post not found"})
        }
        //admins can remove anyone's post; everyone else only their own
        const isOwner = post.postedBy._id.toString() === req.user._id.toString()
        if(!isOwner && !req.user.isAdmin){
            return res.status(403).json({error:"you can only delete your own posts"})
        }
        const removed = await postService.removePost(post)
        res.json(removed)
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not delete post"})
    }
}

module.exports = {
    listFeed,
    listFollowingFeed,
    createPost,
    listMyPosts,
    listSaved,
    save,
    unsave,
    like,
    unlike,
    comment,
    deletePost
}
