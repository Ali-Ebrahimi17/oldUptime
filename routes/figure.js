const express = require('express')
const router = express.Router()
const figure = require('../controllers/figure')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(figure.index))

router.route('/edit/:id').get(isLoggedIn, isDiv, isAdmin, catchAsync(figure.renderEditForm)).post(isLoggedIn, isDiv, isAdmin, catchAsync(figure.edit))

module.exports = router
