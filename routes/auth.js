const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

router.post('/signup',authController.signup)
router.post('/signin',authController.signin)
//handles both signup and login: the first Google sign-in creates the account
router.post('/google-login',authController.googleLogin)
router.post('/reset-password',authController.resetPassword)
router.post('/new-password',authController.newPassword)

module.exports = router
