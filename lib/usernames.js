const mongoose = require('mongoose')

/*
 * Usernames are the @handle shown around the app. They are lowercase, allow
 * only letters, numbers, dots and underscores, and must be unique.
 */
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/

const normalise = (value)=>String(value || "").trim().toLowerCase()

const isValidUsername = (value)=>USERNAME_PATTERN.test(normalise(value))

//turns a name or email into something usable as a handle
const toSlug = (value)=>{
    const slug = normalise(value)
        .replace(/@.*$/,"")        // drop the domain if an email was passed
        .replace(/[^a-z0-9._]/g,"")
        .replace(/^[._]+/,"")
        .slice(0,30)
    return slug.length >= 3 ? slug : (slug + "user").slice(0,30)
}

//appends a number until the handle is free
const uniqueUsername = async (base)=>{
    const User = mongoose.model("User")
    const root = toSlug(base)
    let candidate = root
    let suffix = 0
    // eslint-disable-next-line no-constant-condition
    while(true){
        const taken = await User.exists({username:candidate})
        if(!taken){
            return candidate
        }
        suffix++
        const tail = String(suffix)
        candidate = root.slice(0,30 - tail.length) + tail
    }
}

module.exports = {USERNAME_PATTERN,isValidUsername,normalise,toSlug,uniqueUsername}
