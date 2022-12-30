const express = require('express')
const router = express.Router()
const shift = require('../controllers/shift')
const catchAsync = require('../utils/catchAsync')
const { isLoggedInMachine, isAdminMachine, isDivMachine, canEditUsers, canEditShifts } = require('../middleware/middleware')

router.route('/new/:id').post(isLoggedInMachine, canEditShifts, catchAsync(shift.create))

router.route('/delete/:mId/:sId').post(isLoggedInMachine, canEditShifts, catchAsync(shift.delete))

module.exports = router
