/*
 * Gives every existing account a username, derived from their name and falling
 * back to their email. Accounts created before usernames existed have none,
 * and the app shows @handles everywhere.
 *
 *   node scripts/backfill-usernames.js          # dry run
 *   node scripts/backfill-usernames.js --apply
 */
require('dotenv').config()
const mongoose = require('mongoose')
const {MONGOURI} = require('../config/keys')
require('../models/user')
const User = mongoose.model("User")
const {uniqueUsername} = require('../lib/usernames')

const apply = process.argv.includes('--apply')

const run = async ()=>{
    await mongoose.connect(MONGOURI)
    console.log("database:",mongoose.connection.name)

    const missing = await User.find({
        $or:[{username:{$exists:false}},{username:null},{username:""}]
    }).select("_id name email")

    console.log(`\n${missing.length} account(s) without a username`)
    if(missing.length === 0){
        await mongoose.disconnect()
        return
    }

    //a dry run writes nothing, so remember what this run already handed out —
    //otherwise two people with the same name both preview the same handle
    const claimed = new Set()
    for(const user of missing){
        let handle = await uniqueUsername(user.name || user.email)
        let suffix = 1
        while(claimed.has(handle)){
            handle = await uniqueUsername(`${user.name || user.email}${suffix}`)
            suffix++
        }
        claimed.add(handle)
        console.log(`  ${user.email} -> @${handle}`)
        if(apply){
            //updateOne skips validation of the other fields on old documents
            await User.updateOne({_id:user._id},{$set:{username:handle}})
        }
    }

    console.log(apply
        ? "\ndone"
        : "\nDry run — nothing was written. Re-run with --apply.")
    await mongoose.disconnect()
}

run().catch(err=>{
    console.error("failed:",err.message)
    process.exit(1)
})
