const express = require('express')
const router = express.Router()

const throughput = require('../controllers/throughput')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv, isCFC } = require('../middleware/middleware')

router.get('/wip/:division', catchAsync(throughput.dpu))
router.route('/all/:division').get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.index))
router.route('/all/:division/jack').get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.indexJack))
// .post(isLoggedIn, isCFC, isDiv, catchAsync(throughput.updateJack))

router.route('/updateJack/:id').post(isDiv, isCFC, catchAsync(throughput.updateJack))

router.route('/reds/:division').get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.indexReds))
router.route('/pdi/:division').get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.indexPDI))
// show what faults machine had on when it went through dealer pdi
router.route('/startfaults/:division').get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.startFaults))
// show machines signed pout today
router.route('/soToday/:division').get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.signedOutToday))

// download claims as csv
router.get('/download/:division', isLoggedIn, isDiv, isCFC, catchAsync(throughput.download))

router
	.route('/newso/:division')
	.get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.renderNewSOForm))
	.post(isLoggedIn, isCFC, isDiv, catchAsync(throughput.createSOThroughput))

router
	.route('/newred/:division')
	.get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.renderNewRedForm))
	.post(isLoggedIn, isCFC, isDiv, catchAsync(throughput.createRedThroughput))

//Loadall new throughput
router.route('/newredLdl/:division').post(isLoggedIn, isCFC, isDiv, catchAsync(throughput.createRedThroughputLDL))

router.route('/loadallThroughput/:id').get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.showThroughputLDL))

router.route('/addNewfaulttoLoadallArr/:id').post(isLoggedIn, isCFC, isDiv, catchAsync(throughput.addFaultsToThroughputLDL))

router
	.route('/newPDI/:division')
	.get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.renderNewPDIForm))
	.post(isLoggedIn, isCFC, isDiv, catchAsync(throughput.createPDIThroughput))

router
	.route('/:id')
	.get(isLoggedIn, isCFC, isDiv, catchAsync(throughput.renderEditForm))
	.put(isLoggedIn, isCFC, isDiv, catchAsync(throughput.updateThroughput))
// .delete(isLoggedIn, isAuthor, catchAsync(claims.deleteClaim));

router.put('/:id/signout', isLoggedIn, isCFC, isDiv, catchAsync(throughput.signOutMachine))

module.exports = router
