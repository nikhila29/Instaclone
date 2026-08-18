import React,{useState} from 'react'

/*
 * Shows a post's images. Posts made before multi-image support only have
 * `photo`, so fall back to that and render it as a single slide.
 */
const PostImages = ({post})=>{
    const [index,setIndex] = useState(0)
    const images = (post.photos && post.photos.length ? post.photos : [post.photo]).filter(Boolean)
    const many = images.length > 1

    return (
        <>
            <div className="card-image">
                <img src={images[index]} alt={post.title}/>
                {many &&
                    <>
                        <button
                            className="carousel-nav prev"
                            disabled={index === 0}
                            onClick={()=>setIndex(i=>i-1)}
                        ><i className="material-icons">chevron_left</i></button>
                        <button
                            className="carousel-nav next"
                            disabled={index === images.length-1}
                            onClick={()=>setIndex(i=>i+1)}
                        ><i className="material-icons">chevron_right</i></button>
                        <span className="carousel-count">{index+1}/{images.length}</span>
                    </>
                }
            </div>
            {many &&
                <div className="card-dots">
                    {images.map((image,i)=>(
                        <span key={image+i} className={i === index ? "on" : ""}></span>
                    ))}
                </div>
            }
        </>
    )
}

export default PostImages
