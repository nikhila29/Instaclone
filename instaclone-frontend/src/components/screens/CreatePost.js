import React,{useState,useEffect} from 'react'
import M from 'materialize-css'
import {useHistory} from 'react-router-dom'
import uploadImage from '../../uploadImage'

const MAX_IMAGES = 10

const CretePost = ()=>{

    const history = useHistory()
    const [title,setTitle] = useState("")
    const [body,setBody] = useState("")
    //one entry per chosen image: the File plus its local preview URL
    const [images,setImages] = useState([])
    const [current,setCurrent] = useState(0)
    const [posting,setPosting] = useState(false)

    const addImages = (fileList)=>{
        const files = Array.from(fileList || [])
        if(files.length === 0){
            return
        }
        setImages(old=>{
            const room = MAX_IMAGES - old.length
            if(room <= 0){
                M.toast({html:`A post can hold at most ${MAX_IMAGES} images`,classes:"toast-error"})
                return old
            }
            if(files.length > room){
                M.toast({html:`Only the first ${room} were added — the limit is ${MAX_IMAGES}`,classes:"toast-error"})
            }
            const added = files.slice(0,room).map(file=>({file,preview:URL.createObjectURL(file)}))
            return [...old,...added]
        })
    }

    const removeImage = (index)=>{
        setImages(old=>{
            const removed = old[index]
            if(removed){
                URL.revokeObjectURL(removed.preview)
            }
            const next = old.filter((_,i)=>i !== index)
            setCurrent(c=>Math.max(0,Math.min(c,next.length-1)))
            return next
        })
    }

    //object URLs must be released or the blobs stay in memory
    useEffect(()=>{
        return ()=>{
            images.forEach(image=>URL.revokeObjectURL(image.preview))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    const postDetails = ()=>{
        if(!title || !body || images.length === 0){
            M.toast({html:"Add at least one photo, a title and a caption",classes:"toast-error"})
            return
        }
        setPosting(true)
        //upload them together, then send the post with every hosted URL in order
        Promise.all(images.map(image=>uploadImage(image.file)))
        .then(urls=>{
            return fetch("/createpost",{
                method:"post",
                headers:{
                    "Content-Type":"application/json",
                    "Authorization":"Bearer "+localStorage.getItem("jwt")
                },
                body:JSON.stringify({
                    title,
                    body,
                    pics:urls
                })
            }).then(res=>res.json())
        })
        .then(data=>{
            setPosting(false)
            if(data.error){
                M.toast({html:data.error,classes:"toast-error"})
                return
            }
            M.toast({html:"Post shared",classes:"toast-ok"})
            history.push('/')
        })
        .catch(err=>{
            console.log(err)
            setPosting(false)
            M.toast({html:err.message || "Could not upload the images",classes:"toast-error"})
        })
    }

    const showing = images[current]

    return(
       <div className="create-card">
           <h5>New post</h5>

           {images.length === 0
               ? <label className="file-drop">
                   <div className="file-drop-empty">
                       <i className="material-icons">add_photo_alternate</i>
                       <span>Click to select photos</span>
                       <span className="muted small">You can pick more than one</span>
                   </div>
                   <input type="file" accept="image/*" multiple onChange={(e)=>addImages(e.target.files)} />
                 </label>
               : <div className="composer-preview">
                   <img src={showing.preview} alt={`Selected ${current+1}`}/>
                   {images.length > 1 &&
                       <>
                           <button
                               className="carousel-nav prev"
                               disabled={current === 0}
                               onClick={()=>setCurrent(c=>c-1)}
                           ><i className="material-icons">chevron_left</i></button>
                           <button
                               className="carousel-nav next"
                               disabled={current === images.length-1}
                               onClick={()=>setCurrent(c=>c+1)}
                           ><i className="material-icons">chevron_right</i></button>
                           <span className="carousel-count">{current+1}/{images.length}</span>
                       </>
                   }
                 </div>
           }

           {images.length > 0 &&
               <div className="thumb-strip">
                   {images.map((image,index)=>(
                       <div
                           key={image.preview}
                           className={index === current ? "thumb active" : "thumb"}
                           onClick={()=>setCurrent(index)}
                       >
                           <img src={image.preview} alt={`Selection ${index+1}`}/>
                           <button className="thumb-remove" title="Remove" onClick={(e)=>{e.stopPropagation();removeImage(index)}}>
                               <i className="material-icons">close</i>
                           </button>
                       </div>
                   ))}
                   {images.length < MAX_IMAGES &&
                       <label className="thumb thumb-add" title="Add more photos">
                           <i className="material-icons">add</i>
                           <input type="file" accept="image/*" multiple onChange={(e)=>{addImages(e.target.files);e.target.value=""}} />
                       </label>
                   }
               </div>
           }

           <input
           type="text"
            placeholder="Title"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            />

           <input
            type="text"
             placeholder="Write a caption…"
             value={body}
            onChange={(e)=>setBody(e.target.value)}
             />

            <button className="btn waves-effect waves-light"
            disabled={posting}
            onClick={()=>postDetails()}
            >
                {posting
                    ? (images.length > 1 ? `Sharing ${images.length} photos…` : "Sharing…")
                    : "Share post"}
            </button>

       </div>
   )
}


export default CretePost
