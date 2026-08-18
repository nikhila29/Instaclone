import React,{useState,useEffect,useContext,useCallback,useRef} from 'react'
import {Link} from 'react-router-dom'
import {UserContext} from '../../App'
import M from 'materialize-css'
import Avatar from '../Avatar'
import {ShareIcon} from '../icons'
import {timeAgo} from '../../timeAgo'

/*
 * The inbox: conversations on the left, the open thread on the right.
 * A shared post arrives here as a message with the post attached.
 */
const Messages = ()=>{
    const {state} = useContext(UserContext)
    const [conversations,setConversations] = useState([])
    const [openWith,setOpenWith] = useState(null)
    const [thread,setThread] = useState([])
    const [draft,setDraft] = useState("")
    const [search,setSearch] = useState("")
    const [loading,setLoading] = useState(true)
    const bottom = useRef(null)

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    const loadConversations = useCallback(()=>{
        fetch('/conversations',{headers:authHeaders})
        .then(res=>res.ok ? res.json() : {conversations:[]})
        .then(result=>setConversations(result.conversations || []))
        .catch(err=>console.log(err))
        .finally(()=>setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    useEffect(()=>{ loadConversations() },[loadConversations])

    const openThread = (person)=>{
        setOpenWith(person)
        fetch(`/messages/${person._id}`,{headers:authHeaders})
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                return
            }
            setThread(result.messages || [])
            //reading them clears the unread dot in the list
            loadConversations()
        })
        .catch(err=>console.log(err))
    }

    useEffect(()=>{
        if(bottom.current){
            bottom.current.scrollIntoView({block:"end"})
        }
    },[thread])

    const send = (e)=>{
        e.preventDefault()
        if(!draft.trim() || !openWith){
            return
        }
        fetch(`/messages/${openWith._id}`,{
            method:"post",
            headers:authHeaders,
            body:JSON.stringify({text:draft})
        })
        .then(res=>{
            if(res.status === 404){
                throw new Error("Messaging needs the API server restarted")
            }
            return res.json()
        })
        .then(result=>{
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            setThread(list=>[...list,result.message])
            setDraft("")
            loadConversations()
        })
        .catch(err=>{
            console.log(err)
            M.toast({html:err.message || "Could not send that message",classes:"toast-error"})
        })
    }

    const preview = (message)=>{
        if(message.post){
            return message.text ? message.text : "Shared a post"
        }
        return message.text
    }

    const term = search.trim().toLowerCase()
    const visible = term
        ? conversations.filter(item=>
            (item.user.username || "").toLowerCase().includes(term) ||
            (item.user.name || "").toLowerCase().includes(term))
        : conversations

    return (
        <div className="messages-page">
            <div className="thread-list">
                <div className="thread-list-head">
                    <h5>{state?.username || state?.name}</h5>
                </div>
                <div className="thread-search">
                    <input
                        className="search-input search-input-block"
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={(e)=>setSearch(e.target.value)}
                    />
                </div>
                <div className="thread-scroll">
                    {loading && <p className="muted small center-text">Loading…</p>}
                    {!loading && visible.length === 0 &&
                        <p className="muted small center-text">No conversations yet.</p>
                    }
                    {visible.map(item=>(
                        <button
                            key={item.user._id}
                            className={openWith && openWith._id === item.user._id ? "thread-row active" : "thread-row"}
                            onClick={()=>openThread(item.user)}
                        >
                            <Avatar src={item.user.pic} alt={item.user.username}/>
                            <span className="thread-meta">
                                <span className="thread-name">{item.user.username || item.user.name}</span>
                                <span className="muted small thread-preview">
                                    {preview(item.last)} · {timeAgo(item.last.createdAt,item.last._id)}
                                </span>
                            </span>
                            {item.unread > 0 && <span className="unread-dot"></span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="thread-pane">
                {!openWith
                    ? <div className="thread-empty">
                        <span className="empty-svg"><ShareIcon size={44}/></span>
                        <h5>Your messages</h5>
                        <p className="muted">Share a post or send a message to start a chat.</p>
                      </div>
                    : <>
                      <div className="thread-head">
                          <Avatar src={openWith.pic} alt={openWith.username}/>
                          <Link className="author" to={"/profile/"+openWith._id}>{openWith.username || openWith.name}</Link>
                      </div>
                      <div className="thread-body">
                          {thread.length === 0 && <p className="muted small center-text">No messages yet.</p>}
                          {thread.map(message=>{
                              const mine = message.from && message.from._id === state?._id
                              return (
                                  <div className={mine ? "bubble mine" : "bubble"} key={message._id}>
                                      {message.post &&
                                          <Link to={"/profile/"+openWith._id} className="bubble-post">
                                              <img src={message.post.photo} alt={message.post.title}/>
                                              <span className="muted small">{message.post.title}</span>
                                          </Link>
                                      }
                                      {message.text && <span className="bubble-text">{message.text}</span>}
                                      <span className="bubble-time muted small">{timeAgo(message.createdAt,message._id)}</span>
                                  </div>
                              )
                          })}
                          <div ref={bottom}></div>
                      </div>
                      <form className="thread-composer" onSubmit={send}>
                          <input
                              type="text"
                              placeholder="Message…"
                              value={draft}
                              onChange={(e)=>setDraft(e.target.value)}
                          />
                          <button className="send-btn" type="submit" disabled={!draft.trim()}>Send</button>
                      </form>
                      </>
                }
            </div>
        </div>
    )
}

export default Messages
