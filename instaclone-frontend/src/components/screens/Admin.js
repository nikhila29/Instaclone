import React,{useEffect,useState,useContext} from 'react'
import {UserContext} from '../../App'
import {Link,useHistory} from 'react-router-dom'
import M from 'materialize-css'
import Avatar from '../Avatar'

const formatDate = (value)=>{
    if(!value){
        return "—"
    }
    return new Date(value).toLocaleDateString(undefined,{
        year:"numeric",
        month:"short",
        day:"numeric"
    })
}

const Admin = ()=>{
    const {state} = useContext(UserContext)
    const history = useHistory()
    const [users,setUsers] = useState([])
    const [loading,setLoading] = useState(true)
    const [openUser,setOpenUser] = useState(null)
    const [openPosts,setOpenPosts] = useState([])
    const [search,setSearch] = useState("")
    const [loadError,setLoadError] = useState("")

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    useEffect(()=>{
        fetch('/admin/users',{headers:authHeaders})
        .then(res=>{
            //a 404 returns an HTML page, which would blow up res.json()
            if(res.status === 404){
                throw new Error("The admin API is not running — restart the API server")
            }
            return res.json().then(result=>({result,status:res.status}))
        })
        .then(({result,status})=>{
            if(result.error){
                if(status === 403 || status === 401){
                    //a non-admin has no business on this screen
                    M.toast({html:result.error,classes:"toast-error"})
                    history.push('/')
                    return
                }
                throw new Error(result.error)
            }
            setUsers(result.users || [])
        })
        .catch(err=>{
            console.log(err)
            //otherwise a failed load looks like an app with no users in it
            setLoadError(err.message)
        })
        .finally(()=>setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    const togglePosts = (user)=>{
        if(openUser && openUser._id === user._id){
            setOpenUser(null)
            setOpenPosts([])
            return
        }
        setOpenUser(user)
        setOpenPosts([])
        fetch(`/admin/user/${user._id}/posts`,{headers:authHeaders})
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            setOpenPosts(result.posts || [])
        })
        .catch(err=>{
            console.log(err)
        })
    }

    const deletePost = (postId)=>{
        fetch(`/deletepost/${postId}`,{
            method:"delete",
            headers:authHeaders
        })
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            setOpenPosts(posts=>posts.filter(post=>post._id !== result._id))
            setUsers(list=>list.map(user=>user._id === openUser._id
                ? {...user,posts:Math.max(0,user.posts-1)}
                : user))
            M.toast({html:"post deleted",classes:"toast-ok"})
        })
        .catch(err=>{
            console.log(err)
        })
    }

    const deleteUser = (user)=>{
        //deleting an account also removes their posts, likes and comments
        if(!window.confirm(`Delete ${user.name} (${user.email})? This also removes their posts, likes and comments.`)){
            return
        }
        fetch(`/admin/user/${user._id}`,{
            method:"delete",
            headers:authHeaders
        })
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            setUsers(list=>list.filter(item=>item._id !== result._id))
            if(openUser && openUser._id === result._id){
                setOpenUser(null)
                setOpenPosts([])
            }
            M.toast({html:"user deleted",classes:"toast-ok"})
        })
        .catch(err=>{
            console.log(err)
        })
    }

    if(!state?.isAdmin){
        return (
            <div className="page">
                <div className="panel empty-state">
                    <i className="material-icons">lock</i>
                    <h5>Admins only</h5>
                    <p>Sign in with an account listed in ADMIN_EMAILS to see this page.</p>
                </div>
            </div>
        )
    }

    const term = search.trim().toLowerCase()
    const visible = term
        ? users.filter(user=>user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
        : users

    const totals = users.reduce((acc,user)=>({
        users:acc.users+1,
        posts:acc.posts+user.posts,
        likes:acc.likes+user.likesReceived,
        comments:acc.comments+user.commentsReceived
    }),{users:0,posts:0,likes:0,comments:0})

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h4>Admin</h4>
                    <p className="muted">Every account on Instaclone</p>
                </div>
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search name or email"
                    value={search}
                    onChange={(e)=>setSearch(e.target.value)}
                />
            </div>

            <div className="stat-row">
                <div className="stat"><span>{totals.users}</span>users</div>
                <div className="stat"><span>{totals.posts}</span>posts</div>
                <div className="stat"><span>{totals.likes}</span>likes</div>
                <div className="stat"><span>{totals.comments}</span>comments</div>
            </div>

            {loadError &&
                <div className="panel empty-state">
                    <i className="material-icons">error_outline</i>
                    <h5>Could not load users</h5>
                    <p>{loadError}</p>
                </div>
            }

            {loading
                ? <div className="panel empty-state"><p>Loading…</p></div>
                : loadError ? null
                : <div className="panel table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Joined</th>
                                <th>Sign-in</th>
                                <th className="num">Posts</th>
                                <th className="num">Followers</th>
                                <th className="num">Following</th>
                                <th className="num">Likes</th>
                                <th className="num">Comments</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(user=>(
                                <React.Fragment key={user._id}>
                                    <tr>
                                        <td>
                                            <div className="cell-user">
                                                <Avatar src={user.pic} alt={user.name}/>
                                                <div>
                                                    <Link to={user._id === state?._id ? "/profile" : "/profile/"+user._id}>{user.username || user.name}</Link>
                                                    {user.isPrivate && <span className="tag">private</span>}
                                                    {user.isAdmin && <span className="tag tag-admin">admin</span>}
                                                    <div className="muted small">{user.name} · {user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="muted small">{formatDate(user.joinedAt)}</td>
                                        <td>
                                            {user.usesGoogle && <span className="tag">Google</span>}
                                            {user.hasPassword && <span className="tag">Password</span>}
                                        </td>
                                        <td className="num">{user.posts}</td>
                                        <td className="num">{user.followers}</td>
                                        <td className="num">{user.following}</td>
                                        <td className="num">{user.likesReceived}</td>
                                        <td className="num">{user.commentsReceived}</td>
                                        <td className="row-actions">
                                            <button className="ghost-btn" onClick={()=>togglePosts(user)}>
                                                {openUser && openUser._id === user._id ? "Hide" : "Posts"}
                                            </button>
                                            <button
                                                className="ghost-btn danger"
                                                disabled={user._id === state?._id}
                                                title={user._id === state?._id ? "You cannot delete your own account" : "Delete this user"}
                                                onClick={()=>deleteUser(user)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                    {openUser && openUser._id === user._id &&
                                        <tr className="drawer-row">
                                            <td colSpan="9">
                                                {openPosts.length === 0
                                                    ? <p className="muted small">No posts from this user.</p>
                                                    : <div className="drawer-posts">
                                                        {openPosts.map(post=>(
                                                            <div className="drawer-post" key={post._id}>
                                                                <img src={post.photo} alt={post.title}/>
                                                                <div className="drawer-post-body">
                                                                    <strong>{post.title}</strong>
                                                                    <p className="muted small">{post.body}</p>
                                                                    <p className="muted small">
                                                                        {post.likes.length} likes · {post.comments.length} comments · {formatDate(post.createdAt)}
                                                                    </p>
                                                                </div>
                                                                <button className="ghost-btn danger" onClick={()=>deletePost(post._id)}>Delete</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                }
                                            </td>
                                        </tr>
                                    }
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    {visible.length === 0 && <p className="muted small" style={{padding:"16px"}}>No users match that search.</p>}
                </div>
            }
        </div>
    )
}

export default Admin
