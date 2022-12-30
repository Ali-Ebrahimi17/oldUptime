const express = require('express')
const router = express.Router()
const tracker = require('../controllers/tracker')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isDiv, isQSmartOk } = require('../middleware/middleware')

router.route('/all/:division').get(isLoggedIn, catchAsync(tracker.index))

router.route('/closed/:division').get(isLoggedIn, catchAsync(tracker.closed))

router.route('/new/:division').get(isLoggedIn, catchAsync(tracker.renderNewForm)).post(isLoggedIn, catchAsync(tracker.createNew))

router.route('/edit/:id').get(isLoggedIn, isQSmartOk, catchAsync(tracker.renderEditForm)).post(isLoggedIn, isQSmartOk, catchAsync(tracker.edit))

router.route('/remove/:id').delete(isLoggedIn, isQSmartOk, catchAsync(tracker.delete))

module.exports = router
