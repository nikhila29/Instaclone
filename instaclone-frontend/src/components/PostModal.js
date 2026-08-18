import React,{useState,useEffect,useContext} from 'react'
import {Link} from 'react-router-dom'
import M from 'materialize-css'
import {UserContext} from '../App'
import Avatar from './Avatar'
import PostImages from './PostImages'
import {timeAgo,timeAgoLabel,fullDate} from '../timeAgo'

/*
 * The popup behind a photo in a profile grid: the images, who posted them,
 * the caption, the likes and the comments — with liking and commenting
 * working from inside the popup.
 */
const PostModal = ({post,onClose,onChanged})=>{
    const {state} = useContext(UserContext)
    const [likes,setLikes] = useState(post.likes || [])
    const [comments,setComments] = useState(post.comments || [])
    const [text,setText] = useState("")

    //likes arrive populated, so entries may be objects or bare ids
    const likeId = (like)=>(like && like._id) ? like._id : like
    const liked = likes.some(like=>likeId(like) === state?._id)
    const named = likes.filter(like=>like && like.username)

    useEffect(()=>{
        const onKey = (e)=>{
            if(e.key === "Escape"){
                onClose()
            }
        }
        window.addEventListener("keydown",onKey)
        return ()=>window.removeEventListener("keydown",onKey)
    },[onClose])

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    const toggleLike = ()=>{
        fetch(liked ? '/unlike' : '/like',{
            method:"put",
            headers:authHeaders,
            body:JSON.stringify({postId:post._id})
        })
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            //the like routes return the post without populated authors,
            //so only the likes array is taken from the response
            setLikes(result.likes || [])
            if(onChanged){
                onChanged(post._id,{likes:result.likes || []})
            }
        })
        .catch(err=>console.log(err))
    }

    const addComment = (e)=>{
        e.preventDefault()
        if(!text.trim()){
            return
        }
        fetch('/comment',{
            method:"put",
            headers:authHeaders,
            body:JSON.stringify({postId:post._id,text})
        })
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            //this route does populate the comment authors
            setComments(result.comments || [])
            setText("")
            if(onChanged){
                onChanged(post._id,{comments:result.comments || []})
            }
        })
        .catch(err=>console.log(err))
    }

    const author = post.postedBy || {}

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="post-modal" onClick={(e)=>e.stopPropagation()}>
                <button className="post-modal-close" onClick={onClose} title="Close">
                    <i className="material-icons">close</i>
                </button>

                <div className="post-modal-media">
                    <PostImages post={post}/>
                </div>

                <div className="post-modal-side">
                    <div className="post-modal-head">
                        <Avatar src={author.pic} alt={author.name}/>
                        <Link
                            className="author"
                            to={author._id === state?._id ? "/profile" : "/profile/"+author._id}
                            onClick={onClose}
                        >{author.username || author.name}</Link>
                        <span className="spacer"></span>
                        <span className="muted small" title={fullDate(post.createdAt,post._id)}>
                            {timeAgo(post.createdAt,post._id)}
                        </span>
                    </div>

                    <div className="post-modal-scroll">
                        <p className="post-title">{post.title}</p>
                        <p className="post-body">
                            <Link
                                className="comment-author"
                                to={author._id !== state?._id ? "/profile/"+author._id : "/profile"}
                                onClick={onClose}
                            >{author.username || author.name}</Link>
                            {post.body}
                        </p>

                        {comments.length === 0
                            ? <p className="muted small">No comments yet.</p>
                            : comments.map(comment=>(
                                <div className="comment-row" key={comment._id}>
                                    <Avatar src={comment.postedBy && comment.postedBy.pic} alt={comment.postedBy && comment.postedBy.name}/>
                                    <div>
                                        <p className="comment">
                                            {comment.postedBy
                                                ? <Link
                                                    className="comment-author"
                                                    to={comment.postedBy._id !== state?._id ? "/profile/"+comment.postedBy._id : "/profile"}
                                                    onClick={onClose}
                                                  >{comment.postedBy.username || comment.postedBy.name}</Link>
                                                : <span className="comment-author">Someone</span>
                                            }
                                            {comment.text}
                                        </p>
                                        <span className="muted small" title={fullDate(comment.createdAt,comment._id)}>
                                            {timeAgo(comment.createdAt,comment._id)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <div className="post-modal-foot">
                        <div className="card-actions">
                            <i
                                className={liked ? "material-icons liked" : "material-icons"}
                                title={liked ? "Unlike" : "Like"}
                                onClick={toggleLike}
                            >{liked ? "favorite" : "favorite_border"}</i>
                            <span className="muted small">{comments.length} {comments.length === 1 ? "comment" : "comments"}</span>
                        </div>
                        {named.length > 0
                            ? <p className="liked-by">
                                Liked by <span className="comment-author">{named[0].username}</span>
                                {likes.length > 1 && <> and <b>{likes.length - 1} {likes.length - 1 === 1 ? "other" : "others"}</b></>}
                              </p>
                            : <p className="like-count">{likes.length} {likes.length === 1 ? "like" : "likes"}</p>
                        }
                        <span className="card-time" title={fullDate(post.createdAt,post._id)}>{timeAgoLabel(post.createdAt,post._id)}</span>
                        <form className="comment-form" onSubmit={addComment}>
                            <input
                                type="text"
                                placeholder="Add a comment…"
                                value={text}
                                onChange={(e)=>setText(e.target.value)}
                            />
                            <button className="send-btn" type="submit" disabled={!text.trim()}>Post</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PostModal
