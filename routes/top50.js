const express = require('express')
const router = express.Router()

const top50 = require('../controllers/top50')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv, isVetter } = require('../middleware/middleware')

// show top 50 doa
router.get('/501/:period/:division/:type', isLoggedIn, catchAsync(top50.index50))
router.get('/:number/:period/:division/:type', catchAsync(top50.index502))
router.get('/all/:period/:division/:type', isLoggedIn, catchAsync(top50.indexAll))

router.get('/addLinkedFourC/:id1/:id2', isLoggedIn, isDiv, isVetter, catchAsync(top50.addLinkedClaim))
router.get('/removeLinkedFourC/:id1/:id2', isLoggedIn, isDiv, isVetter, catchAsync(top50.removeLinkedClaim))

// // show top 50 leaks
// router.get('/50/:period/:division/leak', isLoggedIn, catchAsync(top50.index50))
// router.get(
// 	'/all/:period/:division/leak',
// 	isLoggedIn,
// 	catchAsync(top50.indexAll),
// )

// // show top 50 electrics
// router.get(
// 	'/50/:period/:division/electric',
// 	isLoggedIn,
// 	catchAsync(top50.index50),
// )
// router.get(
// 	'/all/:period/:division/electric',
// 	isLoggedIn,
// 	catchAsync(top50.indexAll),
// )

// failed part search
router.get('/part/:period/:division/:type/:failedPart(*)', catchAsync(top50.partsSearch))
// failed part analysis
router.get('/partsanalysis/:period/:division/:type/:failedPart(*)', catchAsync(top50.partsAnalysis))

// render top 50 part update form

router
	.route('/edit/:period/:division/:type/:failedPart(*)')
	.get(isLoggedIn, isDiv, isVetter, catchAsync(top50.renderTop50EditForm))
	.put(isLoggedIn, isDiv, isVetter, catchAsync(top50.updatePart))

//cabs section
// show top 50 doa
router.get('/50cabs', isLoggedIn, catchAsync(top50.index50cabs))

// failed part search
router.get('/partcabs/:failedPart(*)', isLoggedIn, isDiv, isVetter, catchAsync(top50.partsSearchCabs))

// failed part analysis
router.get('/partsanalysiscabs/:failedPart(*)', isLoggedIn, isDiv, isVetter, catchAsync(top50.partsAnalysisCabs))

// render top 50 part update form

router
	.route('/editcabs/:failedPart(*)')
	.get(isLoggedIn, isDiv, isVetter, catchAsync(top50.renderTop50EditFormCabs))
	.put(isLoggedIn, isDiv, isVetter, catchAsync(top50.updatePartCabs))

module.exports = router
