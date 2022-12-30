const express = require('express')
const router = express.Router({ mergeParams: true })
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')
const Area = require('../models/area')
const Email = require('../models/email')
const email = require('../controllers/email')
const ExpressError = require('../utils/ExpressError')
const catchAsync = require('../utils/catchAsync')

router.post('/', isLoggedIn, isAdmin, isDiv, catchAsync(email.create))

router.delete('/:emailId', isLoggedIn, isAdmin, isDiv, catchAsync(email.delete))

module.exports = router
