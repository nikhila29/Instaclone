import React,{useState,useEffect} from 'react'
import PostCard from '../PostCard'
import PostModal from '../PostModal'
import Stories from '../Stories'

const Home = ()=>{
    const [data,setData] = useState([])
    const [openPost,setOpenPost] = useState(null)

    useEffect(()=>{
       fetch('/allpost',{
           headers:{
               "Authorization":"Bearer "+localStorage.getItem("jwt")
           }
       }).then(res=>res.json())
       .then(result=>{
           //an error response has no posts array — keep the empty list instead of crashing the render
           setData(result.posts || [])
       }).catch(err=>{
           console.log(err)
       })
    },[])

    const applyChange = (postId,changes)=>{
        setData(list=>list.map(post=>post._id === postId ? {...post,...changes} : post))
        setOpenPost(open=>open && open._id === postId ? {...open,...changes} : open)
    }

    return (
       <div className="home">
           <Stories />

           {openPost &&
               <PostModal
                   post={openPost}
                   onClose={()=>setOpenPost(null)}
                   onChanged={applyChange}
               />
           }

           {data.length === 0 &&
               <div className="panel empty-state">
                   <i className="material-icons">photo_camera</i>
                   <h5>Nothing here yet</h5>
                   <p>Posts from everyone on Instaclone will show up here.</p>
               </div>
           }

           {data.map(item=>(
               <PostCard
                   key={item._id}
                   post={item}
                   onChanged={applyChange}
                   onDeleted={(postId)=>setData(list=>list.filter(post=>post._id !== postId))}
                   onOpen={setOpenPost}
               />
           ))}
       </div>
    )
}

export default Home
