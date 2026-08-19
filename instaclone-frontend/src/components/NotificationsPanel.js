import React,{useEffect,useState,useContext} from 'react'
import {Link} from 'react-router-dom'
import M from 'materialize-css'
import {UserContext} from '../App'
import Avatar from './Avatar'
import {timeAgo,fullDate} from '../timeAgo'

const FILTERS = [
    {key:"all",label:"All"},
    {key:"comment",label:"Comments"},
    {key:"like",label:"Likes"},
    {key:"follow",label:"Follows"}
]

//Instagram groups by age; same idea, three buckets
const bucketOf = (date)=>{
    const days = (Date.now() - new Date(date).getTime()) / 86400000
    if(days < 7){
        return "This week"
    }
    if(days < 31){
        return "This month"
    }
    return "Earlier"
}

const NotificationsPanel = ({onClose,onSeen})=>{
    const {state,dispatch} = useContext(UserContext)
    const [items,setItems] = useState([])
    const [requests,setRequests] = useState([])
    const [filter,setFilter] = useState("all")
    const [loading,setLoading] = useState(true)
    //people handled from this panel: followed, or requested on a private account
    const [handled,setHandled] = useState({})

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    useEffect(()=>{
        Promise.all([
            fetch('/notifications',{headers:authHeaders}).then(res=>res.ok ? res.json() : {notifications:[]}),
            fetch('/follow-requests',{headers:authHeaders}).then(res=>res.ok ? res.json() : {users:[]})
        ])
        .then(([feed,pending])=>{
            setItems(feed.notifications || [])
            setRequests(pending.users || [])
            //opening the panel is what marks them read
            return fetch('/notifications/read',{method:"put",headers:authHeaders})
        })
        .then(()=>onSeen && onSeen())
        .catch(err=>console.log(err))
        .finally(()=>setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    useEffect(()=>{
        const onKey = (e)=>{ if(e.key === "Escape"){ onClose() } }
        window.addEventListener("keydown",onKey)
        return ()=>window.removeEventListener("keydown",onKey)
    },[onClose])

    const answerRequest = (userId,approve)=>{
        fetch(approve ? '/approve-request' : '/deny-request',{
            method:"put",
            headers:authHeaders,
            body:JSON.stringify({userId})
        })
        .then(res=>res.json())
        .then(updated=>{
            if(updated.error){
                return
            }
            setRequests(list=>list.filter(user=>user._id !== userId))
            if(approve && updated.followers){
                localStorage.setItem("user",JSON.stringify({...state,followers:updated.followers}))
                dispatch({type:"UPDATE",payload:{followers:updated.followers,following:state.following}})
                //the request row has become a "started following you" row, which
                //carries Follow back — pull it in without closing the panel
                fetch('/notifications',{headers:authHeaders})
                    .then(res=>res.ok ? res.json() : {notifications:[]})
                    .then(feed=>setItems(feed.notifications || []))
                    .catch(err=>console.log(err))
            }
        })
        .catch(err=>console.log(err))
    }

    const followBack = (userId,username)=>{
        fetch('/follow',{method:"put",headers:authHeaders,body:JSON.stringify({followId:userId})})
        .then(res=>{
            if(res.status === 404){
                throw new Error("Following needs the API server restarted")
            }
            return res.json()
        })
        .then(data=>{
            if(data.error){
                M.toast({html:data.error,classes:"toast-error"})
                return
            }
            //a private account turns a follow into a pending request, and the
            //following list does not change — say so instead of doing nothing
            if(data.requested){
                setHandled(map=>({...map,[userId]:"requested"}))
                M.toast({html:`Follow request sent to ${username}`,classes:"toast-ok"})
                return
            }
            setHandled(map=>({...map,[userId]:"following"}))
            localStorage.setItem("user",JSON.stringify({...state,following:data.following}))
            dispatch({type:"UPDATE",payload:{following:data.following,followers:state.followers}})
            M.toast({html:`You now follow ${username}`,classes:"toast-ok"})
        })
        .catch(err=>{
            console.log(err)
            M.toast({html:err.message || "Could not follow that account",classes:"toast-error"})
        })
    }

    const sentence = (item)=>{
        switch(item.type){
            case "like": return "liked your post."
            case "comment": return `commented: ${item.text}`
            case "follow": return "started following you."
            case "follow_accepted": return "accepted your follow request."
            case "follow_request": return "requested to follow you."
            default: return "did something."
        }
    }

    const pendingIds = new Set(requests.map(user=>user._id))
    const visible = items.filter(item=>{
        //a request that is still pending is shown by the section above, with
        //Confirm and Delete on it — listing it here as well is a duplicate
        if(item.type === "follow_request" && pendingIds.has(item.actor._id)){
            return false
        }
        if(filter === "all"){ return true }
        if(filter === "follow"){ return item.type.startsWith("follow") }
        return item.type === filter
    })

    //follow requests ride along in the All and Follows views
    const showRequests = filter === "all" || filter === "follow"
    const groups = visible.reduce((acc,item)=>{
        const key = bucketOf(item.createdAt)
        acc[key] = acc[key] || []
        acc[key].push(item)
        return acc
    },{})
    const order = ["This week","This month","Earlier"]
    const isFollowing = (userId)=>(state?.following || []).includes(userId)

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="notif-panel" onClick={(e)=>e.stopPropagation()}>
                <div className="notif-head">
                    <h4>Notifications</h4>
                    <i className="material-icons" onClick={onClose} title="Close">close</i>
                </div>

                <div className="notif-chips">
                    {FILTERS.map(item=>(
                        <button
                            key={item.key}
                            className={filter === item.key ? "chip active" : "chip"}
                            onClick={()=>setFilter(item.key)}
                        >{item.label}</button>
                    ))}
                </div>

                <div className="notif-body">
                    {loading && <p className="muted small center-text">Loading…</p>}

                    {!loading && showRequests && requests.length > 0 &&
                        <>
                        <p className="notif-group">Follow requests</p>
                        {requests.map(user=>(
                            <div className="notif-row" key={"req"+user._id}>
                                <Avatar src={user.pic} alt={user.username}/>
                                <p className="notif-text">
                                    <Link className="comment-author" to={"/profile/"+user._id} onClick={onClose}>{user.username}</Link>
                                    {" requested to follow you."}
                                </p>
                                <div className="request-actions">
                                    <button className="primary-btn" onClick={()=>answerRequest(user._id,true)}>Confirm</button>
                                    <button className="ghost-btn" onClick={()=>answerRequest(user._id,false)}>Delete</button>
                                </div>
                            </div>
                        ))}
                        </>
                    }

                    {!loading && visible.length === 0 && requests.length === 0 &&
                        <div className="empty-state">
                            <i className="material-icons">favorite_border</i>
                            <h5>No notifications yet</h5>
                            <p>Likes, comments and follows show up here.</p>
                        </div>
                    }

                    {order.filter(key=>groups[key]).map(key=>(
                        <React.Fragment key={key}>
                            <p className="notif-group">{key}</p>
                            {groups[key].map(item=>(
                                <div className="notif-row" key={item._id}>
                                    <Avatar src={item.actor.pic} alt={item.actor.username}/>
                                    <p className="notif-text">
                                        <Link className="comment-author" to={"/profile/"+item.actor._id} onClick={onClose}>
                                            {item.actor.username || item.actor.name}
                                        </Link>
                                        {" "}{sentence(item)}{" "}
                                        <span className="muted small" title={fullDate(item.createdAt,item._id)}>
                                            {timeAgo(item.createdAt,item._id)}
                                        </span>
                                    </p>
                                    {item.post
                                        ? <Link to="/" onClick={onClose}><img className="notif-thumb" src={item.post.photo} alt="Post"/></Link>
                                        : item.type === "follow"
                                            ? (handled[item.actor._id] === "requested"
                                                ? <button className="ghost-btn" disabled>Requested</button>
                                                : handled[item.actor._id] === "following" || isFollowing(item.actor._id)
                                                    ? <button className="ghost-btn" disabled>Following</button>
                                                    : <button
                                                        className="primary-btn"
                                                        onClick={()=>followBack(item.actor._id,item.actor.username || item.actor.name)}
                                                      >Follow back</button>)
                                            : null
                                    }
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default NotificationsPanel
