const express = require('express')
const router = express.Router()
const zone = require('../controllers/zone')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, isDiv, isAdmin, catchAsync(zone.index))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isAdmin, catchAsync(zone.renderNewForm))
	.post(isLoggedIn, isDiv, isAdmin, catchAsync(zone.createNew))

router.route('/edit/:id').get(isLoggedIn, isDiv, isAdmin, catchAsync(zone.renderEditForm)).post(isLoggedIn, isDiv, isAdmin, catchAsync(zone.edit))
router.route('/editTrack/:id').get(isLoggedIn, catchAsync(zone.renderEditFormTrack)).post(isLoggedIn, catchAsync(zone.editTrack))

router.route('/edit/zone/remove/:id').delete(isLoggedIn, isDiv, isAdmin, catchAsync(zone.delete))

module.exports = router
