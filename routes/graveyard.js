const express = require('express')
const router = express.Router()
const graveyard = require('../controllers/graveyard')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv, isCFC } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, catchAsync(graveyard.index))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isCFC, catchAsync(graveyard.renderNewForm))
	.post(isLoggedIn, isDiv, isCFC, catchAsync(graveyard.createNew))

router
	.route('/edit/:id')
	.get(isLoggedIn, isDiv, isCFC, catchAsync(graveyard.renderEditForm))
	.post(isLoggedIn, isDiv, isCFC, catchAsync(graveyard.edit))

router.route('/edit/graveyard/remove/:id').delete(isLoggedIn, isDiv, catchAsync(graveyard.delete))

module.exports = router
