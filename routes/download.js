const express = require('express')
const router = express.Router()
const download = require('../controllers/downloads')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv } = require('../middleware/middleware')

router.get('/main/:division', catchAsync(download.index))

router.get('/victor', catchAsync(download.downloadClaimsVictor))

//download warranty claims
router.get('/claims/:division', catchAsync(download.downloadClaims))

//download retails
router.post('/retails/:division', catchAsync(download.downloadRetails))

//download major escapes
router.post('/majors/:division', catchAsync(download.downloadMajorEscapes))

//download q smart stge info
router.post('/q-smart-stage/:division', catchAsync(download.downloadQSmartStage))

//download q smart stge info
router.post('/q-smart-faults/:division', catchAsync(download.downloadQSmartFaults))

//download doa mri data
router.post('/mri-doa/:division', catchAsync(download.downloadMriDOAClaims))

//download t3 mri data
router.post('/mri-t3/:division', catchAsync(download.downloadMriT3Claims))

//download t3 mri data
router.post('/paint-check-results', catchAsync(download.downloadPaintCheckResults))

//dpu to stages
router.post('/dpuForward/:division', catchAsync(download.downloadDpuForward))

module.exports = router
