import React from 'react'

//the three-across square grid used on both profiles and the saved tab
const PostGrid = ({posts,onOpen})=>(
    <div className="gallery">
        {posts.map(post=>(
            <button key={post._id} className="item-btn" onClick={()=>onOpen(post)}>
                <img className="item" src={post.photo} alt={post.title}/>
                <span className="item-overlay">
                    <span><i className="material-icons">favorite</i>{(post.likes || []).length}</span>
                    <span><i className="material-icons">chat_bubble</i>{(post.comments || []).length}</span>
                </span>
            </button>
        ))}
    </div>
)

export default PostGrid
