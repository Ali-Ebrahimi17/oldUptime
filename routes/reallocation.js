const express = require('express')
const router = express.Router()

const reallocation = require('../controllers/reallocations')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv, isCFC } = require('../middleware/middleware')

router.get('/todo/:division', catchAsync(reallocation.index))
router.get('/done/:division', catchAsync(reallocation.done))

// download claims as csv
router.get('/download/:division', isLoggedIn, catchAsync(reallocation.download))

// request 4C reallocation
router.get('/newfourC/:division', isLoggedIn, catchAsync(reallocation.renderNewReallocationForm))

router
	.route('/new/:division')
	.get(isLoggedIn, catchAsync(reallocation.renderNewReallocationForm))
	.post(isLoggedIn, catchAsync(reallocation.createReallocation))

router
	.route('/:id')
	.get(isLoggedIn, isCFC, catchAsync(reallocation.renderEditForm))
	.put(isLoggedIn, isCFC, catchAsync(reallocation.updateReallocation))
// .delete(isLoggedIn, isAuthor, catchAsync(claims.deleteClaim));

module.exports = router
