const express = require('express')
const router = express.Router()
const champion = require('../controllers/champions')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(champion.index))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(champion.renderNewForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(champion.createNew))

router
	.route('/edit/:id')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(champion.renderEditForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(champion.edit))

router.route('/edit/champion/remove/:id').delete(isLoggedIn, isDiv, isAdmin, catchAsync(champion.delete))

module.exports = router
