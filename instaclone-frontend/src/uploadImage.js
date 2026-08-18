/*
 * Uploads one image to Cloudinary.
 *
 * The browser never sees the API secret: it asks our own API for a short-lived
 * signature, then posts the file straight to Cloudinary with it. The server
 * also decides the destination folder, so an upload can only land under the
 * signed-in user's own folder.
 *
 * Resolves with the hosted image URL, rejects with a message worth showing.
 */
const uploadImage = (file)=>{
    const jwt = localStorage.getItem("jwt")
    const headers = {"Content-Type":"application/json"}
    if(jwt){
        headers.Authorization = "Bearer " + jwt
    }

    return fetch('/cloudinary-signature',{method:"post",headers})
        .then(res=>res.json())
        .then(signed=>{
            if(signed.error){
                throw new Error(signed.error)
            }
            const data = new FormData()
            data.append("file",file)
            data.append("api_key",signed.apiKey)
            data.append("timestamp",signed.timestamp)
            data.append("signature",signed.signature)
            data.append("folder",signed.folder)

            return fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,{
                method:"post",
                body:data
            }).then(res=>res.json())
        })
        .then(result=>{
            if(!result.secure_url && !result.url){
                throw new Error((result.error && result.error.message) || "Could not upload the image")
            }
            //secure_url keeps the page from mixing http content into https
            return result.secure_url || result.url
        })
}

export default uploadImage
