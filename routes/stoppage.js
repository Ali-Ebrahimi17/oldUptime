const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const stoppage = require('../controllers/stoppage')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv, canPUsePrograming } = require('../middleware/middleware')

// Create the rate limit rule
const limit = rateLimit({
	windowMs: 1 * 500, // half second
	max: 1, // limit each IP to 1 requests per windowMs
	message: 'You pressed the button more than once',
})

router.route('/new/:id').post(limit, catchAsync(stoppage.createNew))

router.route('/inProgram/:mId').post(catchAsync(stoppage.inProgram))
router.route('/outProgram/:mId').post(catchAsync(stoppage.outProgram))

router.route('/edit/:sId/:mId').post(catchAsync(stoppage.edit))

module.exports = router
