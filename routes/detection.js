const express = require('express')
const router = express.Router()
const detection = require('../controllers/detections')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(detection.index))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(detection.renderNewForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(detection.createNew))

router
	.route('/edit/:id')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(detection.renderEditForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(detection.edit))

router.route('/edit/detection/remove/:id').delete(isLoggedIn, isDiv, isAdmin, catchAsync(detection.delete))

module.exports = router
