const express = require('express')
const router = express.Router()
const model = require('../controllers/model')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(model.index))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(model.renderNewForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(model.createNew))

router.route('/edit/:id').get(isLoggedIn, isDiv, isAdmin, catchAsync(model.renderEditForm)).post(isLoggedIn, isDiv, isAdmin, catchAsync(model.edit))

router.route('/edit/model/remove/:id').delete(isLoggedIn, isDiv, isAdmin, catchAsync(model.delete))

module.exports = router
