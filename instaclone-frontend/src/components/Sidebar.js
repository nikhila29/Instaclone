import React,{useContext,useEffect,useState,useCallback} from 'react'
import {Link,useHistory,useLocation} from 'react-router-dom'
import {UserContext} from '../App'
import Avatar from './Avatar'
import {ShareIcon} from './icons'
import NotificationsPanel from './NotificationsPanel'

/*
 * The app's navigation: a labelled column on wide screens, icons only on
 * medium ones, and a bottom bar on phones — all from CSS, one markup tree.
 */
const Sidebar = ()=>{
    const {state,dispatch} = useContext(UserContext)
    const history = useHistory()
    const location = useLocation()
    const [searchOpen,setSearchOpen] = useState(false)
    const [search,setSearch] = useState('')
    const [results,setResults] = useState([])
    const [unread,setUnread] = useState(0)
    const [unreadMessages,setUnreadMessages] = useState(0)
    const [notifOpen,setNotifOpen] = useState(false)

    const closeSearch = useCallback(()=>{
        setSearchOpen(false)
        setSearch('')
        setResults([])
    },[])

    //the dot on the heart: unread notifications plus any pending follow requests
    const loadUnread = useCallback(()=>{
        if(!state){
            return
        }
        const headers = {"Authorization":"Bearer "+localStorage.getItem("jwt")}
        Promise.all([
            fetch('/notifications',{headers}).then(res=>res.ok ? res.json() : {unread:0}),
            fetch('/conversations',{headers}).then(res=>res.ok ? res.json() : {unread:0})
        ])
        .then(([feed,inbox])=>{
            //unread rows only — a follow request has its own row, so opening
            //the panel clears the count even while the request is still pending
            setUnread(feed.unread || 0)
            setUnreadMessages(inbox.unread || 0)
        })
        .catch(err=>console.log(err))
    },[state])

    useEffect(()=>{ loadUnread() },[loadUnread,location.pathname])

    //poll while the tab is open, so a like elsewhere shows up without a reload
    useEffect(()=>{
        if(!state){
            return
        }
        const timer = setInterval(loadUnread,30000)
        return ()=>clearInterval(timer)
    },[state,loadUnread])

    useEffect(()=>{
        if(!searchOpen){
            return
        }
        const onKey = (e)=>{
            if(e.key === "Escape"){
                closeSearch()
            }
        }
        window.addEventListener("keydown",onKey)
        return ()=>window.removeEventListener("keydown",onKey)
    },[searchOpen,closeSearch])

    const fetchUsers = (query)=>{
        setSearch(query)
        if(!query){
            setResults([])
            return
        }
        fetch('/search-users',{
            method:"post",
            headers:{
                "Content-Type":"application/json",
                "Authorization":"Bearer "+localStorage.getItem("jwt")
            },
            body:JSON.stringify({query})
        }).then(res=>res.json())
        .then(result=>setResults(result.user || []))
        .catch(err=>console.log(err))
    }

    const isActive = (path)=>location.pathname === path

    if(!state){
        return (
            <nav className="sidebar">
                <Link to="/signin" className="brand">Instaclone</Link>
                <ul className="sidebar-links">
                    <li><Link className="sidebar-link" title="Log in" to="/signin"><i className="material-icons">login</i><span className="label">Log in</span></Link></li>
                    <li><Link className="sidebar-link" title="Sign up" to="/signup"><i className="material-icons">person_add</i><span className="label">Sign up</span></Link></li>
                </ul>
            </nav>
        )
    }

    return (
        <>
        <nav className="sidebar">
            <Link to="/" className="brand">Instaclone</Link>
            <ul className="sidebar-links">
                <li>
                    <Link className={isActive("/") ? "sidebar-link active" : "sidebar-link"} title="Home" to="/">
                        <i className="material-icons">home</i><span className="label">Home</span>
                    </Link>
                </li>
                <li>
                    <button className="sidebar-link" title="Search" onClick={()=>setSearchOpen(true)}>
                        <i className="material-icons">search</i><span className="label">Search</span>
                    </button>
                </li>
                <li>
                    <Link className={isActive("/myfollowingpost") ? "sidebar-link active" : "sidebar-link"} title="Following" to="/myfollowingpost">
                        <i className="material-icons">dynamic_feed</i><span className="label">Following</span>
                    </Link>
                </li>
                <li>
                    <Link className={isActive("/messages") ? "sidebar-link active" : "sidebar-link"} title="Messages" to="/messages">
                        <span className="nav-svg"><ShareIcon/></span>
                        <span className="label">Messages</span>
                        {unreadMessages > 0 && <span className="badge">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
                    </Link>
                </li>
                <li>
                    <button className="sidebar-link" title="Notifications" onClick={()=>setNotifOpen(true)}>
                        <i className="material-icons">favorite_border</i>
                        <span className="label">Notifications</span>
                        {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
                    </button>
                </li>
                <li>
                    <Link className={isActive("/create") ? "sidebar-link active" : "sidebar-link"} title="Create" to="/create">
                        <i className="material-icons">add_box</i><span className="label">Create</span>
                    </Link>
                </li>
                {state.isAdmin &&
                    <li>
                        <Link className={isActive("/admin") ? "sidebar-link active" : "sidebar-link"} title="Admin" to="/admin">
                            <i className="material-icons">shield</i><span className="label">Admin</span>
                        </Link>
                    </li>
                }
                <li>
                    <Link className={isActive("/profile") ? "sidebar-link active" : "sidebar-link"} title="Profile" to="/profile">
                        <Avatar src={state.pic} alt={state.name}/><span className="label">Profile</span>
                    </Link>
                </li>
            </ul>
            <div className="sidebar-bottom">
                <Link
                    className={isActive("/settings") ? "sidebar-link active" : "sidebar-link"}
                    title="More"
                    to="/settings"
                >
                    <i className="material-icons">menu</i><span className="label">More</span>
                </Link>
            </div>
        </nav>

        {searchOpen &&
            <div className="modal-backdrop" onClick={closeSearch}>
                <div className="user-modal" onClick={(e)=>e.stopPropagation()}>
                    <div className="user-modal-head">
                        <span>Search</span>
                        <i className="material-icons" onClick={closeSearch}>close</i>
                    </div>
                    <div className="user-modal-body">
                        <input
                            className="search-input search-input-block"
                            type="text"
                            placeholder="Search by username"
                            autoFocus
                            value={search}
                            onChange={(e)=>fetchUsers(e.target.value)}
                        />
                        <div className="search-results">
                            {results.map(user=>(
                                <Link
                                    key={user._id}
                                    className="user-row"
                                    to={user._id !== state._id ? "/profile/"+user._id : '/profile'}
                                    onClick={closeSearch}
                                >
                                    <Avatar src={user.pic} alt={user.username}/>
                                    <div>
                                        <div className="user-row-name">{user.username}</div>
                                        <div className="muted small">{user.name}</div>
                                    </div>
                                    {user.isPrivate && <i className="material-icons muted" style={{fontSize:"16px",marginLeft:"auto"}}>lock</i>}
                                </Link>
                            ))}
                        </div>
                        {search && results.length === 0 && <p className="muted small center-text">No users found.</p>}
                    </div>
                </div>
            </div>
        }

        {notifOpen &&
            <NotificationsPanel
                onClose={()=>setNotifOpen(false)}
                onSeen={loadUnread}
            />
        }
        </>
    )
}

export default Sidebar
