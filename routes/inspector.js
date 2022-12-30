const express = require('express')
const router = express.Router()
const inspector = require('../controllers/inspector')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(inspector.index))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(inspector.renderNewForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(inspector.createNew))

router
	.route('/edit/:id')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(inspector.renderEditForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(inspector.edit))

router.route('/edit/inspector/remove/:id').delete(isLoggedIn, isDiv, isAdmin, catchAsync(inspector.delete))

module.exports = router
