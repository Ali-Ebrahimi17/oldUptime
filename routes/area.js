const express = require('express')
const router = express.Router()
const area = require('../controllers/area')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(area.index))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(area.renderNewForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(area.createNew))

router.route('/newemail/:division/:id').get(isLoggedIn, isDiv, isAdmin, catchAsync(area.renderNewEmailForm))

router.route('/edit/:id').get(isLoggedIn, isDiv, isAdmin, catchAsync(area.renderEditForm)).post(isLoggedIn, isDiv, isAdmin, catchAsync(area.edit))

router
	.route('/editemail/:id')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(area.renderEmailEditPage))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(area.edit))

router.route('/edit/area/remove/:id').delete(isLoggedIn, isDiv, isAdmin, catchAsync(area.delete))

module.exports = router
