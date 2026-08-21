const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const {
    JWT_SECRET,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_FOLDER
} = require('../config/keys')

const User = mongoose.model("User")

const ROOT_FOLDER = CLOUDINARY_FOLDER || "Instaclone"

//folder names come from an email address, so strip anything awkward
const safeSegment = (value)=>String(value).toLowerCase().replace(/[^a-z0-9._@-]/g,"_")

const isConfigured = ()=>!!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)

//same as requireLogin, but a missing or bad token is not an error here:
//signup uploads a profile picture before the account exists
const optionalUser = (authorization)=>new Promise(resolve=>{
    if(!authorization){
        return resolve(null)
    }
    jwt.verify(authorization.replace("Bearer ",""),JWT_SECRET,(err,payload)=>{
        if(err){
            return resolve(null)
        }
        User.findById(payload._id)
            .then(user=>resolve(user || null))
            .catch(()=>resolve(null))
    })
})

/*
 * A one-off signature so the browser can upload straight to Cloudinary. The API
 * secret is only ever used here to compute it — it is never part of the
 * response, so it stays out of the bundle and off the network.
 */
const signUpload = (user)=>{
    //the folder is decided here, so nobody can upload into someone else's
    const folder = user
        ? `${ROOT_FOLDER}/users/${safeSegment(user.email)}`
        : `${ROOT_FOLDER}/signups`

    const timestamp = Math.round(Date.now() / 1000)
    //cloudinary signs the parameters sorted by key, joined with &, then the secret
    const toSign = `folder=${folder}&timestamp=${timestamp}`
    const signature = crypto.createHash('sha1').update(toSign + CLOUDINARY_API_SECRET).digest('hex')

    return {
        cloudName:CLOUDINARY_CLOUD_NAME,
        apiKey:CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder
    }
}

module.exports = {isConfigured,optionalUser,signUpload}
