const adminService = require('../services/adminService')

/*
 * Turns HTTP into service calls and back. This layer owns request validation
 * and status codes; it holds no queries of its own.
 */
const listUsers = async (req,res)=>{
    try{
        const users = await adminService.listUsersWithStats()
        res.json({users})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load users"})
    }
}

const listUserPosts = async (req,res)=>{
    try{
        const posts = await adminService.listPostsByUser(req.params.id)
        res.json({posts})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not load that user's posts"})
    }
}

const deleteUser = async (req,res)=>{
    const userId = req.params.id
    //an admin deleting themselves would lock the admin screen for good
    if(userId.toString() === req.user._id.toString()){
        return res.status(422).json({error:"you cannot delete your own admin account"})
    }
    try{
        const deleted = await adminService.deleteUserAndTraces(userId)
        if(!deleted){
            return res.status(404).json({error:"User not found"})
        }
        res.json({message:"user deleted",_id:userId})
    }catch(err){
        console.log(err)
        res.status(500).json({error:"could not delete that user"})
    }
}

module.exports = {listUsers,listUserPosts,deleteUser}
