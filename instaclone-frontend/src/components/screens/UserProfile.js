import React,{useEffect,useState,useContext} from 'react'
import {UserContext} from '../../App'
import {useParams} from 'react-router-dom'
import M from 'materialize-css'
import UserListModal from '../UserListModal'
import Avatar from '../Avatar'
import PostModal from '../PostModal'
import PostGrid from '../PostGrid'

const UserProfile = ()=>{
    const {state,dispatch} = useContext(UserContext)
    const {userid} = useParams()
    const [profile,setProfile] = useState(null)
    const [listModal,setListModal] = useState(null)
    const [openPost,setOpenPost] = useState(null)

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    useEffect(()=>{
       fetch(`/user/${userid}`,{headers:authHeaders})
       .then(res=>res.json())
       .then(result=>{
            //an error response has no user, and rendering it would throw
            if(result.error || !result.user){
                return
            }
            setProfile(result)
       }).catch(err=>console.log(err))
       // eslint-disable-next-line react-hooks/exhaustive-deps
    },[userid])

    //follow, request to follow, or unfollow, depending on where we stand
    const changeFollow = (endpoint,body)=>{
        fetch(endpoint,{method:"put",headers:authHeaders,body:JSON.stringify(body)})
        .then(res=>res.json())
        .then(data=>{
            if(data.error){
                M.toast({html:data.error,classes:"toast-error"})
                return
            }
            dispatch({type:"UPDATE",payload:{following:data.following,followers:data.followers}})
            localStorage.setItem("user",JSON.stringify({...state,following:data.following,followers:data.followers}))
            //refetch so the locked state and counts settle from the server
            return fetch(`/user/${userid}`,{headers:authHeaders})
                .then(res=>res.json())
                .then(result=>{
                    if(!result.error){
                        setProfile(result)
                    }
                    if(data.requested){
                        M.toast({html:"Follow request sent",classes:"toast-ok"})
                    }
                })
        })
        .catch(err=>console.log(err))
    }

    const applyChange = (postId,changes)=>{
        setProfile(prev=>prev && {...prev,posts:prev.posts.map(post=>post._id === postId ? {...post,...changes} : post)})
        setOpenPost(open=>open && open._id === postId ? {...open,...changes} : open)
    }

    if(!profile){
        return <div className="page"><div className="panel empty-state"><p>Loading…</p></div></div>
    }

    const {user,posts,postCount,locked,relationship} = profile
    const followButton = ()=>{
        if(relationship.isSelf){
            return null
        }
        if(relationship.isFollowing){
            return <button className="btn follow-btn following" onClick={()=>changeFollow('/unfollow',{unfollowId:userid})}>Following</button>
        }
        if(relationship.hasRequested){
            return <button className="btn follow-btn requested" onClick={()=>changeFollow('/unfollow',{unfollowId:userid})}>Requested</button>
        }
        return <button className="btn follow-btn" onClick={()=>changeFollow('/follow',{followId:userid})}>Follow</button>
    }

    return (
       <div className="page">
           {openPost &&
               <PostModal post={openPost} onClose={()=>setOpenPost(null)} onChanged={applyChange}/>
           }
           {listModal &&
               <UserListModal
                   title={listModal === "followers" ? "Followers" : "Following"}
                   url={`/user/${userid}/${listModal}`}
                   onClose={()=>setListModal(null)}
               />
           }

           <div className="profile-head">
               <Avatar className="avatar" alt={user.username} src={user.pic}/>
               <div className="profile-meta">
                   <div className="profile-title">
                       <h4>{user.username || user.name}</h4>
                       {user.isPrivate && <span className="tag"><i className="material-icons" style={{fontSize:"12px",verticalAlign:"-2px"}}>lock</i> private</span>}
                       {followButton()}
                   </div>
                   <p className="display-name">{user.name}</p>
                   <p className="email">{user.email}</p>
                   <div className="profile-counts">
                       <h6><b>{postCount !== undefined ? postCount : posts.length}</b> posts</h6>
                       <button className="count-btn" disabled={locked} onClick={()=>setListModal("followers")}>
                           <b>{user.followers.length}</b> followers
                       </button>
                       <button className="count-btn" disabled={locked} onClick={()=>setListModal("following")}>
                           <b>{user.following.length}</b> following
                       </button>
                   </div>
               </div>
           </div>

           {locked
               ? <div className="locked-state">
                   <i className="material-icons">lock</i>
                   <h5>This account is private</h5>
                   <p>Follow {user.username || user.name} to see their photos.</p>
                 </div>
               : posts.length === 0
                   ? <div className="panel empty-state" style={{marginTop:"24px"}}>
                       <i className="material-icons">photo_library</i>
                       <h5>No posts yet</h5>
                     </div>
                   : <PostGrid posts={posts} onOpen={setOpenPost}/>
           }
       </div>
    )
}

export default UserProfile
