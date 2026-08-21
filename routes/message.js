const express = require('express')
const router = express.Router()
const requireLogin = require('../middleware/requireLogin')
const messageController = require('../controllers/messageController')

//sharing a post is a message with a post attached, to one or more people
router.post('/share',requireLogin,messageController.share)
router.get('/conversations',requireLogin,messageController.listConversations)
router.get('/messages/:userId',requireLogin,messageController.openThread)
router.post('/messages/:userId',requireLogin,messageController.send)

module.exports = router
