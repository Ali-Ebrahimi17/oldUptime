const express = require('express')
const router = express.Router()
const passport = require('passport')
const machine = require('../controllers/machine')

const catchAsync = require('../utils/catchAsync')
const { isLoggedInMachine, isAdminMachine, isDivMachine, canEditUsers, canEditShifts, canDeleteShifts } = require('../middleware/middleware')

router.route('/home').get(catchAsync(machine.home))

// router.route('/create-user/:shortBu').get(catchAsync(machine.renderRegisterForm))
// router.route('/register').post(canEditUsers, catchAsync(machine.register))
router.route('/register').post(catchAsync(machine.register))

router.route('/edit-user/:id/:shortBu').post(isLoggedInMachine, isDivMachine, isAdminMachine, canEditUsers, catchAsync(machine.editUser))

router.route('/delete-user/:id').get(catchAsync(machine.softDeleteUser))

router.route('/machine/:id').get(catchAsync(machine.machine))
router.route('/downloadStoppages/:ids/:type/:stoppage/:newStart/:newEnd').get(catchAsync(machine.downloadStoppages))

// router
// 	.route('/machineAnalysis/:shortBu/:type')
// 	.get(catchAsync(machine.machineAnalysis2))

// router
// 	.route('/machineAnalysis/:shortBu/:type')
// 	.post(catchAsync(machine.machineAnalysis2))

router.route('/machineAnalysis/:id/:type/:stoppage/:reason/:start/:end').get(catchAsync(machine.machineAnalysis2))
router.route('/machineAnalysis/:id/:type/:stoppage/:reason').post(catchAsync(machine.machineAnalysis2))

// create new andon
router.route('/create-new-andon').post(catchAsync(machine.createNewAndon))
//remove andon
router.route('/remove-andon/:id/:mId').get(catchAsync(machine.removeAndon))

router.route('/upcoming').get(catchAsync(machine.upcoming))

router.route('/shift-vs-load/:shortBu').get(catchAsync(machine.shftVsLoad))
router.route('/shift-vs-load/:shortBu').post(catchAsync(machine.shftVsLoad))
router.route('/business-unit/:shortBu').get(catchAsync(machine.businessUnit))
router.route('/screen/:shortBu/:screenName').get(catchAsync(machine.screen))
router.route('/operations').get(catchAsync(machine.operations))
router.route('/operationsNew').get(catchAsync(machine.operationsNew))
router.route('/operations-weekly').get(catchAsync(machine.operationsWeekly))
router.route('/type').get(catchAsync(machine.type))
router.route('/running-time').get(catchAsync(machine.global))
router.route('/touch-time').get(catchAsync(machine.touch))
router.route('/down-time').get(catchAsync(machine.downTime))
router.route('/program-efficiency').get(catchAsync(machine.effOfProgramme))
router.route('/divisionEff/:shortBu/:asset').get(catchAsync(machine.divisionEff))
router.route('/divisionRunning/:shortBu/:asset').get(catchAsync(machine.divisionRunning))
router.route('/divisionTouch/:shortBu/:asset').get(catchAsync(machine.divisionTouch))
router.route('/dayAnalysis/:shortBu/:day/:month').get(catchAsync(machine.dayAnalysis))
router.route('/ukShifts').get(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.ukShifts))
router.route('/ukShifts/:id').get(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.ukShiftsDetail))
router.route('/admin/:shortBu').get(isLoggedInMachine, isDivMachine, isAdminMachine, canEditShifts, catchAsync(machine.shiftAdmin))

router.route('/notifications/:shortBu').get(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.notificationAdmin))
router.route('/contacts/:shortBu').get(isLoggedInMachine, isDivMachine, isAdminMachine, canEditUsers, catchAsync(machine.contactAdmin))
// router.route('/contacts/:shortBu').get(catchAsync(machine.contactAdmin))

router.route('/newNotification/:shortBu').post(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.newNotification))
router.route('/editNotification/:id/:shortBu').post(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.editNotification))
router.route('/deleteNotification/:id/:shortBu').post(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.deleteNotification))
router.route('/addcontact/:shortBu').post(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.createMachineContact))
router.route('/editMachineContact/:id/:shortBu').post(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.editMachineContact))
router.route('/deleteMachineContact/:id/:shortBu').post(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.deleteMachineContact))

router.route('/vsHours').get(catchAsync(machine.vsHours))
router.route('/shiftp/:shortBu/:id').get(isLoggedInMachine, isDivMachine, isAdminMachine, canEditShifts, catchAsync(machine.shiftp))
router.route('/show/:shortBu/:id').get(isLoggedInMachine, isDivMachine, isAdminMachine, canEditShifts, catchAsync(machine.show))
router.route('/history/:shortBu').get(isLoggedInMachine, isDivMachine, isAdminMachine, catchAsync(machine.businessUnitHistory))

router.route('/deleteshift/:id').get(isLoggedInMachine, isDivMachine, isAdminMachine, canDeleteShifts, catchAsync(machine.deleteShift))

router
	.route('/login/:shortBu')
	.get(machine.renderLogin)
	.post(
		passport.authenticate('machineLocal', {
			failureFlash: true,
			failureRedirect: '/equipment-monitoring/operations',
		}),
		machine.login
	)

router.get('/logout', machine.logout)

//ll weekly report
router.get('/live-report', machine.weeklyReport)

//download csv for report
router.get('/updatesCSVDownload', machine.updatesCSVDownload)
//http://localhost/equipment-monitoring/updatesCSVDownload

//download all updates csv file
router.get('/updatesCSVDownloadAll/:shortBu', machine.updatesCSVDownloadAll)
//http://localhost/equipment-monitoring/updatesCSVDownloadAll/LDL

//download all updates csv file
router.post('/machine-stop-start/:id', machine.downloadStopStart)
//http://localhost/equipment-monitoring/updatesCSVDownloadAll/LDL

//open pdf help files
router.get('/help', machine.help)

//download weekly report
router.get('/weeklyReport', machine.weeklyReport)

//add machine notes
router.route('/addMachineNotes/:id').post(catchAsync(machine.addMachineNotes))

//acknowledge Notes
router.get('/readNotes/:id', machine.acknowledgeNotes)

module.exports = router

//http://172.30.32.158:3000
