import React,{useState,useEffect,useContext} from 'react'
import M from 'materialize-css'
import {UserContext} from '../App'
import Avatar from './Avatar'
import {WhatsAppIcon,FacebookIcon,MessengerIcon,EmailIcon,XIcon,LinkIcon} from './icons'

/*
 * Instagram's share sheet: pick people, optionally write a line, send.
 * A shared post lands in the recipient's Messages.
 */
const ShareModal = ({post,onClose})=>{
    const {state} = useContext(UserContext)
    const [people,setPeople] = useState([])
    //how many of the list are people you follow or who follow you
    const [closeCount,setCloseCount] = useState(0)
    const [search,setSearch] = useState("")
    const [picked,setPicked] = useState([])
    const [note,setNote] = useState("")
    const [sending,setSending] = useState(false)
    const [loadError,setLoadError] = useState("")

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    //no search: suggested people (those you follow first). searching: everyone
    useEffect(()=>{
        const query = search.trim()
        const check = (res)=>{
            if(res.status === 404){
                throw new Error("Restart the API server to load people")
            }
            return res.json()
        }
        const request = query
            ? fetch('/search-users',{
                method:"post",
                headers:authHeaders,
                body:JSON.stringify({query})
              }).then(check).then(result=>result.user || [])
            : fetch('/people',{headers:authHeaders})
                .then(check)
                .then(result=>{
                    setCloseCount(result.closeCount || 0)
                    return result.users || []
                })

        request
            .then(list=>{
                setLoadError("")
                setPeople(list.filter(user=>user._id !== state?._id))
            })
            .catch(err=>{
                console.log(err)
                setLoadError(err.message || "Could not load people")
                setPeople([])
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[search])

    useEffect(()=>{
        const onKey = (e)=>{ if(e.key === "Escape"){ onClose() } }
        window.addEventListener("keydown",onKey)
        return ()=>window.removeEventListener("keydown",onKey)
    },[onClose])

    const toggle = (userId)=>{
        setPicked(list=>list.includes(userId) ? list.filter(id=>id !== userId) : [...list,userId])
    }

    const send = ()=>{
        if(picked.length === 0){
            return
        }
        setSending(true)
        fetch('/share',{
            method:"post",
            headers:authHeaders,
            body:JSON.stringify({postId:post._id,userIds:picked,text:note})
        })
        .then(res=>{
            //a 404 returns an HTML page, which would blow up res.json()
            if(res.status === 404){
                throw new Error("Sharing needs the API server restarted")
            }
            return res.json()
        })
        .then(result=>{
            setSending(false)
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            M.toast({
                html:`Sent to ${result.sent} ${result.sent === 1 ? "person" : "people"}`,
                classes:"toast-ok"
            })
            onClose()
        })
        .catch(err=>{
            setSending(false)
            console.log(err)
            //otherwise a failed send looks like nothing happened at all
            M.toast({html:err.message || "Could not share that post",classes:"toast-error"})
        })
    }

    const link = `${window.location.origin}/profile/${post.postedBy._id}`

    const copyLink = ()=>{
        if(navigator.clipboard){
            navigator.clipboard.writeText(link)
                .then(()=>M.toast({html:"Link copied",classes:"toast-ok"}))
                .catch(()=>M.toast({html:link,classes:"toast-ok"}))
            return
        }
        M.toast({html:link,classes:"toast-ok"})
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="share-modal" onClick={(e)=>e.stopPropagation()}>
                <div className="user-modal-head">
                    <span>Share</span>
                    <i className="material-icons" onClick={onClose}>close</i>
                </div>

                <div className="share-search">
                    <input
                        className="search-input search-input-block"
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={(e)=>setSearch(e.target.value)}
                    />
                </div>

                {!search.trim() && closeCount > 0 &&
                    <p className="share-heading">Followers and following</p>
                }
                <div className="share-people">
                    {people.length === 0 &&
                        <p className={loadError ? "small center-text load-error" : "muted small center-text"}
                           style={{gridColumn:"1 / -1"}}>
                            {loadError || (search.trim() ? "No one matches that search." : "No other accounts yet.")}
                        </p>
                    }
                    {people.map(person=>(
                        <button
                            key={person._id}
                            className={picked.includes(person._id) ? "share-person picked" : "share-person"}
                            onClick={()=>toggle(person._id)}
                        >
                            <span className="share-avatar">
                                <Avatar src={person.pic} alt={person.username}/>
                                {picked.includes(person._id) &&
                                    <span className="tick"><i className="material-icons">check</i></span>
                                }
                            </span>
                            <span className="share-name">{person.username || person.name}</span>
                        </button>
                    ))}
                </div>

                {picked.length > 0 &&
                    <div className="share-foot">
                        <input
                            className="search-input search-input-block"
                            type="text"
                            placeholder="Write a message…"
                            value={note}
                            onChange={(e)=>setNote(e.target.value)}
                        />
                        <button className="primary-btn share-send" disabled={sending} onClick={send}>
                            {sending
                                ? "Sending…"
                                : picked.length > 1 ? `Send separately (${picked.length})` : "Send"}
                        </button>
                    </div>
                }

                {/* the row of round options along the bottom */}
                <div className="share-external">
                    <button className="share-ext" onClick={copyLink}>
                        <span className="ext-circle"><LinkIcon/></span>
                        Copy link
                    </button>
                    <a className="share-ext" target="_blank" rel="noreferrer"
                       href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}>
                        <span className="ext-circle brand-fb"><FacebookIcon/></span>
                        Facebook
                    </a>
                    <a className="share-ext" target="_blank" rel="noreferrer"
                       href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(link)}&app_id=0&redirect_uri=${encodeURIComponent(link)}`}>
                        <span className="ext-circle brand-messenger"><MessengerIcon/></span>
                        Messenger
                    </a>
                    <a className="share-ext" target="_blank" rel="noreferrer"
                       href={`https://wa.me/?text=${encodeURIComponent(link)}`}>
                        <span className="ext-circle brand-wa"><WhatsAppIcon/></span>
                        WhatsApp
                    </a>
                    <a className="share-ext" target="_blank" rel="noreferrer"
                       href={`mailto:?subject=${encodeURIComponent(post.title || "A post")}&body=${encodeURIComponent(link)}`}>
                        <span className="ext-circle"><EmailIcon/></span>
                        Email
                    </a>
                    <a className="share-ext" target="_blank" rel="noreferrer"
                       href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`}>
                        <span className="ext-circle"><XIcon/></span>
                        X
                    </a>
                </div>
            </div>
        </div>
    )
}

export default ShareModal
