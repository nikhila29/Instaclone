const express = require('express')
const router = express.Router()
const requireLogin = require('../middleware/requireLogin')
const userController = require('../controllers/userController')

router.get('/user/:id',requireLogin,userController.getProfile)
//the follower/following lists behind the counts on a profile
router.get('/user/:id/followers',requireLogin,userController.getFollowers)
router.get('/user/:id/following',requireLogin,userController.getFollowing)

router.put('/follow',requireLogin,userController.follow)
router.put('/unfollow',requireLogin,userController.unfollow)
router.put('/remove-follower',requireLogin,userController.removeFollower)

//people waiting for me to approve them
router.get('/follow-requests',requireLogin,userController.listFollowRequests)
router.put('/approve-request',requireLogin,userController.approveRequest)
router.put('/deny-request',requireLogin,userController.denyRequest)

router.put('/privacy',requireLogin,userController.setPrivacy)
router.put('/updatepic',requireLogin,userController.updatePicture)
router.get('/people',requireLogin,userController.listPeople)
router.post('/search-users',requireLogin,userController.search)

module.exports = router
