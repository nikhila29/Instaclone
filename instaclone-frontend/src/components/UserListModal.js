import React,{useEffect,useState,useContext} from 'react'
import {Link} from 'react-router-dom'
import {UserContext} from '../App'
import Avatar from './Avatar'

//the popup behind the followers / following counts on a profile
const UserListModal = ({title,url,onClose})=>{
    const {state} = useContext(UserContext)
    const [users,setUsers] = useState([])
    const [loading,setLoading] = useState(true)
    const [error,setError] = useState("")

    useEffect(()=>{
        fetch(url,{
            headers:{
                "Authorization":"Bearer "+localStorage.getItem("jwt")
            }
        })
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
                        <Link
                            key={user._id}
                            className="user-row"
                            to={user._id === state?._id ? "/profile" : "/profile/"+user._id}
                            onClick={onClose}
                        >
                            <Avatar src={user.pic} alt={user.username || user.name}/>
                            <div>
                                <div className="user-row-name">{user.username || user.name}</div>
                                <div className="muted small">{user.name}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default UserListModal
