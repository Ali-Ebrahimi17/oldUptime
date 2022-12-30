const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const cors = require('cors')
const dir = './public/uploads/Covers'
const dirClaims = './public/claims'
const Json2csvParser = require('json2csv').Parser
const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://localhost:27017/today'
const claims = require('../controllers/claims')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isVetter, isAdmin, isDiv, isCFC, isLeak, isService, isClaimsImport } = require('../middleware/middleware')

const upload = multer({
	storage: multer.diskStorage({
		destination: function (req, file, callback) {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir)
			}
			callback(null, './public/uploads')
		},
		filename: function (req, file, callback) {
			callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
		},
	}),

	// list of file types that can be uploaded
	fileFilter: function (req, file, callback) {
		let ext = path.extname(file.originalname)
		if (
			ext !== '.png' &&
			ext !== '.PNG' &&
			ext !== '.jpg' &&
			ext !== '.gif' &&
			ext !== '.jpeg' &&
			ext !== '.JPG' &&
			ext !== '.xls' &&
			ext !== '.xlsx' &&
			ext !== '.xlsm' &&
			ext !== '.pdf' &&
			ext !== '.pptx' &&
			ext !== '.doc' &&
			ext !== '.docx' &&
			ext !== '.PDF'
		) {
			return callback(/*res.end('Only images are allowed')*/ null, false)
		}
		callback(null, true)
	},
})

const uploadClaims = multer({
	storage: multer.diskStorage({
		destination: function (req, file, callback) {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir)
			}
			callback(null, './public/claims')
		},
		filename: function (req, file, callback) {
			callback(null, file.fieldname + path.extname(file.originalname))
		},
	}),

	// list of file types that can be uploaded
	fileFilter: function (req, file, callback) {
		let ext = path.extname(file.originalname)
		if (ext !== '.xlsx') {
			return callback(/*res.end('Only images are allowed')*/ null, false)
		}
		callback(null, true)
	},
})

// manual 4C link
router.post('/manLinkedClaim/:id', catchAsync(claims.manLinkedClaim))

// manual 4C link
router.post('/manRemoveLinkedClaim/:id', catchAsync(claims.manRemoveLinkedClaim))

// router.route('/').get(catchAsync(claims.index)).post(isLoggedIn, upload.any(), catchAsync(claims.createClaim));
router.route('/leak4c/:division').get(catchAsync(claims.leakIndex)).post(isLoggedIn, upload.any(), catchAsync(claims.createLeakClaim))

router.route('/4c/:division').get(catchAsync(claims.index)).post(isLoggedIn, isCFC, upload.any(), catchAsync(claims.createClaim))

// component internal 4C page
router.get('/component4c/:division', catchAsync(claims.componentIndex))

router.route('/4cshow/:id').get(catchAsync(claims.showClaim)).post(isLoggedIn, upload.any(), catchAsync(claims.createClaim))
router.route('/leak4cshow/:id').get(catchAsync(claims.showLeakClaim)).post(isLoggedIn, upload.any(), catchAsync(claims.createClaim))

router.get('/vetting/:division', isLoggedIn, isVetter, isDiv, catchAsync(claims.vettingClaims))
router.get('/vetted/:division', isLoggedIn, isVetter, isDiv, catchAsync(claims.vettedClaims))
router.get('/service/:division', isLoggedIn, isService, catchAsync(claims.awaitingService))
router.get('/serviceHd/:division', isLoggedIn, isService, catchAsync(claims.awaitingServiceHd))
router.get('/serviceUSA/:division', isLoggedIn, isService, catchAsync(claims.awaitingServiceUSA))
//doa 2021 build
router.get('/doa2021/:division', isLoggedIn, isVetter, catchAsync(claims.doa2021))
//doa 2021 table
router.get('/doa2021table/:division', isLoggedIn, isVetter, catchAsync(claims.doa2021table))

router.route('/doa2021/edit/:id').get(isLoggedIn, catchAsync(claims.renderDoa2021Form)).put(isLoggedIn, catchAsync(claims.doa2021edit))

router.route('/serviceres/:id').get(isLoggedIn, catchAsync(claims.renderFormService)).put(isLoggedIn, upload.any(), catchAsync(claims.serviceAnswer))

router.get('/serviceaccepted/:division', isLoggedIn, isService, catchAsync(claims.serviceAccepted))
router.get('/servicerejected/:division', isLoggedIn, isService, catchAsync(claims.serviceRejected))
router.get('/serviceresponded/:id', isLoggedIn, isService, catchAsync(claims.serviceResponded))

// download division claims as csv
router.get('/download/:division', isLoggedIn, isDiv, isVetter, catchAsync(claims.download))
// download heatmap claims as csv
router.get('/downloadHeatmap/:division/:area/:type', isLoggedIn, catchAsync(claims.downloadHeatmap))
// download division claims as csv for martin harper
router.get('/downloadmh/:division', isLoggedIn, isDiv, isVetter, catchAsync(claims.downloadMartin))
// download all divisions claims as csv
router.get('/downloaddivision', catchAsync(claims.downloadAll))

// download all divisions claims as csv
router.get('/downloadCabs', catchAsync(claims.downloadCabsClaims))

// download all asd claim data from the T3 dash
router.get('/downloadt3asd/:division', catchAsync(claims.downloadASDt3))
// download all asd claim data from the DOA dash
router.get('/downloadDoaAsd/:division', catchAsync(claims.downloadASDDoa))

// download all asd claim data from the T3 dash
router.get('/downloadt3asdC/:division', catchAsync(claims.downloadASDt3C))
// download all asd claim data from the DOA dash
router.get('/downloadDoaAsdC/:division', catchAsync(claims.downloadASDDoaC))
// close off 4C for Mark Norton
router.get('/closemark/:id/:personId', catchAsync(claims.markNortonClose))

// download division claims as csv
router.get('/retails/:division', isLoggedIn, isVetter, catchAsync(claims.downloadRetails))

router.get('/new/:division', isLoggedIn, isDiv, catchAsync(claims.renderNewForm))

//api for Yunus
router.get('/api/yunus', cors(), catchAsync(claims.apiYunus))

// //api for Josh
// router.get('/api/josh/:division', cors(), catchAsync(claims.apiJosh))

//api for machine model
router.get('/api/machine-model/:buildNumber', cors(), catchAsync(claims.apiJosh))

router.get('/newleak/:division', isLoggedIn, isDiv, isLeak, catchAsync(claims.renderNewLeakForm))

// serial search
router.get('/serial/:division/:name', isLoggedIn, isDiv, isVetter, catchAsync(claims.serialSearch))
// failed part search
router.get('/part/:division/:failedPart(*)', isLoggedIn, isDiv, isVetter, catchAsync(claims.partsSearch))
router.get('/addLinkedClaim/:id/:id2', isLoggedIn, isVetter, isDiv, catchAsync(claims.addLinkedClaim))
router.get('/removeLinkedClaim/:id/:id2', isLoggedIn, isVetter, isDiv, catchAsync(claims.removeLinkedClaim))

router.route('/:id').put(isLoggedIn, upload.any(), catchAsync(claims.updateClaim)).delete(isLoggedIn, isDiv, catchAsync(claims.deleteClaim))

router.route('/contain/:id').put(isLoggedIn, upload.any(), catchAsync(claims.updateClaimContain))

router.route('/counter/:id').put(isLoggedIn, upload.any(), catchAsync(claims.updateClaimClose))

router
	.route('/reallocate/:id')
	.get(isLoggedIn, catchAsync(claims.renderReallocateForm))
	.put(isLoggedIn, upload.any(), catchAsync(claims.updateClaimReallocate))

router
	.route('/reallocateCabs/:id')
	.get(isLoggedIn, catchAsync(claims.renderReallocateFormCabs))
	.put(isLoggedIn, upload.any(), catchAsync(claims.updateClaimReallocateCabs))

router.route('/nofourc/:id').put(isLoggedIn, isAdmin, upload.any(), catchAsync(claims.updateClaimRemove4C))

router.route('/reopen/:id').put(isLoggedIn, isAdmin, upload.any(), catchAsync(claims.updateClaimReOpen))
router.route('/recontain/:id').put(isLoggedIn, isAdmin, upload.any(), catchAsync(claims.updateClaimReOpenToContained))
router.route('/reopenClear/:id').put(isLoggedIn, isAdmin, upload.any(), catchAsync(claims.updateClaimReOpenClear))

router
	.route('/again/:id')
	// .get(catchAsync(claims.showClaim))
	.put(isLoggedIn, upload.any(), catchAsync(claims.updateClaimAgain))
	.delete(isLoggedIn, isAdmin, catchAsync(claims.deleteClaim))

router.get('/:id/edit', isLoggedIn, isVetter, catchAsync(claims.renderEditForm))
router.get('/:id/editagain', isLoggedIn, isVetter, catchAsync(claims.renderEditFormAgain))

router.put('/close/:id', isLoggedIn, isAdmin, upload.any(), catchAsync(claims.updateClaimAudit))

router.route('/componentInternal/:division').post(isLoggedIn, isVetter, catchAsync(claims.createClaim))

module.exports = router

// download all divisions claims as csv
router.get('/downloadfourCdDates', catchAsync(claims.downloadfourCDates))

// download all divisions claims as csv
router.get('/downloadDealerClaims/:division/:dealer', catchAsync(claims.downloadDealerClaims))

router.get('/serviceAcceptedYes/:division/:id', isLoggedIn, isService, catchAsync(claims.serviceActionedYes))
router.get('/serviceAcceptedNo/:division/:id', isLoggedIn, isService, catchAsync(claims.serviceActionedNo))

router
	.route('/import-claims')
	.get(isLoggedIn, isClaimsImport, catchAsync(claims.renderClaimImportForm))
	.post(isLoggedIn, isClaimsImport, uploadClaims.any(), catchAsync(claims.importClaims))
router
	.route('/import-claims-cabs')
	.get(isLoggedIn, isClaimsImport, catchAsync(claims.renderClaimImportFormCabs))
	.post(isLoggedIn, isClaimsImport, uploadClaims.any(), catchAsync(claims.importClaimsCabs))
router
	.route('/import-claims-mri')
	.get(isLoggedIn, isClaimsImport, catchAsync(claims.renderClaimImportFormMri))
	.post(isLoggedIn, isClaimsImport, uploadClaims.any(), catchAsync(claims.importMriClaimsCabs))

router.route('/master-search/:division').get(catchAsync(claims.masterSearch))

//http://localhost/claims/downloadfourCdDates
