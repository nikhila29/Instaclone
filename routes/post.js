const express = require('express')
const router = express.Router()
const requireLogin = require('../middleware/requireLogin')
const postController = require('../controllers/postController')

router.get('/allpost',requireLogin,postController.listFeed)
router.get('/getsubpost',requireLogin,postController.listFollowingFeed)
router.post('/createpost',requireLogin,postController.createPost)
router.get('/mypost',requireLogin,postController.listMyPosts)
//posts this user bookmarked
router.get('/saved',requireLogin,postController.listSaved)
router.put('/save',requireLogin,postController.save)
router.put('/unsave',requireLogin,postController.unsave)
router.put('/like',requireLogin,postController.like)
router.put('/unlike',requireLogin,postController.unlike)
router.put('/comment',requireLogin,postController.comment)
router.delete('/deletepost/:postId',requireLogin,postController.deletePost)

module.exports = router
