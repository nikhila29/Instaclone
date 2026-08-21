const mongoose = require('mongoose')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const {OAuth2Client} = require('google-auth-library')
const {JWT_SECRET,SENDGRID_API,EMAIL,GOOGLE_CLIENT_ID,ADMIN_EMAILS} = require('../config/keys')
const {uniqueUsername} = require('../lib/usernames')

const User = mongoose.model("User")

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
const authPayload = (user)=>{
    const token = jwt.sign({_id:user._id},JWT_SECRET)
    const {_id,name,username,email,followers,following,pic,isAdmin,isPrivate,saved} = user
    return {token,user:{_id,name,username,email,followers,following,pic,isAdmin,isPrivate,saved:saved||[]}}
}

const findByEmail = (email)=>User.findOne({email})
const findByUsername = (username)=>User.findOne({username})

const createAccount = async ({name,email,password,pic,username})=>{
    //no username given: build one from the name, then the email
    const handle = await uniqueUsername(username || name || email)
    const hashedpassword = await bcrypt.hash(password,12)
    return new User({
        email,
        username:handle,
        password:hashedpassword,
        name,
        pic,
        isAdmin:isAdminEmail(email)
    }).save()
}

const passwordMatches = (plain,hashed)=>bcrypt.compare(plain,hashed)

//verifies the google id token and returns its payload
const verifyGoogleToken = async (credential)=>{
    const ticket = await googleClient.verifyIdToken({
        idToken:credential,
        //audience makes google-auth-library reject tokens minted for another app
        audience:GOOGLE_CLIENT_ID
    })
    return ticket.getPayload()
}

/*
 * Signs a google user in, creating the account on the first google sign-in and
 * linking it to an existing email account when there is one.
 */
const signInWithGoogle = async (payload)=>{
    const email = payload.email.toLowerCase()
    const savedUser = await findByEmail(email)
    if(savedUser){
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
        return changed ? savedUser.save() : savedUser
    }
    const handle = await uniqueUsername(payload.name || email)
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
    return user.save()
}

//stamps a reset token on the account and emails the link
const startPasswordReset = async (email)=>{
    const user = await findByEmail(email)
    if(!user){
        return false
    }
    const token = crypto.randomBytes(32).toString("hex")
    user.resetToken = token
    user.expireToken = Date.now() + 3600000
    await user.save()
    transporter.sendMail({
        to:user.email,
        from:"no-replay@insta.com",
        subject:"password reset",
        html:`
                     <p>You requested for password reset</p>
                     <h5>click in this <a href="${EMAIL}/reset/${token}">link</a> to reset password</h5>
                     `
    })
    return true
}

const completePasswordReset = async (sentToken,newPassword)=>{
    const user = await User.findOne({resetToken:sentToken,expireToken:{$gt:Date.now()}})
    if(!user){
        return false
    }
    user.password = await bcrypt.hash(newPassword,12)
    user.resetToken = undefined
    user.expireToken = undefined
    await user.save()
    return true
}

module.exports = {
    authPayload,
    isAdminEmail,
    findByEmail,
    findByUsername,
    createAccount,
    passwordMatches,
    verifyGoogleToken,
    signInWithGoogle,
    startPasswordReset,
    completePasswordReset,
    googleConfigured:()=>!!GOOGLE_CLIENT_ID
}
