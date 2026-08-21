const express = require('express')
const router = express.Router()
const uploadController = require('../controllers/uploadController')

/*
 * Hands the browser a one-off signature so it can upload straight to Cloudinary.
 * No requireLogin here: signup uploads a profile picture before the account
 * exists, and the controller decides the folder from whoever is signed in.
 */
router.post('/cloudinary-signature',uploadController.signature)

module.exports = router
