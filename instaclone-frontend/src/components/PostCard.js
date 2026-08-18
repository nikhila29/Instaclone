import React,{useState,useRef,useContext} from 'react'
import {Link} from 'react-router-dom'
import M from 'materialize-css'
import {UserContext} from '../App'
import Avatar from './Avatar'
import PostImages from './PostImages'
import ShareModal from './ShareModal'
import {ShareIcon,CommentIcon} from './icons'
import {timeAgo,timeAgoLabel,fullDate} from '../timeAgo'

const COMMENT_PREVIEW = 2

/*
 * One post in a feed. Liking, saving, commenting and deleting all happen here;
 * the parent only supplies the post and is told what changed.
 */
const PostCard = ({post,onChanged,onDeleted,onOpen})=>{
    const {state,dispatch} = useContext(UserContext)
    const [burst,setBurst] = useState(false)
    //only used to enable the Post button
    const [draft,setDraft] = useState("")
    const [shareOpen,setShareOpen] = useState(false)
    const commentInput = useRef(null)
    const lastTap = useRef(0)

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    const likes = post.likes || []
    //likes arrive populated, so they may be objects or bare ids
    const likeId = (like)=>(like && like._id) ? like._id : like
    const liked = likes.some(like=>likeId(like) === state?._id)
    const saved = (state?.saved || []).includes(post._id)
    const author = post.postedBy || {}
    const canDelete = author._id === state?._id || state?.isAdmin

    const setLikes = (result)=>{
        if(result.error){
            M.toast({html:result.error,classes:"toast-error"})
            return
        }
        onChanged(post._id,{likes:result.likes || []})
    }

    const like = ()=>{
        fetch('/like',{method:"put",headers:authHeaders,body:JSON.stringify({postId:post._id})})
            .then(res=>res.json()).then(setLikes).catch(err=>console.log(err))
    }
    const unlike = ()=>{
        fetch('/unlike',{method:"put",headers:authHeaders,body:JSON.stringify({postId:post._id})})
            .then(res=>res.json()).then(setLikes).catch(err=>console.log(err))
    }

    //double tap or double click anywhere on the photo likes it, as in the app
    const onImageTap = ()=>{
        const now = Date.now()
        if(now - lastTap.current < 350){
            if(!liked){
                like()
            }
            setBurst(true)
            setTimeout(()=>setBurst(false),900)
        }
        lastTap.current = now
    }

    const toggleSave = ()=>{
        fetch(saved ? '/unsave' : '/save',{
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
            //the saved list lives on the user, so update the stored session too
            const stored = {...state,saved:result.saved}
            localStorage.setItem("user",JSON.stringify(stored))
            dispatch({type:"SAVED",payload:result.saved})
            M.toast({html:saved ? "Removed from saved" : "Saved",classes:"toast-ok"})
        })
        .catch(err=>console.log(err))
    }

    const addComment = (e)=>{
        e.preventDefault()
        const value = commentInput.current.value
        if(!value.trim()){
            return
        }
        fetch('/comment',{
            method:"put",
            headers:authHeaders,
            body:JSON.stringify({postId:post._id,text:value})
        })
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            onChanged(post._id,{comments:result.comments || []})
            commentInput.current.value = ""
            setDraft("")
        })
        .catch(err=>console.log(err))
    }

    const removePost = ()=>{
        fetch(`/deletepost/${post._id}`,{method:"delete",headers:authHeaders})
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                //e.g. a stale isAdmin in localStorage — say so instead of doing nothing
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            onDeleted(post._id)
        })
        .catch(err=>console.log(err))
    }

    const comments = post.comments || []
    const shown = comments.slice(-COMMENT_PREVIEW)

    //"Liked by rohit and 3 others", using whoever we have a name for
    const likedByLine = ()=>{
        const named = likes.filter(like=>like && like.username)
        if(likes.length === 0){
            return null
        }
        if(named.length === 0){
            return <p className="like-count">{likes.length} {likes.length === 1 ? "like" : "likes"}</p>
        }
        const first = named[0]
        const others = likes.length - 1
        return (
            <p className="liked-by">
                Liked by <Link className="comment-author" to={first._id === state?._id ? "/profile" : "/profile/"+first._id}>{first.username}</Link>
                {others > 0 && <> and <b>{others} {others === 1 ? "other" : "others"}</b></>}
            </p>
        )
    }

    return (
        <div className="home-card">
            {shareOpen && <ShareModal post={post} onClose={()=>setShareOpen(false)}/>}
            <div className="card-head">
                <Avatar src={author.pic} alt={author.username}/>
                <Link className="author" to={author._id !== state?._id ? "/profile/"+author._id : "/profile"}>
                    {author.username || author.name}
                </Link>
                <span className="dot">•</span>
                <span className="dot" title={fullDate(post.createdAt,post._id)}>{timeAgo(post.createdAt,post._id)}</span>
                <span className="spacer"></span>
                {canDelete &&
                    <i className="material-icons" title="Delete post" onClick={removePost}>delete_outline</i>
                }
            </div>

            <div onClick={onImageTap} onDoubleClick={onImageTap}>
                <PostImages post={post}/>
                {burst && <i className="material-icons heart-burst">favorite</i>}
            </div>

            <div className="card-actions">
                {liked
                    ? <i className="material-icons liked" title="Unlike" onClick={unlike}>favorite</i>
                    : <i className="material-icons" title="Like" onClick={like}>favorite_border</i>
                }
                <button className="icon-action" title="View all comments" onClick={()=>onOpen && onOpen(post)}><CommentIcon/></button>
                <button className="icon-action" title="Share" onClick={()=>setShareOpen(true)}><ShareIcon/></button>
                <span className="spacer"></span>
                <i className="material-icons" title={saved ? "Remove from saved" : "Save"} onClick={toggleSave}>
                    {saved ? "bookmark" : "bookmark_border"}
                </i>
            </div>

            <div className="card-body">
                {likedByLine()}
                <p className="post-title">{post.title}</p>
                <p className="post-body">
                    <Link className="comment-author" to={author._id !== state?._id ? "/profile/"+author._id : "/profile"}>
                        {author.username || author.name}
                    </Link>
                    {post.body}
                </p>

                {comments.length > COMMENT_PREVIEW &&
                    <button className="view-all" onClick={()=>onOpen && onOpen(post)}>
                        View all {comments.length} comments
                    </button>
                }
                {shown.map(comment=>(
                    <p className="comment" key={comment._id}>
                        {comment.postedBy
                            ? <Link className="comment-author" to={comment.postedBy._id !== state?._id ? "/profile/"+comment.postedBy._id : "/profile"}>
                                {comment.postedBy.username || comment.postedBy.name}
                              </Link>
                            : <span className="comment-author">Someone</span>
                        }
                        {comment.text}
                    </p>
                ))}
                <span className="card-time" title={fullDate(post.createdAt,post._id)}>{timeAgoLabel(post.createdAt,post._id)}</span>
            </div>

            <form className="comment-form" onSubmit={addComment}>
                <input
                    ref={commentInput}
                    type="text"
                    placeholder="Add a comment…"
                    onChange={(e)=>setDraft(e.target.value)}
                />
                <button className="send-btn" type="submit" disabled={!draft.trim()}>Post</button>
            </form>
        </div>
    )
}

export default PostCard
