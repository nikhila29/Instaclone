const express = require('express')
const router = express.Router()
const requireLogin = require('../middleware/requireLogin')
const requireAdmin = require('../middleware/requireAdmin')
const adminController = require('../controllers/adminController')

//just the map of url to handler — the work lives in the controller and service
router.get('/admin/users',requireLogin,requireAdmin,adminController.listUsers)
router.get('/admin/user/:id/posts',requireLogin,requireAdmin,adminController.listUserPosts)
router.delete('/admin/user/:id',requireLogin,requireAdmin,adminController.deleteUser)

module.exports = router
