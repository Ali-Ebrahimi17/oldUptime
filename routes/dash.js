const express = require('express')
const router = express.Router()
const dash = require('../controllers/dash')
const loadall = require('../controllers/loadallHeatMap')
const dpu = require('../controllers/loadallDPU')
const josh = require('../controllers/josh')
const catchAsync = require('../utils/catchAsync')
const { isLoggedIn, isAdmin, isVetter, isDiv, isQSmartAdmin, isQmr, isLoadallDPU } = require('../middleware/middleware')

// group utc
router.get('/group-utc', catchAsync(dash.groupUtc))
router.get('/group-top50', catchAsync(dash.groupTop50))
router.get('/group-fourc', catchAsync(dash.groupFourc))
router.get('/group-topdealers/:division', catchAsync(dash.topdealers))
router.get('/download', catchAsync(dash.download))
router.get('/single/:division', catchAsync(dash.single))
router.get('/savannah-dashT3', catchAsync(dash.savannahDashT3))
router.get('/savannah-dashDOA', catchAsync(dash.savannahDashDOA))
router.get('/singledoa/:division', catchAsync(dash.singleDoa))
router.get('/singledealer/:division', catchAsync(dash.singleDealer))
router.get('/inspector/:division', catchAsync(dash.inspector))
router.get('/yunus/:division', catchAsync(dash.group))
router.get('/group/:division', catchAsync(dash.group))
router.get('/scc', catchAsync(dash.scc))

// cabs 4C heatmap
router.get('/heatmap/cabs', catchAsync(dash.cabsMap))

// cabs 4C heatmap
router.get('/heatmap/cabs', catchAsync(dash.cabsMap))
// router.get(
// 	'/heatmapClaims/:division/:area/:type',
// 	catchAsync(loadall.heatMapClaims),
// )
// cabs 4C heatmap
router.get('/prediction/cabs', catchAsync(dash.prediction))

// loadall claims claims heatmap
router.get('/heatmaploadallCabs', catchAsync(loadall.heatMapCabsClaims))

// loadall claims heatmap
router.get('/heatmap/:division/:type', catchAsync(loadall.heatMap))
router.get('/heatmapClaims/:division/:area/:type', catchAsync(loadall.heatMapClaims))
// loadall internal heatmap

router.get('/internalHeatmap/:division', catchAsync(loadall.internalHeatmap))
router.get('/internalHeatmapFaults/:division/:area', catchAsync(loadall.internalHeatMapFaults))

// loadall dpu back to cabs
router.get('/nffCabs/:start/:end', catchAsync(dpu.nffCabs))
router.post('/nffCabs/:start/:end', catchAsync(dpu.nffCabs))

// loadall dpu
router.get('/dpu/:division', catchAsync(dpu.overview))
router.get('/dpuTrack/:division', catchAsync(dpu.track))
router.get('/dpuTrackEff/:division', catchAsync(dpu.trackEff))
router.post('/dpuTrackEff/:division', catchAsync(dpu.trackEff))

router.post('/createIgnore', isLoadallDPU, catchAsync(dpu.createIgnore))
router.post('/dpuTrack/:division', catchAsync(dpu.track))
router.get('/dpuTrackQuality/:division', catchAsync(dpu.trackQuality))
router.get('/notFixed/:area/:division', catchAsync(dpu.notFixed))
router.get('/dpu/:division/:area', catchAsync(dpu.zone))
router.get('/dpuFaultData/:bu/:area/:part', catchAsync(dpu.zoneFaultData))
router.get('/escapes/:bu/:area', catchAsync(dpu.escapes))
router.get('/top5escapes/:bu/:area', catchAsync(dpu.top5escapes))

// loadall dpu daily
router.get('/dpuD/:division', catchAsync(dpu.overviewD))
router.get('/dpuD/:division/:area', catchAsync(dpu.zoneD))
router.get('/over3D/:area', catchAsync(dpu.over3D))
router.get('/dpuFaultDataD/:bu/:area/:part', catchAsync(dpu.zoneFaultDataD))
router.get('/dpuFaultDataFilterD/:bu/:area/:part', catchAsync(dpu.zoneFaultDataFilterD))
router.get('/escapesD/:bu/:area', catchAsync(dpu.escapesD))
router.get('/top5escapesD/:bu/:area', catchAsync(dpu.top5escapesD))
router.get('/top5escapesDetailD/:bu/:area/:number', catchAsync(dpu.top5escapesDetailD))
router.get('/notFixedD/:area/:division', catchAsync(dpu.notFixedD))
router.get('/notRFTD/:area/:division', catchAsync(dpu.notRFTD))

//no shortages
router.get('/trackFaultsInArea/:division/:area/:startTime/:endTime', catchAsync(dpu.pickedUpInArea))

router.get('/trackFaultsForward/:division/:area/:startTime/:endTime', catchAsync(dpu.sentForward))
router.get('/trackFaultsFixedInArea/:division/:area/:startTime/:endTime', catchAsync(dpu.fixedInArea))
router.get('/trackFaultsEscapedArea/:division/:area/:startTime/:endTime', catchAsync(dpu.escapedArea))
router.get('/trackFaultsShortage/:division/:area/:startTime/:endTime', catchAsync(dpu.shortage))
router.get('/totest/:startTime/:endTime', catchAsync(dpu.toTest))
router.get('/toPDI/:startTime/:endTime', catchAsync(dpu.toPDI))
router.get('/faultstotest/:startTime/:endTime', catchAsync(dpu.faultsToTest))
router.get('/shortstotest/:startTime/:endTime', catchAsync(dpu.shortsToTest))
router.get('/notRFT/:area/:division', catchAsync(dpu.notRFT))

router.get('/sip/all/:division', catchAsync(dpu.allSips))
router.route('/sip/edit/:id').get(catchAsync(dpu.ShowUpdateSipForm)).post(catchAsync(dpu.updateSip))

router.get('/top5escapesDetail/:bu/:area/:number', catchAsync(dpu.top5escapesDetail))
router.get('/dpuFaultDataFilter/:bu/:area/:part', catchAsync(dpu.zoneFaultDataFilter))

router.get('/over3/:area', catchAsync(dpu.over3))

router.get('/area/:zones/:division', catchAsync(dash.zone))
router.get('/area/:zones/:division/claimsyear', catchAsync(dash.claimsThisYear))

router.get('/area/:zones/:division/claimsmonth', catchAsync(dash.claimsThisMonth))
router.get('/area/:zones/:division/claimsweek', catchAsync(dash.claimsThisWeek))

router.get('/qsmart/:area/:division', catchAsync(dash.dashQSmart))
router.get('/componentDivision/:businessUnit/:division', catchAsync(dash.divFaults))

//////////////////with shortages for dale cabs nff map
router.get('/trackFaultsInAreaAll/:division/:area/:startTime/:endTime', catchAsync(dpu.pickedUpInAreaAll))

router.get('/trackFaultsForwardAll/:division/:area/:startTime/:endTime', catchAsync(dpu.sentForwardAll))
router.get('/trackFaultsToCFC/:startTime/:endTime', catchAsync(dpu.faultsToCFC))
router.get('/trackFaultsFixedInAreaAll/:division/:area/:startTime/:endTime', catchAsync(dpu.fixedInAreaAll))

/////////////////////////////////////////////

router.get('/component/:division', catchAsync(dash.componentInternal))
router.get('/ecomponent/:division', catchAsync(dash.componentExternal))

router.get('/effHistory/:division', catchAsync(dash.effHistory))

router.get('/downloadComponent/:division/:code', catchAsync(dash.downloadComponent))

//download stage 12
//   http://localhost/dash/stage12download
router.get('/stage12download', catchAsync(dash.stage12Download))

//download cabs open faults
router.get('/cabsopenfaultsdownload', catchAsync(dash.cabsFaultsDownload))

//quality managment dash dealer
router.get('/qmrc/:division', catchAsync(dash.qmrc2))
//quality managment dash customer
router.get('/qmrd/:division', catchAsync(dash.qmrd2))

// update qmr data
router.post('/updateQmr/:id', isDiv, isQmr, catchAsync(dash.updateQmr))
// update qmr data cuetomer
router.post('/updateQmrC/:id', isDiv, isQmr, catchAsync(dash.updateQmrCustomer))

//quality managment dash Cabd dealer
router.get('/qmrccabs/:division', catchAsync(dash.qmrcCabs))
//quality managment dash Cabs customer
router.get('/qmrdcabs', catchAsync(dash.qmrdCabs))

// update qmr data
router.post('/updateCabsMri/:id', isDiv, isQmr, catchAsync(dash.updateCabsMri))

//data for josh wilcox

//doa rft
router.get('/josh/doa-rft', catchAsync(josh.doaRft))

//t3 dpu
router.get('/josh/t3-dpu', catchAsync(josh.t3Dpu))

//robot eff month
router.get('/josh/robot-eff', catchAsync(josh.robots))

//robot eff week
router.get('/josh/robot-eff-week', catchAsync(josh.robotsWeek))

//robot eff week by bu
router.get('/josh/robot-effWeek/:shortBu', catchAsync(josh.robotsWeekBu))

//robot eff
router.get('/josh/bu-eff', catchAsync(josh.businessUnits))

module.exports = router
