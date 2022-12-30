const express = require('express')
const router = express.Router()
const passport = require('passport')
const tCard = require('../controllers/tCard')
const loadallTcard = require('../controllers/t-cards/ldl')
const BackhoeTcard = require('../controllers/t-cards/bhl')
const earthMoversTcard = require('../controllers/t-cards/em')
const hbuTcard = require('../controllers/t-cards/hbu')
const heavyTcard = require('../controllers/t-cards/hp')
const comnpactTcard = require('../controllers/t-cards/cp')
const cabsTcard = require('../controllers/t-cards/cabs')
// const earthMoversTcardQuality = require('../controllers/t-cards/em-quality')
// const backhoeTcardQuality = require('../controllers/t-cards/bhl-quality')
// const compactTcardQuality = require('../controllers/t-cards/cp-quality')
// const heavyTcardQuality = require('../controllers/t-cards/hp-quality')
// const loadallTcardQuality = require('../controllers/t-cards/ldl-quality')
const quality = require('../controllers/t-cards/quality')

const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isLoggedInTCard, isTCardAdmin, isDivTCard, isTCard, isDiv, canAssignCardUsers } = require('../middleware/middleware')

router.route('/register/:division').post(catchAsync(tCard.register))

router.route('/analysis').get(catchAsync(tCard.analysis))
router.route('/operations').get(catchAsync(tCard.divisionView))
router.route('/operations-v3').get(catchAsync(tCard.divisionV3))
router.route('/training').get(catchAsync(tCard.training))
router.route('/training/reset').get(catchAsync(tCard.reset))

router.route('/divDetail/:division').get(catchAsync(tCard.divisionDetail))

// router.route('/shift').get(catchAsync(tCard.newShift))
// router.route('/show/:division').get(catchAsync(tCard.area))
// router.route('/show/:division/:area').get(catchAsync(tCard.location))
// router.route('/show/:division/:area/:location').get(catchAsync(tCard.ShiftP))
router.route('/show/:division/:area/:location/:shiftP').get(catchAsync(tCard.checks))

router.route('/edit/:id').get(
	isLoggedInTCard,
	// isDivTCard,
	// isTCard,
	catchAsync(tCard.renderDoCheckForm)
)
router.route('/contain/:id').get(
	isLoggedInTCard,
	// isTCard,
	// isDivTCard,
	catchAsync(tCard.renderContainCheckForm)
)
router.route('/close/:id').get(isLoggedInTCard, isDivTCard, catchAsync(tCard.renderCloseCheckForm))

router.route('/admin/:division/:area/:location/:shiftP/:frequency').get(
	isLoggedInTCard,
	// isTCard,
	// isDivTCard,
	isTCardAdmin,
	catchAsync(tCard.renderAdminPage)
)
router.route('/history/:division/:area/:location/:shiftP').get(catchAsync(tCard.renderHistoryPage))
router.route('/historyQasi/:division/:area/:category').get(catchAsync(tCard.renderHistoryPageQasi))
router.route('/historyQasi-section/:division/:area/:category/:section').get(catchAsync(tCard.renderHistoryPageQasiScection))

router.route('/allhistory/:division/:area').get(catchAsync(tCard.renderAllHistoryPage))

router
	.route('/new/:division/:area/:location/:shiftP/:frequency')
	.get(
		isLoggedInTCard,
		// isTCard,
		// isDivTCard,
		isTCardAdmin,
		catchAsync(tCard.renderNewForm)
	)
	.post(
		isLoggedInTCard,
		// isTCard,
		// isDivTCard,
		isTCardAdmin,
		catchAsync(tCard.createNew)
	)

router
	.route('/adminedit/:division/:area/:location/:shiftP/:frequency/:id')
	.get(
		isLoggedInTCard,
		// isTCard,
		// isDivTCard,
		isTCardAdmin,
		catchAsync(tCard.renderEditForm)
	)
	.post(
		isLoggedInTCard,
		// isTCard,
		// isDivTCard,
		isTCardAdmin,
		catchAsync(tCard.edit)
	)

router.route('/adminreason/:division/:area/:location/:shiftP/:frequency/:id').get(
	isLoggedInTCard,
	// isTCard,
	// isDivTCard,
	isTCardAdmin,
	catchAsync(tCard.renderReasonAndActionPage)
)

router
	.route('/login')
	.get(tCard.renderLogin)
	.post(
		passport.authenticate('userLocal', {
			failureFlash: true,
			failureRedirect: '/tCard/login',
		}),
		tCard.login
	)
router
	.route('/loginQCS/:division')
	.get(tCard.renderLoginQCS)
	.post(
		passport.authenticate('userLocal', {
			failureFlash: true,
			failureRedirect: '/tCard/loginQCS',
		}),
		tCard.loginQCS
	)
// router.route('/loginTraining').post(
// 	passport.authenticate('userLocal', {
// 		failureFlash: true,
// 		failureRedirect: '/tCard/login',
// 	}),
// 	tCard.loginTraining
// )

router.get('/logout', tCard.logout)
router.get('/logoutQCS/:division', tCard.logoutQCS)

router.route('/delete/:division/:area/:location/:shiftP/:frequency/:id').delete(
	// isLoggedInTCard,
	// isTCard,
	// isDivTCard,
	isTCardAdmin,
	catchAsync(tCard.delete)
)

router.route('/qcs').get(
	// isLoggedIn,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.divisionViewQCS)
)
router.route('/qcs-critical-to-quality-dash/:id').get(
	// isLoggedIn,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.criticalToQualityDash)
)
router.route('/qcs-new').get(
	// isLoggedIn,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.divisionViewQCSNew)
)
router.route('/qcs-new-create-update').post(
	isLoggedIn,
	// isTCard,
	// isDivTCard,
	isTCardAdmin,
	catchAsync(tCard.createNewUpdate)
)
router.route('/qcs-new-edit-update/:id').post(
	isLoggedIn,
	// isTCard,
	// isDivTCard,
	isTCardAdmin,
	catchAsync(tCard.editUpdate)
)
router.route('/qcs-new-delete-update/:id').get(
	isLoggedIn,
	// isTCard,
	// isDivTCard,
	isTCardAdmin,
	catchAsync(tCard.deleteUpdate)
)
router.route('/qcs/all-checks/:division').get(
	// isLoggedIn,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.allDivisionChecksQCS)
)
router.route('/qcs/section-checks/:division/:section').get(
	// isLoggedIn,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.allDivisionChecksQCSByCategory)
)
router.route('/qcs/my-checks/:division/:id').get(
	isLoggedIn,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.myChecks)
)
router.route('/qcs-dash').get(
	// isLoggedIn,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.groupViewQCSDash)
)
router.route('/qcs-dash/:bu').get(
	// isLoggedIn,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.divisionViewQCSDash)
)
router.route('/qcs-assign-card-users/:bu').get(
	isLoggedIn,
	canAssignCardUsers,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.assignCardUsers)
)
router.route('/update-card-users/:bu/:id').post(
	isLoggedIn,
	canAssignCardUsers,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.saveNewCardUsers)
)

router.route('/my-checks/:id/').get(
	isLoggedIn,
	// canAssignCardUsers,
	// isTCard,
	// isDivTCard,
	// isTCardAdmin,
	catchAsync(tCard.myChecks)
)
router.route('/deleteQasi/:division/:id/').get(
	isLoggedIn,
	// canAssignCardUsers,
	// isTCard,
	// isDivTCard,
	isTCardAdmin,
	catchAsync(tCard.deleteQasi)
)

module.exports = router
