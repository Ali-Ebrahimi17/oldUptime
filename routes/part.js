const express = require('express')
const router = express.Router()
const part = require('../controllers/part')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.route('/parts-risk-search/:division').get(catchAsync(part.index))
router.route('/add-part').post(catchAsync(part.createNew))
router.route('/edit-part/:id').post(catchAsync(part.edit))

module.exports = router
