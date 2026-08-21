const authService = require('../services/authService')
const {isValidUsername,normalise} = require('../lib/usernames')

const signup = async (req,res)=>{
    const {name,email,password,pic} = req.body
    const username = normalise(req.body.username)
    if(!email || !password || !name){
        return res.status(422).json({error:"please add all the fields"})
    }
    if(username && !isValidUsername(username)){
        return res.status(422).json({error:"username can use 3-30 letters, numbers, dots or underscores"})
    }
    try{
        if(await authService.findByEmail(email)){
            return res.status(422).json({error:"user already exists with that email"})
        }
        if(username && await authService.findByUsername(username)){
            return res.status(422).json({error:"that username is taken"})
        }
        await authService.createAccount({name,email,password,pic,username})
        res.json({message:"saved successfully"})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not create account"})
    }
}

const signin = async (req,res)=>{
    const {email,password} = req.body
    if(!email || !password){
        return res.status(422).json({error:"please add email or password"})
    }
    try{
        const savedUser = await authService.findByEmail(email)
        if(!savedUser){
            return res.status(422).json({error:"Invalid Email or password"})
        }
        if(!savedUser.password){
            //a Google-only account has no password to compare against
            return res.status(422).json({error:"This account uses Google sign-in"})
        }
        if(!await authService.passwordMatches(password,savedUser.password)){
            return res.status(422).json({error:"Invalid Email or password"})
        }
        res.json(authService.authPayload(savedUser))
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not sign in"})
    }
}

//handles both signup and login: the first Google sign-in creates the account
const googleLogin = async (req,res)=>{
    const {credential} = req.body
    if(!credential){
        return res.status(422).json({error:"missing google credential"})
    }
    if(!authService.googleConfigured()){
        return res.status(500).json({error:"google sign-in is not configured"})
    }
    try{
        const payload = await authService.verifyGoogleToken(credential)
        if(!payload.email_verified){
            return res.status(422).json({error:"your google email is not verified"})
        }
        const user = await authService.signInWithGoogle(payload)
        res.json(authService.authPayload(user))
    }catch(err){
        console.log(err)
        res.status(401).json({error:"google sign-in failed"})
    }
}

const resetPassword = async (req,res)=>{
    const {email} = req.body
    //without an email the query would be built from undefined
    if(!email){
        return res.status(422).json({error:"User dont exists with that email"})
    }
    try{
        const started = await authService.startPasswordReset(email)
        if(!started){
            return res.status(422).json({error:"User dont exists with that email"})
        }
        res.json({message:"check your email"})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not start password reset"})
    }
}

const newPassword = async (req,res)=>{
    const {password,token} = req.body
    if(!password || !token){
        return res.status(422).json({error:"Try again session expired"})
    }
    try{
        const updated = await authService.completePasswordReset(token,password)
        if(!updated){
            return res.status(422).json({error:"Try again session expired"})
        }
        res.json({message:"password updated success"})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not update password"})
    }
}

module.exports = {signup,signin,googleLogin,resetPassword,newPassword}
