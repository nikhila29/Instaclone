import React,{useState,useEffect} from 'react'

//same image the User schema uses as its default, inlined so it can never 404
export const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23efefef'/><circle cx='50' cy='38' r='18' fill='%23b9b9b9'/><path d='M18 92a32 32 0 0 1 64 0z' fill='%23b9b9b9'/></svg>"

/*
 * Profile pictures come from Google and Cloudinary, and either can fail to load
 * — a deleted asset, an offline host, or a privacy extension blocking the
 * request. Falling back on error means a broken image icon is never shown.
 */
const Avatar = ({src,alt,className,style})=>{
    const [failed,setFailed] = useState(false)

    //a different user may be rendered into the same slot, so retry their picture
    useEffect(()=>{
        setFailed(false)
    },[src])

    return (
        <img
            className={className}
            style={style}
            src={!src || failed ? DEFAULT_AVATAR : src}
            alt={alt || "profile"}
            //Google returns 403 for some avatars when a referer is sent
            referrerPolicy="no-referrer"
            onError={()=>setFailed(true)}
        />
    )
}

export default Avatar
