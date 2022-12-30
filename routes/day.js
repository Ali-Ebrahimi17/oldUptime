const express = require('express')
const router = express.Router()
const day = require('../controllers/day')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(day.index))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(day.renderNewForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(day.createNew))

router.route('/edit/:id').get(isLoggedIn, isDiv, isAdmin, catchAsync(day.renderEditForm)).post(isLoggedIn, isDiv, isAdmin, catchAsync(day.edit))

module.exports = router
