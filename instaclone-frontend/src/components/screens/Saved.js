import React,{useEffect,useState} from 'react'
import PostModal from '../PostModal'
import PostGrid from '../PostGrid'

//everything this user bookmarked, same grid as a profile
const Saved = ()=>{
    const [posts,setPosts] = useState([])
    const [loading,setLoading] = useState(true)
    const [openPost,setOpenPost] = useState(null)

    useEffect(()=>{
        fetch('/saved',{headers:{"Authorization":"Bearer "+localStorage.getItem("jwt")}})
        .then(res=>res.json())
        .then(result=>setPosts(result.posts || []))
        .catch(err=>console.log(err))
        .finally(()=>setLoading(false))
    },[])

    const applyChange = (postId,changes)=>{
        setPosts(list=>list.map(post=>post._id === postId ? {...post,...changes} : post))
        setOpenPost(open=>open && open._id === postId ? {...open,...changes} : open)
    }

    return (
        <div className="page">
            {openPost &&
                <PostModal post={openPost} onClose={()=>setOpenPost(null)} onChanged={applyChange}/>
            }
            <div className="page-head">
                <div>
                    <h4>Saved</h4>
                    <p className="muted">Only you can see what you have saved</p>
                </div>
            </div>
            {loading
                ? <div className="panel empty-state"><p>Loading…</p></div>
                : posts.length === 0
                    ? <div className="panel empty-state">
                        <i className="material-icons">bookmark_border</i>
                        <h5>Nothing saved yet</h5>
                        <p>Tap the bookmark on a post to keep it here.</p>
                      </div>
                    : <PostGrid posts={posts} onOpen={setOpenPost}/>
            }
        </div>
    )
}

export default Saved
