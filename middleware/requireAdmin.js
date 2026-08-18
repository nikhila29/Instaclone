//must run after requireLogin, which is what puts req.user on the request
module.exports = (req,res,next)=>{
    if(!req.user || !req.user.isAdmin){
        return res.status(403).json({error:"admins only"})
    }
    next()
}
