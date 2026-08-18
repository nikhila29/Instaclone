import React,{useState,useEffect,useContext,useCallback} from 'react'
import M from 'materialize-css'
import {UserContext} from '../App'
import Avatar from './Avatar'
import uploadImage from '../uploadImage'
import {timeAgo} from '../timeAgo'

const STORY_MS = 5000

/*
 * The ring of circles above the feed, plus the full screen viewer.
 * Stories are deleted by MongoDB 24 hours after they are posted.
 */
const Stories = ()=>{
    const {state} = useContext(UserContext)
    const [groups,setGroups] = useState([])
    const [openIndex,setOpenIndex] = useState(null)
    const [slide,setSlide] = useState(0)
    const [uploading,setUploading] = useState(false)

    const authHeaders = {
        "Content-Type":"application/json",
        "Authorization":"Bearer "+localStorage.getItem("jwt")
    }

    const load = useCallback(()=>{
        fetch('/stories',{headers:{"Authorization":"Bearer "+localStorage.getItem("jwt")}})
        .then(res=>res.ok ? res.json() : {groups:[]})
        .then(result=>setGroups(result.groups || []))
        .catch(err=>console.log(err))
    },[])

    useEffect(()=>{ load() },[load])

    const current = openIndex === null ? null : groups[openIndex]
    const story = current ? current.stories[slide] : null

    const close = useCallback(()=>{
        setOpenIndex(null)
        setSlide(0)
        //rings turn grey once seen, so refresh after viewing
        load()
    },[load])

    const next = useCallback(()=>{
        if(!current){
            return
        }
        if(slide + 1 < current.stories.length){
            setSlide(slide + 1)
            return
        }
        if(openIndex + 1 < groups.length){
            setOpenIndex(openIndex + 1)
            setSlide(0)
            return
        }
        close()
    },[current,slide,openIndex,groups.length,close])

    const previous = ()=>{
        if(slide > 0){
            setSlide(slide - 1)
            return
        }
        if(openIndex > 0){
            const before = groups[openIndex - 1]
            setOpenIndex(openIndex - 1)
            setSlide(Math.max(0,before.stories.length - 1))
        }
    }

    //advance on a timer, and mark each one seen as it shows
    useEffect(()=>{
        if(!story){
            return
        }
        fetch(`/story/${story._id}/seen`,{method:"put",headers:authHeaders}).catch(err=>console.log(err))
        const timer = setTimeout(next,STORY_MS)
        return ()=>clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[story && story._id])

    useEffect(()=>{
        if(openIndex === null){
            return
        }
        const onKey = (e)=>{
            if(e.key === "Escape"){ close() }
            if(e.key === "ArrowRight"){ next() }
            if(e.key === "ArrowLeft"){ previous() }
        }
        window.addEventListener("keydown",onKey)
        return ()=>window.removeEventListener("keydown",onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[openIndex,slide,groups.length])

    const addStory = (file)=>{
        if(!file){
            return
        }
        setUploading(true)
        uploadImage(file)
        .then(hostedUrl=>fetch('/story',{
            method:"post",
            headers:authHeaders,
            body:JSON.stringify({photo:hostedUrl})
        }).then(res=>res.json()))
        .then(result=>{
            setUploading(false)
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            M.toast({html:"Story added — it disappears in 24 hours",classes:"toast-ok"})
            load()
        })
        .catch(err=>{
            setUploading(false)
            console.log(err)
            M.toast({html:err.message || "Could not add your story",classes:"toast-error"})
        })
    }

    const mine = groups.find(group=>group.user._id === state?._id)

    const deleteStory = ()=>{
        if(!story){
            return
        }
        fetch(`/story/${story._id}`,{method:"delete",headers:authHeaders})
        .then(res=>res.json())
        .then(result=>{
            if(result.error){
                M.toast({html:result.error,classes:"toast-error"})
                return
            }
            M.toast({html:"Story deleted",classes:"toast-ok"})
            close()
        })
        .catch(err=>console.log(err))
    }

    return (
        <>
        <div className="stories-row">
            {/* your own bubble doubles as the add button */}
            <label className="story-bubble story-add" title="Add to your story">
                <div className={mine ? "story-ring" : "story-ring seen"}>
                    <Avatar src={state?.pic} alt={state?.username}/>
                </div>
                <span className="plus"><i className="material-icons">add</i></span>
                <span className="story-name">{uploading ? "Adding…" : "Your story"}</span>
                <input type="file" accept="image/*" onChange={(e)=>{addStory(e.target.files[0]);e.target.value=""}}/>
            </label>

            {groups.filter(group=>group.user._id !== state?._id).map((group,index)=>(
                <button
                    className="story-bubble"
                    key={group.user._id}
                    onClick={()=>{
                        setOpenIndex(groups.indexOf(group))
                        setSlide(0)
                    }}
                >
                    <div className={group.seen ? "story-ring seen" : "story-ring"}>
                        <Avatar src={group.user.pic} alt={group.user.username}/>
                    </div>
                    <span className="story-name">{group.user.username || group.user.name}</span>
                </button>
            ))}

            {mine && mine.stories.length > 0 &&
                <button className="story-bubble" onClick={()=>{setOpenIndex(groups.indexOf(mine));setSlide(0)}}>
                    <div className={mine.seen ? "story-ring seen" : "story-ring"}>
                        <Avatar src={mine.user.pic} alt={mine.user.username}/>
                    </div>
                    <span className="story-name">View yours</span>
                </button>
            }
        </div>

        {story &&
            <div className="story-viewer">
                <div className="story-stage">
                    <div className="story-bars">
                        {current.stories.map((item,index)=>(
                            <div
                                key={item._id}
                                className={index < slide ? "story-bar done" : index === slide ? "story-bar current" : "story-bar"}
                            ><span></span></div>
                        ))}
                    </div>
                    <div className="story-top">
                        <Avatar src={current.user.pic} alt={current.user.username}/>
                        <span className="story-author">{current.user.username || current.user.name}</span>
                        <span className="muted small" style={{color:"#ddd"}}>{timeAgo(story.createdAt,story._id)}</span>
                        <span className="spacer"></span>
                        {current.user._id === state?._id &&
                            <i className="material-icons" title="Delete story" onClick={deleteStory}>delete_outline</i>
                        }
                        <i className="material-icons" title="Close" onClick={close}>close</i>
                    </div>

                    <div className="story-tap left" onClick={previous}></div>
                    <div className="story-tap right" onClick={next}></div>
                    <img src={story.photo} alt="Story"/>
                    {story.caption && <p className="story-caption">{story.caption}</p>}
                </div>
            </div>
        }
        </>
    )
}

export default Stories
