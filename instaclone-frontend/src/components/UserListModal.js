import React,{useEffect,useState,useContext} from 'react'
import {Link} from 'react-router-dom'
import M from 'materialize-css'
import {UserContext} from '../App'
import Avatar from './Avatar'

/*
 * The popup behind the followers / following counts.
 *
 * On your own lists each row carries an action: Unfollow on the people you
 * follow, Remove on the people who follow you. Other people's lists are
 * read-only — you cannot manage someone else's followers.
 */
const UserListModal = ({title,url,onClose,kind,isOwn})=>{
    const {state,dispatch} = useContext(UserContext)
    const [users,setUsers] = useState([])
    const [loading,setLoading] = useState(true)
    const [error,setError] = useState("")
    const [busy,setBusy] = useState(null)

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    useEffect(()=>{
        fetch(url,{headers:authHeaders})
        .then(res=>{
            //a 404 returns an HTML error page, which would blow up res.json()
            if(!res.ok){
                throw new Error(res.status === 404
                    ? "This list needs the API server restarted"
                    : `Could not load the list (${res.status})`)
            }
            return res.json()
        })
        .then(result=>{
            if(result.error){
                throw new Error(result.error)
            }
            setUsers(result.users || [])
        })
        .catch(err=>{
            console.log(err)
            //otherwise a failed request looks exactly like an empty list
            setError(err.message)
        })
        .finally(()=>setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[url])

    useEffect(()=>{
        const onKey = (e)=>{
            if(e.key === "Escape"){
                onClose()
            }
        }
        window.addEventListener("keydown",onKey)
        return ()=>window.removeEventListener("keydown",onKey)
    },[onClose])

    //unfollow someone, or drop them as a follower — both return the updated me
    const act = (user)=>{
        const unfollowing = kind === "following"
        setBusy(user._id)
        fetch(unfollowing ? '/unfollow' : '/remove-follower',{
            method:"put",
            headers:authHeaders,
            body:JSON.stringify(unfollowing ? {unfollowId:user._id} : {userId:user._id})
        })
        .then(res=>{
            if(res.status === 404){
                throw new Error("This needs the API server restarted")
            }
            return res.json()
        })
        .then(updated=>{
            setBusy(null)
            if(updated.error){
                M.toast({html:updated.error,classes:"toast-error"})
                return
            }
            setUsers(list=>list.filter(item=>item._id !== user._id))
            //the counts on the profile come from the stored session
            localStorage.setItem("user",JSON.stringify({
                ...state,
                followers:updated.followers,
                following:updated.following
            }))
            dispatch({type:"UPDATE",payload:{followers:updated.followers,following:updated.following}})
            M.toast({
                html:unfollowing
                    ? `Unfollowed ${user.username || user.name}`
                    : `Removed ${user.username || user.name}`,
                classes:"toast-ok"
            })
        })
        .catch(err=>{
            setBusy(null)
            console.log(err)
            M.toast({html:err.message || "That did not work",classes:"toast-error"})
        })
    }

    return (
        //clicking the backdrop closes, clicking the sheet itself must not
        <div className="modal-backdrop" onClick={onClose}>
            <div className="user-modal" onClick={(e)=>e.stopPropagation()}>
                <div className="user-modal-head">
                    <span>{title}</span>
                    <i className="material-icons" onClick={onClose}>close</i>
                </div>
                <div className="user-modal-body">
                    {loading && <p className="muted small center-text">Loading…</p>}
                    {!loading && error && <p className="small center-text load-error">{error}</p>}
                    {!loading && !error && users.length === 0 && <p className="muted small center-text">Nobody here yet.</p>}
                    {users.map(user=>(
                        <div className="user-row" key={user._id}>
                            <Link
                                className="user-row-main"
                                to={user._id === state?._id ? "/profile" : "/profile/"+user._id}
                                onClick={onClose}
                            >
                                <Avatar src={user.pic} alt={user.username || user.name}/>
                                <div>
                                    <div className="user-row-name">{user.username || user.name}</div>
                                    <div className="muted small">{user.name}</div>
                                </div>
                            </Link>
                            {isOwn && user._id !== state?._id &&
                                <button
                                    className="ghost-btn"
                                    disabled={busy === user._id}
                                    onClick={()=>act(user)}
                                >
                                    {busy === user._id
                                        ? "…"
                                        : kind === "following" ? "Unfollow" : "Remove"}
                                </button>
                            }
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default UserListModal
