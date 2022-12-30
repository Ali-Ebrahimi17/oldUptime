const express = require('express')
const router = express.Router()
const yard = require('../controllers/yard')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv, isCFC, isTopYard } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, catchAsync(yard.index))

router.route('/reviewed/:id/:division').get(isLoggedIn, isCFC, isDiv, catchAsync(yard.reviewed))
router.route('/returned/:id/:division').get(isLoggedIn, isCFC, isDiv, catchAsync(yard.returned))
router.route('/dispatch/:id/:division').get(isLoggedIn, isTopYard, isDiv, catchAsync(yard.dispatch))

router.route('/new/:division').get(isLoggedIn, isTopYard, catchAsync(yard.renderNewForm)).post(isLoggedIn, isTopYard, catchAsync(yard.createNew))

router.route('/edit/:id').get(isLoggedIn, isCFC, isDiv, catchAsync(yard.renderEditForm)).post(isLoggedIn, isCFC, isDiv, catchAsync(yard.edit))

module.exports = router
