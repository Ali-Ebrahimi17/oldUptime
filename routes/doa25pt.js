const express = require('express')
const router = express.Router()
const doa25pt = require('../controllers/doa25pt')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isDiv, isVetter, is25ptAdmin } = require('../middleware/middleware')

const multer = require('multer')
const path = require('path')
const fs = require('fs')
const dir = './public/uploads/Covers'

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

router.route('/all/:division').get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.index))
router.route('/repeat/:division/:failuremode/:failuretype/:id').get(catchAsync(doa25pt.repeatData))

router.route('/toGrade').get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.toGrade))

router.route('/monthlyIntake').get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.monthlyIntake))
router.route('/lateContClosure').get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.lateContClosure))
router.route('/buildMonthDetail/:division/:month').get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.historicalBuildMonth))
router.route('/reportMonthDetail/:division/:month').get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.historicalReportMonth))
router.route('/lateContMonthDetail/:division/:month').get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.historicalContMonth))
router.route('/lateCloseMonthDetail/:division/:month').get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.historicalCloseMonth))
router.route('/minors').get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.minors))
router.route('/majors').get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.majors))
router.route('/dash').get(catchAsync(doa25pt.dash))
router.route('/escapeTracker/:division').get(catchAsync(doa25pt.loadallDash))
router.route('/newdash').get(catchAsync(doa25pt.dale))
router.route('/weekMonth').get(catchAsync(doa25pt.weekMonth))
router.route('/late').get(catchAsync(doa25pt.late))
router.route('/tracker/:division').get(catchAsync(doa25pt.tracker))

router.route('/cabsdash').get(catchAsync(doa25pt.cabsDash))

router
	.route('/newFType1/:id')
	.get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.renderNewFailureTypeForm1))
	.post(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.createNewFailureType1))
router
	.route('/newFMode1/:id')
	.get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.renderNewFailureModeForm1))
	.post(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.createNewFailureMode1))
router.route('/newFMode1/:id').get(catchAsync(doa25pt.renderNewFailureModeForm1))

router
	.route('/new/:division')
	.get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.renderNewForm))
	.post(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.createNew))
router
	.route('/newFType/:id')
	.get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.renderNewFailureTypeForm))
	.post(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.createNewFailureType))
router
	.route('/newFMode/:id')
	.get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.renderNewFailureModeForm))
	.post(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.createNewFailureMode))

router
	.route('/edit/:id')
	.get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.renderEditForm))
	.post(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.edit))

router
	.route('/image/:id')
	.get(isLoggedIn, isDiv, isVetter, catchAsync(doa25pt.renderImageForm))
	.post(isLoggedIn, isDiv, isVetter, upload.any(), catchAsync(doa25pt.addImages))
router
	.route('/grade/:id')
	.get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.renderGradeForm))
	.post(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.grade))
router
	.route('/gradeAgain/:id')
	.get(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.renderGradeAgainForm))
	.post(isLoggedIn, isDiv, isVetter, is25ptAdmin, catchAsync(doa25pt.gradeAgain))

router.route('/edit/doa25pt/remove/:id').delete(isLoggedIn, isDiv, isAdmin, catchAsync(doa25pt.delete))

module.exports = router
