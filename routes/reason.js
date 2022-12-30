const express = require('express')
const router = express.Router({ mergeParams: true })
const { isLoggedIn, isAdmin, isDiv, validateReview, isReviewAuthor } = require('../middleware/middleware')
const Reason = require('../models/reason')
const reason = require('../controllers/reason')
const ExpressError = require('../utils/ExpressError')
const catchAsync = require('../utils/catchAsync')

router.route('/new').get(catchAsync(reason.renderReasonAndActionPage)).post(catchAsync(reason.create))

router.delete('/delete/:division/:area/:location/:shiftP/:frequency/:id/:reasonId', catchAsync(reason.delete))

module.exports = router
