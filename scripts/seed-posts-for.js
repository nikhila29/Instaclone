/*
 * Adds demo posts to an existing account, straight into MongoDB.
 *
 * The API route needs a password login, which Google-only accounts do not
 * have — this writes the same documents the route would create.
 *
 *   node scripts/seed-posts-for.js someone@example.com
 */
require('dotenv').config()
const mongoose = require('mongoose')
const {MONGOURI} = require('../config/keys')
require('../models/user')
require('../models/post')
const User = mongoose.model("User")
const Post = mongoose.model("Post")

const email = (process.argv[2] || "").toLowerCase()
const img = (seed)=>`https://picsum.photos/seed/${seed}/800/800`

const POSTS = [
    {title:"Site visit", body:"Slab work started this morning.", photos:[img("site1"),img("site2")]},
    {title:"Handover day", body:"Keys handed over. Two years in the making.", photos:[img("keys1")]},
    {title:"Evening drive", body:"Empty roads and a good playlist.", photos:[img("drive1"),img("drive2"),img("drive3")]}
]

const run = async ()=>{
    if(!email){
        console.error("usage: node scripts/seed-posts-for.js <email>")
        process.exit(1)
    }
    await mongoose.connect(MONGOURI)
    const user = await User.findOne({email})
    if(!user){
        console.error(`no account found for ${email}`)
        await mongoose.disconnect()
        process.exit(1)
    }

    const existing = await Post.countDocuments({postedBy:user._id})
    console.log(`${user.name} <${user.email}> currently has ${existing} post(s)`)

    for(const post of POSTS){
        //skip anything already seeded, so re-running does not duplicate
        const already = await Post.findOne({postedBy:user._id,title:post.title})
        if(already){
            console.log(`  skipped  "${post.title}" (already there)`)
            continue
        }
        await Post.create({
            title:post.title,
            body:post.body,
            photo:post.photos[0],
            photos:post.photos,
            postedBy:user._id
        })
        console.log(`  posted   "${post.title}" (${post.photos.length} image${post.photos.length>1?"s":""})`)
    }

    console.log(`total now: ${await Post.countDocuments({postedBy:user._id})}`)
    await mongoose.disconnect()
}

run().catch(err=>{
    console.error("failed:",err.message)
    process.exit(1)
})
