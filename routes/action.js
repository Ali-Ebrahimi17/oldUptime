const express = require('express')
const router = express.Router({ mergeParams: true })
const { isLoggedIn, isAdmin, isDiv, validateReview, isReviewAuthor } = require('../middleware/middleware')
const Action = require('../models/action')
const action = require('../controllers/action')
const ExpressError = require('../utils/ExpressError')
const catchAsync = require('../utils/catchAsync')

router.route('/new').get(catchAsync(action.renderReasonAndActionPage)).post(catchAsync(action.create))

router.delete('/delete/:division/:area/:location/:shiftP/:frequency/:id/:actionId', catchAsync(action.delete))

module.exports = router
