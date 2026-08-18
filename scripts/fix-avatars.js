/*
 * Repairs profile pictures that point at the old default avatar.
 *
 * Accounts created before the schema default changed still carry a Cloudinary
 * URL that 404s (and older ones carry two URLs concatenated into one string).
 * This replaces only those exact values with the current schema default, so
 * pictures people actually uploaded are left untouched.
 *
 *   node scripts/fix-avatars.js          # dry run, changes nothing
 *   node scripts/fix-avatars.js --apply  # writes the changes
 */
require('dotenv').config()
const mongoose = require('mongoose')
const {MONGOURI} = require('../config/keys')
require('../models/user')
const User = mongoose.model("User")

const apply = process.argv.includes('--apply')
const BROKEN_PREFIX = "https://res.cloudinary.com/bnp/image/upload/v1586197723/noimage_d4ipmd.png"
const goodDefault = User.schema.path('pic').defaultValue

const run = async ()=>{
    await mongoose.connect(MONGOURI)
    console.log("database:",mongoose.connection.name)

    //an empty pic renders as a broken image too
    const query = {
        $or:[
            {pic:{$exists:false}},
            {pic:null},
            {pic:""},
            {pic:{$regex:"^"+BROKEN_PREFIX.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}}
        ]
    }

    const affected = await User.find(query).select("_id name email pic").lean()
    const total = await User.countDocuments()

    console.log(`\n${affected.length} of ${total} accounts have a broken avatar:`)
    affected.forEach(user=>{
        console.log(`  ${user.name} <${user.email}>`)
        console.log(`    now: ${user.pic ? user.pic.slice(0,90) : "(empty)"}`)
    })

    if(affected.length === 0){
        console.log("\nNothing to do.")
        await mongoose.disconnect()
        return
    }

    if(!apply){
        console.log(`\nDry run — nothing was written. Re-run with --apply to fix these ${affected.length}.`)
        await mongoose.disconnect()
        return
    }

    const result = await User.updateMany(query,{$set:{pic:goodDefault}})
    console.log(`\nUpdated ${result.modifiedCount} account(s) to the built-in default avatar.`)
    const left = await User.countDocuments(query)
    console.log(`Remaining broken: ${left}`)
    await mongoose.disconnect()
}

run().catch(err=>{
    console.error("failed:",err.message)
    process.exit(1)
})
