/*
 * Creates a handful of demo accounts with posts, follows, likes and comments,
 * so the app has something to look at.
 *
 * Everything goes through the running HTTP API, so it passes the same
 * validation a real browser would.
 *
 *   node scripts/seed-demo.js                 # against http://localhost:3003
 *   API_BASE=http://localhost:4000 node scripts/seed-demo.js
 *
 * Re-running it is safe: accounts that already exist are reused, not doubled.
 * Post images come from picsum.photos, so no Cloudinary quota is spent.
 */
const API = process.env.API_BASE || "http://localhost:3003"
const PASSWORD = "demo1234"

const img = (seed)=>`https://picsum.photos/seed/${seed}/800/800`
const avatar = (seed)=>`https://i.pravatar.cc/300?img=${seed}`

const PEOPLE = [
    {
        name:"Aditi Sharma", email:"aditi@demo.com", pic:avatar(5),
        posts:[
            {title:"Morning ride", body:"Beat the traffic for once.", pics:[img("ride1")]},
            {title:"Weekend in the hills", body:"Three days, no signal, no regrets.", pics:[img("hills1"),img("hills2"),img("hills3")]}
        ]
    },
    {
        name:"Rohit Verma", email:"rohit@demo.com", pic:avatar(12),
        posts:[
            {title:"Filter coffee", body:"The only correct way to start a day.", pics:[img("coffee1")]},
            {title:"Desk setup, finally done", body:"Cable management took longer than the build.", pics:[img("desk1"),img("desk2")]}
        ]
    },
    {
        name:"Meera Nair", email:"meera@demo.com", pic:avatar(45),
        posts:[
            {title:"Street food run", body:"Ate first, photographed later. Sorry.", pics:[img("food1"),img("food2")]},
            {title:"Old town walls", body:"Every corner here is older than my whole city.", pics:[img("town1")]},
            {title:"Studio day", body:"Six hours for one usable frame.", pics:[img("studio1")]}
        ]
    },
    {
        name:"Nikhila Patel", email:"nikhila@demo.com", pic:avatar(31),
        posts:[
            {title:"Balcony garden", body:"Everything survived the summer. Small wins.", pics:[img("garden1"),img("garden2")]},
            {title:"Sunday bake", body:"First loaf that actually rose properly.", pics:[img("bake1")]},
            {title:"Long way home", body:"Took the coast road instead. Worth the extra hour.", pics:[img("coast1"),img("coast2"),img("coast3")]}
        ]
    },
    {
        name:"Karan Patel", email:"karan@demo.com", pic:avatar(60),
        posts:[
            {title:"Match day", body:"We lost. Still worth it.", pics:[img("match1"),img("match2")]},
            {title:"New lens", body:"Testing on the least patient model available.", pics:[img("dog1")]}
        ]
    }
]

const COMMENTS = [
    "This is lovely 👏","Where is this?","Great shot!","Adding this to my list",
    "The colours here are unreal","Okay this is my favourite one"
]

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
        throw new Error(`${method} ${path} -> ${res.status} (not JSON — is the API running on ${API}?)`)
    }
    if(data.error){
        throw new Error(`${method} ${path} -> ${data.error}`)
    }
    return data
}

const run = async ()=>{
    console.log("seeding against",API,"\n")
    const people = []

    for(const person of PEOPLE){
        //signup returns an error if the account already exists, which is fine
        try{
            await call('/signup',{method:"POST",body:{
                name:person.name, email:person.email, password:PASSWORD, pic:person.pic
            }})
            console.log("created  ",person.email)
        }catch(err){
            if(!/already exists/i.test(err.message)){
                throw err
            }
            console.log("existing ",person.email)
        }
        const session = await call('/signin',{method:"POST",body:{email:person.email,password:PASSWORD}})
        people.push({...person, token:session.token, id:session.user._id})
    }

    console.log("")
    for(const person of people){
        const mine = await call('/mypost',{token:person.token})
        if(mine.mypost.length > 0){
            console.log(`${person.name}: already has ${mine.mypost.length} post(s), skipping`)
            person.postIds = mine.mypost.map(post=>post._id)
            person.newPostIds = []
            continue
        }
        person.postIds = []
        person.newPostIds = []
        for(const post of person.posts){
            const created = await call('/createpost',{method:"POST",token:person.token,body:post})
            person.postIds.push(created.post._id)
            person.newPostIds.push(created.post._id)
            console.log(`${person.name}: posted "${post.title}" (${post.pics.length} image${post.pics.length>1?"s":""})`)
        }
    }

    console.log("")
    //everyone follows everyone else, so the feeds are not empty
    for(const person of people){
        for(const other of people){
            if(other.id === person.id){
                continue
            }
            await call('/follow',{method:"PUT",token:person.token,body:{followId:other.id}})
        }
    }
    console.log("follows: every demo account follows the other three")

    //spread likes and comments across other people's posts
    let commentIndex = 0
    for(const person of people){
        for(const other of people){
            if(other.id === person.id){
                continue
            }
            //likes use addToSet server side, so re-liking is a no-op
            for(const postId of other.postIds.slice(0,2)){
                await call('/like',{method:"PUT",token:person.token,body:{postId}})
            }
            //comments append, so only comment on posts created in this run
            for(const postId of other.newPostIds.slice(0,2)){
                if(commentIndex % 2 === 0){
                    await call('/comment',{method:"PUT",token:person.token,body:{
                        postId, text:COMMENTS[commentIndex % COMMENTS.length]
                    }})
                }
                commentIndex++
            }
        }
    }
    console.log("likes and comments added\n")

    console.log("Sign in with any of these:")
    people.forEach(person=>console.log(`  ${person.email.padEnd(18)} ${PASSWORD}`))
}

run().catch(err=>{
    console.error("\nseeding failed:",err.message)
    process.exit(1)
})
