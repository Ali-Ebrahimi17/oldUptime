const express = require('express')
const router = express.Router()
const cfcTopFive = require('../controllers/cfcTopFive')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv, isCFCTop5 } = require('../middleware/middleware')

router.route('/all/:division/:type').get(catchAsync(cfcTopFive.index))

router.route('/new/:division').post(isLoggedIn, isDiv, isCFCTop5, catchAsync(cfcTopFive.createNew))

router.route('/edit/:id').post(isLoggedIn, isDiv, catchAsync(cfcTopFive.edit))

module.exports = router
