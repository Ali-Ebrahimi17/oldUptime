const express = require('express')
const router = express.Router({ mergeParams: true })
const { isLoggedIn, isTCardAdmin, isDiv, validateReview, isReviewAuthor } = require('../middleware/middleware')

const check = require('../controllers/check')
const ExpressError = require('../utils/ExpressError')
const catchAsync = require('../utils/catchAsync')

router.route('/').post(isLoggedIn, catchAsync(check.createCheck))
router.route('/qasi/:page').post(isLoggedIn, catchAsync(check.createCheckQasi))

router.route('/contain').post(isLoggedIn, catchAsync(check.containCheck))
router.route('/contain/qasi/:page').post(isLoggedIn, catchAsync(check.containCheckQasi))

router.route('/bypass').get(isLoggedIn, catchAsync(check.byPassCheck))
router.route('/bypassQasi/:page').get(isLoggedIn, isTCardAdmin, catchAsync(check.byPassCheckQasi))

router.route('/history/fail').get(catchAsync(check.showFailDetail))
router.route('/history/contain').get(catchAsync(check.showContainDetail))
router.route('/history/pass').get(catchAsync(check.showPassDetail))

module.exports = router
