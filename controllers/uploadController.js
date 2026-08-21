const uploadService = require('../services/uploadService')

const signature = async (req,res)=>{
    if(!uploadService.isConfigured()){
        return res.status(500).json({error:"image uploads are not configured"})
    }
    try{
        //signed in or not: signup uploads a picture before the account exists
        const user = await uploadService.optionalUser(req.headers.authorization)
        res.json(uploadService.signUpload(user))
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not prepare the upload"})
    }
}

module.exports = {signature}
