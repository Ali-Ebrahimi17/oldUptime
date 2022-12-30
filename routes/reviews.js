const express = require('express')
const router = express.Router({ mergeParams: true })
const { isLoggedIn, isAdmin, isDiv, validateReview, isReviewAuthor } = require('../middleware/middleware')
const Claim = require('../models/claim')
const Review = require('../models/review')
const reviews = require('../controllers/reviews')
const ExpressError = require('../utils/ExpressError')
const catchAsync = require('../utils/catchAsync')

router.post('/', isLoggedIn, validateReview, catchAsync(reviews.createReview))

router.delete('/:reviewId', isLoggedIn, isReviewAuthor, catchAsync(reviews.deleteReview))

module.exports = router
