const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = mongoose.model("User")
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {JWT_SECRET} = require('../config/keys')
const requireLogin = require('../middleware/requireLogin')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const {SENDGRID_API,EMAIL,GOOGLE_CLIENT_ID,ADMIN_EMAILS} = require('../config/keys')
const {OAuth2Client} = require('google-auth-library')
const {isValidUsername,normalise,uniqueUsername} = require('../lib/usernames')


const transporter = nodemailer.createTransport(sendgridTransport({
    auth:{
        api_key:SENDGRID_API
    }
}))

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID)

//ADMIN_EMAILS is a comma separated list in .env
const adminEmails = (ADMIN_EMAILS || "")
    .split(",")
    .map(email=>email.trim().toLowerCase())
    .filter(Boolean)

const isAdminEmail = (email)=>adminEmails.includes((email || "").toLowerCase())

//the shape every login route returns, so the frontend can treat them the same
const sendAuthResponse = (res,user)=>{
    const token = jwt.sign({_id:user._id},JWT_SECRET)
    const {_id,name,username,email,followers,following,pic,isAdmin,isPrivate,saved} = user
    res.json({token,user:{_id,name,username,email,followers,following,pic,isAdmin,isPrivate,saved:saved||[]}})
}

router.post('/signup',(req,res)=>{
  const {name,email,password,pic} = req.body
  const username = normalise(req.body.username)
  if(!email || !password || !name){
     return res.status(422).json({error:"please add all the fields"})
  }
  if(username && !isValidUsername(username)){
     return res.status(422).json({error:"username can use 3-30 letters, numbers, dots or underscores"})
  }
  User.findOne({email:email})
  .then((savedUser)=>{
      if(savedUser){
        return res.status(422).json({error:"user already exists with that email"})
      }
      return User.findOne({username})
      .then(takenUsername=>{
        if(username && takenUsername){
            return res.status(422).json({error:"that username is taken"})
        }
        //no username given: build one from the name, then the email
        return uniqueUsername(username || name || email)
        .then(handle=>
      bcrypt.hash(password,12)
      .then(hashedpassword=>{
            const user = new User({
                email,
                username:handle,
                password:hashedpassword,
                name,
                pic,
                isAdmin:isAdminEmail(email)
            })
    
            user.save()
            .then(user=>{
                // transporter.sendMail({
                //     to:user.email,
                //     from:"no-reply@insta.com",
                //     subject:"signup success",
                //     html:"<h1>welcome to instagram</h1>"
                // })
                res.json({message:"saved successfully"})
            })
            .catch(err=>{
                console.log(err)
                res.status(500).json({error:"could not create account"})
            })
      }))
      })

  })
  .catch(err=>{
    console.log(err)
    res.status(500).json({error:"could not create account"})
  })
})


router.post('/signin',(req,res)=>{
    const {email,password} = req.body
    if(!email || !password){
       return res.status(422).json({error:"please add email or password"})
    }
    User.findOne({email:email})
    .then(savedUser=>{
        if(!savedUser){
           return res.status(422).json({error:"Invalid Email or password"})
        }
        if(!savedUser.password){
           //a Google-only account has no password to compare against
           return res.status(422).json({error:"This account uses Google sign-in"})
        }
        bcrypt.compare(password,savedUser.password)
        .then(doMatch=>{
            if(doMatch){
               sendAuthResponse(res,savedUser)
            }
            else{
                return res.status(422).json({error:"Invalid Email or password"})
            }
        })
        .catch(err=>{
            console.log(err)
            res.status(500).json({error:"could not sign in"})
        })
    })
    .catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not sign in"})
    })
})


//handles both signup and login: the first Google sign-in creates the account
router.post('/google-login',(req,res)=>{
    const {credential} = req.body
    if(!credential){
        return res.status(422).json({error:"missing google credential"})
    }
    if(!GOOGLE_CLIENT_ID){
        return res.status(500).json({error:"google sign-in is not configured"})
    }
    googleClient.verifyIdToken({
        idToken:credential,
        //audience makes google-auth-library reject tokens minted for another app
        audience:GOOGLE_CLIENT_ID
    })
    .then(ticket=>{
        const payload = ticket.getPayload()
        if(!payload.email_verified){
            return res.status(422).json({error:"your google email is not verified"})
        }
        const email = payload.email.toLowerCase()
        return User.findOne({email:email})
        .then(async savedUser=>{
            if(savedUser){
                //link the google account to the existing email account on first google login
                let changed = false
                if(!savedUser.username){
                    savedUser.username = await uniqueUsername(savedUser.name || email)
                    changed = true
                }
                if(!savedUser.googleId){
                    savedUser.googleId = payload.sub
                    changed = true
                }
                if(savedUser.isAdmin !== isAdminEmail(email)){
                    savedUser.isAdmin = isAdminEmail(email)
                    changed = true
                }
                if(!changed){
                    return sendAuthResponse(res,savedUser)
                }
                return savedUser.save().then(updated=>sendAuthResponse(res,updated))
            }
            return uniqueUsername(payload.name || email).then(handle=>{
            const user = new User({
                email,
                username:handle,
                name:payload.name || email.split("@")[0],
                googleId:payload.sub,
                isAdmin:isAdminEmail(email)
            })
            //pic is left to the schema default when google sends no picture
            if(payload.picture){
                user.pic = payload.picture
            }
            return user.save().then(created=>sendAuthResponse(res,created))
            })
        })
    })
    .catch(err=>{
        console.log(err)
        res.status(401).json({error:"google sign-in failed"})
    })
})


router.post('/reset-password',(req,res)=>{
     crypto.randomBytes(32,(err,buffer)=>{
         if(err){
             console.log(err)
             //without this return, buffer is undefined and the next line throws
             return res.status(500).json({error:"could not start password reset"})
         }
         const token = buffer.toString("hex")
         User.findOne({email:req.body.email})
         .then(user=>{
             if(!user){
                 return res.status(422).json({error:"User dont exists with that email"})
             }
             user.resetToken = token
             user.expireToken = Date.now() + 3600000
             user.save().then((result)=>{
                 transporter.sendMail({
                     to:user.email,
                     from:"no-replay@insta.com",
                     subject:"password reset",
                     html:`
                     <p>You requested for password reset</p>
                     <h5>click in this <a href="${EMAIL}/reset/${token}">link</a> to reset password</h5>
                     `
                 })
                 res.json({message:"check your email"})
             })

         })
         .catch(err=>{
             console.log(err)
             res.status(500).json({error:"could not start password reset"})
         })
     })
})


router.post('/new-password',(req,res)=>{
    const newPassword = req.body.password
    const sentToken = req.body.token
    User.findOne({resetToken:sentToken,expireToken:{$gt:Date.now()}})
    .then(user=>{
        if(!user){
            return res.status(422).json({error:"Try again session expired"})
        }
        bcrypt.hash(newPassword,12).then(hashedpassword=>{
           user.password = hashedpassword
           user.resetToken = undefined
           user.expireToken = undefined
           user.save().then((saveduser)=>{
               res.json({message:"password updated success"})
           })
        })
    }).catch(err=>{
        console.log(err)
        res.status(500).json({error:"could not update password"})
    })
})


module.exports = router