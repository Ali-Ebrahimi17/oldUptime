const express = require('express')
const router = express.Router()
const stage = require('../controllers/stage')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isQSmartAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(stage.index))

// router
// 	.route('/new/:division')
// 	.get(isLoggedIn, isDiv, isAdmin, catchAsync(area.renderNewForm))
// 	.post(isLoggedIn, isDiv, isAdmin, catchAsync(area.createNew));

// router
// 	.route('/newemail/:division/:id')
// 	.get(isLoggedIn, isDiv, isAdmin, catchAsync(area.renderNewEmailForm))

router.route('/edit/:id').get(isLoggedIn, isDiv, isAdmin, catchAsync(stage.renderEditForm)).post(isLoggedIn, isDiv, isAdmin, catchAsync(stage.edit))

// router
// 	.route('/editemail/:id')
// 	.get(isLoggedIn, isDiv, isAdmin, catchAsync(area.renderEmailEditPage))
// 	.post(isLoggedIn, isDiv, isAdmin, catchAsync(area.edit));

// router.route('/edit/area/remove/:id').delete(isLoggedIn, isDiv, isAdmin, catchAsync(area.delete));

module.exports = router
