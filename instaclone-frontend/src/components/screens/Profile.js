import React,{useEffect,useState,useContext} from 'react'
import {UserContext} from '../../App'
import {Link} from 'react-router-dom'
import M from 'materialize-css'
import uploadImage from '../../uploadImage'
import UserListModal from '../UserListModal'
import Avatar from '../Avatar'
import PostModal from '../PostModal'
import PostGrid from '../PostGrid'

const Profile = ()=>{
    const {state,dispatch} = useContext(UserContext)
    const [mypics,setPics] = useState([])
    const [savedPosts,setSaved] = useState([])
    const [tab,setTab] = useState("posts")
    const [image,setImage] = useState("")
    const [listModal,setListModal] = useState(null)
    const [openPost,setOpenPost] = useState(null)

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    useEffect(()=>{
       fetch('/mypost',{headers:authHeaders})
       .then(res=>res.json())
       .then(result=>{
           //an error response has no mypost array — keep the empty list instead of crashing the render
           setPics(result.mypost || [])
       }).catch(err=>console.log(err))
       // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    //saved posts are only fetched when that tab is opened
    useEffect(()=>{
        if(tab !== "saved"){
            return
        }
        fetch('/saved',{headers:authHeaders})
        .then(res=>res.json())
        .then(result=>setSaved(result.posts || []))
        .catch(err=>console.log(err))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[tab])

    useEffect(()=>{
       if(!image){
           return
       }
       uploadImage(image)
       .then(hostedUrl=>fetch('/updatepic',{
           method:"put",
           headers:authHeaders,
           body:JSON.stringify({pic:hostedUrl})
       }).then(res=>res.json()))
       .then(result=>{
           if(result.error){
               M.toast({html:result.error,classes:"toast-error"})
               return
           }
           localStorage.setItem("user",JSON.stringify({...state,pic:result.pic}))
           dispatch({type:"UPDATEPIC",payload:result.pic})
           M.toast({html:"Photo updated",classes:"toast-ok"})
       })
       .catch(err=>{
           console.log(err)
           M.toast({html:err.message || "Could not upload the photo",classes:"toast-error"})
       })
       // eslint-disable-next-line react-hooks/exhaustive-deps
    },[image])

    const applyChange = (postId,changes)=>{
        setPics(list=>list.map(post=>post._id === postId ? {...post,...changes} : post))
        setSaved(list=>list.map(post=>post._id === postId ? {...post,...changes} : post))
        setOpenPost(open=>open && open._id === postId ? {...open,...changes} : open)
    }

    const shown = tab === "saved" ? savedPosts : mypics

    return (
       <div className="page">
           {openPost &&
               <PostModal post={openPost} onClose={()=>setOpenPost(null)} onChanged={applyChange}/>
           }
           {listModal && state &&
               <UserListModal
                   title={listModal === "followers" ? "Followers" : "Following"}
                   url={`/user/${state._id}/${listModal}`}
                   kind={listModal}
                   isOwn={true}
                   onClose={()=>setListModal(null)}
               />
           }

           <div className="profile-head">
               <Avatar className="avatar" alt={state?state.username:"profile"} src={state?state.pic:""}/>
               <div className="profile-meta">
                   <div className="profile-title">
                       <h4>{state ? (state.username || state.name) : "loading"}</h4>
                       {state?.isPrivate && <span className="tag"><i className="material-icons" style={{fontSize:"12px",verticalAlign:"-2px"}}>lock</i> private</span>}
                       <Link className="ghost-btn" to="/settings">Settings</Link>
                       {state?.isAdmin && <span className="tag tag-admin">admin</span>}
                   </div>
                   <p className="display-name">{state?state.name:""}</p>
                   <p className="email">{state?state.email:""}</p>

                   <div className="profile-counts">
                       <h6><b>{mypics.length}</b> posts</h6>
                       <button className="count-btn" onClick={()=>setListModal("followers")}>
                           <b>{state?state.followers.length:0}</b> followers
                       </button>
                       <button className="count-btn" onClick={()=>setListModal("following")}>
                           <b>{state?state.following.length:0}</b> following
                       </button>
                   </div>

                   <div className="file-field input-field" style={{marginTop:"16px"}}>
                       <div className="btn">
                           <span>Update photo</span>
                           <input type="file" accept="image/*" onChange={(e)=>setImage(e.target.files[0])} />
                       </div>
                       <div className="file-path-wrapper">
                           <input className="file-path validate" type="text" />
                       </div>
                   </div>

               </div>
           </div>

           <div className="profile-tabs">
               <button className={tab === "posts" ? "profile-tab active" : "profile-tab"} onClick={()=>setTab("posts")}>
                   <i className="material-icons">grid_on</i> Posts
               </button>
               <button className={tab === "saved" ? "profile-tab active" : "profile-tab"} onClick={()=>setTab("saved")}>
                   <i className="material-icons">bookmark_border</i> Saved
               </button>
           </div>

           {shown.length === 0
               ? <div className="panel empty-state" style={{marginTop:"24px"}}>
                   <i className="material-icons">{tab === "saved" ? "bookmark_border" : "photo_library"}</i>
                   <h5>{tab === "saved" ? "Nothing saved yet" : "No posts yet"}</h5>
                   <p>{tab === "saved" ? "Posts you save will appear here." : "Photos you share will appear here."}</p>
                 </div>
               : <PostGrid posts={shown} onOpen={setOpenPost}/>
           }
       </div>
    )
}

export default Profile
