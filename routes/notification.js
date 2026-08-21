const express = require('express')
const router = express.Router()
const requireLogin = require('../middleware/requireLogin')
const notificationController = require('../controllers/notificationController')

router.get('/notifications',requireLogin,notificationController.list)
router.put('/notifications/read',requireLogin,notificationController.markRead)

module.exports = router
