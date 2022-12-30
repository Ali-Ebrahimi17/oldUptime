const CfcTopFive = require('../models/cfcTopFive')
const Area = require('../models/area')
const Doa25pt = require('../models/doa25pt')

const axios = require('axios')

const moment = require('moment')

const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0)
const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division, type } = req.params

	const searchOptions = { division, type }

	if (req.query.status != null && req.query.status != '') {
		searchOptions.status = new RegExp(escapeRegex(req.query.status), 'gi')
	}

	const clfcTopFives = await CfcTopFive.find(searchOptions)
	const areas1 = await Area.find({ division: division }).sort({ name: '' })

	let thisMonthText = moment().subtract(0, 'months').format('MMM')
	let oneMonthAgoText = moment().subtract(1, 'months').format('MMM')
	let twoMonthsAgoText = moment().subtract(2, 'months').format('MMM')
	let threeMonthsAgoText = moment().subtract(3, 'months').format('MMM')
	let fourMonthsAgoText = moment().subtract(4, 'months').format('MMM')
	let fiveMonthsAgoText = moment().subtract(5, 'months').format('MMM')
	let sixMonthsAgoText = moment().subtract(6, 'months').format('MMM')
	let sevenMonthsAgoText = moment().subtract(7, 'months').format('MMM')

	let sevenMonthsAgoNumber = moment().subtract(7, 'months').format('MM')
	let sevenMonthsAgoNumberY = moment().subtract(7, 'months').format('YYYY')
	let sixMonthsAgoNumber = moment().subtract(6, 'months').format('MM')
	let sixMonthsAgoNumberY = moment().subtract(6, 'months').format('YYYY')
	let fiveMonthsAgoNumber = moment().subtract(5, 'months').format('MM')
	let fiveMonthsAgoNumberY = moment().subtract(5, 'months').format('YYYY')
	let fourMonthsAgoNumber = moment().subtract(4, 'months').format('MM')
	let fourMonthsAgoNumberY = moment().subtract(4, 'months').format('YYYY')
	let threeMonthsAgoNumber = moment().subtract(3, 'months').format('MM')
	let threeMonthsAgoNumberY = moment().subtract(3, 'months').format('YYYY')
	let twoMonthsAgoNumber = moment().subtract(2, 'months').format('MM')
	let twoMonthsAgoNumberY = moment().subtract(2, 'months').format('YYYY')
	let oneMonthAgoNumber = moment().subtract(1, 'months').format('MM')
	let oneMonthAgoNumberY = moment().subtract(1, 'months').format('YYYY')
	let thisMonthNumber = moment().subtract(0, 'months').format('MM')
	let thisMonthNumberY = moment().subtract(0, 'months').format('YYYY')

	const openAll = await CfcTopFive.countDocuments({
		status: 'Open',
		type,
		division,
	})
	const containedAll = await CfcTopFive.countDocuments({
		status: 'Contained',
		type,
		division,
	})
	const closedAll = await CfcTopFive.countDocuments({
		status: 'Closed',
		type,
		division,
	})

	const top5 = await CfcTopFive.aggregate([
		{
			$match: {
				type,
				division,
			},
		},
		// {
		// 	$match : {
		// 		date : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		// {
		// 	$project : {
		// 		week : { $week: '$dateToStage' },
		// 	},
		// },
		{
			$group: {
				_id: '$area',
				status: { $push: '$status' },
				count: { $sum: 1 },
			},
		},
		{
			$addFields: {
				openNum: 0,
				openPercent: 0,
				containedNum: 0,
				containedPercent: 0,
				closedNum: 0,
				closedPercent: 0,
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]).limit(5)

	for (let t of top5) {
		t.openNum += countOccurrences(t.status, 'Open')
		t.openPercent += (countOccurrences(t.status, 'Open') / t.count) * 100
		t.containedNum += countOccurrences(t.status, 'Contained')
		t.containedPercent += (countOccurrences(t.status, 'Contained') / t.count) * 100
		t.closedNum += countOccurrences(t.status, 'Closed')
		t.closedPercent += (countOccurrences(t.status, 'Closed') / t.count) * 100
	}

	// new stuff
	const startTimeAPI = new Date()
	startTimeAPI.setHours(00, 00, 00, 00)
	const endTimeAPI = new Date()
	endTimeAPI.setHours(23, 59, 0, 0)
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
	let newFaultsOutOfOBay = []
	let newShortageOutOfOBay = []

	const theHour = 1

	let startDateAPI = moment().subtract(theHour, 'hours').format('YYYY/MM/DD/00/00')
	let endDateAPI = moment().add(theHour, 'hours').format('YYYY/MM/DD/23/59')

	const stage16Response = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/16/${startDateAPI}/${endDateAPI}`)

	// add hours to timestamp
	Date.prototype.addHours = function (h) {
		this.setHours(this.getHours() + h)
		return this
	}

	if (stage16Response && stage16Response.data) {
		stage16Number = stage16Response.data.length
		stage16MacinesData = stage16Response.data
		for (let s of stage16MacinesData) {
			let d = new Date(s.dateToStage)
			let time = d.addHours(-1)
			s.dateToStage = time
		}
	} else {
		stage16Number = 0
		stage16MacinesData = []
	}

	const stage16Start = moment().subtract(2, 'months').format('YYYY/MM/DD/HH/mm')

	let areas = ['Cycle Test New', 'Layered PDI Inspection']

	const stage16FaultsResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${stage16Start}/${endDateAPI}}/1`)
	let noDate = new Date('2020, 01, 01')

	if (stage16FaultsResponse && stage16FaultsResponse.data) {
		stage16FaultsResponseData1 = stage16FaultsResponse.data
	} else {
		stage16FaultsResponseData1 = []
	}

	let stage16FaultsResponseData0 = stage16FaultsResponseData1.filter((item) => item['Fault Code'] !== 'Scale')

	let stage16FaultsResponseData = stage16FaultsResponseData0.filter(
		(item) => (item['Fault Area'] !== 'Shot & Paint' && item['Fault Code'] !== 'Paintwork') || item['Fault Code'] !== 'Paintwork'
	)

	for (let s of stage16MacinesData) {
		for (let f of stage16FaultsResponseData) {
			if (
				s.buildNo === f['Build Number'] &&
				(new Date(f['Fixed Date']) > new Date(s.dateToStage) || new Date(f['Fixed Date']) < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] !== 'Shortage' &&
				!areas.includes(f.Zone)
			) {
				f.dateToStage = s.dateToStage
				newFaultsOutOfOBay.push(f)
			}
			if (
				s.buildNo === f['Build Number'] &&
				(new Date(f['Fixed Date']) > new Date(s.dateToStage) || new Date(f['Fixed Date']) < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] === 'Shortage' &&
				!areas.includes(f.Zone)
			) {
				f.dateToStage = s.dateToStage
				newShortageOutOfOBay.push(f)
			}
		}
	}

	let sentTo16Number = newFaultsOutOfOBay.length
	let sentTo16NumberSh = newShortageOutOfOBay.length
	let sentTo16All = +sentTo16Number + +sentTo16NumberSh

	if (stage16Number > 0) {
		sentTo16Dpu = (newFaultsOutOfOBay.length / stage16Number).toFixed(2)
		sentTo16DpuSh = (newShortageOutOfOBay.length / stage16Number).toFixed(2)
		sentTo16DpuAll = (sentTo16All / stage16Number).toFixed(2)
	} else {
		sentTo16Dpu = '0.00'
		sentTo16DpuSh = '0.00'
		sentTo16DpuAll = '0.00'
	}

	let faultsTo18 = []
	let faultsTo18Sh = []

	const stage18Response = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/18/${startDateAPI}/${endDateAPI}`)

	// console.log(stage18Response)

	if (stage18Response && stage18Response.data) {
		stage18Number = stage18Response.data.length
		stage18MacinesData = stage18Response.data
		for (let s of stage18MacinesData) {
			let d = new Date(s.dateToStage)
			let time = d.addHours(-1)
			s.dateToStage = time
		}
	} else {
		stage18Number = 0
		stage18MacinesData = []
	}

	const stage18Start = moment().subtract(2, 'months').format('YYYY/MM/DD/HH/mm')

	const stage18FaultsResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${stage18Start}/${endDateAPI}}/1`)

	if (stage18FaultsResponse && stage18FaultsResponse.data) {
		stage18FaultsResponseData1 = stage18FaultsResponse.data
	} else {
		stage18FaultsResponseData1 = []
	}

	let stage18FaultsResponseData0 = stage18FaultsResponseData1.filter((item) => item['Fault Code'] !== 'Scale')

	let pdiAreas = ['Layered PDI Inspection']

	let stage18FaultsResponseData = stage18FaultsResponseData0.filter(
		(item) => (item['Fault Area'] !== 'Shot & Paint' && item['Fault Code'] !== 'Paintwork') || item['Fault Code'] !== 'Paintwork'
	)

	for (let s of stage18MacinesData) {
		for (let f of stage18FaultsResponseData) {
			d1 = new Date(f['Fixed Date'])
			d2 = new Date(d1)
			d2.setMinutes(d1.getMinutes() - 10) // give 5 mins grace to pass faults off after bookning to stage 20
			if (
				s.buildNo === f['Build Number'] &&
				(d2 > new Date(s.dateToStage) || d2 < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] !== 'Shortage' &&
				!pdiAreas.includes(f.Zone)
			) {
				f.dateToStage = s.dateToStage
				faultsTo18.push(f)
			}
			if (
				s.buildNo === f['Build Number'] &&
				(d2 > new Date(s.dateToStage) || d2 < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] === 'Shortage' &&
				!pdiAreas.includes(f.Zone)
			) {
				f.dateToStage = s.dateToStage
				faultsTo18Sh.push(f)
			}
		}
	}

	let sentTo18Number = faultsTo18.length
	let sentTo18NumberSh = faultsTo18Sh.length
	let sentTo18All = +sentTo18Number + +sentTo18NumberSh

	let sentTo18Dpu = (faultsTo18.length / stage18Number).toFixed(2)
	let sentTo18DpuSh = (faultsTo18Sh.length / stage18Number).toFixed(2)
	let sentTo18DpuAll = (sentTo18All / stage18Number).toFixed(2)

	// end of stage 18

	// start of stage 19

	let faultsTo19 = []
	let faultsTo19Sh = []

	const stage19Response = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/19/${startDateAPI}/${endDateAPI}`)

	// console.log(stage18Response)

	if (stage19Response && stage19Response.data) {
		stage19Number = stage19Response.data.length
		stage19MacinesData = stage19Response.data
		for (let s of stage19MacinesData) {
			let d = new Date(s.dateToStage)
			let time = d.addHours(-1)
			s.dateToStage = time
		}
	} else {
		stage19Number = 0
		stage19MacinesData = []
	}

	const stage19Start = moment().subtract(2, 'months').format('YYYY/MM/DD/HH/mm')

	const stage19FaultsResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${stage19Start}/${endDateAPI}}/1`)

	if (stage19FaultsResponse && stage19FaultsResponse.data) {
		stage19FaultsResponseData1 = stage19FaultsResponse.data
	} else {
		stage19FaultsResponseData1 = []
	}

	let stage19FaultsResponseData0 = stage19FaultsResponseData1.filter((item) => item['Fault Code'] !== 'Scale')

	let stage19FaultsResponseData = stage19FaultsResponseData0.filter(
		(item) =>
			(item['Fault Area'] !== 'Shot & Paint' && item['Fault Code'] !== 'Paintwork') ||
			item['Fault Code'] !== 'Paintwork' ||
			item['Fault Code'] !== 'Scale'
	)

	for (let s of stage19MacinesData) {
		for (let f of stage19FaultsResponseData) {
			d1 = new Date(f['Fixed Date'])
			d2 = new Date(d1)
			d2.setMinutes(d1.getMinutes() - 10) // give 5 mins grace to pass faults off after bookning to stage 20
			if (
				s.buildNo === f['Build Number'] &&
				(d2 > new Date(s.dateToStage) || d2 < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] !== 'Shortage'
			) {
				f.dateToStage = s.dateToStage
				faultsTo19.push(f)
			}
			if (
				s.buildNo === f['Build Number'] &&
				(d2 > new Date(s.dateToStage) || d2 < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] === 'Shortage'
			) {
				f.dateToStage = s.dateToStage
				faultsTo19Sh.push(f)
			}
		}
	}

	let sentTo19Number = faultsTo19.length
	let sentTo19NumberSh = faultsTo19Sh.length
	let sentTo19All = +sentTo19Number + +sentTo19NumberSh

	let sentTo19Dpu = (faultsTo19.length / stage19Number).toFixed(2)
	let sentTo19DpuSh = (faultsTo19Sh.length / stage19Number).toFixed(2)
	let sentTo19DpuAll = (sentTo19All / stage19Number).toFixed(2)

	//end stage 19

	let faultsToCFC = []
	let faultsToCFCSh = []

	const stage20Response = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/20/${startDateAPI}/${endDateAPI}`)

	if (stage20Response && stage20Response.data) {
		stage20Number = stage20Response.data.length
		stage20MacinesData = stage20Response.data
		for (let s of stage20MacinesData) {
			let d = new Date(s.dateToStage)
			let time = d.addHours(-1)
			s.dateToStage = time
		}
	} else {
		stage20Number = 0
		stage20MacinesData = []
	}

	const stage20Start = moment().subtract(2, 'months').format('YYYY/MM/DD/HH/mm')

	const stage20FaultsResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${stage20Start}/${endDateAPI}}/1`)

	if (stage20FaultsResponse && stage20FaultsResponse.data) {
		stage20FaultsResponseData1 = stage20FaultsResponse.data
	} else {
		stage20FaultsResponseData1 = []
	}

	let stage20FaultsResponseData0 = stage20FaultsResponseData1.filter((item) => item['Fault Code'] !== 'Scale')

	let stage20FaultsResponseData = stage20FaultsResponseData0.filter(
		(item) => (item['Fault Area'] !== 'Shot & Paint' && item['Fault Code'] !== 'Paintwork') || item['Fault Code'] !== 'Paintwork'
	)

	for (let s of stage20MacinesData) {
		for (let f of stage20FaultsResponseData) {
			d1 = new Date(f['Fixed Date'])
			d2 = new Date(d1)
			d2.setMinutes(d1.getMinutes() - 10) // give 5 mins grace to pass faults off after bookning to stage 20
			if (
				s.buildNo === f['Build Number'] &&
				(d2 > new Date(s.dateToStage) || d2 < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] !== 'Shortage'
			) {
				f.dateToStage = s.dateToStage
				faultsToCFC.push(f)
			}
			if (
				s.buildNo === f['Build Number'] &&
				(d2 > new Date(s.dateToStage) || d2 < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] === 'Shortage'
			) {
				f.dateToStage = s.dateToStage
				faultsToCFCSh.push(f)
			}
		}
	}

	let sentTo20Number = faultsToCFC.length
	let sentTo20NumberSh = faultsToCFCSh.length
	let sentTo20All = +sentTo20Number + +sentTo20NumberSh

	let sentTo20Dpu = (faultsToCFC.length / stage20Number).toFixed(2)
	let sentTo20DpuSh = (faultsToCFCSh.length / stage20Number).toFixed(2)
	let sentTo20DpuAll = (sentTo20All / stage20Number).toFixed(2)

	res.render('cfcTopFives/all', {
		division,
		clfcTopFives,
		areas1,
		openAll,
		containedAll,
		closedAll,
		top5,
		type,
		thisMonthText,
		oneMonthAgoText,
		twoMonthsAgoText,
		threeMonthsAgoText,
		fourMonthsAgoText,
		fiveMonthsAgoText,
		sixMonthsAgoText,
		sevenMonthsAgoText,

		// post0BayArr,
		stage16Number,
		stage16MacinesData,
		newFaultsOutOfOBay,
		newShortageOutOfOBay,
		sentTo16Number,
		sentTo16NumberSh,
		sentTo16Dpu,
		sentTo16DpuSh,
		sentTo16DpuAll,

		stage18MacinesData,
		stage18Number,
		faultsTo18,
		faultsTo18Sh,
		sentTo18Number,
		sentTo18NumberSh,
		sentTo18Dpu,
		sentTo18DpuSh,
		sentTo18DpuAll,

		stage19MacinesData,
		stage19Number,
		faultsTo19,
		faultsTo19Sh,
		sentTo19Number,
		sentTo19NumberSh,
		sentTo19Dpu,
		sentTo19DpuSh,
		sentTo19DpuAll,

		stage20MacinesData,
		stage20Number,
		faultsToCFC,
		faultsToCFCSh,
		sentTo20Number,
		sentTo20NumberSh,
		sentTo20Dpu,
		sentTo20DpuSh,
		sentTo20DpuAll,
	})
}

module.exports.createNew = async (req, res) => {
	const topFive = new CfcTopFive(req.body)
	const division = 'LDL'

	topFive.status = 'Open'
	topFive.type = 'CFC'
	topFive.division = division

	await topFive.save()

	const type = topFive.type

	res.redirect(`/cfc-top-five/all/LDL/CFC`)
}

module.exports.edit = async (req, res) => {
	const { id } = req.params

	if (req.user.isCFCTop5) {
		updated = await CfcTopFive.findByIdAndUpdate(id, {
			...req.body,
			updatedBy: req.user.firstName + ' ' + req.user.lastName,
		})
	} else {
		updated = await CfcTopFive.findByIdAndUpdate(id, {
			status: req.body.status,
			comments: req.body.comments,
			containment: req.body.containment,
			closure: req.body.closure,
			action: req.body.action,
			containCutIn: req.body.containCutIn,
			closeCutIn: req.body.closeCutIn,
			updatedBy: req.user.firstName + ' ' + req.user.lastName,
		})
	}

	const type = updated.type

	res.redirect(`/cfc-top-five/all/LDL/CFC`)
}

// // delete claim
// module.exports.delete = async (req, res) => {
// 	const { id } = req.params
// 	await Area.findByIdAndDelete(id)
// 	req.flash('success', 'Successfully deleted area')
// 	res.redirect('/')
// }
