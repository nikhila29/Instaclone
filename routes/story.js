const express = require('express')
const router = express.Router()
const requireLogin = require('../middleware/requireLogin')
const storyController = require('../controllers/storyController')

router.post('/story',requireLogin,storyController.create)
router.get('/stories',requireLogin,storyController.feed)
router.put('/story/:id/seen',requireLogin,storyController.markSeen)
router.delete('/story/:id',requireLogin,storyController.remove)

module.exports = router
