const QSmart = require('../models/qSmart')
const Stage = require('../models/stage')
const Stage12 = require('../models/stage12')
const Ignore = require('../models/ignore')
const Stage16 = require('../models/stage16')
const Stage17 = require('../models/stage17')
const Stage19 = require('../models/stage19')
const Throughput = require('../models/throughput')
const Day = require('../models/day')
const Sip = require('../models/sip')
const Inspector = require('../models/inspector')
const Claim = require('../models/claim')

const Json2csvParser = require('json2csv').Parser
const fs = require('fs')

const moment = require('moment')
const axios = require('axios')
let momentDays = require('moment-business-days')
moment.updateLocale('gb', {
	workingWeekdays: [1, 2, 3, 4, 5],
})

const lastSevenDaysForDash = moment().subtract(6, 'days').format('DD/MM/YYYY')
const lastSevenDaysString = moment().subtract(6, 'days').format('YYYY, MM, DD')
const lastSevenDays = new Date(lastSevenDaysString)
lastSevenDays.setHours(1, 0, 0, 0)
const lastSixWeeksForDash = moment().subtract(42, 'days').format('DD/MM/YYYY')
const lastSixWeeksString = moment().subtract(42, 'days').format('YYYY, MM, DD')
const lastSixWeeks = new Date(lastSixWeeksString)
lastSixWeeks.setHours(1, 0, 0, 0)
const today = new Date()
today.setHours(0, 0, 0, 0)

const firstOfJuly = new Date('2022, 01, 01')
let theWeek = moment().format('WW')
const theHour = 0

const extra = [
	{
		_id: { week: 1 },
	},
	{
		_id: { week: 2 },
	},
	{
		_id: { week: 3 },
	},
	{
		_id: { week: 4 },
	},
	{
		_id: { week: 5 },
	},
	{
		_id: { week: 6 },
	},
	{
		_id: { week: 7 },
	},
	{
		_id: { week: 8 },
	},
	{
		_id: { week: 9 },
	},
	{
		_id: { week: 10 },
	},
	{
		_id: { week: 11 },
	},
	{
		_id: { week: 12 },
	},
	{
		_id: { week: 13 },
	},
	{
		_id: { week: 14 },
	},
	{
		_id: { week: 15 },
	},
	{
		_id: { week: 16 },
	},
	{
		_id: { week: 17 },
	},
	{
		_id: { week: 18 },
	},
	{
		_id: { week: 19 },
	},
	{
		_id: { week: 20 },
	},
	{
		_id: { week: 21 },
	},
	{
		_id: { week: 22 },
	},
	{
		_id: { week: 23 },
	},
	{
		_id: { week: 24 },
	},
	{
		_id: { week: 25 },
	},
	{
		_id: { week: 26 },
	},
	{
		_id: { week: 27 },
	},
	{
		_id: { week: 28 },
	},
	{
		_id: { week: 29 },
	},
	{
		_id: { week: 30 },
	},
	{
		_id: { week: 31 },
	},
	{
		_id: { week: 32 },
	},
	{
		_id: { week: 33 },
	},
	{
		_id: { week: 34 },
	},
	{
		_id: { week: 35 },
	},
	{
		_id: { week: 36 },
	},
	{
		_id: { week: 37 },
	},
	{
		_id: { week: 38 },
	},
	{
		_id: { week: 39 },
	},
	{
		_id: { week: 40 },
	},
	{
		_id: { week: 41 },
	},
	{
		_id: { week: 42 },
	},
	{
		_id: { week: 43 },
	},
	{
		_id: { week: 44 },
	},
	{
		_id: { week: 45 },
	},
	{
		_id: { week: 46 },
	},
	{
		_id: { week: 47 },
	},
	{
		_id: { week: 48 },
	},
	{
		_id: { week: 49 },
	},
	{
		_id: { week: 50 },
	},
	{
		_id: { week: 51 },
	},
	{
		_id: { week: 52 },
	},
]

module.exports.overview = async (req, res) => {
	// start if api
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
	const { division } = req.params

	let buNumber = 19
	let fullDivision

	if (division === 'BHL') {
		buNumber = 18
		fullDivision = 'Backhoe'
	}

	if (division === 'LDL') {
		buNumber = 19
		fullDivision = 'Loadall'
	}
	const newStartTimeFormat = moment(lastSixWeeks).format(`YYYY-MM-DDT00:00:00.000Z`)

	const newEndTimeFormat = moment().format(`YYYY-MM-DDT23:59:00.000Z`)

	let startDateAPI = moment(lastSixWeeks).subtract(theHour, 'hours').format('YYYY/MM/DD/00/00')
	let endDateAPI = moment().add(theHour, 'hours').format('YYYY/MM/DD/23/59')

	const apiResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/${buNumber}/${startDateAPI}/${endDateAPI}}/1`)

	if (apiResponse.status === 200 && apiResponse.data) apiResult = apiResponse.data.filter((fault) => fault['Production Line'] !== 'P712')

	apiResult.forEach((fault) => {
		fault['Created Date'] = new Date(fault['Created Date'])
		fault.week = +moment(fault['Created Date']).format('WW')
	})

	// const handleDates = (list, prop) => {
	// 	return list.map((item) => {
	// 		const obj = Object.assign({}, item)
	// 		obj[prop] = new Date(obj[prop])
	// 		return obj
	// 	})
	// }

	// console.log(handleDates(apiResult, 'Created Date'))

	let apiResultNoShortage = apiResult.filter((item) => item['Fault Code'] !== 'Shortage')

	const counts = apiResultNoShortage.reduce((p, c) => {
		let name = c['Fault Area']
		if (!p.hasOwnProperty(name)) {
			p[name] = 0
		}
		p[name]++
		return p
	}, {})

	const areas = Object.keys(counts)
		.map((k) => {
			return { _id: k, count: counts[k] }
		})
		.sort((a, b) => b.count - a.count)

	let weekCounts = apiResultNoShortage.reduce((p, c) => {
		let name = c.week
		if (!p.hasOwnProperty(name)) {
			p[name] = 0
		}
		p[name]++
		return p
	}, {})

	const allFaultsWithoutShortages = Object.keys(weekCounts)
		.map((k) => {
			return {
				_id: { week: +k },
				count: weekCounts[k],
				dpu: 0,
				build: 0,
				target: 6,
			}
		})
		.sort((a, b) => a._id - b._id)

	const totalNumberOfFaults = apiResultNoShortage.length

	let top10FaultCount = 0

	const top10Faults = areas.slice(0, 10)

	for (let f of top10Faults) {
		top10FaultCount += f.count
	}

	const top10Percent = Math.round((top10FaultCount / totalNumberOfFaults) * 100)

	const allFaults = apiResultNoShortage.length

	const stage12 = await Stage12.aggregate([
		// {
		// 	$match : {
		// 		// date : { $gte: firstOfJuly },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		// {
		// 	$match : {
		// 		date : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		{
			$project: {
				week: { $week: '$dateToStage' },
			},
		},
		{
			$group: {
				_id: '$week',
				status: { $push: '$status' },
				count: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	])

	for (let f of allFaultsWithoutShortages) {
		for (let s of stage12) {
			if (s._id === f._id.week) {
				f.build = s.count
			}
		}
	}

	for (let f of allFaultsWithoutShortages) {
		if (f.build > 0) {
			f.dpu = (f.count / f.build).toFixed(2)
		}
	}

	for (let e of extra) {
		if (e._id.week > +theWeek) {
			allFaultsWithoutShortages.push(e)
		}
	}

	res.render('dash/loadallDPUOverview', {
		division,
		areas,
		allFaults,
		allFaultsWithoutShortages,
		totalNumberOfFaults,
		top10Percent,
		fullDivision,
	})
}
module.exports.zone = async (req, res) => {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
	let { division, area } = req.params

	let buNumber = 19
	let fullDivision

	if (division === 'BHL') {
		buNumber = 18
		fullDivision = 'Backhoe'
	}

	if (division === 'LDL') {
		buNumber = 19
		fullDivision = 'Loadall'
	}

	let startDateAPI = moment(lastSixWeeks).subtract(theHour, 'hours').format('YYYY/MM/DD/00/00')
	let endDateAPI = moment().add(theHour, 'hours').format('YYYY/MM/DD/23/59')

	const apiResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/${buNumber}/${startDateAPI}/${endDateAPI}}/1`)

	if (apiResponse.status === 200 && apiResponse.data) apiResult = apiResponse.data.filter((fault) => fault['Production Line'] !== 'P712')

	apiResult.forEach((fault) => {
		fault['Created Date'] = new Date(fault['Created Date'])
		fault.week = +moment(fault['Created Date']).format('WW')
	})

	const getUniqueBy = (arr, prop) => {
		const set = new Set()
		return arr.filter((o) => !set.has(o[prop]) && set.add(o[prop]))
	}

	let apiResultNoShortage = apiResult.filter((item) => item['Fault Code'] !== 'Shortage' && item['Fault Area'] === area)

	const counts = apiResultNoShortage.reduce((p, c) => {
		let name = c['User Defined Test']
		if (!p.hasOwnProperty(name)) {
			p[name] = 0
		}
		p[name]++
		return p
	}, {})

	const issuesAll = Object.keys(counts)
		.map((k) => {
			return { _id: k, count: counts[k] }
		})
		.sort((a, b) => b.count - a.count)

	const issues = issuesAll.slice(0, 5)

	let faultsArr = []
	for (let i of issues) {
		let theFault = apiResultNoShortage.filter((item) => item['User Defined Test'] === i._id)
		faultsArr.push(theFault)
		let weekCounts = theFault.reduce((p, c) => {
			let name = c.week
			if (!p.hasOwnProperty(name)) {
				p[name] = 0
			}
			p[name]++
			return p
		}, {})

		const graphData = Object.keys(weekCounts)
			.map((k) => {
				return {
					_id: { week: +k },
					count: weekCounts[k],
				}
			})
			.sort((a, b) => a._id - b._id)
		i.graph = graphData
	}

	// I am here

	const stage = await Stage.find({ name: area })

	let areas = []
	let theSipStation = 'N/A'
	let theTarget = 0

	if (stage.length > 0) {
		if (area === 'Track 3 Zone 1') {
			areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1']
			theSipStation = 'Track 3 Zone 1'
		} else if (area === 'Track 3 Zone 2') {
			areas = ['Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
			theSipStation = 'Track 3 Zone 1'
		} else {
			areas = [area]
		}
		theTarget = stage[0].target
		theSipStation = stage[0].sip
	}

	let allEscapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
				Zone: { $nin: areas },
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	let allFaultsForNotFixed = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Code']: { $ne: 'Shortage' },
				['Zone']: { $in: areas },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])
	let allFaults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Code']: { $ne: 'Shortage' },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])
	let allFoundFaults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Fault Code']: { $ne: 'Shortage' },
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				Zone: { $in: areas },
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	const effPercent = Math.round((allFoundFaults.length / allFaults.length) * 100)

	let startDateSevenDaysAgo = moment().subtract(42, 'days').format('YYYY/MM/DD/00/00')
	// let endDate = moment().subtract(30, 'days').format('YYYY/MM/DD/00/00')
	let endDateNow = moment().format('YYYY/MM/DD/kk/mm')

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	const track3 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/TRACK 3 SIP 2/${startDateSevenDaysAgo}/${endDateNow}`)

	const track1 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/SIP 5 NEW/${startDateSevenDaysAgo}/${endDateNow}`)

	if (track1.data) {
		track1Builds = track1.data.map((build) => build.buildNo)
	} else {
		track1Builds = []
	}
	if (track3.data) {
		track3Builds = track3.data.map((build) => build.buildNo)
	} else {
		track3Builds = []
	}

	let allBuildCount = track1.data.length + track3.data.length
	let allBuildNumbers = []

	// const allBuild = await Day.aggregate([
	// 	{
	// 		$match : {
	// 			date : { $gte: firstOfJuly },
	// 			// eff       : { $gt: 0 },
	// 			// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
	// 		},
	// 	},
	// ])

	// for (let b of allBuild) {
	// 	allBuildCount += b.build
	// }
	for (let f of allFaults) {
		allBuildNumbers.push(f['Build Number'])
	}

	let uniqueBuildsWithFaults = [...new Set(allBuildNumbers)]

	if (theSipStation === 'N/A') {
		allEscapes = []
	}

	const rftAmount = allBuildCount - uniqueBuildsWithFaults.length

	const rftPercent = Math.round((rftAmount / allBuildCount) * 100)

	// console.log(allFaults.length)

	issuesOver2Arr = issuesAll.filter((item) => item.count > 2)

	const countsOver2 = issuesOver2Arr.reduce((p, c) => {
		let name = c['User Defined Test']
		if (!p.hasOwnProperty(name)) {
			p[name] = 0
		}
		p[name]++
		return p
	}, {})

	const issuesOver2Data = Object.keys(counts)
		.map((k) => {
			return { _id: k, count: counts[k] }
		})
		.sort((a, b) => b.count - a.count)

	issuesOver2 = issuesOver2Arr.length

	issuesOver4Arr = issuesAll.filter((item) => item.count > 4)

	const countsOver4 = issuesOver2Arr.reduce((p, c) => {
		let name = c['User Defined Test']
		if (!p.hasOwnProperty(name)) {
			p[name] = 0
		}
		p[name]++
		return p
	}, {})

	const issuesOver4Data = Object.keys(counts)
		.map((k) => {
			return { _id: k, count: counts[k] }
		})
		.sort((a, b) => b.count - a.count)

	issuesOver4 = issuesOver4Arr.length

	issuesOver6Arr = issuesAll.filter((item) => item.count > 6)
	const countsOver5 = issuesOver2Arr.reduce((p, c) => {
		let name = c['User Defined Test']
		if (!p.hasOwnProperty(name)) {
			p[name] = 0
		}
		p[name]++
		return p
	}, {})

	const issuesOver6Data = Object.keys(counts)
		.map((k) => {
			return { _id: k, count: counts[k] }
		})
		.sort((a, b) => b.count - a.count)

	issuesOver6 = issuesOver6Arr.length

	const build = await Day.aggregate([
		{
			$match: {
				date: { $gte: firstOfJuly },
				// eff       : { $gt: 0 },
				// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		// {
		// 	$match : {
		// 		date : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		{
			$project: {
				year: { $year: '$date' },
				week: { $week: '$date' },
				build: 1,
				faults: 1,
				target: 1,
			},
		},
		{
			$group: {
				_id: { year: '$year', week: '$week' },
				allBuild: { $sum: '$build' },
				allFaults: { $sum: '$faults' },
				target: { $avg: '$target' },
			},
		},

		{
			$addFields: {
				dpu: {
					$divide: ['$allFaults', '$allBuild'],
				},
			},
		},
		{
			$addFields: {
				averageDpu: {
					$round: ['$dpu', 2],
				},
			},
		},
		{ $sort: { _id: 1 } },
	])

	const days = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gte: firstOfJuly },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		// {
		// 	$match : {
		// 		['Created Date'] : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		{
			$project: {
				week: { $week: '$Created Date' },
			},
		},
		{
			$group: {
				_id: { week: '$week' },
				count: { $sum: 1 },
				// target    : { $avg: '$target' },
			},
		},

		{
			$addFields: {
				target: theTarget,
			},
		},
		{
			$addFields: {
				build: 0,
			},
		},
		{
			$addFields: {
				dpu: 0,
			},
		},
		// {
		// 	$addFields : {
		// 		averageDpu : {
		// 			$round : [
		// 				'$dpu',
		// 				2,
		// 			],
		// 		},
		// 	},
		// },
		{ $sort: { _id: 1 } },
	])

	for (let d of days) {
		for (let b of build) {
			if (b._id.week === d._id.week) {
				d.build = b.allBuild
				d.dpu = (d.count / d.build).toFixed(2)
			}
		}
	}

	const stage12 = await Stage12.aggregate([
		// {
		// 	$match : {
		// 		// date : { $gte: firstOfJuly },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		// {
		// 	$match : {
		// 		date : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		{
			$project: {
				week: { $week: '$dateToStage' },
			},
		},
		{
			$group: {
				_id: '$week',
				count: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	])

	const allFaultsWithoutShortages = await QSmart.aggregate([
		// {
		// 	$match : {
		// 		['Created Date'] : { $lt: today },
		// 	},
		// },
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: firstOfJuly },
				['Fault Code']: { $ne: 'Shortage' },
				['Fault Area']: area,
			},
		},
		{
			$project: {
				week: { $week: '$Created Date' },
			},
		},
		{
			$group: {
				_id: { week: '$week' },
				count: { $sum: 1 },
			},
		},
		{
			$addFields: {
				dpu: 0,
				build: 0,
				target: theTarget,
			},
		},
		{
			$match: {
				_id: {
					$nin: [{ week: 30 }, { week: 31 }, { week: 32 }],
				},
			},
		},
		{ $sort: { _id: 1 } },
	])

	for (let f of allFaultsWithoutShortages) {
		for (let s of stage12) {
			if (s._id === f._id.week) {
				f.build = s.count
			}
		}
	}
	// for (let f of allFaultsWithoutShortages) {
	// 	for (let b of build) {
	// 		if (b._id.week === f._id.week) {
	// 			f.build = b.allBuild
	// 		}
	// 	}
	// }
	for (let f of allFaultsWithoutShortages) {
		if (f.build > 0) {
			f.dpu = (f.count / f.build).toFixed(2)
		}
	}

	for (let e of extra) {
		if (e._id.week > +theWeek) {
			allFaultsWithoutShortages.push(e)
		}
	}

	let recs = []

	if (stage.length > 0) {
		if (stage[0].rec1 != '') {
			recs.push(stage[0].rec1)
		}
		if (stage[0].rec2 != '') {
			recs.push(stage[0].rec2)
		}
		if (stage[0].rec3 != '') {
			recs.push(stage[0].rec3)
		}
		if (stage[0].rec4 != '') {
			recs.push(stage[0].rec4)
		}
		if (stage[0].rec5 != '') {
			recs.push(stage[0].rec5)
		}
		if (stage[0].rec6 != '') {
			recs.push(stage[0].rec6)
		}
		if (stage[0].rec7 != '') {
			recs.push(stage[0].rec7)
		}
		if (stage[0].rec8 != '') {
			recs.push(stage[0].rec8)
		}
		if (stage[0].rec9 != '') {
			recs.push(stage[0].rec9)
		}
		if (stage[0].rec10 != '') {
			recs.push(stage[0].rec10)
		}
		if (stage[0].rec11 != '') {
			recs.push(stage[0].rec11)
		}
		if (stage[0].rec12 != '') {
			recs.push(stage[0].rec12)
		}
		if (stage[0].rec13 != '') {
			recs.push(stage[0].rec13)
		}
		if (stage[0].rec14 != '') {
			recs.push(stage[0].rec14)
		}
		if (stage[0].rec15 != '') {
			recs.push(stage[0].rec15)
		}
		if (stage[0].rec16 != '') {
			recs.push(stage[0].rec16)
		}
		if (stage[0].rec17 != '') {
			recs.push(stage[0].rec17)
		}
		if (stage[0].rec18 != '') {
			recs.push(stage[0].rec18)
		}
		if (stage[0].rec19 != '') {
			recs.push(stage[0].rec19)
		}
		if (stage[0].rec20 != '') {
			recs.push(stage[0].rec21)
		}
		if (stage[0].rec22 != '') {
			recs.push(stage[0].rec22)
		}
		if (stage[0].rec23 != '') {
			recs.push(stage[0].rec23)
		}
		if (stage[0].rec24 != '') {
			recs.push(stage[0].rec24)
		}
		if (stage[0].rec25 != '') {
			recs.push(stage[0].rec25)
		}
	}
	let allFaultsNotFixedInArea = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Zone']: { $in: areas },
				['Fault Code']: { $ne: 'Shortage' },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	if (recs.length > 0) {
		allFaultsNotFixedInArea = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					['Created Date']: { $gt: lastSixWeeks },
					['Fixed By']: { $nin: recs },
					['Fault Code']: { $ne: 'Shortage' },
					['Zone']: { $in: areas },
					['Fault Area']: area,
				},
			},

			{ $sort: { ['Created Date']: -1, _id: 1 } },
		])
	}

	let notFixedPercentage = Math.round((allFaultsNotFixedInArea.length / allFaultsForNotFixed.length) * 100)

	if (isNaN(notFixedPercentage)) {
		notFixedPercentage = 0
	}

	res.render('dash/dpuZone', {
		division,
		fullDivision,
		issues,
		faultsArr,
		area,
		issuesOver2,
		issuesOver4,
		issuesOver6,
		issuesOver2Data,
		issuesOver4Data,
		issuesOver6Data,
		issuesOver2Arr,
		issuesOver4Arr,
		issuesOver6Arr,
		allEscapes,
		allFaults,
		allFoundFaults,
		effPercent,
		theSipStation,
		// days,
		allBuildCount,
		rftAmount,
		rftPercent,
		allFaultsNotFixedInArea,
		allFaultsForNotFixed,
		notFixedPercentage,
		allFaultsWithoutShortages,
	})
}

module.exports.over3 = async (req, res) => {
	let { area } = req.params

	let division = 'LDL'

	const issuesOver3 = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$project: {
				['Created Date']: 1,
				['User Defined Test']: 1,
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{
			$match: {
				count: { $gt: 2 }, // Duplicates considered as count greater than one
			},
		},

		{ $sort: { count: -1, _id: 1 } },
	])

	res.render('dash/over3', { division, issuesOver3, area })
}

module.exports.zoneFaultData = async (req, res) => {
	const { bu, area, part } = req.params
	let division = 'LDL'

	const help = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])

	let partName = help[part]._id

	const issues = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{ $sort: { ['Created Date']: -1 } },
	])

	res.render('dash/zoneFaultData', { division, issues, area, partName, part })
}

module.exports.zoneFaultDataFilter = async (req, res) => {
	const { bu, area, part } = req.params
	let division = 'LDL'

	const help = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])

	let partName = help[part]._id

	const comments = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Comments',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])
	const inspectors = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Created By',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])

	const areas = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Zone',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])
	const models = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Model',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])
	const faultCodes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Fault Code',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])

	res.render('dash/zoneFaultDataFilter', {
		division,
		comments,
		inspectors,
		areas,
		area,
		models,
		faultCodes,
		partName,
	})
}

// escapes from area

module.exports.escapes = async (req, res) => {
	let { division, area } = req.params

	const stage = await Stage.find({ name: area })

	let areas = []

	if (stage.length > 0) {
		if (area === 'Track 3 Zone 1') {
			areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1']
		} else if (area === 'Track 3 Zone 2') {
			areas = ['Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
		} else {
			areas = [area]
		}
		let division = 'LDL'
	}

	const top5Escapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				Zone: { $nin: areas },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 5 },
	])

	const allEscapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				Zone: { $nin: areas },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	res.render('dash/zoneEscapes', {
		division,
		area,
		top5Escapes,
		allEscapes,
	})
}

//top 5 escapes

module.exports.top5escapes = async (req, res) => {
	let { division, area } = req.params

	const stage = await Stage.find({ name: area })

	if (stage.length > 0) {
		theSipStation = stage[0].sip
		let division = 'LDL'
	}

	const top5escapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				Zone: { $ne: theSipStation },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 5 },
	])

	res.render('dash/top5Escapes', {
		division,
		area,
		top5escapes,
	})
}

//top 5 escapes detail

module.exports.top5escapesDetail = async (req, res) => {
	let { division, area, number } = req.params

	const stage = await Stage.find({ name: area })

	if (stage.length > 0) {
		theSipStation = stage[0].sip
		let division = 'LDL'
	}

	const top5escapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				Zone: { $ne: theSipStation },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 5 },
	])

	const help = top5escapes[number]._id

	const faultData = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
				Zone: { $ne: theSipStation },
				['User Defined Test']: help,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	res.render('dash/top5EscapesDetail', {
		division,
		area,
		top5escapes,
		faultData,
	})
}

module.exports.notFixed = async (req, res) => {
	let { area, division } = req.params
	const stage = await Stage.find({ name: area })

	let recs = []

	if (stage.length > 0) {
		theSipStation = stage[0].sip
		if (stage[0].rec1 != '') {
			recs.push(stage[0].rec1)
		}
		if (stage[0].rec2 != '') {
			recs.push(stage[0].rec2)
		}
		if (stage[0].rec3 != '') {
			recs.push(stage[0].rec3)
		}
		if (stage[0].rec4 != '') {
			recs.push(stage[0].rec4)
		}
		if (stage[0].rec5 != '') {
			recs.push(stage[0].rec5)
		}
		if (stage[0].rec6 != '') {
			recs.push(stage[0].rec6)
		}
		if (stage[0].rec7 != '') {
			recs.push(stage[0].rec7)
		}
		if (stage[0].rec8 != '') {
			recs.push(stage[0].rec8)
		}
		if (stage[0].rec9 != '') {
			recs.push(stage[0].rec9)
		}
		if (stage[0].rec10 != '') {
			recs.push(stage[0].rec10)
		}
		if (stage[0].rec11 != '') {
			recs.push(stage[0].rec11)
		}
		if (stage[0].rec12 != '') {
			recs.push(stage[0].rec12)
		}
		if (stage[0].rec13 != '') {
			recs.push(stage[0].rec13)
		}
		if (stage[0].rec14 != '') {
			recs.push(stage[0].rec14)
		}
		if (stage[0].rec15 != '') {
			recs.push(stage[0].rec15)
		}
		if (stage[0].rec16 != '') {
			recs.push(stage[0].rec16)
		}
		if (stage[0].rec17 != '') {
			recs.push(stage[0].rec17)
		}
		if (stage[0].rec18 != '') {
			recs.push(stage[0].rec18)
		}
		if (stage[0].rec19 != '') {
			recs.push(stage[0].rec19)
		}
		if (stage[0].rec20 != '') {
			recs.push(stage[0].rec21)
		}
		if (stage[0].rec22 != '') {
			recs.push(stage[0].rec22)
		}
		if (stage[0].rec23 != '') {
			recs.push(stage[0].rec23)
		}
		if (stage[0].rec24 != '') {
			recs.push(stage[0].rec24)
		}
		if (stage[0].rec25 != '') {
			recs.push(stage[0].rec25)
		}
	}

	let areas = []

	if (area === 'Track 3 Zone 1') {
		areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1']
	} else if (area === 'Track 3 Zone 2') {
		areas = ['Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
	} else {
		areas = [area]
	}

	let issues = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Zone']: { $in: areas },
				['Fault Code']: { $ne: 'Shortage' },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	if (recs.length > 0) {
		issues = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					['Created Date']: { $gt: lastSixWeeks },
					['Zone']: { $in: areas },
					['Fixed By']: { $nin: recs },
					['Fault Code']: { $ne: 'Shortage' },
					['Fault Area']: area,
				},
			},

			{ $sort: { ['Created Date']: -1, _id: 1 } },
		])
	}

	res.render('dash/notFixed', {
		issues,
		division,
	})
}

module.exports.track = async (req, res) => {
	const { division } = req.params

	if (req.body.startDate && req.body.endDate) {
		newStartTimeFormat = moment(req.body.startDate).format(`YYYY-MM-DDT${req.body.startTime}:00.000Z`)

		newEndTimeFormat = moment(req.body.endDate).format(`YYYY-MM-DDT${req.body.endTime}:00.000Z`)
	} else {
		newStartTimeFormat = moment().format(`YYYY-MM-DDT06:00:00.000Z`)

		newEndTimeFormat = moment().format(`YYYY-MM-DDT23:59:00.000Z`)
	}

	if (new Date(newEndTimeFormat) <= new Date(newStartTimeFormat)) {
		req.flash('error', 'Start time cannot be before end time')
		res.redirect(`/dash/dpuTrack/LDL`)
		return
	}

	const timeDif = new Date(newEndTimeFormat) - new Date(newStartTimeFormat)

	if (timeDif > 604740000) {
		req.flash('error', 'Sorry, maximum range is 1 week.')

		res.redirect(`/dash/dpuTrack/LDL`)
		return
	}

	// if (req.body.startTime && req.body.) {
	// 	newStartTimeFormat = moment().format(`YYYY-MM-DDT06:30:00.000Z`)

	// 	newEndTimeFormat = moment().format(`YYYY-MM-DDT16:30:00.000Z`)
	// } else {
	// 	newStartTimeFormat = moment().format(`YYYY-MM-DDT06:30:00.000Z`)

	// 	newEndTimeFormat = moment().format(`YYYY-MM-DDT16:30:00.000Z`)
	// }

	const theHour = -1

	const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

	const startTimeAPI = new Date()
	startTimeAPI.setHours(00, 00, 00, 00)
	const endTimeAPI = new Date()
	endTimeAPI.setHours(23, 59, 0, 0)
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	let startDateAPI = moment(newStartTimeFormat).subtract(theHour, 'hours').format('YYYY/MM/DD/HH/mm')
	let endDateAPI = moment(newEndTimeFormat).add(theHour, 'hours').format('YYYY/MM/DD/HH/mm')

	// const stage12 = await axios(
	// 	`https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/12/${startDateAPI}/${endDateAPI}`,
	// )

	const track3 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/QCS 9/${startDateAPI}/${endDateAPI}`)

	const track1 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/QCS 7/${startDateAPI}/${endDateAPI}`)

	if (track1.data) {
		track1Builds = track1.data.map((build) => build.buildNo)
	} else {
		track1Builds = []
	}
	if (track3.data) {
		track3Builds = track3.data.map((build) => build.buildNo)
	} else {
		track3Builds = []
	}

	const apiResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${startDateAPI}/${endDateAPI}}/1`)

	const startTime = new Date(newStartTimeFormat)
	const endTime = new Date(newEndTimeFormat)

	const lay = track1Builds.length
	const track1lay = track1Builds.length
	const track3lay = track3Builds.length

	let apiResult1 = []

	if (apiResponse.status === 200 && apiResponse.data) apiResult1 = apiResponse.data.filter((fault) => fault['Production Line'] !== 'P712')

	let apiResult0 = apiResult1.filter((item) => item['Fault Code'] !== 'Scale')
	let apiResult3 = apiResult0.filter((item) => item['User Defined Test'] !== 'Ensure CAS Tooling Has Been Used')

	let apiResult = apiResult3.filter(
		(item) => (item['Fault Area'] !== 'Shot & Paint' && item['Fault Code'] !== 'Paintwork') || item['Fault Code'] !== 'Paintwork'
	)

	const theArrayOfAreas = [
		{
			//id
			id: 1,
			//fault area
			zone: 'Track 3 Zone 1',
			//display name
			displayName: 'QCS 8',
			// found area
			sipName: ['QCS 8'],
			//track
			track: 3,
			//name for rec area
			recname: 'Track 3 SIP 1',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 2,
			//fault area
			zone: 'Track 3 Zone 2',
			//display name
			displayName: 'QCS 9',
			// found area
			sipName: ['QCS 9'],
			//track
			track: 3,
			//name for rec area
			recname: 'Track 3 SIP 2',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 3,
			//fault area
			zone: 'Boom Sub Assembly',
			//display name
			displayName: 'Booms',
			// found area
			sipName: ['QCS 4 Booms'],
			//track
			track: 1,
			//name for rec area
			recname: 'Boom Sub Assembly LDL',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 4,
			//fault area
			zone: 'Zone 1 Ldl',
			//display name
			displayName: 'QCS 1A',
			// found area
			sipName: ['QCS 1A'],
			//track
			track: 1,
			//name for rec area
			recname: 'QCS 1A',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 5,
			//fault area
			zone: 'Zone 2 Ldl',
			//display name
			displayName: 'QCS 1B',
			// found area
			sipName: ['QCS 1B'],
			//track
			track: 1,
			//name for rec area
			recname: 'QCS 1B',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 6,
			//fault area
			zone: 'Zone 3 Ldl',
			//display name
			displayName: 'QCS 2',
			// found area
			sipName: ['QCS 2'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 3 NEW',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 8,
			//fault area
			zone: 'Zone 4 Ldl',
			//display name
			displayName: 'QCS 3',
			// found area
			sipName: ['QCS 3'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 4 NEW',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 7,
			//fault area
			zone: 'Cab Systems',
			//display name
			displayName: 'Cab Insp',
			// found area
			sipName: ['QCS 5 Cabs'],
			//track
			track: 1,
			//name for rec area
			recname: 'NEW Cab Inspection',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 9,
			//fault area
			zone: 'Zone 5 Ldl',
			//display name
			displayName: 'QCS 6',
			// found area
			sipName: ['QCS 6'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 5 NEW',
			//before of after track 3
			position: 'after',
		},

		{
			//id
			id: 10,
			//fault area
			zone: 'Zone 6 Ldl',
			//display name
			displayName: 'QCS 7',
			// found area
			sipName: ['QCS 7'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 6 NEW',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 11,
			//fault area
			zone: 'UV 1 Ldl',
			//display name
			displayName: 'UV1 & RR',
			// found area
			sipName: ['UV 1 Ldl', 'Rolling Rd/Warm Up'],
			//track
			track: 1,
			//name for rec area
			recname: 'UV 1 Ldl',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 12,
			//fault area
			zone: 'Zone 7 Ldl',
			//display name
			displayName: 'QCS 10',
			// found area
			sipName: ['QCS 10'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP SPEC Ldl',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 13,
			//fault area
			zone: 'Zone 7 Ldl',
			//display name
			displayName: 'Zone 7',
			// found area
			sipName: ['Z7 Electrical Test'],
			//track
			track: 1,
			//name for rec area
			recname: 'Z7 Electrical Test',
			//before of after track 3
			position: 'before',
		},
	]
	let theArrayOfDataT1 = []
	let theArrayOfDataT3 = []
	let assyDPU = 0
	let shortageDPU = 0
	let totalDPU = 0

	let assyDPU3 = 0
	let shortageDPU3 = 0
	let totalDPU3 = 0

	let totalFaultsT3 = 0

	let dupForwardTotal = 0
	let dupForwardTotal3 = 0
	let dupForwardTotalTrack1 = 0
	let dupForwardTotalTrack3 = 0
	let dupForwardTotalAll = 0

	for (a of theArrayOfAreas) {
		let areaName = a.displayName

		if (a.track === 1) {
			theLay = track1lay
		} else {
			theLay = track3lay
		}

		let id = a.id
		let foundInAreaFaults = apiResult.filter((item) => a.sipName.includes(item.Zone) && item['Fault Code'] !== 'Shortage')
		let foundInAreaNumber = foundInAreaFaults.length
		if (theLay > 0) {
			foundInAreaDPU = (foundInAreaNumber / theLay || 0).toFixed(2)
		} else {
			foundInAreaDPU = '0.00'
		}

		let recMen = await Sip.findOne(
			{
				name: a.recname,
			},
			{ _id: 0, name: 0, division: 0 }
		).lean()

		if (recMen) {
			sorted = Object.fromEntries(Object.entries(recMen).filter(([_, v]) => v != ''))
			recNames = Object.keys(sorted).map((key) => sorted[key])
		} else {
			recNames = []
		}
		// get rec men and remove empty strings

		let recNumber = recNames.length

		let fixedInAreaFaults = apiResult.filter(
			(item) =>
				//failed in area
				a.sipName.includes(item.Zone) &&
				// not shortage
				item['Fault Code'] !== 'Shortage' &&
				// fixed by rec men
				recNames.includes(item['Fixed By'])
		)

		let fixedInAreaNumber = fixedInAreaFaults.length
		if (theLay > 0) {
			fixedInAreaDPU = (fixedInAreaNumber / theLay || 0).toFixed(2)
		} else {
			fixedInAreaDPU = '0.00'
		}

		let notFixedInAreaFaults = apiResult.filter(
			(item) =>
				//failed in area
				a.sipName.includes(item.Zone) &&
				// not shortage
				item['Fault Code'] !== 'Shortage' &&
				// not fixed by rec men
				!recNames.includes(item['Fixed By'])
		)

		let notFixedInAreaNumber = notFixedInAreaFaults.length
		if (theLay > 0) {
			notFixedInAreaDPU = (notFixedInAreaNumber / theLay || 0).toFixed(2)
		} else {
			notFixedInAreaDPU = '0.00'
		}

		const notFoundArr = [...a.sipName, 'Torque Overcheck', 'Torque Overcheck 2']
		const zone7Arr = ['Cycle Test New', 'UV 2 Ldl', 'Layered PDI Inspection']

		if (a.zone === 'Zone 7 Ldl') {
			escapedAreaFaults = apiResult.filter(
				(item) =>
					//not found in area
					zone7Arr.includes(item.Zone) &&
					// not shortage
					item['Fault Code'] !== 'Shortage' &&
					// failed back to area
					item['Fault Area'] === 'Electrical Investigation'
			)
		} else {
			escapedAreaFaults = apiResult.filter(
				(item) =>
					//not found in area
					!notFoundArr.includes(item.Zone) &&
					// not shortage
					item['Fault Code'] !== 'Shortage' &&
					// failed back to area
					item['Fault Area'] === a.zone
			)
		}

		let escapedAreaNumber = escapedAreaFaults.length
		if (theLay > 0) {
			escapedAreaDPU = (escapedAreaNumber / theLay || 0).toFixed(2)
		} else {
			escapedAreaDPU = '0.00'
		}

		let foundInAreaFaultsSh = apiResult.filter((item) => a.sipName.includes(item.Zone) && item['Fault Code'] === 'Shortage')
		let foundInAreaNumberSh = foundInAreaFaultsSh.length
		if (theLay > 0) {
			foundInAreaDPUSh = (foundInAreaNumberSh / theLay || 0).toFixed(2)
		} else {
			foundInAreaDPUSh = '0.00'
		}

		let forwardPercentage = 0

		if (notFixedInAreaNumber > 0) {
			forwardPercentage = Math.round((notFixedInAreaNumber / foundInAreaNumber) * 100) || 0
		}

		let assyDPU = foundInAreaDPU
		let shortageDPU = foundInAreaDPUSh
		let areaDPU = +assyDPU + +shortageDPU

		if (a.track === 1) {
			dupForwardTotal += +notFixedInAreaDPU
			dupForwardTotalTrack1 += +notFixedInAreaDPU
			dupForwardTotalAll += +notFixedInAreaDPU
			dupForwardTotal3 += 0
			dupForwardTotalTrack3 += 0
		}
		if (a.track === 3) {
			dupForwardTotal3 += +notFixedInAreaDPU
			dupForwardTotalTrack3 += +notFixedInAreaDPU
			dupForwardTotalAll += +notFixedInAreaDPU
			dupForwardTotal += 0
			dupForwardTotalTrack1 += 0
		}

		if (a.track === 1 && a.position === 'before') {
			totalDPU += +areaDPU
			totalDPU3 += 0

			//} else {
			// 	totalDPU = 0
			// 	totalDPU3 = 0
		}
		if (a.track === 1 && a.position === 'after') {
			extraDPU = (totalFaultsT3 / theLay).toFixed(2)
			allExtraDPU = +extraDPU + +areaDPU
			totalDPU += allExtraDPU
			totalDPU3 += 0

			//} else {
			// extraDPU = 0
			// allExtraDPU = 0
			// totalDPU = 0
			// totalDPU3 = 0
		}

		if (a.track === 3 && theLay > 0) {
			totalDPU += 0
			totalDPU3 += areaDPU
			totalFaultsT3 += foundInAreaNumber

			// } else {
			// 	totalDPU = 0
			// 	totalDPU3 = 0
			// 	totalFaultsT3 = 0
		}

		if (isNaN(totalDPU)) totalDPU = 0
		if (isNaN(totalDPU3)) totalDPU3 = 0

		if (a.track === 1)
			theArrayOfDataT1.push({
				id,
				areaName,
				foundInAreaFaults,
				foundInAreaNumber,
				foundInAreaDPU,
				fixedInAreaFaults,
				fixedInAreaNumber,
				fixedInAreaDPU,
				notFixedInAreaFaults,
				notFixedInAreaNumber,
				notFixedInAreaDPU,
				escapedAreaFaults,
				escapedAreaNumber,
				escapedAreaDPU,
				foundInAreaFaultsSh,
				foundInAreaNumberSh,
				foundInAreaDPUSh,
				recNumber,
				assyDPU,
				shortageDPU,
				areaDPU,
				forwardPercentage,
				totalDPU,
				totalDPU3,
				dupForwardTotal3,
				dupForwardTotalTrack3,
				dupForwardTotal,
				dupForwardTotalTrack1,
				dupForwardTotalAll,
			})
		if (a.track === 3)
			theArrayOfDataT3.push({
				id,
				areaName,
				foundInAreaFaults,
				foundInAreaNumber,
				foundInAreaDPU,
				fixedInAreaFaults,
				fixedInAreaNumber,
				fixedInAreaDPU,
				notFixedInAreaFaults,
				notFixedInAreaNumber,
				notFixedInAreaDPU,
				escapedAreaFaults,
				escapedAreaNumber,
				escapedAreaDPU,
				foundInAreaFaultsSh,
				foundInAreaNumberSh,
				foundInAreaDPUSh,
				recNumber,
				assyDPU,
				shortageDPU,
				areaDPU,
				forwardPercentage,
				totalDPU,
				totalDPU3,
				dupForwardTotal3,
				dupForwardTotalTrack3,
				dupForwardTotal,
				dupForwardTotalTrack1,
				dupForwardTotalAll,
			})
	}

	let newFaultsOutOfOBay = []
	let newShortageOutOfOBay = []

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
			let time = d.addHours(0)
			s.dateToStage = time
		}
	} else {
		stage16Number = 0
		stage16MacinesData = []
	}

	const stage16Start = moment(newStartTimeFormat).subtract(2, 'months').format('YYYY/MM/DD/HH/mm')

	let areas = ['Cycle Test New', 'Layered PDI Inspection']

	const stage16FaultsResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${stage16Start}/${endDateAPI}}/1`)
	let noDate = new Date('2020, 01, 01')

	if (stage16FaultsResponse && stage16FaultsResponse.data) {
		stage16FaultsResponseData1 = stage16FaultsResponse.data.filter((fault) => fault['Production Line'] !== 'P712')
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
				f['Fault Code'] !== 'Shortage'
			) {
				f.dateToStage = s.dateToStage
				newFaultsOutOfOBay.push(f)
			}
			if (
				s.buildNo === f['Build Number'] &&
				(new Date(f['Fixed Date']) > new Date(s.dateToStage) || new Date(f['Fixed Date']) < noDate) &&
				new Date(f['Created Date']) < new Date(s.dateToStage) &&
				f['Fault Code'] === 'Shortage'
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

	// postOBay

	// let post0BayArr = []

	// const post0bayAreas = [
	// 	{
	// 		//id
	// 		id: 21,
	// 		//found in area
	// 		sipName: ['Cycle Test New'],
	// 		//name
	// 		name: 'Cycle Test',
	// 		//api name
	// 		apiname: 'Cycle Test New',
	// 	},
	// 	{
	// 		//id
	// 		id: 22,
	// 		//found in area
	// 		sipName: ['UV 2 Ldl'],
	// 		//name
	// 		name: 'UV2',
	// 		//api name
	// 		apiname: 'UV 2 Ldl',
	// 	},
	// 	{
	// 		//id
	// 		id: 23,
	// 		//found in area
	// 		sipName: ['Layered PDI Inspection'],
	// 		//name
	// 		name: 'PDI',
	// 		//api name
	// 		apiname: 'Layered PDI Inspection',
	// 	},
	// ]

	// for (let p of post0bayAreas) {
	// 	let name = p.name
	// 	let id = p.id

	// 	allTested = await axios(
	// 		`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/${p.apiname}/${startDateAPI}/${endDateAPI}`
	// 	)
	// 	if (allTested.data) {
	// 		allTestedBuilds = allTested.data
	// 	} else {
	// 		allTestedBuilds = []
	// 	}

	// 	let testedNumber = allTestedBuilds.length

	// 	let foundInAreaFaults = apiResult.filter(
	// 		(item) =>
	// 			p.sipName.includes(item.Zone) && item['Fault Code'] !== 'Shortage'
	// 	)

	// 	let foundInAreaNumber = foundInAreaFaults.length

	// 	if (testedNumber > 0) {
	// 		foundInAreaDPU = (foundInAreaNumber / testedNumber).toFixed(2)
	// 	} else {
	// 		foundInAreaDPU = '0.00'
	// 	}

	// 	let foundInAreaFaultsSh = apiResult.filter(
	// 		(item) =>
	// 			p.sipName.includes(item.Zone) && item['Fault Code'] === 'Shortage'
	// 	)

	// 	let foundInAreaNumberSh = foundInAreaFaultsSh.length

	// 	if (testedNumber > 0) {
	// 		foundInAreaDPUSh = (foundInAreaNumberSh / testedNumber).toFixed(2)
	// 	} else {
	// 		foundInAreaDPUSh = '0.00'
	// 	}

	// 	let fixedInAreaFaults = apiResult.filter(
	// 		(item) =>
	// 			p.sipName.includes(item.Zone) &&
	// 			item['Fault Code'] !== 'Shortage' &&
	// 			item['Fixed By'] === item['Created By']
	// 	)

	// 	let fixedInAreaNumber = fixedInAreaFaults.length

	// 	if (testedNumber > 0) {
	// 		fixedInAreaDPU = (fixedInAreaNumber / testedNumber).toFixed(2)
	// 	} else {
	// 		fixedInAreaDPU = '0.00'
	// 	}

	// 	let sentForwardFaults = apiResult.filter(
	// 		(item) =>
	// 			p.sipName.includes(item.Zone) &&
	// 			item['Fault Code'] !== 'Shortage' &&
	// 			item['Fixed By'] !== item['Created By']
	// 	)

	// 	const sentForwardNumber = sentForwardFaults.length

	// 	if (testedNumber > 0) {
	// 		sentForwardDPU = (sentForwardNumber / testedNumber).toFixed(2)
	// 	} else {
	// 		sentForwardDPU = '0.00'
	// 	}

	// 	let totalDPU = +foundInAreaDPU + +foundInAreaDPUSh

	// 	post0BayArr.push({
	// 		id,
	// 		name,
	// 		testedNumber,
	// 		allTestedBuilds,
	// 		foundInAreaFaults,
	// 		foundInAreaNumber,
	// 		foundInAreaDPU,
	// 		foundInAreaFaultsSh,
	// 		foundInAreaNumberSh,
	// 		foundInAreaDPUSh,
	// 		fixedInAreaFaults,
	// 		fixedInAreaNumber,
	// 		fixedInAreaDPU,
	// 		sentForwardFaults,
	// 		sentForwardNumber,
	// 		sentForwardDPU,
	// 		totalDPU,
	// 	})
	// }

	// start of stage 18

	let faultsTo18 = []
	let faultsTo18Sh = []

	const stage18Response = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/18/${startDateAPI}/${endDateAPI}`)

	// console.log(stage18Response)

	if (stage18Response && stage18Response.data) {
		stage18Number = stage18Response.data.length
		stage18MacinesData = stage18Response.data
		for (let s of stage18MacinesData) {
			let d = new Date(s.dateToStage)
			let time = d.addHours(0)

			s.dateToStage = time
		}
	} else {
		stage18Number = 0
		stage18MacinesData = []
	}

	const stage18Start = moment(newStartTimeFormat).subtract(2, 'months').format('YYYY/MM/DD/HH/mm')

	const stage18FaultsResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${stage18Start}/${endDateAPI}}/1`)

	if (stage18FaultsResponse && stage18FaultsResponse.data) {
		stage18FaultsResponseData1 = stage18FaultsResponse.data.filter((fault) => fault['Production Line'] !== 'P712')
	} else {
		stage18FaultsResponseData1 = []
	}

	let pdiAreas = ['Layered PDI Inspection']

	let stage18FaultsResponseData0 = stage18FaultsResponseData1.filter((item) => item['Fault Code'] !== 'Scale')

	let stage18FaultsResponseData = stage18FaultsResponseData0.filter(
		(item) => (item['Fault Area'] !== 'Shot & Paint' && item['Fault Code'] !== 'Paintwork') || item['Fault Code'] !== 'Paintwork'
	)

	for (let s of stage18MacinesData) {
		for (let f of stage18FaultsResponseData) {
			d1 = new Date(f['Fixed Date'])
			d2 = new Date(d1)
			d2.setMinutes(d1.getMinutes() - 10) // give 10 mins grace to pass faults off after bookning to stage 20
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
			let time = d.addHours(0)
			s.dateToStage = time
		}
	} else {
		stage19Number = 0
		stage19MacinesData = []
	}

	const stage19Start = moment(newStartTimeFormat).subtract(2, 'months').format('YYYY/MM/DD/HH/mm')

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
			let time = d.addHours(0)
			s.dateToStage = time
		}
	} else {
		stage20Number = 0
		stage20MacinesData = []
	}

	const stage20Start = moment(newStartTimeFormat).subtract(2, 'months').format('YYYY/MM/DD/HH/mm')

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

	// // console.log(post0BayArr)

	// let pdiRecMan = await Sip.findOne(
	// 	{
	// 		name: 'PDI',
	// 	},
	// 	{ _id: 0, name: 0, division: 0 }
	// ).lean()

	// if (pdiRecMan) {
	// 	sortedPI = Object.fromEntries(
	// 		Object.entries(pdiRecMan).filter(([_, v]) => v != '')
	// 	)
	// 	recNamesPDI = Object.keys(sortedPI).map((key) => sortedPI[key])
	// } else {
	// 	recNamesPDI = []
	// }

	// let recNumberPDI = recNamesPDI.length

	// console.log(recNamesPDI)

	res.render('dash/dpuTrack', {
		theArrayOfDataT1,
		theArrayOfDataT3,
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

		division,
		startTime,
		endTime,
		lay,
		track3lay,
	})
}

module.exports.trackEff = async (req, res) => {
	const { division } = req.params

	if (req.body.startDate && req.body.endDate) {
		newStartTimeFormat = moment(req.body.startDate).format(`YYYY-MM-DDT${req.body.startTime}:00.000Z`)

		newEndTimeFormat = moment(req.body.endDate).format(`YYYY-MM-DDT${req.body.endTime}:00.000Z`)
	} else {
		newStartTimeFormat = moment().format(`YYYY-MM-DDT06:00:00.000Z`)

		newEndTimeFormat = moment().format(`YYYY-MM-DDT16:30:00.000Z`)
	}

	if (new Date(newEndTimeFormat) <= new Date(newStartTimeFormat)) {
		req.flash('error', 'Start time cannot be before end time')
		res.redirect(`/dash/dpuTrackEff/LDL`)
		return
	}

	const timeDif = new Date(newEndTimeFormat) - new Date(newStartTimeFormat)

	if (timeDif > 604740000) {
		req.flash('error', 'Sorry, maximum range is 1 week.')

		res.redirect(`/dash/dpuTrackEff/LDL`)
		return
	}

	const theHour = 0

	const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

	const startTimeAPI = new Date()
	startTimeAPI.setHours(00, 00, 00, 00)
	const endTimeAPI = new Date()
	endTimeAPI.setHours(23, 59, 0, 0)
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	let startDateAPI = moment(newStartTimeFormat).subtract(theHour, 'hours').format('YYYY/MM/DD/HH/mm')
	let endDateAPI = moment(newEndTimeFormat).add(theHour, 'hours').format('YYYY/MM/DD/HH/mm')

	// const stage12 = await axios(
	// 	`https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/12/${startDateAPI}/${endDateAPI}`,
	// )

	const track3 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/QCS 9/${startDateAPI}/${endDateAPI}`)

	const track1 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/QCS 7/${startDateAPI}/${endDateAPI}`)

	if (track1.data) {
		track1Builds = track1.data.map((build) => build.buildNo)
	} else {
		track1Builds = []
	}
	if (track3.data) {
		track3Builds = track3.data.map((build) => build.buildNo)
	} else {
		track3Builds = []
	}

	const apiResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${startDateAPI}/${endDateAPI}}/1`)

	// console.log(apiResponse.status)

	const startTime = new Date(newStartTimeFormat)
	const endTime = new Date(newEndTimeFormat)

	const lay = track1Builds.length
	const track1lay = track1Builds.length
	const track3lay = track3Builds.length

	let apiResult = []

	if (apiResponse.status === 200 && apiResponse.data) apiResult1 = apiResponse.data

	const overCheck = ['Torque Overcheck', 'Torque Overcheck 2']

	apiResult = apiResult1.filter(
		(item) =>
			//not overcheckers
			!overCheck.includes(item.Zone) &&
			//not shortage
			item['Fault Code'] !== 'Shortage'
	)

	const theArrayOfAreas = [
		{
			//id
			id: 10,
			//fault area
			zone: 'Zone 1 Ldl',
			zones: ['Zone 1 Ldl', 'Zone 2 Ldl'],

			//display name
			displayName: 'QCS 1',
			// found area
			sipName: ['QCS 1A', 'QCS 1B'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 1',
			//before of after track 3
			position: 'before',
		},

		{
			//id
			id: 11,
			//fault area
			zone: 'Zone 3 Ldl',
			zones: ['Zone 3 Ldl'],
			//display name
			displayName: 'QCS 2',
			// found area
			sipName: ['QCS 2'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 3 NEW',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 12,
			//fault area
			zone: 'Zone 4 Ldl',
			zones: ['Zone 4 Ldl'],
			//display name
			displayName: 'QCS 3',
			// found area
			sipName: ['QCS 3'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 4 NEW',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 13,
			//fault area
			zone: 'Boom Sub Assembly',
			zones: ['Boom Sub Assembly'],
			//display name
			displayName: 'QCS 4 Booms',
			// found area
			sipName: ['QCS 4 Booms'],
			//track
			track: 'Booms',
			//name for rec area
			recname: 'Boom Sub Assembly LDL',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 14,
			//fault area
			zone: 'Cab Systems',
			zones: ['Cab Systems'],
			//display name
			displayName: 'QCS 5 Cabs',
			// found area
			sipName: ['QCS 5 Cabs'],
			//track
			track: 1,
			//name for rec area
			recname: 'NEW Cab Inspection',
			//before of after track 3
			position: 'before',
		},

		{
			//id
			id: 15,
			//fault area
			zone: 'Zone 5 Ldl',
			zones: ['Zone 5 Ldl'],
			//display name
			displayName: 'QCS 6',
			// found area
			sipName: ['QCS 6'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 5 NEW',
			//before of after track 3
			position: 'after',
		},

		{
			//id
			id: 16,
			//fault area
			zone: 'Zone 6 Ldl',
			zones: ['Zone 6 Ldl'],
			//display name
			displayName: 'QCS 7',
			// found area
			sipName: ['QCS 7'],
			//track
			track: 1,
			//name for rec area
			recname: 'SIP 6 NEW',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 17,
			//fault area
			zone: 'Track 3 Zone 1',
			zones: ['Track 3 Zone 1'],
			//display name
			displayName: 'QCS 8',
			// found area
			sipName: ['QCS 8'],
			//track
			track: 1,
			//name for rec area
			recname: 'Track 3 SIP 1',
			//before of after track 3
			position: 'before',
		},
		{
			//id
			id: 18,
			//fault area
			zone: 'Track 3 Zone 2',
			zones: ['Track 3 Zone 2'],
			//display name
			displayName: 'QCS 9',
			// found area
			sipName: ['QCS 9'],
			//track
			track: 1,
			//name for rec area
			recname: 'Track 3 SIP 2',
			//before of after track 3
			position: 'before',
		},
	]
	let theArrayOfDataT1 = []

	for (a of theArrayOfAreas) {
		let areaName = a.displayName

		let ignoreList = await Ignore.find({ faultArea: { $in: a.zones } })

		let ignoredFaults = ignoreList.map((i) => i.fault)

		if (a.track === 'Booms') {
			theLay = +track1lay + +track3lay
		} else if (a.track === 3) {
			theLay = track3lay
		} else {
			theLay = track1lay
		}

		let id = a.id

		const failedBack = [...a.zones, 'Torque Overcheck', 'Torque Overcheck 2']

		foundInAreaFaultsAll = apiResult.filter(
			(item) =>
				//found in area
				a.sipName.includes(item.Zone)
			// failed back to area
			// a.zones.includes(item['Fault Area'])
		)
		foundInAreaFaults = apiResult.filter(
			(item) =>
				//found in area
				a.sipName.includes(item.Zone) &&
				// failed back to area
				a.zones.includes(item['Fault Area'])
		)
		function getRandomInt(max) {
			return Math.floor(Math.random() * max)
		}

		escapedAreaFaults1 = apiResult.filter(
			(item) =>
				//found in area
				!a.sipName.includes(item.Zone) &&
				// failed back to area
				a.zones.includes(item['Fault Area']) &&
				// not on ignore list
				!ignoredFaults.includes(`${item['Fault Code']} - ${item['User Defined Test']}`)
		)

		const escapedAreaFaults = escapedAreaFaults1.map((v) => ({
			...v,
			_id: getRandomInt(500000),
		}))

		// for (let e of escapedAreaFaults) {
		// 	if (ignoredDetail.includes('Props tight and torque marked')) {
		// 		// console.log(e)
		// 		console.log('Yes')
		// 	}
		// }
		// console.log(ignoredDetail)

		// console.log(ignoredTypes)
		// console.log(ignoredDetail)

		let foundInAreaFaultsAllNumber = foundInAreaFaultsAll.length
		let foundInAreaNumber = foundInAreaFaults.length
		let escapedAreaNumber = escapedAreaFaults.length
		let totalFaults = foundInAreaNumber + escapedAreaNumber

		if (escapedAreaNumber > 0) {
			escapedAreaDPU = Math.round(100 - (escapedAreaNumber / foundInAreaFaultsAllNumber) * 100)
		} else {
			escapedAreaDPU = 100
		}

		if (escapedAreaDPU < 0) {
			escapedAreaDPU = 0
		}

		// let escapedAreaDPU = Math.round(
		// 	100 - (escapedAreaNumber / foundInAreaFaultsAllNumber) * 100
		// )
		// let escapedAreaDPU = Math.round(
		// 	100 - (escapedAreaNumber / totalFaults) * 100
		// )

		theArrayOfDataT1.push({
			id,
			areaName,
			escapedAreaFaults,
			escapedAreaNumber,
			escapedAreaDPU,
			foundInAreaNumber,
			foundInAreaFaults,
			foundInAreaFaultsAll,
			foundInAreaFaultsAllNumber,
		})
	}

	const totalAverageSum =
		theArrayOfDataT1[0].escapedAreaDPU +
		theArrayOfDataT1[1].escapedAreaDPU +
		theArrayOfDataT1[2].escapedAreaDPU +
		theArrayOfDataT1[5].escapedAreaDPU +
		theArrayOfDataT1[6].escapedAreaDPU +
		theArrayOfDataT1[7].escapedAreaDPU +
		theArrayOfDataT1[8].escapedAreaDPU

	const totalAverage = Math.round(totalAverageSum / 7)

	res.render('dash/dpuTrackEff', {
		theArrayOfDataT1,
		division,
		startTime,
		endTime,
		lay,
		track3lay,
		totalAverage,
	})
}

module.exports.createIgnore = async (req, res) => {
	const ignore = await Ignore.create(req.body)

	res.redirect('/dash/dpuTrackEff/LDL')
}
module.exports.removeIgnore = async (req, res) => {
	const ignore = await Ignore.create(req.body)

	res.redirect('/dash/dpuTrackEff/LDL')
}

module.exports.pickedUpInArea = async (req, res) => {
	let { division, area, startTime, endTime } = req.params

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	let areas = []

	if (area === 'Track 3 SIP 1') {
		areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1']
	} else if (area === 'Track 3 SIP 2') {
		areas = ['Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
	} else if (area === 'Zone 7') {
		areas = ['Z7 Electrical Test', 'Rolling Rd/Warm Up']
	} else {
		areas = [area]
	}
	let faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],
				['Fault Code']: { $ne: 'Shortage' },
				Zone: { $in: areas },
			},
		},
		{ $sort: { ['Created Date']: -1 } },
	])

	res.render('dash/trackZoneFaults', {
		faults,
		area,
	})
}

module.exports.allSips = async (req, res) => {
	const { division } = req.params
	const sips = await Sip.find({})

	res.render('sip/all', { division, sips })
}

module.exports.ShowUpdateSipForm = async (req, res) => {
	const { id } = req.params
	const sip = await Sip.findById(id)

	inspectors = await Inspector.find({ division: 'LDL' }).sort({ name: '' })

	const division = sip.division

	if (sip.name === 'Times') {
		res.render('sip/editTimes', { division, sip, inspectors })
	} else if (sip.name === 'Update Lay') {
		res.render('sip/editLay', { division, sip, inspectors })
	} else {
		res.render('sip/edit', { division, sip, inspectors })
	}
}

module.exports.updateSip = async (req, res) => {
	const { id } = req.params
	const sip = await Sip.findByIdAndUpdate(id, {
		...req.body.sip,
	})

	res.redirect('/dash/sip/all/LDL')
}

module.exports.sentForward = async (req, res) => {
	let { division, area, startTime, endTime } = req.params

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	let areas = []

	if (area === 'Track 3 SIP 1') {
		areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1']
	} else if (area === 'Track 3 SIP 2') {
		areas = ['Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
	} else if (area === 'Zone 7') {
		areas = ['Z7 Electrical Test', 'Rolling Rd/Warm Up']
	} else {
		areas = [area]
	}

	const recMen = await Sip.find({ name: area })

	let recs = []
	for (let m of recMen) {
		if (m.rec1 != '') {
			recs.push(m.rec1)
		}
		if (m.rec2 != '') {
			recs.push(m.rec2)
		}
		if (m.rec3 != '') {
			recs.push(m.rec3)
		}
		if (m.rec4 != '') {
			recs.push(m.rec4)
		}
		if (m.rec5 != '') {
			recs.push(m.rec5)
		}
		if (m.rec6 != '') {
			recs.push(m.rec6)
		}
		if (m.rec7 != '') {
			recs.push(m.rec7)
		}
		if (m.rec8 != '') {
			recs.push(m.rec8)
		}
		if (m.rec9 != '') {
			recs.push(m.rec9)
		}
		if (m.rec10 != '') {
			recs.push(m.rec10)
		}
		if (m.rec11 != '') {
			recs.push(m.rec11)
		}
		if (m.rec12 != '') {
			recs.push(m.rec12)
		}
		if (m.rec13 != '') {
			recs.push(m.rec13)
		}
		if (m.rec14 != '') {
			recs.push(m.rec14)
		}
		if (m.rec15 != '') {
			recs.push(m.rec15)
		}
		if (m.rec16 != '') {
			recs.push(m.rec16)
		}
		if (m.rec17 != '') {
			recs.push(m.rec17)
		}
		if (m.rec18 != '') {
			recs.push(m.rec18)
		}
		if (m.rec19 != '') {
			recs.push(m.rec19)
		}
		if (m.rec20 != '') {
			recs.push(m.rec20)
		}
		if (m.rec21 != '') {
			recs.push(m.rec21)
		}
		if (m.rec22 != '') {
			recs.push(m.rec22)
		}
		if (m.rec23 != '') {
			recs.push(m.rec23)
		}
		if (m.rec24 != '') {
			recs.push(m.rec24)
		}
		if (m.rec25 != '') {
			recs.push(m.rec25)
		}
	}

	let faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],
				['Fault Code']: { $ne: 'Shortage' },
				Zone: { $in: areas },
				['Fixed By']: { $nin: recs },
			},
		},
		{ $sort: { ['Created Date']: -1 } },
	])

	res.render('dash/trackZoneForward', {
		faults,
		area,
	})
}

module.exports.fixedInArea = async (req, res) => {
	let { division, area, startTime, endTime } = req.params

	let areas = []

	if (area === 'Track 3 SIP 1') {
		areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1']
	} else if (area === 'Track 3 SIP 2') {
		areas = ['Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
	} else if (area === 'Zone 7') {
		areas = ['Z7 Electrical Test', 'Rolling Rd/Warm Up']
	} else {
		areas = [area]
	}

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	const recMen = await Sip.find({ name: area })

	let recs = []
	for (let m of recMen) {
		if (m.rec1 != '') {
			recs.push(m.rec1)
		}
		if (m.rec2 != '') {
			recs.push(m.rec2)
		}
		if (m.rec3 != '') {
			recs.push(m.rec3)
		}
		if (m.rec4 != '') {
			recs.push(m.rec4)
		}
		if (m.rec5 != '') {
			recs.push(m.rec5)
		}
		if (m.rec6 != '') {
			recs.push(m.rec6)
		}
		if (m.rec7 != '') {
			recs.push(m.rec7)
		}
		if (m.rec8 != '') {
			recs.push(m.rec8)
		}
		if (m.rec9 != '') {
			recs.push(m.rec9)
		}
		if (m.rec10 != '') {
			recs.push(m.rec10)
		}
		if (m.rec11 != '') {
			recs.push(m.rec11)
		}
		if (m.rec12 != '') {
			recs.push(m.rec12)
		}
		if (m.rec13 != '') {
			recs.push(m.rec13)
		}
		if (m.rec14 != '') {
			recs.push(m.rec14)
		}
		if (m.rec15 != '') {
			recs.push(m.rec15)
		}
		if (m.rec16 != '') {
			recs.push(m.rec16)
		}
		if (m.rec17 != '') {
			recs.push(m.rec17)
		}
		if (m.rec18 != '') {
			recs.push(m.rec18)
		}
		if (m.rec19 != '') {
			recs.push(m.rec19)
		}
		if (m.rec20 != '') {
			recs.push(m.rec20)
		}
		if (m.rec21 != '') {
			recs.push(m.rec21)
		}
		if (m.rec22 != '') {
			recs.push(m.rec22)
		}
		if (m.rec23 != '') {
			recs.push(m.rec23)
		}
		if (m.rec24 != '') {
			recs.push(m.rec24)
		}
		if (m.rec25 != '') {
			recs.push(m.rec25)
		}
	}

	let faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],
				['Fault Code']: { $ne: 'Shortage' },
				Zone: { $in: areas },
				['Fixed By']: { $in: recs },
			},
		},
		{ $sort: { ['Created Date']: -1 } },
	])

	res.render('dash/trackFaultsFixed', {
		faults,
		area,
	})
}

module.exports.escapedArea = async (req, res) => {
	let { division, area, startTime, endTime } = req.params

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	let postOBayZones = ['Torque Overcheck', 'Torque Overcheck 2']

	if (area === 'Zone 7') {
		postOBayZones.push('Boom Sub Assembly LDL')
		postOBayZones.push('SIP 1')
		postOBayZones.push('SIP 2 NEW')
		postOBayZones.push('SIP 3 NEW')
		postOBayZones.push('SIP 4 NEW')
		postOBayZones.push('SIP 5 NEW')
		postOBayZones.push('SIP 6 NEW')
		postOBayZones.push('Track 3 SIP 1')
		postOBayZones.push('Track 3 SIP 2')
		postOBayZones.push('Zone 7 Ldl')
		postOBayZones.push('UV 1 Ldl')
	}
	if (area === 'Track 3 SIP 1') {
		postOBayZones.push('Track 3 SIP 1 - P42')
		postOBayZones.push('T3 SIP 1')
		postOBayZones.push('TRack 3 SIP 1')
	}
	if (area === 'Track 3 SIP 2') {
		postOBayZones.push('Track 3 SIP 2 - P42')
		postOBayZones.push('T3 SIP 2')
		postOBayZones.push('TRack 3 SIP 2')
	}

	postOBayZones.push(area)

	let faultArea = []

	if (area === 'Boom Sub Assembly LDL') {
		faultArea.push('Boom Sub Assembly')
	}
	if (area === 'SIP 1') {
		faultArea.push('Zone 1 Ldl')
	}
	if (area === 'SIP 2 NEW') {
		faultArea.push('Zone 2 Ldl')
	}
	if (area === 'SIP 3 NEW') {
		faultArea.push('Zone 3 Ldl')
	}
	if (area === 'SIP 4 NEW') {
		faultArea.push('Zone 4 Ldl')
	}
	if (area === 'SIP 5 NEW') {
		faultArea.push('Zone 5 Ldl')
	}
	if (area === 'SIP 6 NEW') {
		faultArea.push('Zone 6 Ldl')
	}
	if (area === 'Track 3 SIP 1') {
		faultArea.push('Track 3 Zone 1')
	}
	if (area === 'Track 3 SIP 2') {
		faultArea.push('Track 3 Zone 2')
	}
	if (area === 'SIP SPEC Ldl') {
		faultArea.push('Zone 7 Ldl')
	}
	if (area === 'UV 1 Ldl') {
		faultArea.push('UV 1 Ldl')
	}
	if (area === 'Zone 7') {
		faultArea.push('Electrical Investigation')
	}
	if (area === 'NEW Cab Inspection') {
		faultArea.push('Cab Systems')
	}

	let faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],
				['Fault Area']: { $in: faultArea },
				['Fault Code']: { $ne: 'Shortage' },
				Zone: { $nin: postOBayZones },
			},
		},
		{ $sort: { ['Created Date']: -1 } },
	])

	res.render('dash/trackZoneEscapes', {
		faults,
		area,
	})
}

module.exports.shortage = async (req, res) => {
	const { division, area, startTime, endTime } = req.params

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	let areas = [area]

	if (area === 'Track 3 SIP 1') {
		areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1']
	} else if (area === 'Track 3 SIP 2') {
		areas = ['Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
	} else if (area === 'Zone 7') {
		areas = ['Z7 Electrical Test', 'Rolling Rd/Warm Up']
	} else {
		areas = [area]
	}

	let faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],
				['Fault Code']: 'Shortage',
				Zone: { $in: areas },
			},
		},
		{ $sort: { ['Created Date']: -1 } },
	])

	res.render('dash/trackZoneShortages', {
		faults,
		area,
	})
}

module.exports.notRFT = async (req, res) => {
	const { area, division } = req.params

	let faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Fault Code']: { $ne: 'Shortage' },
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	res.render('dash/notRFT', {
		faults,
		division,
		area,
	})
}
module.exports.notRFTD = async (req, res) => {
	const { area, division } = req.params

	let faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Fault Code']: { $ne: 'Shortage' },
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	res.render('dash/notRFTD', {
		faults,
		division,
		area,
	})
}
module.exports.toTest = async (req, res) => {
	const { startTime, endTime } = req.params
	const stage = '16'

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	const machines = await Stage16.find({
		dateToStage: { $gte: startDB, $lte: endDB },
	}).sort({ dateToStage: -1 })

	res.render('dash/totest', { machines, stage })
}
module.exports.toPDI = async (req, res) => {
	const { startTime, endTime } = req.params
	const stage = '17'

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	const machines = await Stage17.find({
		dateToStage: { $gte: startDB, $lte: endDB },
	}).sort({ dateToStage: -1 })

	res.render('dash/totest', { machines, stage })
}
module.exports.faultsToTest = async (req, res) => {
	const times = await Sip.find({ name: 'Times' })

	const newStartTimeFormat = moment(times[0].startDate).format(`YYYY-MM-DDT${times[0].startTime}:00.000Z`)

	const newEndTimeFormat = moment(times[0].endDate).format(`YYYY-MM-DDT${times[0].endTime}:00.000Z`)

	let startTime = new Date(newStartTimeFormat)
	let endTime = new Date(newEndTimeFormat)

	const stage16 = await Stage16.find({
		dateToStage: { $gt: startTime, $lt: endTime },
	}).sort({ dateToStage: -1 })

	let faults = []
	let areas = ['Cycle Test New', 'Layered PDI Inspection']

	for (let x of stage16) {
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Fixed Date']: { $gt: x.dateToStage },
					['Created Date']: { $lt: x.dateToStage },
					['Fault Code']: { $ne: 'Shortage' },
					Zone: { $nin: areas },
				},
			},
		])

		if (data.length > 0) {
			faults.push(data)
		}
	}
	for (let x of stage16) {
		let noDate = new Date('2020, 01, 01')
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Created Date']: { $lt: x.dateToStage },
					['Fault Code']: { $ne: 'Shortage' },
					['Fixed Date']: { $lt: noDate },
					Zone: { $nin: areas },
				},
			},
		])

		if (data.length > 0) {
			faults.push(data)
		}
	}

	faults = faults.reduce((a, b) => a.concat(b), [])
	faults.sort((a, b) => b['Created Date'] - a['Created Date'])

	res.render('dash/faultsToTest', { faults })
}
module.exports.shortsToTest = async (req, res) => {
	const times = await Sip.find({ name: 'Times' })

	const newStartTimeFormat = moment(times[0].startDate).format(`YYYY-MM-DDT${times[0].startTime}:00.000Z`)

	const newEndTimeFormat = moment(times[0].endDate).format(`YYYY-MM-DDT${times[0].endTime}:00.000Z`)

	let startTime = new Date(newStartTimeFormat)
	let endTime = new Date(newEndTimeFormat)

	const stage16 = await Stage16.find({
		dateToStage: { $gt: startTime, $lt: endTime },
	}).sort({ dateToStage: -1 })

	let faults = []
	let areas = ['Cycle Test New', 'Layered PDI Inspection']

	for (let x of stage16) {
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Fixed Date']: { $gt: x.dateToStage },
					['Created Date']: { $lt: x.dateToStage },
					['Fault Code']: 'Shortage',
					Zone: { $nin: areas },
				},
			},
		])

		if (data.length > 0) {
			faults.push(data)
		}
	}
	for (let x of stage16) {
		let noDate = new Date('2020, 01, 01')
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Created Date']: { $lt: x.dateToStage },
					['Fault Code']: 'Shortage',
					['Fixed Date']: { $lt: noDate },
					Zone: { $nin: areas },
				},
			},
		])

		if (data.length > 0) {
			faults.push(data)
		}
	}

	faults = faults.reduce((a, b) => a.concat(b), [])
	faults.sort((a, b) => b['Created Date'] - a['Created Date'])

	res.render('dash/shortsToTest', { faults })
}

module.exports.nffCabs = async (req, res) => {
	let { start, end } = req.params
	const theHour = 0

	const notFixedDate = new Date('2021, 01, 01')

	// let newStartTimeFormat = new Date()
	// newStartTimeFormat.setHours(00, 00, 00, 00)

	// let newEndTimeFormat = new Date()
	// newEndTimeFormat.setHours(23, 59, 0, 0)

	if (start === '1') {
		newStartTimeFormat = new Date()
		newStartTimeFormat.setHours(06, 00, 00, 00)
		newEndTimeFormat = new Date()
		newEndTimeFormat.setHours(17, 59, 0, 0)
	} else {
		newStartTimeFormat = new Date(start)

		newEndTimeFormat = new Date(end)
	}

	// let newStartTimeFormat = new Date()
	// newStartTimeFormat.setHours(00, 00, 00, 00)

	// let newEndTimeFormat = new Date()
	// newEndTimeFormat.setHours(23, 59, 0, 0)

	if (req.body.startDate) {
		newStartTimeFormat = moment(req.body.startDate).format(`YYYY-MM-DDT${req.body.startTime}:00.000Z`)
		newEndTimeFormat = moment(req.body.endDate).format(`YYYY-MM-DDT${req.body.endTime}:00.000Z`)
	}

	const startTime = new Date(newStartTimeFormat)
	const endTime = new Date(newEndTimeFormat)

	const startTimeAddress = moment(startTime).format('YYYY-MM-DDTHH:mm:00')
	const endTimeAddress = moment(endTime).format('YYYY-MM-DDTHH:mm:00')

	// console.log(req.body)

	// console.log(startTime)
	// console.log(endTime)

	// console.log(startTimeAddress)
	// console.log(endTimeAddress)

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	let startDateAPI = moment(newStartTimeFormat).subtract(theHour, 'hours').format('YYYY/MM/DD/HH/mm')
	let endDateAPI = moment(newEndTimeFormat).add(theHour, 'hours').format('YYYY/MM/DD/HH/mm')

	const track3 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/TRACK 3 SIP 2/${startDateAPI}/${endDateAPI}`)

	const track1 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/SIP 6 NEW/${startDateAPI}/${endDateAPI}`)

	if (track1.data) {
		lay = track1.data.reduce((r) => r + 1, 0)
	} else {
		lay = 0
	}
	if (track3.data) {
		track3lay = track3.data.reduce((r) => r + 1, 0)
	} else {
		track3lay = 0
	}

	// console.log(inCFC)

	//sip 1

	const recMenZone1 = await Sip.find({ name: 'SIP 1' })

	let recsZone1 = []
	for (let m of recMenZone1) {
		if (m.rec1 != '') {
			recsZone1.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsZone1.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsZone1.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsZone1.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsZone1.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsZone1.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsZone1.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsZone1.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsZone1.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsZone1.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsZone1.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsZone1.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsZone1.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsZone1.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsZone1.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsZone1.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsZone1.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsZone1.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsZone1.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsZone1.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsZone1.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsZone1.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsZone1.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsZone1.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsZone1.push(m.rec25)
		}
	}

	// faults found in area

	const zone1FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'SIP 1',
	})

	const zone1FoundInAreaDPU = (zone1FoundInArea / lay).toFixed(2)

	// faults fixed in area

	let zone1FixedInArea = 0

	if (recsZone1.length > 0) {
		zone1FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'SIP 1',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsZone1 },
			['Fixed Date']: { $gt: notFixedDate },
		})
	}

	const zone1FixedInAreaDPU = (zone1FixedInArea / lay).toFixed(2)

	// faults not fixed in area

	let zone1NotFixedInArea = zone1FoundInArea - zone1FixedInArea

	const zone1NotFixedInAreaDPU = (zone1NotFixedInArea / lay).toFixed(2)

	// faults not found in area

	const zone1NotFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		['Fault Area']: 'Zone 1 Ldl',
		Zone: {
			$nin: ['SIP 1', 'Torque Overcheck', 'Torque Overcheck 2'],
		},
	})

	const zone1NotFoundInAreaDPU = (zone1NotFoundInArea / lay).toFixed(2)

	const totDpuZone1 = zone1FoundInAreaDPU
	const totalFaultsPercentZone1 = Math.round((zone1NotFixedInArea / zone1FoundInArea) * 100)

	totSentForwardFromZone1 = zone1NotFixedInAreaDPU

	// sip 2

	const recMenZone2 = await Sip.find({ name: 'SIP 2 NEW' })

	let recsZone2 = []
	for (let m of recMenZone2) {
		if (m.rec1 != '') {
			recsZone2.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsZone2.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsZone2.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsZone2.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsZone2.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsZone2.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsZone2.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsZone2.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsZone2.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsZone2.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsZone2.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsZone2.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsZone2.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsZone2.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsZone2.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsZone2.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsZone2.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsZone2.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsZone2.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsZone2.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsZone2.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsZone2.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsZone2.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsZone2.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsZone2.push(m.rec25)
		}
	}

	// faults found in area

	const zone2FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'SIP 2 NEW',
	})

	const zone2FoundInAreaDPU = (zone2FoundInArea / lay).toFixed(2)

	// faults fixed in area

	let zone2FixedInArea = 0

	if (recsZone2.length > 0) {
		zone2FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'SIP 2 NEW',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsZone2 },
			['Fixed Date']: { $gt: notFixedDate },
		})
	}

	// faults not fixed in area

	let zone2NotFixedInArea = zone2FoundInArea - zone2FixedInArea

	const zone2NotFixedInAreaDPU = (zone2NotFixedInArea / lay).toFixed(2)

	// faults not found in area

	const zone2NotFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		['Fault Area']: 'Zone 2 Ldl',
		Zone: {
			$nin: ['SIP 2 NEW', 'Torque Overcheck', 'Torque Overcheck 2'],
		},
	})

	totSentForwardFromZone2 = (+totSentForwardFromZone1 + +zone2NotFixedInAreaDPU).toFixed(2)

	const totDpuZone2 = (+totDpuZone1 + +zone2FoundInAreaDPU).toFixed(2)
	const totalFaultsPercentZone2 = Math.round(((zone1NotFixedInArea + zone2NotFixedInArea) / (zone1FoundInArea + zone2FoundInArea)) * 100)

	// sip 3

	const recMenZone3 = await Sip.find({ name: 'SIP 3 NEW' })

	let recsZone3 = []
	for (let m of recMenZone3) {
		if (m.rec1.trim() != '') {
			recsZone3.push(m.rec1)
		}
		if (m.rec2.trim() !== '') {
			recsZone3.push(m.rec2)
		}
		if (m.rec3.trim() !== '') {
			recsZone3.push(m.rec3)
		}
		if (m.rec4.trim() != '') {
			recsZone3.push(m.rec4)
		}
		if (m.rec5.trim() != '') {
			recsZone3.push(m.rec5)
		}
		if (m.rec6.trim() != '') {
			recsZone3.push(m.rec6)
		}
		if (m.rec7.trim() != '') {
			recsZone3.push(m.rec7)
		}
		if (m.rec8.trim() != '') {
			recsZone3.push(m.rec8)
		}
		if (m.rec9.trim() != '') {
			recsZone3.push(m.rec9)
		}
		if (m.rec10.trim() != '') {
			recsZone3.push(m.rec10)
		}
		if (m.rec11.trim() != '') {
			recsZone3.push(m.rec11)
		}
		if (m.rec12.trim() != '') {
			recsZone3.push(m.rec12)
		}
		if (m.rec13.trim() != '') {
			recsZone3.push(m.rec13)
		}
		if (m.rec14.trim() != '') {
			recsZone3.push(m.rec14)
		}
		if (m.rec15.trim() != '') {
			recsZone3.push(m.rec15)
		}
		if (m.rec16.trim() != '') {
			recsZone3.push(m.rec16)
		}
		if (m.rec17.trim() != '') {
			recsZone3.push(m.rec17)
		}
		if (m.rec18.trim() != '') {
			recsZone3.push(m.rec18)
		}
		if (m.rec19.trim() != '') {
			recsZone3.push(m.rec19)
		}
		if (m.rec20.trim() != '') {
			recsZone3.push(m.rec20)
		}
		if (m.rec21.trim() != '') {
			recsZone3.push(m.rec21)
		}
		if (m.rec22.trim() != '') {
			recsZone3.push(m.rec22)
		}
		if (m.rec15.trim() != '') {
			recsZone3.push(m.rec23)
		}
		if (m.rec24.trim() != '') {
			recsZone3.push(m.rec24)
		}
		if (m.rec25.trim() != '') {
			recsZone3.push(m.rec25)
		}
	}

	// faults found in area

	const zone3FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'SIP 3 NEW',
	})

	const zone3FoundInAreaDPU = (zone3FoundInArea / lay).toFixed(2)

	// faults fixed in area

	let zone3FixedInArea = 0

	if (recsZone3.length > 0) {
		zone3FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],

			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'SIP 3 NEW',

			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsZone3 },
			['Fixed Date']: { $gt: notFixedDate },
		})
	}

	// faults not fixed in area

	let zone3NotFixedInArea = zone3FoundInArea - zone3FixedInArea

	const zone3NotFixedInAreaDPU = (zone3NotFixedInArea / lay).toFixed(2)

	totSentForwardFromZone3 = (+totSentForwardFromZone2 + +zone3NotFixedInAreaDPU).toFixed(2)

	const totDpuZone3 = (+totDpuZone2 + +zone3FoundInAreaDPU).toFixed(2)
	const totalFaultsPercentZone3 = Math.round(
		((zone1NotFixedInArea + zone2NotFixedInArea + zone3NotFixedInArea) / (zone1FoundInArea + zone2FoundInArea + zone3FoundInArea)) * 100
	)

	// cab inspection

	const recMenCabs = await Sip.find({ name: 'NEW Cab Inspection' })

	let recsCabs = []
	for (let m of recMenCabs) {
		if (m.rec1 != '') {
			recsCabs.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsCabs.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsCabs.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsCabs.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsCabs.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsCabs.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsCabs.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsCabs.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsCabs.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsCabs.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsCabs.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsCabs.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsCabs.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsCabs.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsCabs.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsCabs.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsCabs.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsCabs.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsCabs.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsCabs.push(m.re20)
		}
		if (m.rec21 != '') {
			recsCabs.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsCabs.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsCabs.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsCabs.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsCabs.push(m.rec25)
		}
	}

	// faults found in area

	const cabsFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'NEW Cab Inspection',
	})

	const cabsFoundInAreaDPU = (cabsFoundInArea / lay).toFixed(2)

	// faults fixed in area

	let cabsFixedInArea = 0

	if (recsCabs.length > 0) {
		cabsFixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'NEW Cab Inspection',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsCabs },
		})
	}

	const cabsFixedInAreaDPU = (cabsFixedInArea / lay).toFixed(2)

	// faults not fixed in area

	let cabsNotFixedInArea = cabsFoundInArea - cabsFixedInArea

	const cabsNotFixedInAreaDPU = (cabsNotFixedInArea / lay).toFixed(2)

	// faults not found in area

	const cabsNotFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		['Fault Area']: 'Cab Systems',
		Zone: {
			$nin: ['NEW Cab Inspection', 'Torque Overcheck', 'Torque Overcheck 2'],
		},
	})

	const cabsNotFoundInAreaDPU = (cabsNotFoundInArea / lay).toFixed(2)

	const assCabs = (+cabsNotFixedInAreaDPU + +cabsFixedInAreaDPU + +cabsNotFoundInAreaDPU).toFixed(2)

	totSentForwardFromCabs = (+totSentForwardFromZone3 + +cabsNotFixedInAreaDPU).toFixed(2)

	const totDpuCabs = (+totDpuZone3 + +cabsFoundInAreaDPU).toFixed(2)

	const totalFaultsPercentCabs = Math.round(
		((zone1NotFixedInArea + zone2NotFixedInArea + zone3NotFixedInArea + cabsNotFixedInArea) /
			(zone1FoundInArea + zone2FoundInArea + zone3FoundInArea + cabsFoundInArea)) *
			100
	)

	// sip 4

	const recMenZone4 = await Sip.find({ name: 'SIP 4 NEW' })

	let recsZone4 = []
	for (let m of recMenZone4) {
		if (m.rec1 != '') {
			recsZone4.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsZone4.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsZone4.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsZone4.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsZone4.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsZone4.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsZone4.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsZone4.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsZone4.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsZone4.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsZone4.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsZone4.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsZone4.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsZone4.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsZone4.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsZone4.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsZone4.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsZone4.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsZone4.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsZone4.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsZone4.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsZone4.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsZone4.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsZone4.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsZone4.push(m.rec25)
		}
	}

	// faults found in area

	const zone4FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'SIP 4 NEW',
	})

	const zone4FoundInAreaDPU = (zone4FoundInArea / lay).toFixed(2)

	// faults fixed in area

	let zone4FixedInArea = 0

	if (recsZone4.length > 0) {
		zone4FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'SIP 4 NEW',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsZone4 },
		})
	}

	// faults not fixed in area

	let zone4NotFixedInArea = zone4FoundInArea - zone4FixedInArea

	// faults not found in area4
	const zone4NotFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		['Fault Area']: 'Zone 4 Ldl',
		Zone: {
			$nin: ['SIP 4 NEW', 'Torque Overcheck', 'Torque Overcheck 2'],
		},
	})

	const totDpuZone4 = (+totDpuCabs + +zone4FoundInAreaDPU).toFixed(2)

	const totalFaultsPercentZone4 = Math.round(
		((zone1NotFixedInArea + zone2NotFixedInArea + zone3NotFixedInArea + cabsNotFixedInArea + zone4NotFixedInArea) /
			(zone1FoundInArea + zone2FoundInArea + zone3FoundInArea + cabsFoundInArea + zone4FoundInArea)) *
			100
	)

	//booms

	const recMenBooms = await Sip.find({ name: 'Boom Sub Assembly LDL' })

	let recsBooms = []
	for (let m of recMenBooms) {
		if (m.rec1 != '') {
			recsBooms.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsBooms.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsBooms.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsBooms.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsBooms.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsBooms.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsBooms.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsBooms.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsBooms.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsBooms.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsBooms.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsBooms.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsBooms.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsBooms.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsBooms.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsBooms.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsBooms.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsBooms.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsBooms.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsBooms.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsBooms.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsBooms.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsBooms.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsBooms.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsBooms.push(m.rec25)
		}
	}

	// faults found in area

	const allLay = lay + track3lay

	const boomsFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'Boom Sub Assembly LDL',
	})

	const boomsFoundInAreaDPU = (boomsFoundInArea / allLay).toFixed(2)

	// faults fixed in area

	let boomsFixedInArea = 0

	if (recsBooms.length > 0) {
		boomsFixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'Boom Sub Assembly LDL',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsBooms },
		})
	}

	const boomsFixedInAreaDPU = (boomsFixedInArea / allLay).toFixed(2)

	// faults not fixed in area

	let boomsNotFixedInArea = boomsFoundInArea - boomsFixedInArea

	// faults not found in area

	const boomsNotFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		['Fault Area']: 'Boom Sub Assembly',
		Zone: {
			$nin: ['Boom Sub Assembly LDL', 'Torque Overcheck', 'Torque Overcheck 2'],
		},
	})

	const totDpuBooms = (boomsFoundInArea / allLay).toFixed(2)

	const totalFaultsPercentBooms = Math.round((boomsNotFixedInArea / boomsFoundInArea) * 100)

	// sip 5

	const recMenZone5 = await Sip.find({ name: 'SIP 5 NEW' })

	let recsZone5 = []
	for (let m of recMenZone5) {
		if (m.rec1 != '') {
			recsZone5.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsZone5.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsZone5.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsZone5.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsZone5.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsZone5.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsZone5.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsZone5.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsZone5.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsZone5.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsZone5.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsZone5.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsZone5.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsZone5.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsZone5.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsZone5.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsZone5.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsZone5.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsZone5.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsZone5.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsZone5.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsZone5.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsZone5.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsZone5.push(m.rec14)
		}
		if (m.rec25 != '') {
			recsZone5.push(m.rec25)
		}
	}

	// faults found in area

	const zone5FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'SIP 5 NEW',
	})

	const zone5FoundInAreaDPU = (zone5FoundInArea / lay).toFixed(2)

	// faults fixed in area

	let zone5FixedInArea = 0

	if (recsZone5.length > 0) {
		zone5FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'SIP 5 NEW',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsZone5 },
		})
	}

	// faults not fixed in area

	let zone5NotFixedInArea = zone5FoundInArea - zone5FixedInArea

	const totDpuZone5 = (+totDpuZone4 + +totDpuBooms + +zone5FoundInAreaDPU).toFixed(2)

	const totalFaultsPercentZone5 = Math.round(
		((zone1NotFixedInArea +
			zone2NotFixedInArea +
			zone3NotFixedInArea +
			cabsNotFixedInArea +
			zone4NotFixedInArea +
			zone5NotFixedInArea +
			boomsNotFixedInArea) /
			(zone1FoundInArea + zone2FoundInArea + zone3FoundInArea + cabsFoundInArea + zone4FoundInArea + zone5FoundInArea + boomsFoundInArea)) *
			100
	)

	// t3 Zone 1

	const recMenZoneT3S1 = await Sip.find({ name: 'Track 3 SIP 1' })

	let recsT3Z1 = []
	for (let m of recMenZoneT3S1) {
		if (m.rec1 != '') {
			recsT3Z1.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsT3Z1.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsT3Z1.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsT3Z1.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsT3Z1.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsT3Z1.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsT3Z1.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsT3Z1.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsT3Z1.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsT3Z1.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsT3Z1.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsT3Z1.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsT3Z1.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsT3Z1.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsT3Z1.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsT3Z1.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsT3Z1.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsT3Z1.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsT3Z1.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsT3Z1.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsT3Z1.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsT3Z1.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsT3Z1.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsT3Z1.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsT3Z1.push(m.rec25)
		}
	}

	const recMenZoneT3S2 = await Sip.find({ name: 'Track 3 SIP 2' })

	let recsT3Z2 = []
	for (let m of recMenZoneT3S2) {
		if (m.rec1 != '') {
			recsT3Z2.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsT3Z2.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsT3Z2.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsT3Z2.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsT3Z2.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsT3Z2.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsT3Z2.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsT3Z2.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsT3Z2.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsT3Z2.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsT3Z2.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsT3Z2.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsT3Z2.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsT3Z2.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsT3Z2.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsT3Z2.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsT3Z2.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsT3Z2.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsT3Z2.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsT3Z2.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsT3Z2.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsT3Z2.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsT3Z2.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsT3Z2.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsT3Z2.push(m.rec25)
		}
	}

	const recsT3 = [...recsT3Z1, ...recsT3Z2]

	// faults found in area

	const t3FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		$or: [
			{ Zone: 'Track 3 SIP 1' },
			{ Zone: 'Track 3 SIP 1 - P42' },
			{ Zone: 'T3 SIP 1' },
			{ Zone: 'Track 3 SIP 2' },
			{ Zone: 'Track 3 SIP 2 - P42' },
			{ Zone: 'T3 SIP 2' },
		],
	})

	const t3FoundInAreaDPU = (t3FoundInArea / track3lay).toFixed(2)

	// faults fixed in area

	let t3FixedInArea = 0

	if (recsT3.length > 0) {
		t3FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			$or: [
				{ Zone: 'Track 3 SIP 1' },
				{ Zone: 'Track 3 SIP 1 - P42' },
				{ Zone: 'T3 SIP 1' },
				{ Zone: 'Track 3 SIP 2' },
				{ Zone: 'Track 3 SIP 2 - P42' },
				{ Zone: 'T3 SIP 2' },
			],
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsT3 },
		})
	}

	// faults not fixed in area

	let t3NotFixedInArea = t3FoundInArea - t3FixedInArea

	const totDpuT3 = t3FoundInAreaDPU
	const totDpuT3ForTrack1 = (t3FoundInArea / lay).toFixed(2)

	const totalFaultsPercentT3 = Math.round((t3NotFixedInArea / t3FoundInArea) * 100)

	// sip 6
	const recMenZone6 = await Sip.find({ name: 'SIP 6 NEW' })

	let recsZone6 = []
	for (let m of recMenZone6) {
		if (m.rec1 != '') {
			recsZone6.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsZone6.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsZone6.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsZone6.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsZone6.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsZone6.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsZone6.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsZone6.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsZone6.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsZone6.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsZone6.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsZone6.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsZone6.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsZone6.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsZone6.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsZone6.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsZone6.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsZone6.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsZone6.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsZone6.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsZone6.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsZone6.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsZone6.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsZone6.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsZone6.push(m.rec25)
		}
	}

	// faults found in area

	const zone6FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'SIP 6 NEW',
	})

	const zone6FoundInAreaDPU = (zone6FoundInArea / lay).toFixed(2)

	// faults fixed in area

	let zone6FixedInArea = 0

	if (recsZone6.length > 0) {
		zone6FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'SIP 6 NEW',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsZone6 },
		})
	}

	// faults not fixed in area

	let zone6NotFixedInArea = zone6FoundInArea - zone6FixedInArea

	const zone6NotFixedInAreaDPU = (zone6NotFixedInArea / lay).toFixed(2)

	const totDpuZone6 = (+totDpuZone5 + +totDpuT3ForTrack1 + +zone6FoundInAreaDPU).toFixed(2)

	const totalFaultsPercentZone6 = Math.round(
		((zone1NotFixedInArea +
			zone2NotFixedInArea +
			zone3NotFixedInArea +
			cabsNotFixedInArea +
			zone4NotFixedInArea +
			zone5NotFixedInArea +
			zone6NotFixedInArea +
			boomsNotFixedInArea +
			t3NotFixedInArea) /
			(zone1FoundInArea +
				zone2FoundInArea +
				zone3FoundInArea +
				cabsFoundInArea +
				zone4FoundInArea +
				zone5FoundInArea +
				zone6FoundInArea +
				boomsFoundInArea +
				t3FoundInArea)) *
			100
	)

	// UV1
	const recMenUV1 = await Sip.find({ name: 'UV 1 Ldl' })

	let recsUV1 = []
	for (let m of recMenUV1) {
		if (m.rec1 != '') {
			recsUV1.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsUV1.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsUV1.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsUV1.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsUV1.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsUV1.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsUV1.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsUV1.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsUV1.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsUV1.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsUV1.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsUV1.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsUV1.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsUV1.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsUV1.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsUV1.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsUV1.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsUV1.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsUV1.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsUV1.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsUV1.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsUV1.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsUV1.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsUV1.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsUV1.push(m.rec25)
		}
	}

	// faults found in area

	const uv1FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'UV 1 Ldl',
	})

	const uv1FoundInAreaDPU = (uv1FoundInArea / lay).toFixed(2)

	// faults fixed in area

	let uv1FixedInArea = 0

	if (recsUV1.length > 0) {
		uv1FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'UV 1 Ldl',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsUV1 },
		})
	}

	// faults not fixed in area

	let uv1NotFixedInArea = uv1FoundInArea - uv1FixedInArea

	const totDpuUV1 = (+totDpuZone6 + +uv1FoundInAreaDPU).toFixed(2)

	const totalFaultsPercentUV1 = Math.round(
		((zone1NotFixedInArea +
			zone2NotFixedInArea +
			zone3NotFixedInArea +
			cabsNotFixedInArea +
			zone4NotFixedInArea +
			zone5NotFixedInArea +
			zone6NotFixedInArea +
			boomsNotFixedInArea +
			t3NotFixedInArea +
			uv1NotFixedInArea) /
			(zone1FoundInArea +
				zone2FoundInArea +
				zone3FoundInArea +
				cabsFoundInArea +
				zone4FoundInArea +
				zone5FoundInArea +
				zone6FoundInArea +
				boomsFoundInArea +
				t3FoundInArea +
				uv1FoundInArea)) *
			100
	)

	// spec
	const recMenSpec = await Sip.find({ name: 'SIP SPEC Ldl' })

	let recsSpec = []
	for (let m of recMenSpec) {
		if (m.rec1 != '') {
			recsSpec.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsSpec.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsSpec.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsSpec.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsSpec.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsSpec.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsSpec.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsSpec.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsSpec.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsSpec.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsSpec.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsSpec.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsSpec.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsSpec.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsSpec.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsSpec.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsSpec.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsSpec.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsSpec.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsSpec.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsSpec.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsSpec.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsSpec.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsSpec.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsSpec.push(m.rec25)
		}
	}

	// faults found in area

	const specFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'SIP SPEC Ldl',
	})

	const specFoundInAreaDPU = (specFoundInArea / lay).toFixed(2)

	// faults fixed in area

	let specFixedInArea = 0

	if (recsSpec.length > 0) {
		specFixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: 'SIP SPEC Ldl',
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsSpec },
		})
	}

	const specNotFixedInArea = specFoundInArea - specFixedInArea

	const totDpuSpec = (+totDpuUV1 + +specFoundInAreaDPU).toFixed(2)

	const totalFaultsPercentSpec = Math.round(
		((zone1NotFixedInArea +
			zone2NotFixedInArea +
			zone3NotFixedInArea +
			cabsNotFixedInArea +
			zone4NotFixedInArea +
			zone5NotFixedInArea +
			zone6NotFixedInArea +
			boomsNotFixedInArea +
			t3NotFixedInArea +
			uv1NotFixedInArea +
			specNotFixedInArea) /
			(zone1FoundInArea +
				zone2FoundInArea +
				zone3FoundInArea +
				cabsFoundInArea +
				zone4FoundInArea +
				zone5FoundInArea +
				zone6FoundInArea +
				boomsFoundInArea +
				t3FoundInArea +
				uv1FoundInArea +
				specFoundInArea)) *
			100
	)

	//  zone 7
	const recMenZ7E = await Sip.find({ name: 'Z7 Electrical Test' })

	let recsZ7E = []
	for (let m of recMenZ7E) {
		if (m.rec1 != '') {
			recsZ7E.push(m.rec1)
		}
		if (m.rec2 != '') {
			recsZ7E.push(m.rec2)
		}
		if (m.rec3 != '') {
			recsZ7E.push(m.rec3)
		}
		if (m.rec4 != '') {
			recsZ7E.push(m.rec4)
		}
		if (m.rec5 != '') {
			recsZ7E.push(m.rec5)
		}
		if (m.rec6 != '') {
			recsZ7E.push(m.rec6)
		}
		if (m.rec7 != '') {
			recsZ7E.push(m.rec7)
		}
		if (m.rec8 != '') {
			recsZ7E.push(m.rec8)
		}
		if (m.rec9 != '') {
			recsZ7E.push(m.rec9)
		}
		if (m.rec10 != '') {
			recsZ7E.push(m.rec10)
		}
		if (m.rec11 != '') {
			recsZ7E.push(m.rec11)
		}
		if (m.rec12 != '') {
			recsZ7E.push(m.rec12)
		}
		if (m.rec13 != '') {
			recsZ7E.push(m.rec13)
		}
		if (m.rec14 != '') {
			recsZ7E.push(m.rec14)
		}
		if (m.rec15 != '') {
			recsZ7E.push(m.rec15)
		}
		if (m.rec16 != '') {
			recsZ7E.push(m.rec16)
		}
		if (m.rec17 != '') {
			recsZ7E.push(m.rec17)
		}
		if (m.rec18 != '') {
			recsZ7E.push(m.rec18)
		}
		if (m.rec19 != '') {
			recsZ7E.push(m.rec19)
		}
		if (m.rec20 != '') {
			recsZ7E.push(m.rec20)
		}
		if (m.rec21 != '') {
			recsZ7E.push(m.rec21)
		}
		if (m.rec22 != '') {
			recsZ7E.push(m.rec22)
		}
		if (m.rec23 != '') {
			recsZ7E.push(m.rec23)
		}
		if (m.rec24 != '') {
			recsZ7E.push(m.rec24)
		}
		if (m.rec25 != '') {
			recsZ7E.push(m.rec25)
		}
	}

	// faults found in area
	const zone7areas = ['Z7 Electrical Test', 'Rolling Rd/Warm Up']

	const z7FoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: { $in: zone7areas },
	})

	const z7FoundInAreaDPU = (z7FoundInArea / lay).toFixed(2)

	// faults fixed in area

	let z7FixedInArea = 0

	if (recsZ7E.length > 0) {
		z7FixedInArea = await QSmart.countDocuments({
			['Business Unit']: 'Loadall',
			$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],
			// ['Fault Code']    : { $ne: 'Shortage' },
			Zone: { $in: zone7areas },
			// ['Fault Area']    : 'Boom Sub Assembly',
			['Fixed By']: { $in: recsZ7E },
		})
	}

	// faults not fixed in area

	let z7NotFixedInArea = z7FoundInArea - z7FixedInArea

	const totDpuZ7 = (+totDpuSpec + +z7FoundInAreaDPU).toFixed(2)

	const totalFaultsPercentZ7 = Math.round(
		((zone1NotFixedInArea +
			zone2NotFixedInArea +
			zone3NotFixedInArea +
			cabsNotFixedInArea +
			zone4NotFixedInArea +
			zone5NotFixedInArea +
			zone6NotFixedInArea +
			boomsNotFixedInArea +
			t3NotFixedInArea +
			uv1NotFixedInArea +
			specNotFixedInArea +
			z7NotFixedInArea) /
			(zone1FoundInArea +
				zone2FoundInArea +
				zone3FoundInArea +
				cabsFoundInArea +
				zone4FoundInArea +
				zone5FoundInArea +
				zone6FoundInArea +
				boomsFoundInArea +
				t3FoundInArea +
				uv1FoundInArea +
				specFoundInArea +
				z7FoundInArea)) *
			100
	)

	let faultsOutOfOBay = []

	let threeWeksAgo = moment().subtract(2, 'weeks')

	const threeWeeksMongo = new Date(threeWeksAgo)

	// console.log(threeWeeksMongo)

	const stage16 = await Stage16.find({
		dateToStage: { $gt: startTime, $lt: endTime },
	})

	const stage16Buids = stage16.map((b) => b.buildNo)
	let areas = ['Cycle Test New', 'Layered PDI Inspection']
	let oBayaAreas = [
		'Boom Sub Assembly LDL',
		'NEW Cab Inspection',
		'Rolling Rd/Warm Up',
		'SIP 1',
		'SIP 2 NEW',
		'SIP 3',
		'SIP 3 NEW',
		'SIP 4 NEW',
		'SIP 5 NEW',
		'SIP 6',
		'SIP 6 NEW',
		'SIP 7 NEW',
		'SIP SPEC Ldl',
		'T3 SIP 1',
		'T3 SIP 2',
		'Torque Overcheck',
		'Torque Overcheck 2',
		'Track 3 SIP 1',
		'Track 3 SIP 1 - P42',
		'Track 3 SIP 2',
		'Track 3 SIP 2 - P42',
		'Track PDI/Validation',
		'UV 1 Ldl',
		'Z7 Electrical Test',
	]

	const allFaultsBefore16 = await QSmart.countDocuments({
		['Build Number']: { $in: stage16Buids },
		// ['Fault Code']   : { $ne: 'Shortage' },
		Zone: { $in: oBayaAreas },
	})

	for (let x of stage16) {
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Fixed Date']: { $gt: x.dateToStage },
					['Created Date']: { $lt: x.dateToStage },
					// ['Fault Code']   : { $ne: 'Shortage' },
					Zone: { $in: oBayaAreas },
				},
			},
		])

		if (data.length > 0) {
			faultsOutOfOBay.push(data)
		}
	}
	for (let x of stage16) {
		let noDate = new Date('2020, 01, 01')
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Created Date']: { $lt: x.dateToStage },
					// ['Fault Code']   : { $ne: 'Shortage' },
					['Fixed Date']: { $lt: noDate },
					Zone: { $in: oBayaAreas },
				},
			},
		])

		if (data.length > 0) {
			faultsOutOfOBay.push(data)
		}
	}

	faultsOutOfOBay = faultsOutOfOBay.reduce((a, b) => a.concat(b), [])

	const faultsForwardTo16 = faultsOutOfOBay.length

	// console.log('SENT TO 16 =>', faultsForwardTo16)
	// // console.log('ALL FAILED BEFORE 16 =>', allFaultsBefore16)
	// console.log('ALL FAILED BEFORE 16 =>', allFaultsBefore16.length)

	const dpuForwadTo16 = (faultsOutOfOBay.length / stage16.length).toFixed(2)
	const percentForwadTo16 = Math.round((faultsForwardTo16 / allFaultsBefore16) * 100)

	// console.log(faultsOutOfOBay)
	// console.log(faultsOutOfOBay.length)
	// cycle test

	// total tested

	const allCycleTested = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/Cycle Test New/${startDateAPI}/${endDateAPI}`)

	if (allCycleTested.data) {
		allCycleTestedBuilds = allCycleTested.data.map((build) => build.buildNo)
	} else {
		allCycleTestedBuilds = []
	}

	// faults found in area

	const cycleTestFoundInArea = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],

		// ['Fault Code']    : { $ne: 'Shortage' },
		// ['Fault Area']    : 'Boom Sub Assembly',
		Zone: 'Cycle Test New',
	})
	const cycleTestFixedInAreaData = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				$and: [{ ['Created Date']: { $gt: startTime } }, { ['Created Date']: { $lt: endTime } }],

				Zone: 'Cycle Test New',
				// ['Fixed By']      : { $ne: [ 'Created By' ] },
			},
		},
		{
			$redact: {
				$cond: [{ $eq: ['$Fixed By', '$Created By'] }, '$$KEEP', '$$PRUNE'],
			},
		},
		// { $where: [ 'Fixed By' ] != [ 'Created By' ] },
	])

	const cycleTestFixedInArea = +cycleTestFixedInAreaData.length

	const cycleTestNotFixedInArea = cycleTestFoundInArea - cycleTestFixedInArea

	// console.log(allCycleTestedBuilds.length)
	// console.log(cycleTestFoundInArea)

	const cycleTestFoundInAreaDPU = (cycleTestFoundInArea / allCycleTestedBuilds.length).toFixed(2)

	const dpuFprwardToPDI = (+totDpuZ7 + +cycleTestFoundInAreaDPU).toFixed(2)

	//work out stage 17 builds
	const stage17 = await Stage17.find({
		dateToStage: { $gt: startTime, $lt: endTime },
	})

	const stage17Buids = stage17.map((b) => b.buildNo)

	let oBayaAreasWithCycleTest = [
		'Boom Sub Assembly LDL',
		'NEW Cab Inspection',
		'Rolling Rd/Warm Up',
		'SIP 1',
		'SIP 2 NEW',
		'SIP 3',
		'SIP 3 NEW',
		'SIP 4 NEW',
		'SIP 5 NEW',
		'SIP 6',
		'SIP 6 NEW',
		'SIP 7 NEW',
		'SIP SPEC Ldl',
		'T3 SIP 1',
		'T3 SIP 2',
		'Torque Overcheck',
		'Torque Overcheck 2',
		'Track 3 SIP 1',
		'Track 3 SIP 1 - P42',
		'Track 3 SIP 2',
		'Track 3 SIP 2 - P42',
		'Track PDI/Validation',
		'UV 1 Ldl',
		'Z7 Electrical Test',
		'Cycle Test New',
	]

	let faultsOutOfCycleTest = []

	const allFaultsBefore17 = await QSmart.countDocuments({
		['Build Number']: { $in: stage17Buids },
		// ['Fault Code']   : { $ne: 'Shortage' },
		Zone: { $in: oBayaAreasWithCycleTest },
	})

	for (let x of stage17) {
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Fixed Date']: { $gt: x.dateToStage },
					['Created Date']: { $lt: x.dateToStage },
					// ['Fault Code']   : { $ne: 'Shortage' },
					Zone: { $in: oBayaAreasWithCycleTest },
				},
			},
		])

		if (data.length > 0) {
			faultsOutOfCycleTest.push(data)
		}
	}
	for (let x of stage17) {
		let noDate = new Date('2020, 01, 01')
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Created Date']: { $lt: x.dateToStage },
					// ['Fault Code']   : { $ne: 'Shortage' },
					['Fixed Date']: { $lt: noDate },
					Zone: { $in: oBayaAreasWithCycleTest },
				},
			},
		])

		if (data.length > 0) {
			faultsOutOfCycleTest.push(data)
		}
	}

	faultsOutOfCycleTest = faultsOutOfCycleTest.reduce((a, b) => a.concat(b), [])

	const faultsForwardFromCycleTest = +faultsForwardTo16 + +cycleTestFoundInArea - +cycleTestFixedInArea

	const faultsForwardToPDIPercent = Math.round((faultsOutOfCycleTest.length / allFaultsBefore17) * 100)

	let faultsAfterStage17 = []

	for (let x of stage17) {
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Created Date']: { $gt: x.dateToStage },
					// ['Created Date'] : { $lt: x.dateToStage },
					// ['Fault Code']   : { $ne: 'Shortage' },
					Zone: { $nin: oBayaAreasWithCycleTest },
				},
			},
		])

		if (data.length > 0) {
			faultsAfterStage17.push(data)
		}
	}

	const concatArray = async (array) => {
		array.reduce((a, b) => a.concat(b), [])
	}

	const faultsFoundAfterStage17 = faultsAfterStage17.reduce((a, b) => a.concat(b), []).length
	const pdiFoundInAreaDPU = (faultsFoundAfterStage17 / stage17.length).toFixed(2)

	// const fixedInPDI = await QSmart.countDocuments({
	// 	['Build Number']  : { $in: stage17Buids },
	// 	['Business Unit'] : 'Loadall',
	// 	['Fixed By']      : { $nin: [ '', 'Customer Focus Centre' ] },
	// })

	const testStart = new Date('2021, 11, 08')
	const testEnd = new Date('2021, 11, 09')

	//machines through CFC
	const inCFC = await Throughput.find({
		createdAt: { $gt: startTime, $lt: endTime },
		// createdAt : { $gt: testStart, $lt: testEnd },
		division: 'LDL',
		building: { $ne: 'Loadall PDI' },
	})

	let faultsFoundInCFC = 0
	let faultsOutOfCFC = 0

	for (let c of inCFC) {
		faultsFoundInCFC += c.functional

		if (c.cabsFaults) faultsFoundInCFC += c.cabsFaults

		if (c.cosmetic) faultsFoundInCFC += c.cosmetic

		if (c.electricalFaults) faultsFoundInCFC += c.electricalFaults

		if (c.fabFaults) faultsFoundInCFC += c.fabFaults

		if (c.shortages) faultsFoundInCFC += c.shortages

		if (c.mechanicalFaults) faultsFoundInCFC += c.mechanicalFaults

		const delim = 'ST21'
		const name = c.startFaults
		const result = name.split(delim).slice(1).join(delim)

		faultsOutOfCFC += (result.match(/,/g) || []).length + 1
	}

	const fixedInCFC = faultsFoundInCFC - faultsOutOfCFC

	//just build numnbers through CFC
	const buildsThroughCFC = inCFC.map((b) => b.buildNumber.toUpperCase())

	let fixedInPDI = []

	for (let x of stage17) {
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Created Date']: { $gt: x.dateToStage },
					// ['Created Date'] : { $lt: x.dateToStage },
					// ['Fault Code']   : { $ne: 'Shortage' },
					Zone: { $nin: oBayaAreasWithCycleTest },
					['Fixed By']: { $nin: ['', 'Customer Focus Centre'] },
				},
			},
		])

		if (data.length > 0) {
			fixedInPDI.push(data)
		}
	}

	let notFixedInPDI = []

	for (let x of stage17) {
		let data = await QSmart.aggregate([
			{
				$match: {
					['Build Number']: x.buildNo,
					['Created Date']: { $gt: x.dateToStage },

					Zone: { $nin: oBayaAreasWithCycleTest },
					['Fixed By']: 'Customer Focus Centre',
				},
			},
			{
				$match: {
					['Build Number']: { $in: buildsThroughCFC },
				},
			},
		])

		if (data.length > 0) {
			notFixedInPDI.push(data)
		}
	}

	const numberFixedInPDI = fixedInPDI.reduce((a, b) => a.concat(b), []).length

	const dputoCFC = (+pdiFoundInAreaDPU + +dpuFprwardToPDI).toFixed(2)

	const forwardFromPDI = notFixedInPDI.reduce((a, b) => a.concat(b), []).length

	// console.log(inCFC)

	const faultsForwardToCFC = await QSmart.countDocuments({
		['Build Number']: { $in: buildsThroughCFC },
		['Business Unit']: 'Loadall',
		['Fixed By']: 'Customer Focus Centre',
	})
	const faultsForwardToCFCData = await QSmart.find({
		['Build Number']: { $in: buildsThroughCFC },
		['Business Unit']: 'Loadall',
		['Fixed By']: 'Customer Focus Centre',
	})

	const allFaultsOnMachinesSentToCFC = await QSmart.countDocuments({
		['Build Number']: { $in: buildsThroughCFC },
		['Business Unit']: 'Loadall',
	})

	const faultsPercentToCFC = Math.round((faultsForwardToCFC / allFaultsOnMachinesSentToCFC) * 100)

	// console.log('BUILDS IN CFC =>', buildsThroughCFC.length)
	// console.log('FAULTS INTO CFC =>', faultsForwardToCFC)
	// console.log(
	// 	'TOTAL FAULTS ON MACHINES INTO CFC =>',
	// 	allFaultsOnMachinesSentToCFC,
	// )
	// console.log('PERCENT INTO CFC =>', faultsPercentToCFC)

	const dpuInCFC = (faultsFoundInCFC / buildsThroughCFC.length).toFixed(2)

	const startTimeFormat = moment(startTime).format('YYYY-MM-DDTHH:mm:00.000Z')
	const endTimeFormat = moment(endTime).format('YYYY-MM-DDTHH:mm:00.000Z')

	res.render('dash/nffCabs', {
		faultsFoundInCFC,
		faultsOutOfCFC,
		fixedInCFC,
		dpuInCFC,
		startTime,
		endTime,
		startTimeFormat,
		endTimeFormat,
		lay,
		track3lay,
		startTimeAddress,
		endTimeAddress,
		stage16,
		stage17,

		//ff
		faultsForwardFromCycleTest,

		// stage 16
		faultsForwardTo16,
		dpuForwadTo16,
		percentForwadTo16,
		// cycle test
		cycleTestFoundInArea,
		cycleTestFoundInAreaDPU,
		dpuFprwardToPDI,
		faultsForwardToPDIPercent,
		cycleTestFixedInArea,
		cycleTestNotFixedInArea,
		//PDI
		faultsFoundAfterStage17,
		pdiFoundInAreaDPU,
		numberFixedInPDI,
		forwardFromPDI,
		//CFC
		inCFC,
		dputoCFC,
		faultsPercentToCFC,
		faultsForwardToCFC,

		//sip 1
		zone1FoundInArea,
		zone1FixedInArea,
		zone1FoundInAreaDPU,
		zone1NotFixedInArea,

		totDpuZone1,
		totalFaultsPercentZone1,
		//sip 2
		zone2FoundInArea,
		zone2FixedInArea,
		zone2FoundInAreaDPU,
		zone2NotFixedInArea,

		totDpuZone2,
		totalFaultsPercentZone2,
		//sip 3
		zone3FoundInArea,
		zone3FixedInArea,
		zone3FoundInAreaDPU,
		zone3NotFixedInArea,

		totDpuZone3,
		totalFaultsPercentZone3,
		//cab insp loadall
		cabsFoundInArea,
		cabsFixedInArea,
		cabsFoundInAreaDPU,
		cabsNotFixedInArea,

		totDpuCabs,
		totalFaultsPercentCabs,
		//sip 4
		zone4FoundInArea,
		zone4FixedInArea,
		zone4FoundInAreaDPU,
		zone4NotFixedInArea,

		totDpuZone4,
		totalFaultsPercentZone4,
		//booms
		boomsFoundInArea,
		boomsFixedInArea,
		boomsFoundInAreaDPU,
		boomsNotFixedInArea,

		totDpuBooms,
		totalFaultsPercentBooms,
		//sip 5
		zone5FoundInArea,
		zone5FixedInArea,
		zone5FoundInAreaDPU,
		zone5NotFixedInArea,

		totDpuZone5,
		totalFaultsPercentZone5,
		//track 3
		t3FoundInArea,
		t3FixedInArea,
		t3FoundInAreaDPU,
		t3NotFixedInArea,

		totDpuT3,
		totalFaultsPercentT3,
		//sip 6
		zone6FoundInArea,
		zone6FixedInArea,
		zone6FoundInAreaDPU,
		zone6NotFixedInArea,
		zone6NotFixedInAreaDPU,
		totDpuZone6,
		totalFaultsPercentZone6,
		//uv 1
		uv1FoundInArea,
		uv1FixedInArea,
		uv1FoundInAreaDPU,
		uv1NotFixedInArea,
		totDpuUV1,
		totalFaultsPercentUV1,
		//spec
		specFoundInArea,
		specFixedInArea,
		specFoundInAreaDPU,
		specNotFixedInArea,
		totDpuSpec,
		totalFaultsPercentSpec,
		// zone 7
		z7FoundInArea,
		z7FixedInArea,
		z7FoundInAreaDPU,
		z7NotFixedInArea,
		totDpuZ7,
		totalFaultsPercentZ7,
	})
}

// nff from cabs for dale

module.exports.pickedUpInAreaAll = async (req, res) => {
	let { division, area, startTime, endTime } = req.params

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	let areas = []
	let faults = []

	// console.log('START => ', startDB)
	// console.log('END => ', endDB)

	//work out stage 17 builds
	const stage17 = await Stage17.find({
		dateToStage: { $gt: startDB, $lt: endDB },
	})

	// console.log(stage17)

	// const stage17Buids = stage17.map((b) => b.buildNo)

	let oBayaAreasWithCycleTest = [
		'Boom Sub Assembly LDL',
		'NEW Cab Inspection',
		'Rolling Rd/Warm Up',
		'SIP 1',
		'SIP 2 NEW',
		'SIP 3',
		'SIP 3 NEW',
		'SIP 4 NEW',
		'SIP 5 NEW',
		'SIP 6',
		'SIP 6 NEW',
		'SIP 7 NEW',
		'SIP SPEC Ldl',
		'T3 SIP 1',
		'T3 SIP 2',
		'Torque Overcheck',
		'Torque Overcheck 2',
		'Track 3 SIP 1',
		'Track 3 SIP 1 - P42',
		'Track 3 SIP 2',
		'Track 3 SIP 2 - P42',
		'Track PDI/Validation',
		'UV 1 Ldl',
		'Z7 Electrical Test',
		'Cycle Test New',
	]

	if (area === 'Track 3') {
		areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1', 'Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
	} else if (area === 'Zone 7') {
		areas = ['Z7 Electrical Test', 'Rolling Rd/Warm Up']
	} else {
		areas = [area]
	}

	if (area === 'After Stage 17') {
		// console.log('i am here')
		for (let x of stage17) {
			let data = await QSmart.aggregate([
				{
					$match: {
						['Build Number']: x.buildNo,
						['Created Date']: { $gt: x.dateToStage },
						// ['Created Date'] : { $lt: x.dateToStage },
						// ['Fault Code']   : { $ne: 'Shortage' },
						Zone: { $nin: oBayaAreasWithCycleTest },
					},
				},
			])

			if (data.length > 0) {
				faults.push(data)
			}

			faults = faults.reduce((a, b) => a.concat(b), [])
		}
	} else {
		faults = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],
					// ['Fault Code']    : { $ne: 'Shortage' },
					Zone: { $in: areas },
				},
			},
			{ $sort: { ['Created Date']: -1 } },
		])
	}

	// console.log(faults)

	res.render('dash/trackZoneFaultsAll', {
		faults,
		area,
	})
}

module.exports.sentForwardAll = async (req, res) => {
	let { division, area, startTime, endTime } = req.params

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	let areas = []
	let faults = []
	let notFixedInPDI = []

	// console.log('START => ', startDB)
	// console.log('END => ', endDB)

	//work out stage 17 builds
	const stage17 = await Stage17.find({
		dateToStage: { $gt: startDB, $lt: endDB },
	})

	//machines through CFC
	const inCFC = await Throughput.find({
		createdAt: { $gt: startDB, $lt: endDB },
		// createdAt : { $gt: testStart, $lt: testEnd },
		division: 'LDL',
		building: { $ne: 'Loadall PDI' },
	})

	//just build numnbers through CFC
	const buildsThroughCFC = inCFC.map((b) => b.buildNumber.toUpperCase())

	// console.log(stage17)

	// const stage17Buids = stage17.map((b) => b.buildNo)

	let oBayaAreasWithCycleTest = [
		'Boom Sub Assembly LDL',
		'NEW Cab Inspection',
		'Rolling Rd/Warm Up',
		'SIP 1',
		'SIP 2 NEW',
		'SIP 3',
		'SIP 3 NEW',
		'SIP 4 NEW',
		'SIP 5 NEW',
		'SIP 6',
		'SIP 6 NEW',
		'SIP 7 NEW',
		'SIP SPEC Ldl',
		'T3 SIP 1',
		'T3 SIP 2',
		'Torque Overcheck',
		'Torque Overcheck 2',
		'Track 3 SIP 1',
		'Track 3 SIP 1 - P42',
		'Track 3 SIP 2',
		'Track 3 SIP 2 - P42',
		'Track PDI/Validation',
		'UV 1 Ldl',
		'Z7 Electrical Test',
		'Cycle Test New',
	]

	if (area === 'Track 3') {
		areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1', 'Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
	} else if (area === 'Zone 7') {
		areas = ['Z7 Electrical Test', 'Rolling Rd/Warm Up']
	} else {
		areas = [area]
	}

	const recMen = await Sip.find({ name: { $in: areas } }).lean()

	// console.log(recMen)
	let recs = []

	for (let r of recMen) {
		if (Object.values(r).length > 1) recs.push(Object.values(r))
	}

	const allRecs = recs.reduce((a, b) => a.concat(b), [])

	const uniqueRecs = [...new Set(allRecs)]

	const filteredRecs = uniqueRecs.filter(function (el) {
		return el != ''
	})

	if (area === 'Cycle Test New') {
		faults = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],

					Zone: { $in: areas },
					// ['Fixed By']      : { $ne: [ 'Created By' ] },
				},
			},
			{
				$redact: {
					$cond: [{ $ne: ['$Fixed By', '$Created By'] }, '$$KEEP', '$$PRUNE'],
				},
			},
			// { $where: [ 'Fixed By' ] != [ 'Created By' ] },
			{ $sort: { ['Created Date']: -1 } },
		])
	} else if (area === 'After Stage 17') {
		for (let x of stage17) {
			let data = await QSmart.aggregate([
				{
					$match: {
						['Build Number']: x.buildNo,
						['Created Date']: { $gt: x.dateToStage },

						Zone: { $nin: oBayaAreasWithCycleTest },
						['Fixed By']: { $in: ['', 'Customer Focus Centre'] },
					},
				},
				{
					$match: {
						['Build Number']: { $in: buildsThroughCFC },
					},
				},
			])

			if (data.length > 0) {
				notFixedInPDI.push(data)
			}
		}
		faults = notFixedInPDI.reduce((a, b) => a.concat(b), [])
	} else {
		faults = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],

					Zone: { $in: areas },
					['Fixed By']: { $nin: filteredRecs },
				},
			},
			{ $sort: { ['Created Date']: -1 } },
		])
	}

	res.render('dash/trackZoneForwardAll', {
		faults,
		area,
	})
}

module.exports.fixedInAreaAll = async (req, res) => {
	let { division, area, startTime, endTime } = req.params

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	let areas = []
	let faults = []
	let fixedInPDI = []
	let fixedInZone7 = []

	let oBayaAreasWithCycleTest = [
		'Boom Sub Assembly LDL',
		'NEW Cab Inspection',
		'Rolling Rd/Warm Up',
		'SIP 1',
		'SIP 2 NEW',
		'SIP 3',
		'SIP 3 NEW',
		'SIP 4 NEW',
		'SIP 5 NEW',
		'SIP 6',
		'SIP 6 NEW',
		'SIP 7 NEW',
		'SIP SPEC Ldl',
		'T3 SIP 1',
		'T3 SIP 2',
		'Torque Overcheck',
		'Torque Overcheck 2',
		'Track 3 SIP 1',
		'Track 3 SIP 1 - P42',
		'Track 3 SIP 2',
		'Track 3 SIP 2 - P42',
		'Track PDI/Validation',
		'UV 1 Ldl',
		'Z7 Electrical Test',
		'Cycle Test New',
	]

	let oBayaAreasWithoutCycleTest = [
		'Boom Sub Assembly LDL',
		'NEW Cab Inspection',
		'Rolling Rd/Warm Up',
		'SIP 1',
		'SIP 2 NEW',
		'SIP 3',
		'SIP 3 NEW',
		'SIP 4 NEW',
		'SIP 5 NEW',
		'SIP 6',
		'SIP 6 NEW',
		'SIP 7 NEW',
		'SIP SPEC Ldl',
		'T3 SIP 1',
		'T3 SIP 2',
		'Torque Overcheck',
		'Torque Overcheck 2',
		'Track 3 SIP 1',
		'Track 3 SIP 1 - P42',
		'Track 3 SIP 2',
		'Track 3 SIP 2 - P42',
		'Track PDI/Validation',
		'UV 1 Ldl',
		'Z7 Electrical Test',
	]

	//work out stage 16 builds
	const stage16 = await Stage16.find({
		dateToStage: { $gt: startDB, $lt: endDB },
	})

	//work out stage 17 builds
	const stage17 = await Stage17.find({
		dateToStage: { $gt: startDB, $lt: endDB },
	})

	//machines through CFC
	const inCFC = await Throughput.find({
		createdAt: { $gt: startDB, $lt: endDB },
		// createdAt : { $gt: testStart, $lt: testEnd },
		division: 'LDL',
		building: { $ne: 'Loadall PDI' },
	})

	//just build numnbers through CFC
	const buildsThroughCFC = inCFC.map((b) => b.buildNumber.toUpperCase())

	if (area === 'Track 3') {
		areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1', 'Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
	} else if (area === 'Zone 7') {
		areas = ['Z7 Electrical Test', 'Rolling Rd/Warm Up']
	} else {
		areas = [area]
	}

	const recMen = await Sip.find({ name: { $in: areas } }).lean()

	// console.log(recMen)
	let recs = []

	for (let r of recMen) {
		if (Object.values(r).length > 1) recs.push(Object.values(r))
	}

	const allRecs = recs.reduce((a, b) => a.concat(b), [])

	const uniqueRecs = [...new Set(allRecs)]

	const filteredRecs = uniqueRecs.filter(function (el) {
		return el != ''
	})

	if (area === 'Cycle Test New') {
		faults = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],

					Zone: { $in: areas },
					// ['Fixed By']      : { $ne: [ 'Created By' ] },
				},
			},
			{
				$redact: {
					$cond: [{ $eq: ['$Fixed By', '$Created By'] }, '$$KEEP', '$$PRUNE'],
				},
			},
			// { $where: [ 'Fixed By' ] != [ 'Created By' ] },
			{ $sort: { ['Created Date']: -1 } },
		])
	} else if (area === 'After Stage 17') {
		for (let x of stage17) {
			let data = await QSmart.aggregate([
				{
					$match: {
						['Build Number']: x.buildNo,
						['Fixed Date']: { $lt: x.dateToStage },
						['Created Date']: { $lt: x.dateToStage },
						Zone: { $in: oBayaAreasWithoutCycleTest },
					},
				},
				{
					$match: {
						['Build Number']: x.buildNo,
						['Created Date']: { $gt: x.dateToStage },
						Zone: { $nin: oBayaAreasWithCycleTest },
						['Fixed By']: { $ne: 'Customer Focus Centre' },
						['Fixed Date']: { $gt: startDB, $lt: endDB },
					},
				},
				// {
				// 	$match : {
				// 		['Build Number'] : { $in: buildsThroughCFC },
				// 	},
				// },
			])

			if (data.length > 0) {
				fixedInPDI.push(data)
			}
		}
		faults = fixedInPDI.reduce((a, b) => a.concat(b), [])
	} else if (area === 'Zone 7') {
		for (let x of stage16) {
			let data = await QSmart.aggregate([
				{
					$match: {
						['Build Number']: x.buildNo,
						['Created Date']: { $lt: x.dateToStage },
						Zone: { $in: oBayaAreasWithoutCycleTest },
						['Fixed Date']: { $gt: startDB, $lt: endDB },
					},
				},
				// {
				// 	$match : {
				// 		['Build Number'] : { $in: buildsThroughCFC },
				// 	},
				// },
			])

			if (data.length > 0) {
				fixedInZone7.push(data)
			}
		}
		faults = fixedInZone7.reduce((a, b) => a.concat(b), [])
	} else {
		faults = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					$and: [{ ['Created Date']: { $gt: startDB } }, { ['Created Date']: { $lt: endDB } }],

					Zone: { $in: areas },
					['Fixed By']: { $in: filteredRecs },
				},
			},
			{ $sort: { ['Created Date']: -1 } },
		])
	}

	res.render('dash/trackFaultsFixedAll', {
		faults,
		area,
	})
}

module.exports.faultsToCFC = async (req, res) => {
	let { startTime, endTime } = req.params

	const startDB = new Date(startTime)
	const endDB = new Date(endTime)

	//machines through CFC
	const inCFC = await Throughput.find({
		createdAt: { $gt: startDB, $lt: endDB },
		// createdAt : { $gt: testStart, $lt: testEnd },
		division: 'LDL',
		building: { $ne: 'Loadall PDI' },
	})

	//just build numnbers through CFC
	const buildsThroughCFC = inCFC.map((b) => b.buildNumber.toUpperCase())

	const faults = await QSmart.find({
		['Build Number']: { $in: buildsThroughCFC },
		['Business Unit']: 'Loadall',
		['Fixed By']: 'Customer Focus Centre',
	})

	res.render('dash/faultsToCFC', {
		faults,
	})
}

//days section

module.exports.overviewD = async (req, res) => {
	const { division } = req.params

	const areas = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{
			$group: {
				_id: '$Fault Area',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		// { $limit: 50 },
	])
	const totalFaults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
	])

	let top10FaultCount = 0

	const top10Faults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{
			$group: {
				_id: '$Fault Area',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 10 },
	])

	for (let f of top10Faults) {
		top10FaultCount += f.count
	}

	const totalNumberOfFaults = totalFaults.length

	const top10Percent = Math.round((top10FaultCount / totalNumberOfFaults) * 100)

	const allFaults = await QSmart.countDocuments({
		['Business Unit']: 'Loadall',
		['Created Date']: { $gt: lastSevenDays },
		['Fault Code']: { $ne: 'Shortage' },
	})

	const allFaultsWithoutShortages = await QSmart.aggregate([
		// {
		// 	$match : {
		// 		['Created Date'] : { $lt: today },
		// 	},
		// },
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSixWeeks },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$project: {
				week: { $week: '$Created Date' },
			},
		},
		{
			$group: {
				_id: { week: '$week' },
				count: { $sum: 1 },
			},
		},
		{
			$addFields: {
				dpu: 0,
				build: 0,
				target: 6,
			},
		},
		{
			$match: {
				_id: {
					$nin: [
						{ week: 42 },
						{ week: 43 },
						{ week: 44 },
						{ week: 45 },
						{ week: 46 },
						{ week: 47 },
						{ week: 48 },
						{ week: 49 },
						{ week: 50 },
						{ week: 51 },
					],
				},
			},
		},
		{ $sort: { _id: 1 } },
	])

	const days = await Day.aggregate([
		{
			$match: {
				date: { $gte: firstOfJuly },
				// eff       : { $gt: 0 },
				// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		// {
		// 	$match : {
		// 		date : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		{
			$project: {
				week: { $week: '$date' },
				build: 1,
				faults: 1,
				target: 1,
			},
		},
		{
			$group: {
				_id: { week: '$week' },
				allBuild: { $sum: '$build' },
				allFaults: { $sum: '$faults' },
				target: { $avg: '$target' },
			},
		},

		{
			$addFields: {
				dpu: {
					$divide: ['$allFaults', '$allBuild'],
				},
			},
		},
		{
			$addFields: {
				averageDpu: {
					$round: ['$dpu', 2],
				},
			},
		},
		{ $sort: { _id: 1 } },
	])

	const stage12 = await Stage12.aggregate([
		// {
		// 	$match : {
		// 		// date : { $gte: firstOfJuly },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		// {
		// 	$match : {
		// 		date : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		{
			$project: {
				week: { $week: '$dateToStage' },
			},
		},
		{
			$group: {
				_id: '$week',
				count: { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	])

	for (let f of allFaultsWithoutShortages) {
		for (let d of days) {
			if (d._id.week === f._id.week) {
				f.target = d.target
			}
		}
		for (let s of stage12) {
			if (s._id === f._id.week) {
				f.build = s.count
			}
		}
	}

	for (let f of allFaultsWithoutShortages) {
		if (f.build > 0) {
			f.dpu = (f.count / f.build).toFixed(2)
		}
	}

	for (let e of extra) {
		if (e._id.week > +theWeek) {
			allFaultsWithoutShortages.push(e)
		}
	}

	res.render('dash/loadallDPUOverviewD', {
		division,
		areas,
		days,
		allFaults,
		allFaultsWithoutShortages,
		totalNumberOfFaults,
		top10Percent,
	})
}
module.exports.zoneD = async (req, res) => {
	const { division, area } = req.params
	console.log('here')

	const issues = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 5 },
	])

	for (let i of issues) {
		graphData = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					['Created Date']: { $gt: lastSevenDays },
					['Fault Area']: area,
					['Fault Code']: { $ne: 'Shortage' },
					['User Defined Test']: i._id,
				},
			},
			{
				$project: {
					day: { $dayOfMonth: '$Created Date' },
					month: { $month: '$Created Date' },
					['User Defined Test']: 1,
				},
			},
			{
				$group: {
					_id: { day: '$day', month: '$month' },
					count: { $sum: 1 },
				},
			},

			{ $sort: { _id: 1 } },
		])
		i.graph = graphData
	}

	const stage = await Stage.find({ name: area })

	let areas = []
	let theSipStation = 'N/A'
	let theTarget = 0

	if (stage.length > 0) {
		if (area === 'Track 3 Zone 1') {
			areas = ['Track 3 SIP 1', 'Track 3 SIP 1 - P42', 'T3 SIP 1']
			theSipStation = 'Track 3 Zone 1'
		} else if (area === 'Track 3 Zone 2') {
			areas = ['Track 3 SIP 2', 'Track 3 SIP 2 - P42', 'T3 SIP 2']
			theSipStation = 'Track 3 Zone 1'
		} else {
			areas = [area]
		}
		theTarget = stage[0].target
		theSipStation = stage[0].sip
	}

	let allEscapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
				Zone: { $ne: theSipStation },
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	let allFaultsForNotFixed = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Code']: { $ne: 'Shortage' },
				['Zone']: theSipStation,
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])
	let allFaults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Code']: { $ne: 'Shortage' },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])
	let allFoundFaults = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Fault Code']: { $ne: 'Shortage' },
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				Zone: theSipStation,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	const effPercent = Math.round((allFoundFaults.length / allFaults.length) * 100)

	let startDateSevenDaysAgo = moment().subtract(7, 'days').format('YYYY/MM/DD/00/00')
	// let endDate = moment().subtract(30, 'days').format('YYYY/MM/DD/00/00')
	let endDateNow = moment().format('YYYY/MM/DD/kk/mm')

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	const track3 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/TRACK 3 SIP 2/${startDateSevenDaysAgo}/${endDateNow}`)

	const track1 = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/zones/19/SIP 5 NEW/${startDateSevenDaysAgo}/${endDateNow}`)

	if (track1.data) {
		track1Builds = track1.data.map((build) => build.buildNo)
	} else {
		track1Builds = []
	}
	if (track3.data) {
		track3Builds = track3.data.map((build) => build.buildNo)
	} else {
		track3Builds = []
	}

	let allBuildCount = track1.data.length + track3.data.length
	let allBuildNumbers = []

	// const allBuild = await Day.aggregate([
	// 	{
	// 		$match : {
	// 			date : { $gte: firstOfJuly },
	// 			// eff       : { $gt: 0 },
	// 			// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
	// 		},
	// 	},
	// ])

	// for (let b of allBuild) {
	// 	allBuildCount += b.build
	// }
	for (let f of allFaults) {
		allBuildNumbers.push(f['Build Number'])
	}

	let uniqueBuildsWithFaults = [...new Set(allBuildNumbers)]

	if (theSipStation === 'N/A') {
		allEscapes = []
	}

	const rftAmount = allBuildCount - uniqueBuildsWithFaults.length

	const rftPercent = Math.round((rftAmount / allBuildCount) * 100)

	const issuesOver2 = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Fault Code']: { $ne: 'Shortage' },
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
			},
		},
		{
			$project: {
				['Created Date']: 1,
				['User Defined Test']: 1,
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{
			$match: {
				count: { $gt: 2 },
			},
		},

		{ $sort: { count: -1, _id: 1 } },
	])

	const issuesOver4 = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Fault Code']: { $ne: 'Shortage' },
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
			},
		},
		{
			$project: {
				['Created Date']: 1,
				['User Defined Test']: 1,
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{
			$match: {
				count: { $gt: 4 },
			},
		},

		{ $sort: { count: -1, _id: 1 } },
	])
	const issuesOver6 = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Fault Code']: { $ne: 'Shortage' },
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
			},
		},
		{
			$project: {
				['Created Date']: 1,
				['User Defined Test']: 1,
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{
			$match: {
				count: { $gt: 6 },
			},
		},

		{ $sort: { count: -1, _id: 1 } },
	])

	const issuesOver3 = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Fault Code']: { $ne: 'Shortage' },
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
			},
		},
		{
			$project: {
				['Created Date']: 1,
				['User Defined Test']: 1,
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{
			$match: {
				count: { $gt: 2 }, // Duplicates considered as count greater than one
			},
		},

		{ $sort: { count: -1, _id: 1 } },
	])

	const build = await Day.aggregate([
		{
			$match: {
				date: { $gte: firstOfJuly },
				// eff       : { $gt: 0 },
				// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		// {
		// 	$match : {
		// 		date : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		{
			$project: {
				week: { $week: '$date' },
				build: 1,
				faults: 1,
				target: 1,
			},
		},
		{
			$group: {
				_id: { week: '$week' },
				allBuild: { $sum: '$build' },
				allFaults: { $sum: '$faults' },
				target: { $avg: '$target' },
			},
		},

		{
			$addFields: {
				dpu: {
					$divide: ['$allFaults', '$allBuild'],
				},
			},
		},
		{
			$addFields: {
				averageDpu: {
					$round: ['$dpu', 2],
				},
			},
		},
		{ $sort: { _id: 1 } },
	])

	const days = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gte: firstOfJuly },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		// {
		// 	$match : {
		// 		['Created Date'] : { $lt: today },
		// 		// eff       : { $gt: 0 },
		// 		// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
		// 	},
		// },
		{
			$project: {
				week: { $week: '$Created Date' },
			},
		},
		{
			$group: {
				_id: { week: '$week' },
				count: { $sum: 1 },
				// target    : { $avg: '$target' },
			},
		},

		{
			$addFields: {
				target: theTarget,
			},
		},
		{
			$addFields: {
				build: 0,
			},
		},
		{
			$addFields: {
				dpu: 0,
			},
		},
		// {
		// 	$addFields : {
		// 		averageDpu : {
		// 			$round : [
		// 				'$dpu',
		// 				2,
		// 			],
		// 		},
		// 	},
		// },
		{ $sort: { _id: 1 } },
	])

	for (let d of days) {
		for (let b of build) {
			if (b._id.week === d._id.week) {
				d.build = b.allBuild
				d.dpu = (d.count / d.build).toFixed(2)
			}
		}
	}

	const thirtyDaysAgoHelp = moment().businessSubtract(30).format('YYYY, MM, DD')

	const thirtyDaysAgoDB = new Date(thirtyDaysAgoHelp)

	// if (area === 'Track 3 Zone 2' || area === 'Track 3 Zone 1') {
	// 	track = '2'
	// } else {
	// 	track = '1'
	// }

	const stage12 = await Stage12.aggregate([
		{
			$match: {
				dateToStage: { $gte: thirtyDaysAgoDB },
				// track       : track,
				// eff       : { $gt: 0 },
				// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},

		{
			$project: {
				year: { $year: '$dateToStage' },
				month: { $month: '$dateToStage' },
				week: { $week: '$dateToStage' },
				day: { $dayOfMonth: '$dateToStage' },
				dayNumber: { $dayOfWeek: '$dateToStage' },
			},
		},
		{
			$match: {
				dayNumber: { $nin: [7, 1] },
				// eff       : { $gt: 0 },
				// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$group: {
				_id: {
					year: '$year',
					month: '$month',
					week: '$week',
					day: '$day',
				},
				count: { $sum: 1 },
			},
		},

		{ $sort: { _id: 1 } },
	])

	const allFaultsWithoutShortages = await QSmart.aggregate([
		// {
		// 	$match : {
		// 		['Created Date'] : { $gte: thirtyDaysAgoDB },
		// 	},
		// },
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: thirtyDaysAgoDB },
				['Fault Code']: { $ne: 'Shortage' },
				['Fault Area']: area,
			},
		},
		{
			$project: {
				year: { $year: '$Created Date' },
				month: { $month: '$Created Date' },
				week: { $week: '$Created Date' },
				day: { $dayOfMonth: '$Created Date' },
				dayNumber: { $dayOfWeek: '$Created Date' },
			},
		},
		{
			$match: {
				dayNumber: { $nin: [7, 1] },
				// eff       : { $gt: 0 },
				// updatedAt : { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$group: {
				_id: {
					year: '$year',
					month: '$month',
					week: '$week',
					day: '$day',
				},
				count: { $sum: 1 },
			},
		},
		{
			$addFields: {
				dpu: 0,
				build: 0,
				target: theTarget,
			},
		},
		// {
		// 	$match : {
		// 		_id : {
		// 			$nin : [ { week: 30 }, { week: 31 }, { week: 32 } ],
		// 		},
		// 	},
		// },
		{ $sort: { _id: 1 } },
	])

	// console.log(allFaultsWithoutShortages)

	for (let f of allFaultsWithoutShortages) {
		for (let s of stage12) {
			if (s._id.month === f._id.month && s._id.day === f._id.day) {
				f.build = s.count
				// console.log('Match')
			}
		}
	}
	// for (let f of allFaultsWithoutShortages) {
	// 	for (let b of build) {
	// 		if (b._id.week === f._id.week) {
	// 			f.build = b.allBuild
	// 		}
	// 	}
	// }
	for (let f of allFaultsWithoutShortages) {
		if (f.build > 0) {
			f.dpu = (f.count / f.build).toFixed(2)
		}
	}

	// for (let e of extra) {
	// 	if (e._id.week > +theWeek) {
	// 		allFaultsWithoutShortages.push(e)
	// 	}
	// }

	let recs = []

	if (stage.length > 0) {
		if (stage[0].rec1 != '') {
			recs.push(stage[0].rec1)
		}
		if (stage[0].rec2 != '') {
			recs.push(stage[0].rec2)
		}
		if (stage[0].rec3 != '') {
			recs.push(stage[0].rec3)
		}
		if (stage[0].rec4 != '') {
			recs.push(stage[0].rec4)
		}
		if (stage[0].rec5 != '') {
			recs.push(stage[0].rec5)
		}
		if (stage[0].rec6 != '') {
			recs.push(stage[0].rec6)
		}
		if (stage[0].rec7 != '') {
			recs.push(stage[0].rec7)
		}
		if (stage[0].rec8 != '') {
			recs.push(stage[0].rec8)
		}
		if (stage[0].rec9 != '') {
			recs.push(stage[0].rec9)
		}
		if (stage[0].rec10 != '') {
			recs.push(stage[0].rec10)
		}
	}
	let allFaultsNotFixedInArea = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Zone']: theSipStation,
				['Fault Code']: { $ne: 'Shortage' },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	if (recs.length > 0) {
		allFaultsNotFixedInArea = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					['Created Date']: { $gt: lastSevenDays },
					['Fixed By']: { $nin: recs },
					['Fault Code']: { $ne: 'Shortage' },
					['Zone']: theSipStation,
					['Fault Area']: area,
				},
			},

			{ $sort: { ['Created Date']: -1, _id: 1 } },
		])
	}

	let notFixedPercentage = Math.round((allFaultsNotFixedInArea.length / allFaultsForNotFixed.length) * 100)

	if (isNaN(notFixedPercentage)) {
		notFixedPercentage = 0
	}

	console.log(allFaultsWithoutShortages)

	res.render('dash/dpuZoneD', {
		division,
		issues,
		area,
		issuesOver2,
		issuesOver4,
		issuesOver6,
		issuesOver3,
		allEscapes,
		allFaults,
		allFoundFaults,
		effPercent,
		theSipStation,
		days,
		allBuildCount,
		rftAmount,
		rftPercent,
		allFaultsNotFixedInArea,
		allFaultsForNotFixed,
		notFixedPercentage,
		allFaultsWithoutShortages,
	})
}

module.exports.over3D = async (req, res) => {
	let { area } = req.params

	let division = 'LDL'

	const issuesOver3 = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$project: {
				['Created Date']: 1,
				['User Defined Test']: 1,
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{
			$match: {
				count: { $gt: 2 }, // Duplicates considered as count greater than one
			},
		},

		{ $sort: { count: -1, _id: 1 } },
	])

	res.render('dash/over3D', { division, issuesOver3, area })
}

module.exports.zoneFaultDataD = async (req, res) => {
	const { bu, area, part } = req.params
	let division = 'LDL'

	const help = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])

	let partName = help[part]._id

	const issues = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{ $sort: { ['Created Date']: -1 } },
	])

	res.render('dash/zoneFaultDataD', {
		division,
		issues,
		area,
		partName,
		part,
	})
}

module.exports.zoneFaultDataFilterD = async (req, res) => {
	const { bu, area, part } = req.params
	let division = 'LDL'

	const help = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])

	let partName = help[part]._id

	const comments = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Comments',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])
	const inspectors = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Created By',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])

	const areas = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Zone',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])
	const models = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Model',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])
	const faultCodes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				['User Defined Test']: partName,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$Fault Code',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	])

	res.render('dash/zoneFaultDataFilterD', {
		division,
		comments,
		inspectors,
		areas,
		area,
		models,
		faultCodes,
		partName,
	})
}

// escapes from area

module.exports.escapesD = async (req, res) => {
	let { division, area } = req.params

	const stage = await Stage.find({ name: area })

	if (stage.length > 0) {
		theSipStation = stage[0].sip
		let division = 'LDL'
	}

	const top5Escapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				Zone: { $ne: theSipStation },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 5 },
	])

	const allEscapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				Zone: { $ne: theSipStation },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	res.render('dash/zoneEscapesD', {
		division,
		area,
		top5Escapes,
		allEscapes,
	})
}

//top 5 escapes

module.exports.top5escapesD = async (req, res) => {
	let { division, area } = req.params

	const stage = await Stage.find({ name: area })

	if (stage.length > 0) {
		theSipStation = stage[0].sip
		let division = 'LDL'
	}

	const top5escapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				Zone: { $ne: theSipStation },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 5 },
	])

	res.render('dash/top5EscapesD', {
		division,
		area,
		top5escapes,
	})
}

//top 5 escapes detail

module.exports.top5escapesDetailD = async (req, res) => {
	let { division, area, number } = req.params

	const stage = await Stage.find({ name: area })

	if (stage.length > 0) {
		theSipStation = stage[0].sip
		let division = 'LDL'
	}

	const top5escapes = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				Zone: { $ne: theSipStation },
				['Fault Code']: { $ne: 'Shortage' },
			},
		},
		{
			$group: {
				_id: '$User Defined Test',
				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 5 },
	])

	const help = top5escapes[number]._id

	const faultData = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Fault Area']: area,
				Zone: { $ne: theSipStation },
				['User Defined Test']: help,
				['Fault Code']: { $ne: 'Shortage' },
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	res.render('dash/top5EscapesDetailD', {
		division,
		area,
		top5escapes,
		faultData,
	})
}

module.exports.notFixedD = async (req, res) => {
	let { area, division } = req.params
	const stage = await Stage.find({ name: area })

	let recs = []

	if (stage.length > 0) {
		theSipStation = stage[0].sip
		if (stage[0].rec1 != '') {
			recs.push(stage[0].rec1)
		}
		if (stage[0].rec2 != '') {
			recs.push(stage[0].rec2)
		}
		if (stage[0].rec3 != '') {
			recs.push(stage[0].rec3)
		}
		if (stage[0].rec4 != '') {
			recs.push(stage[0].rec4)
		}
		if (stage[0].rec5 != '') {
			recs.push(stage[0].rec5)
		}
		if (stage[0].rec6 != '') {
			recs.push(stage[0].rec6)
		}
		if (stage[0].rec7 != '') {
			recs.push(stage[0].rec7)
		}
		if (stage[0].rec8 != '') {
			recs.push(stage[0].rec8)
		}
		if (stage[0].rec9 != '') {
			recs.push(stage[0].rec9)
		}
		if (stage[0].rec10 != '') {
			recs.push(stage[0].rec10)
		}
	}

	let issues = await QSmart.aggregate([
		{
			$match: {
				['Business Unit']: 'Loadall',
				['Created Date']: { $gt: lastSevenDays },
				['Zone']: theSipStation,
				['Fault Code']: { $ne: 'Shortage' },
				['Fault Area']: area,
			},
		},

		{ $sort: { ['Created Date']: -1, _id: 1 } },
	])

	if (recs.length > 0) {
		issues = await QSmart.aggregate([
			{
				$match: {
					['Business Unit']: 'Loadall',
					['Created Date']: { $gt: lastSevenDays },
					['Zone']: theSipStation,
					['Fixed By']: { $nin: recs },
					['Fault Code']: { $ne: 'Shortage' },
					['Fault Area']: area,
				},
			},

			{ $sort: { ['Created Date']: -1, _id: 1 } },
		])
	}

	res.render('dash/notFixedD', {
		issues,
		division,
	})
}
