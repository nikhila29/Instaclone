/*
 * Has the demo accounts like and comment on someone's posts, so an account
 * seeded outside the demo set does not sit at zero engagement.
 *
 *   node scripts/seed-engagement-for.js someone@example.com
 *
 * Re-run safe: likes use $addToSet server side, and a demo account only
 * comments on a post it has not already commented on.
 */
const API = process.env.API_BASE || "http://localhost:3003"
const PASSWORD = "demo1234"
const DEMO_ACCOUNTS = ["aditi@demo.com","rohit@demo.com","meera@demo.com","nikhila@demo.com","karan@demo.com"]

const COMMENTS = [
    "Looks great 👏","Congratulations!","This turned out really well",
    "Love the progress here","Beautiful work","Can't wait to see the finished one"
]

const target = (process.argv[2] || "").toLowerCase()

const call = async (path,{method="GET",token,body}={})=>{
    const res = await fetch(API+path,{
        method,
        headers:{
            "Content-Type":"application/json",
            ...(token ? {Authorization:"Bearer "+token} : {})
        },
        body: body ? JSON.stringify(body) : undefined
    })
    const text = await res.text()
    let data
    try{
        data = JSON.parse(text)
    }catch(err){
        throw new Error(`${method} ${path} -> ${res.status} (is the API running on ${API}?)`)
    }
    if(data.error){
        throw new Error(`${method} ${path} -> ${data.error}`)
    }
    return data
}

const run = async ()=>{
    if(!target){
        console.error("usage: node scripts/seed-engagement-for.js <email>")
        process.exit(1)
    }

    const sessions = []
    for(const email of DEMO_ACCOUNTS){
        try{
            const session = await call('/signin',{method:"POST",body:{email,password:PASSWORD}})
            sessions.push({email,token:session.token,id:session.user._id,name:session.user.name})
        }catch(err){
            console.log(`skipping ${email}: ${err.message}`)
        }
    }
    if(sessions.length === 0){
        throw new Error("no demo accounts available — run scripts/seed-demo.js first")
    }

    //find the target through search, using any demo session
    const found = await call('/search-users',{method:"POST",token:sessions[0].token,body:{query:target}})
    const person = (found.user || []).find(user=>user.email && user.email.toLowerCase() === target)
    if(!person){
        throw new Error(`no account found for ${target}`)
    }

    const feed = await call('/allpost',{token:sessions[0].token})
    const posts = feed.posts.filter(post=>post.postedBy && post.postedBy._id === person._id)
    if(posts.length === 0){
        throw new Error(`${person.name} has no posts yet`)
    }
    console.log(`${person.name}: ${posts.length} post(s)\n`)

    let commentIndex = 0
    for(const post of posts){
        let likes = 0
        let comments = 0
        for(const session of sessions){
            await call('/like',{method:"PUT",token:session.token,body:{postId:post._id}})
            likes++
            const alreadyCommented = post.comments.some(c=>c.postedBy && c.postedBy._id === session.id)
            //keep it to roughly half of them, so it reads naturally
            if(!alreadyCommented && commentIndex % 2 === 0){
                await call('/comment',{method:"PUT",token:session.token,body:{
                    postId:post._id, text:COMMENTS[commentIndex % COMMENTS.length]
                }})
                comments++
            }
            commentIndex++
        }
        console.log(`  "${post.title}" -> ${likes} like(s), ${comments} new comment(s)`)
    }
}

run().catch(err=>{
    console.error("\nfailed:",err.message)
    process.exit(1)
})
