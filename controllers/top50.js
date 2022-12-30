const Claim = require('../models/claim')
const Inspector = require('../models/inspector')
const Area = require('../models/area')
const Champion = require('../models/champions')

const Detection = require('../models/detection')
const Model = require('../models/models')
const moment = require('moment')
const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// get the build months
let thisMonth = moment().subtract(0, 'months').format('MM/YYYY')
let oneMonthAgo = moment().subtract(1, 'months').format('MM/YYYY')
let twoMonthsAgo = moment().subtract(2, 'months').format('MM/YYYY')
let threeMonthsAgo = moment().subtract(3, 'months').format('MM/YYYY')
let fourMonthsAgo = moment().subtract(4, 'months').format('MM/YYYY')
let fiveMonthsAgo = moment().subtract(5, 'months').format('MM/YYYY')
let sixMonthsAgo = moment().subtract(6, 'months').format('MM/YYYY')
let sevenMonthsAgo = moment().subtract(7, 'months').format('MM/YYYY')
let eightMonthsAgo = moment().subtract(8, 'months').format('MM/YYYY')
let nineMonthsAgo = moment().subtract(9, 'months').format('MM/YYYY')
let tenMonthsAgo = moment().subtract(10, 'months').format('MM/YYYY')

module.exports.index50 = async (req, res) => {
	let { period, division, type } = req.params
	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}

	let types = []
	let modes = []

	if (type === 'leak') {
		types = ['O Ring', 'Loose Hose/Adaptor', 'Leaking', 'Ram seal leak']
		modes = ['Hydraulic']
	}
	if (type === 'paint') {
		types = ['Paint Damage', 'Paint adhesion', 'Weld spatter', 'Poor Paint', 'Conndition']
		modes = ['Paint Damage Body', 'Paint Damage Cab']
	}
	if (type === 'electric') {
		types = [
			'Clip up Electrical',
			'Failed Battery',
			'Gouged/Scored/Cut',
			'Harness Connectivity',
			'Harness Routing',
			'Loose',
			'Low Pressure',
			'Misaligned/Assy/Loose',
			'Not Built To Spec',
			'Not Fitted Correctly',
			'Open Circuit',
			'Over Charged',
			'Over Tightened',
			'Part Failure',
			'Routing',
			'Short Circuit',
			'Short Circuit/Burn Out',
			'Software',
			'Software Update',
			'Unconnected',
			'Unconnected/Open Circuit',
			'Water in Connector',
			'Wiring damage',
		]
		modes = ['Electrics']
	}

	const champions = await Champion.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })
	if (period === 'doa') {
		thePeriod = ['DOA']
	}
	if (period === 't0') {
		thePeriod = ['T000']
	}
	if (period === 't1') {
		thePeriod = ['T000', 'T001']
	}
	if (period === 't3') {
		thePeriod = ['T000', 'T001', 'T002', 'T003']
	}

	if (period === 'doa') {
		theOtherPeriod = ['T000', 'T001', 'T002', 'T003']
	} else {
		theOtherPeriod = ['DOA']
	}

	const inTodayOptions = [
		{
			$match: {
				importedDate: { $gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
				active: true,
				division: {
					$in: division,
				},
				tPeriod: {
					$in: thePeriod,
				},
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',
			},
		},
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		inTodayOptions.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}
	if (type === 'cabs') {
		inTodayOptions.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}

	const options = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',
				concern: { $addToSet: '$concern' },
				rag: { $addToSet: '$rag' },
				closureDate: { $addToSet: '$closureDate' },
				asdJosh: { $addToSet: '$asdJosh' },
				action: { $addToSet: '$action' },
				champion: { $addToSet: '$champion' },
				sccJosh: { $addToSet: '$sccJosh' },
				buildDate: {
					$push: {
						$substr: ['$buildDate', 3, 10],
					},
				},

				count: { $sum: 1 },
			},
		},
		{
			$addFields: {
				totalNum: 0,
				month1: 0,
				month2: 0,
				month3: 0,
				month4: 0,
				month5: 0,
				month6: 0,
				month7: 0,
				month8: 0,
				month9: 0,
				month10: 0,
				month11: 0,
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 500 },
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		options.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}
	if (type === 'cabs') {
		options.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}
	if (req.query.rag != null && req.query.rag != '') {
		if (req.query.rag == 'Open') {
			options.push({
				$match: {
					rag: {
						$nin: ['Contained', 'Closed'],
					},
				},
			})
		} else {
			options.push({
				$match: {
					rag: {
						$in: [new RegExp(escapeRegex(req.query.rag), 'gi')],
					},
				},
			})
		}
	}
	if (req.query.champion != null && req.query.champion != '') {
		options.push({
			$match: {
				champion: new RegExp(escapeRegex(req.query.champion), 'gi'),
			},
		})
	}
	if (req.query.asdJosh != null && req.query.asdJosh != '') {
		options.push({
			$match: {
				asdJosh: new RegExp(escapeRegex(req.query.asdJosh), 'gi'),
			},
		})
	}
	if (req.query.sccJosh != null && req.query.sccJosh != '') {
		options.push({
			$match: {
				sccJosh: new RegExp(escapeRegex(req.query.sccJosh), 'gi'),
			},
		})
	}

	const otherOptions = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: theOtherPeriod,
				},
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',
				concern: { $addToSet: '$concern' },
				rag: { $addToSet: '$rag' },
				closureDate: { $addToSet: '$closureDate' },
				asdJosh: { $addToSet: '$asdJosh' },
				action: { $addToSet: '$action' },
				champion: { $addToSet: '$champion' },
				sccJosh: { $addToSet: '$sccJosh' },
				buildDate: {
					$push: {
						$substr: ['$buildDate', 3, 10],
					},
				},

				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 500 },
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		otherOptions.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}
	if (type === 'cabs') {
		otherOptions.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}

	const parts1 = await Claim.aggregate(options)
	const otherParts = await Claim.aggregate(otherOptions)
	const last48Hours = await Claim.aggregate(inTodayOptions)
	let last48HoursParts = []
	let otherTParts = []

	for (let p of last48Hours) {
		last48HoursParts.push(p._id)
	}
	for (let p of otherParts) {
		otherTParts.push(p._id)
	}

	let allParts = 0

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		allParts = await Claim.countDocuments({
			division: {
				$in: division,
			},
			active: true,
			tPeriod: {
				$in: thePeriod,
			},
			failuretype: { $in: types },
			failuremode: { $in: modes },
			outcome: {
				$nin: ['Reject', 'Z Code'],
			},
			$or: [
				{ buildDate: { $regex: tenMonthsAgo } },
				{ buildDate: { $regex: nineMonthsAgo } },
				{ buildDate: { $regex: eightMonthsAgo } },
				{ buildDate: { $regex: sevenMonthsAgo } },
				{ buildDate: { $regex: sixMonthsAgo } },
				{ buildDate: { $regex: fiveMonthsAgo } },
				{ buildDate: { $regex: fourMonthsAgo } },
				{ buildDate: { $regex: threeMonthsAgo } },
				{ buildDate: { $regex: twoMonthsAgo } },
				{ buildDate: { $regex: oneMonthAgo } },
				{ buildDate: { $regex: thisMonth } },
			],
		})
	} else if (type === 'cabs') {
		allParts = await Claim.countDocuments({
			division: {
				$in: division,
			},
			active: true,
			area: 'Cabs Systems',
			tPeriod: {
				$in: thePeriod,
			},
			outcome: {
				$nin: ['Reject', 'Z Code'],
			},
			$or: [
				{ buildDate: { $regex: tenMonthsAgo } },
				{ buildDate: { $regex: nineMonthsAgo } },
				{ buildDate: { $regex: eightMonthsAgo } },
				{ buildDate: { $regex: sevenMonthsAgo } },
				{ buildDate: { $regex: sixMonthsAgo } },
				{ buildDate: { $regex: fiveMonthsAgo } },
				{ buildDate: { $regex: fourMonthsAgo } },
				{ buildDate: { $regex: threeMonthsAgo } },
				{ buildDate: { $regex: twoMonthsAgo } },
				{ buildDate: { $regex: oneMonthAgo } },
				{ buildDate: { $regex: thisMonth } },
			],
		})
	} else {
		allParts = await Claim.countDocuments({
			division: {
				$in: division,
			},
			active: true,
			tPeriod: {
				$in: thePeriod,
			},
			outcome: {
				$nin: ['Reject', 'Z Code'],
			},
			$or: [
				{ buildDate: { $regex: tenMonthsAgo } },
				{ buildDate: { $regex: nineMonthsAgo } },
				{ buildDate: { $regex: eightMonthsAgo } },
				{ buildDate: { $regex: sevenMonthsAgo } },
				{ buildDate: { $regex: sixMonthsAgo } },
				{ buildDate: { $regex: fiveMonthsAgo } },
				{ buildDate: { $regex: fourMonthsAgo } },
				{ buildDate: { $regex: threeMonthsAgo } },
				{ buildDate: { $regex: twoMonthsAgo } },
				{ buildDate: { $regex: oneMonthAgo } },
				{ buildDate: { $regex: thisMonth } },
			],
		})
	}
	const refNumbers = await Claim.aggregate([
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					// { buildDate: { $regex: tenMonthsAgo } },
					// { buildDate: { $regex: nineMonthsAgo } },
					// { buildDate: { $regex: eightMonthsAgo } },
					// { buildDate: { $regex: sevenMonthsAgo } },
					// { buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',

				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 1000 },
	])

	let parts = []

	if (period === 'doa') {
		for (let p of parts1) {
			for (let r of refNumbers) {
				if (r._id === p._id) {
					if (r.count) p.totalNum = r.count
					p.count = r.count
				}
			}
		}
		parts1.sort((a, b) => b.totalNum - a.totalNum)

		parts1.filter((item) => item.totalNum > 0)

		const parts2 = parts1.filter((item) => item.totalNum > 0)

		parts = parts2.slice(0, 50)
		// parts.sort((a, b) => (a.totalNum > b.totalNum ? -1 : 1))
	} else {
		parts = parts1.slice(0, 50)
	}

	let month1 = []
	let month2 = []
	let month3 = []
	let month4 = []
	let month5 = []
	let month6 = []
	let month7 = []
	let month8 = []
	let month9 = []
	let month10 = []
	let month11 = []

	function countInArray(array, what, month, part) {
		let count = 0
		for (let i = 0; i < array.length; i++) {
			if (array[i] === what) {
				count++
			}
		}

		month.push(count)
		return count
	}

	parts.forEach((part) => {
		let count = countInArray(part.buildDate, tenMonthsAgo, month1)
		part.month1 = count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, nineMonthsAgo, month2)
		part.month1 = count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, eightMonthsAgo, month3)
		part.month3 = count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, sevenMonthsAgo, month4)
		part.month4 = count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, sixMonthsAgo, month5)
		part.month5 = count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, fiveMonthsAgo, month6)
		part.month6 = count
		// part.totalNum += count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, fourMonthsAgo, month7)
		part.month7 = count
		// part.totalNum += count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, threeMonthsAgo, month8)
		part.month8 = count
		// part.totalNum += count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, twoMonthsAgo, month9)
		part.month9 = count
		// part.totalNum += count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, oneMonthAgo, month10)
		part.month10 = count
		// part.totalNum += count
	})
	parts.forEach((part) => {
		let count = countInArray(part.buildDate, thisMonth, month11)
		part.month11 = count
		// part.totalNum += count
	})

	if (Array.isArray(division) && division.length > 1) {
		division = 'GROUP'
	}

	// console.log(refNumbers[0])
	// console.log(parts[0])
	// console.log(month1)
	// console.log(refNumbers)

	res.render('top50/group', {
		division,
		type,
		parts,
		otherTParts,
		allParts,
		period,
		champions,
		last48HoursParts,
		month1,
		month2,
		month3,
		month4,
		month5,
		month6,
		month7,
		month8,
		month9,
		month10,
		month11,
	})
}

module.exports.index502 = async (req, res) => {
	let { number, period, division, type } = req.params

	await Claim.updateMany(
		{
			failedPart: '157/30109 -AXLE SHIM # THK',
		},
		{ failedPart: '157/30109 -AXLE SHIM THK' }
	)

	// get the build months
	let thisMonth = moment().subtract(0, 'months').format('MM/YYYY')
	let oneMonthAgo = moment().subtract(1, 'months').format('MM/YYYY')
	let twoMonthsAgo = moment().subtract(2, 'months').format('MM/YYYY')
	let threeMonthsAgo = moment().subtract(3, 'months').format('MM/YYYY')
	let fourMonthsAgo = moment().subtract(4, 'months').format('MM/YYYY')
	let fiveMonthsAgo = moment().subtract(5, 'months').format('MM/YYYY')
	let sixMonthsAgo = moment().subtract(6, 'months').format('MM/YYYY')
	let sevenMonthsAgo = moment().subtract(7, 'months').format('MM/YYYY')
	let eightMonthsAgo = moment().subtract(8, 'months').format('MM/YYYY')
	let nineMonthsAgo = moment().subtract(9, 'months').format('MM/YYYY')
	let tenMonthsAgo = moment().subtract(10, 'months').format('MM/YYYY')

	let thisMonthTable = moment().subtract(0, 'months').format('MMM-YY')
	let oneMonthAgoTable = moment().subtract(1, 'months').format('MMM-YY')
	let twoMonthsAgoTable = moment().subtract(2, 'months').format('MMM-YY')
	let threeMonthsAgoTable = moment().subtract(3, 'months').format('MMM-YY')
	let fourMonthsAgoTable = moment().subtract(4, 'months').format('MMM-YY')
	let fiveMonthsAgoTable = moment().subtract(5, 'months').format('MMM-YY')
	let sixMonthsAgoTable = moment().subtract(6, 'months').format('MMM-YY')
	let sevenMonthsAgoTable = moment().subtract(7, 'months').format('MMM-YY')
	let eightMonthsAgoTable = moment().subtract(8, 'months').format('MMM-YY')
	let nineMonthsAgoTable = moment().subtract(9, 'months').format('MMM-YY')
	let tenMonthsAgoTable = moment().subtract(10, 'months').format('MMM-YY')

	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}

	let theOtherPeriods = ['DOA']
	let theBuildMonths = [{ buildDate: { $regex: thisMonth } }]
	let theOtherBuildMonths = [{ buildDate: { $regex: thisMonth } }]
	let thePeriod = ['DOA']

	if (period === 'doa' || period === 'DOA') {
		thePeriod = ['DOA']
		theOtherPeriods = ['T000', 'T001', 'T002', 'T003']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
		theOtherBuildMonths = [
			{ buildDate: { $regex: tenMonthsAgo } },
			{ buildDate: { $regex: nineMonthsAgo } },
			{ buildDate: { $regex: eightMonthsAgo } },
			{ buildDate: { $regex: sevenMonthsAgo } },
			{ buildDate: { $regex: sixMonthsAgo } },
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't0' || period === 'T000') {
		thePeriod = ['T000']
		theOtherPeriods = ['DOA']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
		theOtherBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't1' || period === 'T001') {
		thePeriod = ['T000', 'T001']
		theOtherPeriods = ['DOA']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
		theOtherBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't2' || period === 'T002') {
		thePeriod = ['T000', 'T001', 'T002']
		theOtherPeriods = ['DOA']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
		theOtherBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't3' || period === 'T003') {
		thePeriod = ['T000', 'T001', 'T002', 'T003']
		theOtherPeriods = ['DOA']
		theBuildMonths = [
			{ buildDate: { $regex: tenMonthsAgo } },
			{ buildDate: { $regex: nineMonthsAgo } },
			{ buildDate: { $regex: eightMonthsAgo } },
			{ buildDate: { $regex: sevenMonthsAgo } },
			{ buildDate: { $regex: sixMonthsAgo } },
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
		theOtherBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}

	const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0)
	const getMonthNumberFromName = (month) => {
		return 'JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(month) / 3 + 1
	}

	function isSameDate(a, b) {
		return Math.abs(a - b) < 1000 * 3600 * 24 && a.getDay() === b.getDay()
	}

	const checkPostClosureFailures = (buildDateArr, month, closureMonth) => {
		let result = false
		if (!closureMonth) {
			return result
		}

		let formattedBuildArr = buildDateArr.map((item) => {
			let date = `01/${item}`
			return new Date(moment(new Date(date.split('/').reverse().join(', '))).format('YYYY, MM, DD'))
		})

		const formattedMonth = new Date(moment(new Date(`01/${month}`.split('/').reverse().join(', '))).format('YYYY, MM, DD'))

		const monthText = closureMonth.substring(0, 3)
		const yearNumber = closureMonth.substring(4)

		const formattedClosureDate = new Date(`${getMonthNumberFromName(monthText)}/01/20${yearNumber}`)
		const formattedMonthAfterClosure = new Date(moment(formattedClosureDate).add(0, 'months').format('YYYY, MM, DD'))

		for (let b of formattedBuildArr) {
			if (isSameDate(b, formattedMonth) && b > formattedMonthAfterClosure) {
				result = 'red'
			}
		}

		return result

		// for (let b of formattedBuildArr) {
		// 	if (formattedPropperArr.indexOf(b) > formattedPropperArr.indexOf(formattedMonthAfterClosure)) {
		// 		result = true
		// 		// console.log(b, ' - ', closureMonth)
		// 		// console.log('BUILDS => ', formattedBuildArr)
		// 		console.log('PROPER => ', properMonths)
		// 		// console.log('CLOSURE => ', closureMonth)
		// 		console.log('BUILD => ', b)
		// 		console.log('CLOSURE => ', closureMonth)
		// 		console.log('BUILD POS => ', formattedPropperArr.indexOf(b))
		// 		console.log('CLOSURE POS => ', formattedPropperArr.indexOf(formattedMonthAfterClosure))
		// 	}
		// }
	}

	const allCount = await Claim.countDocuments({
		division: {
			$in: division,
		},
		active: true,
		tPeriod: { $in: thePeriod },
		outcome: {
			$nin: ['Reject', 'Z Code'],
		},
		$or: theBuildMonths,
	})

	let options = [
		{
			$match: {
				division: {
					$in: division,
				},
				// rag: { $ne: null },
				active: true,
				tPeriod: { $in: thePeriod },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: theBuildMonths,
			},
		},

		{
			$group: {
				_id: '$failedPart',
				concernArr: { $addToSet: '$concern' },
				ragArr: { $addToSet: '$rag' },
				claimArr: { $addToSet: '$claimNumber' },
				top50OpenDateArr: { $addToSet: '$top50OpenedDate' },
				top50ContainedDateArr: { $addToSet: '$top50ContainedDate' },
				top50ClosedDateArr: { $addToSet: '$top50ClosedDate' },
				closureDateArr: { $addToSet: '$closureDate' },
				asdJoshArr: { $addToSet: '$asdJosh' },
				actionArr: { $addToSet: '$action' },
				championArr: { $addToSet: '$champion' },
				sccJoshArr: { $addToSet: '$sccJosh' },
				divisionArr: { $addToSet: '$division' },
				areaArr: { $addToSet: '$area' },
				linkedArr: { $addToSet: '$top50Linked' },
				top50LinkedToArr: { $addToSet: '$top50LinkedTo' },
				buildDateArr: {
					$push: {
						$substr: ['$buildDate', 3, 10],
					},
				},
				importedDateArr: {
					$push: {
						importedDate: '$importedDate',
					},
				},
				// claimsArr: {
				// 	$push: {
				// 		claimNumber: '$claimNumber',
				// 		closureDate: '$closureDate',
				// 	},
				// },

				count: { $sum: 1 },
			},
		},
		{
			$addFields: {
				month1: [],
				month2: [],
				month3: [],
				month4: [],
				month5: [],
				month6: [],
				month7: [],
				month8: [],
				month9: [],
				month10: [],
				month11: [],
				status: '',
				asd: '',
				color: 'grey',
				percentageCont: 0,
				fourCArr: [],
				failedCutIn: false,
				daysOpen: '--',
				daysContained: '--',
				daysRemaining: '--',
				daysRemainingColor: '',
				fourCIssued: 'No',
				cabsCount: 0,
				psCount: 0,
				axlesCount: 0,
				hbuCount: 0,
				fourCLinked: false,
				linkedTo: '',
				linkedFourC: '',
				inOtherTop50: false,
				claimInLast48Hours: '',
				trend: 'same',
			},
		},
		// { $sort: { count: -1, _id: 1 } },
		// { $sort: { count: -1, ragArr: -1, _id: 1 } },
	]

	if (number === '50') {
		options.push({ $sort: { count: -1, ragArr: -1, _id: 1 } }, { $limit: 50 })
	} else {
		options.push({ $sort: { count: -1, ragArr: -1, _id: 1 } })
	}

	const oneDayago = moment().subtract(1, 'days').format('YYYY, MM, DD')

	const oneDayAgoDB = new Date(oneDayago)

	let yesterdayOptions = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				importedDate: { $lt: oneDayAgoDB },
				tPeriod: { $in: thePeriod },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: theBuildMonths,
			},
		},

		{
			$group: {
				_id: '$failedPart',
				concernArr: { $addToSet: '$concern' },
				ragArr: { $addToSet: '$rag' },
				top50OpenDateArr: { $addToSet: '$top50OpenedDate' },
				top50ContainedDateArr: { $addToSet: '$top50ContainedDate' },
				top50ClosedDateArr: { $addToSet: '$top50ClosedDate' },
				closureDateArr: { $addToSet: '$closureDate' },
				asdJoshArr: { $addToSet: '$asdJosh' },
				actionArr: { $addToSet: '$action' },
				championArr: { $addToSet: '$champion' },
				sccJoshArr: { $addToSet: '$sccJosh' },
				divisionArr: { $addToSet: '$division' },
				areaArr: { $addToSet: '$area' },
				linkedArr: { $addToSet: '$top50Linked' },
				top50LinkedToArr: { $addToSet: '$top50LinkedTo' },
				buildDateArr: {
					$push: {
						$substr: ['$buildDate', 3, 10],
					},
				},
				importedDateArr: {
					$push: {
						importedDate: '$importedDate',
					},
				},
				// claimsArr: {
				// 	$push: {
				// 		claimNumber: '$claimNumber',
				// 		closureDate: '$closureDate',
				// 	},
				// },

				count: { $sum: 1 },
			},
		},

		// { $sort: { count: -1, _id: 1 } },
		// { $sort: { count: -1, ragArr: -1, _id: 1 } },
	]

	if (number === '50') {
		yesterdayOptions.push({ $sort: { count: -1, ragArr: -1, _id: 1 } }, { $limit: 50 })
	} else {
		yesterdayOptions.push({ $sort: { count: -1, ragArr: -1, _id: 1 } })
	}

	let otherOptions = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: { $in: theOtherPeriods },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: theOtherBuildMonths,
			},
		},

		{
			$group: {
				_id: '$failedPart',
				concernArr: { $addToSet: '$concern' },
				ragArr: { $addToSet: '$rag' },
				top50OpenDateArr: { $addToSet: '$top50OpenedDate' },
				top50ContainedDateArr: { $addToSet: '$top50ContainedDate' },
				top50ClosedDateArr: { $addToSet: '$top50ClosedDate' },
				closureDateArr: { $addToSet: '$closureDate' },
				asdJoshArr: { $addToSet: '$asdJosh' },
				actionArr: { $addToSet: '$action' },
				championArr: { $addToSet: '$champion' },
				sccJoshArr: { $addToSet: '$sccJosh' },
				divisionArr: { $addToSet: '$division' },
				areaArr: { $addToSet: '$area' },
				linkedArr: { $addToSet: '$top50Linked' },
				top50LinkedToArr: { $addToSet: '$top50LinkedTo' },
				buildDateArr: {
					$push: {
						$substr: ['$buildDate', 3, 10],
					},
				},

				count: { $sum: 1 },
			},
		},

		// { $sort: { count: -1, _id: 1 } },
		// { $sort: { count: -1, ragArr: -1, _id: 1 } },
	]

	if (number === '50') {
		otherOptions.push({ $sort: { count: -1, ragArr: -1, _id: 1 } }, { $limit: 50 })
	} else {
		otherOptions.push({ $sort: { count: -1, ragArr: -1, _id: 1 } })
	}

	let parts = await Claim.aggregate(options)
	let otherParts = await Claim.aggregate(otherOptions)
	let yesterdayParts = await Claim.aggregate(yesterdayOptions)

	const todayPartsIds = parts.map((p) => p._id)
	const yesterdayPartsIds = yesterdayParts.map((p) => p._id)

	let top50Count = 0
	let openCount = 0
	let containedCount = 0
	let closedCount = 0
	let assemblyCount = 0
	let supplierCount = 0
	let designCount = 0
	let failedPostCutIn = 0

	let theCount = 0

	for (let p of parts) {
		if (p.fourCLinked) {
			p.linkedTo = p.top50LinkedToArr[0]
			p.linkedFourC = await Claim.findById(p.linkedTo)
		}
	}

	for (let p of parts) {
		theCount++
		top50Count += p.count

		for (let o of otherParts) {
			if (p._id === o._id) {
				p.inOtherTop50 = true
			}
		}

		for (let i of p.importedDateArr) {
			let yesterday = new Date()
			yesterday.setDate(yesterday.getDate() - 2)

			if (i.importedDate > yesterday) {
				p.claimInLast48Hours = 'red'
			}
		}

		if (yesterdayPartsIds.indexOf(p._id) < 0) {
			p.trend = 'up'
		} else {
			if (todayPartsIds.indexOf(p._id) < yesterdayPartsIds.indexOf(p._id)) p.trend = 'up'
			if (todayPartsIds.indexOf(p._id) > yesterdayPartsIds.indexOf(p._id)) p.trend = 'down'
		}

		// console.log('PART =>', p._id)
		// console.log('TREND =>', p.status)
		// console.log('TREND =>', p.trend)
		// for (let c of p.importedDateArr) {
		// 	// console.log('IMPORTED => ', new Date(c.importedDate))
		// 	// console.log('48 HOURS AGO => ', new Date(Date.now() - 48 * 60 * 60 * 1000))

		// 	if (new Date(c.importedDate) > new Date('2022, 06, 01')) {
		// 		p.claimInLast48Hours = 'red'
		// 	}
		// }
		p.month1.count = countOccurrences(p.buildDateArr, tenMonthsAgo)
		p.month2.count = countOccurrences(p.buildDateArr, nineMonthsAgo)
		p.month3.count = countOccurrences(p.buildDateArr, eightMonthsAgo)
		p.month4.count = countOccurrences(p.buildDateArr, sevenMonthsAgo)
		p.month5.count = countOccurrences(p.buildDateArr, sixMonthsAgo)
		p.month6.count = countOccurrences(p.buildDateArr, fiveMonthsAgo)
		p.month7.count = countOccurrences(p.buildDateArr, fourMonthsAgo)
		p.month8.count = countOccurrences(p.buildDateArr, threeMonthsAgo)
		p.month9.count = countOccurrences(p.buildDateArr, twoMonthsAgo)
		p.month10.count = countOccurrences(p.buildDateArr, oneMonthAgo)
		p.month11.count = countOccurrences(p.buildDateArr, thisMonth)

		p.fourCLinked = p.linkedArr[0]
		p.asd = p.asdJoshArr[0]

		if (p.fourCLinked && p.top50LinkedToArr) {
			p.top50LinkedToArr.sort()

			p.linkedTo = p.top50LinkedToArr[0]
			p.linkedFourC = await Claim.findById(p.linkedTo)

			if (p.linkedFourC && p.linkedFourC.status) {
				p.status = await p.linkedFourC.status
			}

			p.closureDate = ''

			if (p.status === 'Open') {
				p.action = p.actionArr[0]
				if (p.linkedFourC.reOpenedAt) {
					p.daysOpen = Math.round((new Date() - p.linkedFourC.reOpenedAt) / (1000 * 60 * 60 * 24))
				} else {
					p.daysOpen = Math.round((new Date() - p.linkedFourC.vettedAt) / (1000 * 60 * 60 * 24))
				}
			}

			if (p.status === 'Contained') {
				p.action = p.linkedFourC.containNotes
				if (p.linkedFourC.containedAt) {
					p.closureDate = moment(p.linkedFourC.containedAt).format('MMM-YY')
					if (p.linkedFourC.reOpenedAt) {
						p.daysOpen = Math.round((p.linkedFourC.containedAt - p.linkedFourC.reOpenedAt) / (1000 * 60 * 60 * 24))
					} else {
						p.daysOpen = Math.round((p.linkedFourC.containedAt - p.linkedFourC.vettedAt) / (1000 * 60 * 60 * 24))
					}

					p.daysContained = Math.round((new Date() - p.linkedFourC.containedAt) / (1000 * 60 * 60 * 24))
				} else {
					p.closureDate = ''
				}
			}
			if (p.status === 'Closed') {
				p.action = p.linkedFourC.counterWhatNotes
				if (p.linkedFourC.closedAt) {
					p.closureDate = moment(p.linkedFourC.closedAt).format('MMM-YY')
					if (p.linkedFourC.reOpenedAt) {
						p.daysOpen = Math.round((p.linkedFourC.containedAt - p.linkedFourC.reOpenedAt) / (1000 * 60 * 60 * 24))
					} else {
						p.daysOpen = Math.round((p.linkedFourC.containedAt - p.linkedFourC.vettedAt) / (1000 * 60 * 60 * 24))
					}
					p.daysContained = Math.round((p.linkedFourC.closedAt - p.linkedFourC.containedAt) / (1000 * 60 * 60 * 24))
				} else {
					p.closureDate = ''
				}
			}

			// p.closureDate = p.closureDateArr[0]
		} else {
			p.status = p.ragArr[0]

			p.asd = p.asdJoshArr[0]
			p.action = p.actionArr[0]

			// if (!p.status) p.status = 'Open'

			p.closureDate = ''

			if (p.status === 'Open') {
				if (p.top50OpenDateArr.length > 0 && p.top50OpenDateArr[0] != null) {
					p.daysOpen = Math.round((new Date() - p.top50OpenDateArr[0]) / (1000 * 60 * 60 * 24))
				}
			}

			if (p.status === 'Contained') {
				if (
					p.top50ContainedDateArr.length > 0 &&
					p.top50ContainedDateArr[0] != null &&
					p.top50OpenDateArr.length > 0 &&
					p.top50OpenDateArr[0] != null
				) {
					p.closureDate = moment(p.top50ContainedDateArr[0]).format('MMM-YY')
					p.daysOpen = Math.round((p.top50ContainedDateArr[0] - p.top50OpenDateArr[0]) / (1000 * 60 * 60 * 24))
					p.daysContained = Math.round((new Date() - p.top50ContainedDateArr[0]) / (1000 * 60 * 60 * 24))
				} else {
					p.closureDate = ''
				}
			}
			if (p.status === 'Closed') {
				if (
					p.top50ClosedDateArr.length > 0 &&
					p.top50ClosedDateArr[0] != null &&
					p.top50ContainedDateArr.length > 0 &&
					p.top50ContainedDateArr[0] != null &&
					p.top50OpenDateArr.length > 0 &&
					p.top50OpenDateArr[0] != null
				) {
					p.closureDate = moment(p.top50ClosedDateArr[0]).format('MMM-YY')
					p.daysOpen = Math.round((p.top50ContainedDateArr[0] - p.top50OpenDateArr[0]) / (1000 * 60 * 60 * 24))
					p.daysContained = Math.round((p.top50ClosedDateArr[0] - p.top50ContainedDateArr[0]) / (1000 * 60 * 60 * 24))
				} else {
					p.closureDate = ''
				}
			}

			// p.closureDate = p.closureDateArr[0]
		}

		p.concern = p.concernArr[0]
		p.champion = p.championArr[0]

		p.percentageCont = ((p.count / allCount) * 100).toFixed(2)

		if (p.status === 'Open') {
			p.color = 'red'
			openCount++
		}
		if (p.status === 'Contained') {
			p.color = 'orange'
			containedCount++
		}
		if (p.status === 'Closed') {
			p.color = 'green'
			closedCount++
		}
		if (p.asd === 'Assembly') {
			assemblyCount++
		}
		if (p.asd === 'Supplier') {
			supplierCount++
		}
		if (p.asd === 'Design') {
			designCount++
		}

		if (p.color === 'grey') {
			p.status = 'TBC'
		}

		if (p.status === 'Closed' || p.status === 'Contained') {
			p.month1.postFaulire = checkPostClosureFailures(p.buildDateArr, tenMonthsAgo, p.closureDate)
			p.month2.postFaulire = checkPostClosureFailures(p.buildDateArr, nineMonthsAgo, p.closureDate)
			p.month3.postFaulire = checkPostClosureFailures(p.buildDateArr, eightMonthsAgo, p.closureDate)
			p.month4.postFaulire = checkPostClosureFailures(p.buildDateArr, sevenMonthsAgo, p.closureDate)
			p.month5.postFaulire = checkPostClosureFailures(p.buildDateArr, sixMonthsAgo, p.closureDate)
			p.month6.postFaulire = checkPostClosureFailures(p.buildDateArr, fiveMonthsAgo, p.closureDate)
			p.month7.postFaulire = checkPostClosureFailures(p.buildDateArr, fourMonthsAgo, p.closureDate)
			p.month8.postFaulire = checkPostClosureFailures(p.buildDateArr, threeMonthsAgo, p.closureDate)
			p.month9.postFaulire = checkPostClosureFailures(p.buildDateArr, twoMonthsAgo, p.closureDate)
			p.month10.postFaulire = checkPostClosureFailures(p.buildDateArr, oneMonthAgo, p.closureDate)
			p.month11.postFaulire = checkPostClosureFailures(p.buildDateArr, thisMonth, p.closureDate)

			if (
				p.month1.postFaulire === 'red' ||
				p.month2.postFaulire === 'red' ||
				p.month3.postFaulire === 'red' ||
				p.month4.postFaulire === 'red' ||
				p.month5.postFaulire === 'red' ||
				p.month6.postFaulire === 'red' ||
				p.month7.postFaulire === 'red' ||
				p.month8.postFaulire === 'red' ||
				p.month9.postFaulire === 'red' ||
				p.month10.postFaulire === 'red' ||
				p.month11.postFaulire === 'red'
			) {
				failedPostCutIn++
				p.failedCutIn = true
			}
		}
		if (p.status === 'Open' || p.status === 'TBC') p.closureDate = ''

		if (p.daysOpen != '--') {
			if (p.daysOpen < 0 || isNaN(p.daysOpen)) p.daysOpen = 0
		}
		if (p.daysContained != '--') {
			if (p.daysContained < 0 || isNaN(p.daysContained)) p.daysContained = 0
		}

		if (p.asd === 'Assembly' && p.status === 'Open') {
			p.daysRemaining = 20 - p.daysOpen
		}
		if (p.asd === 'Assembly' && p.status === 'Contained') {
			p.daysRemaining = 20 - (p.daysOpen + p.daysContained)
		}
		if (p.asd === 'Supplier' && p.status === 'Open') {
			p.daysRemaining = 40 - p.daysOpen
		}
		if (p.asd === 'Supplier' && p.status === 'Contained') {
			p.daysRemaining = 40 - (p.daysOpen + p.daysContained)
		}
		if (p.asd === 'Design' && p.status === 'Open') {
			p.daysRemaining = 60 - p.daysOpen
		}
		if (p.asd === 'Design' && p.status === 'Contained') {
			p.daysRemaining = 60 - (p.daysOpen + p.daysContained)
		}

		if (p.daysRemaining < 0) p.daysRemainingColor = 'red'

		if (p.daysRemaining != '--') {
			if (isNaN(p.daysRemaining)) p.daysRemaining = '--'
		}
	}

	const failedPostCutInPercent = Math.round((failedPostCutIn / parts.length) * 100)

	////////////////////
	let openCountTotal = 0
	let containedCountTotal = 0
	let closedCountTotal = 0

	for (let p of parts) {
		if (p.status === 'Open') {
			openCountTotal += p.count
		}
		if (p.status === 'Contained') {
			containedCountTotal += p.count
		}
		if (p.status === 'Closed') {
			closedCountTotal += p.count
		}
	}

	///////////////////////

	let assemblyPercent = 0
	let supplierPercent = 0
	let designPercent = 0

	if (assemblyCount > 0) assemblyPercent = Math.round((assemblyCount / parts.length) * 100)
	if (supplierCount > 0) supplierPercent = Math.round((supplierCount / parts.length) * 100)
	if (designCount > 0) designPercent = Math.round((designCount / parts.length) * 100)
	const unassignedPercent = 100 - assemblyPercent - supplierPercent - designPercent

	let noActionCount = parts.length - openCount - containedCount - closedCount

	const openPercent = Math.round((openCountTotal / top50Count) * 100)
	const containedPercent = Math.round((containedCountTotal / top50Count) * 100)
	const closedPercent = Math.round((closedCountTotal / top50Count) * 100)
	let noActionPercent = 100 - openPercent - containedPercent - closedPercent

	if (noActionPercent < 0) noActionPercent = 0

	const outTop50Count = allCount - top50Count
	const top50Percent = Math.round((top50Count / allCount) * 100)

	const headerText = `${period} top ${number}`

	const headerTextUpper = headerText.toUpperCase()

	if (req.query.rag != null && req.query.rag != '') {
		let filteredParts = parts.filter((item) => item.status === req.query.rag)
		parts = filteredParts
	}

	if (req.query.asd != null && req.query.asd != '') {
		let filteredParts = parts.filter((item) => item.asd === req.query.asd)
		parts = filteredParts
	}
	if (req.query.repeat != null && req.query.repeat != '') {
		let filteredParts = parts.filter((item) => item.failedCutIn)
		parts = filteredParts
	}
	if (req.query.champion != null && req.query.champion != '') {
		let filteredParts = parts.filter((item) => item.champion === req.query.champion)
		parts = filteredParts
	}

	// for (let p of parts) {
	// 	if ((p.claimInLast48Hours = 'red')) {
	// 		console.log(p._id)
	// 	}
	// }

	division = division[0]

	// if (division.length > 1) {
	// 	division = 'GROUP'
	// }

	res.render('top50/top50', {
		period,
		number,
		division,
		type,
		parts,
		headerTextUpper,
		thisMonthTable,
		oneMonthAgoTable,
		twoMonthsAgoTable,
		threeMonthsAgoTable,
		fourMonthsAgoTable,
		fiveMonthsAgoTable,
		sixMonthsAgoTable,
		sevenMonthsAgoTable,
		eightMonthsAgoTable,
		nineMonthsAgoTable,
		tenMonthsAgoTable,
		allCount,
		top50Count,
		outTop50Count,
		top50Percent,
		openPercent,
		containedPercent,
		closedPercent,
		noActionPercent,
		assemblyPercent,
		supplierPercent,
		designPercent,
		unassignedPercent,
		failedPostCutIn,
		failedPostCutInPercent,
		openCount,
		containedCount,
		closedCount,
		assemblyCount,
		supplierCount,
		designCount,
		noActionCount,
	})
}

// get claims by part number
module.exports.partsSearch = async (req, res) => {
	let { period, division, type, failedPart } = req.params

	let types = []
	let modes = []

	if (type === 'leak') {
		types = ['O Ring', 'Loose Hose/Adaptor', 'Leaking', 'Ram seal leak']
		modes = ['Hydraulic']
	}
	if (type === 'paint') {
		types = ['Paint Damage', 'Paint adhesion', 'Weld spatter', 'Poor Paint', 'Conndition']
		modes = ['Paint Damage Body', 'Paint Damage Cab']
	}
	if (type === 'electric') {
		types = [
			'Clip up Electrical',
			'Failed Battery',
			'Gouged/Scored/Cut',
			'Harness Connectivity',
			'Harness Routing',
			'Loose',
			'Low Pressure',
			'Misaligned/Assy/Loose',
			'Not Built To Spec',
			'Not Fitted Correctly',
			'Open Circuit',
			'Over Charged',
			'Over Tightened',
			'Part Failure',
			'Routing',
			'Short Circuit',
			'Short Circuit/Burn Out',
			'Software',
			'Software Update',
			'Unconnected',
			'Unconnected/Open Circuit',
			'Water in Connector',
			'Wiring damage',
		]
		modes = ['Electrics']
	}
	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}
	if (period === 'doa' || period === 'DOA') {
		thePeriod = ['DOA']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't0' || period === 'T000') {
		thePeriod = ['T000']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't1' || period === 'T001') {
		thePeriod = ['T000', 'T001']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't2' || period === 'T002') {
		thePeriod = ['T000', 'T001', 'T002']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't3' || period === 'T003') {
		thePeriod = ['T000', 'T001', 'T002', 'T003']
		theBuildMonths = [
			{ buildDate: { $regex: tenMonthsAgo } },
			{ buildDate: { $regex: nineMonthsAgo } },
			{ buildDate: { $regex: eightMonthsAgo } },
			{ buildDate: { $regex: sevenMonthsAgo } },
			{ buildDate: { $regex: sixMonthsAgo } },
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}

	let searchOptions = {
		division: {
			$in: division,
		},
		active: true,
		tPeriod: {
			$in: thePeriod,
		},
		outcome: {
			$nin: ['Reject', 'Z Code'],
		},
		$or: theBuildMonths,
	}
	if (type === 'leak' || type === 'electric' || type === 'paint') {
		searchOptions = {
			division: {
				$in: division,
			},
			active: true,
			failuretype: { $in: types },
			failuremode: { $in: modes },
			tPeriod: {
				$in: thePeriod,
			},
			outcome: {
				$nin: ['Reject', 'Z Code'],
			},
			$or: theBuildMonths,
		}
	}

	if (type === 'cabs') {
		searchOptions = {
			division: {
				$in: division,
			},
			active: true,
			area: 'Cabs Systems',

			tPeriod: {
				$in: thePeriod,
			},
			outcome: {
				$nin: ['Reject', 'Z Code'],
			},
			$or: theBuildMonths,
		}
	}

	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
	}

	if (division != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(failedPart), 'gi')
	}
	const inspectors = await Inspector.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })
	const areas = await Area.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })
	const detections = await Detection.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })
	const models = await Model.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })
	const claims = await Claim.find(searchOptions).sort({ vettedAt: '' }).limit(1000)

	let num = 0
	for (let claim of claims) {
		num++
	}

	division = division[0]

	if (Array.isArray(division) && division.length > 1) {
		division = 'GROUP'
	}

	res.render('top50/partclaims', {
		division,
		type,
		inspectors,
		areas,
		detections,
		models,
		claims,
		num,
		period,
		failedPart,
	})
}
module.exports.partsAnalysis = async (req, res) => {
	let { period, division, type, failedPart } = req.params

	let types = []
	let modes = []
	let thePeriod = []

	if (type === 'leak') {
		types = ['O Ring', 'Loose Hose/Adaptor', 'Leaking', 'Ram seal leak']
		modes = ['Hydraulic']
	}
	if (type === 'paint') {
		types = ['Paint Damage', 'Paint adhesion', 'Weld spatter', 'Poor Paint', 'Conndition']
		modes = ['Paint Damage Body', 'Paint Damage Cab']
	}
	if (type === 'electric') {
		types = [
			'Clip up Electrical',
			'Failed Battery',
			'Gouged/Scored/Cut',
			'Harness Connectivity',
			'Harness Routing',
			'Loose',
			'Low Pressure',
			'Misaligned/Assy/Loose',
			'Not Built To Spec',
			'Not Fitted Correctly',
			'Open Circuit',
			'Over Charged',
			'Over Tightened',
			'Part Failure',
			'Routing',
			'Short Circuit',
			'Short Circuit/Burn Out',
			'Software',
			'Software Update',
			'Unconnected',
			'Unconnected/Open Circuit',
			'Water in Connector',
			'Wiring damage',
		]
		modes = ['Electrics']
	}
	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}
	if (period === 'doa' || period === 'DOA') {
		thePeriod = ['DOA']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't0' || period === 'T000') {
		thePeriod = ['T000']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't1' || period === 'T001') {
		thePeriod = ['T000', 'T001']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't2' || period === 'T002') {
		thePeriod = ['T000', 'T001', 'T002']
		theBuildMonths = [
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}
	if (period === 't3' || period === 'T003') {
		thePeriod = ['T000', 'T001', 'T002', 'T003']
		theBuildMonths = [
			{ buildDate: { $regex: tenMonthsAgo } },
			{ buildDate: { $regex: nineMonthsAgo } },
			{ buildDate: { $regex: eightMonthsAgo } },
			{ buildDate: { $regex: sevenMonthsAgo } },
			{ buildDate: { $regex: sixMonthsAgo } },
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		]
	}

	const dealerSearchOptions = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				failedPart: new RegExp(escapeRegex(failedPart), 'gi'),
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: theBuildMonths,
			},
		},

		{
			$group: {
				_id: '$dealer',
				count: {
					$sum: 1,
				},
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		dealerSearchOptions.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}

	if (type === 'cabs') {
		dealerSearchOptions.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}
	const modelSearchOptions = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				failedPart: new RegExp(escapeRegex(failedPart), 'gi'),
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: theBuildMonths,
			},
		},

		{
			$group: {
				_id: '$baseModel',
				count: {
					$sum: 1,
				},
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		modelSearchOptions.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}

	if (type === 'cabs') {
		modelSearchOptions.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}
	const countrySearchOptions = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				failedPart: new RegExp(escapeRegex(failedPart), 'gi'),
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: theBuildMonths,
			},
		},

		{
			$group: {
				_id: '$country',
				count: {
					$sum: 1,
				},
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		countrySearchOptions.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}

	if (type === 'cabs') {
		countrySearchOptions.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}
	const tPeriodSearchOptions = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				failedPart: new RegExp(escapeRegex(failedPart), 'gi'),
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: theBuildMonths,
			},
		},

		{
			$group: {
				_id: '$tPeriod',
				count: {
					$sum: 1,
				},
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		tPeriodSearchOptions.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}

	if (type === 'cabs') {
		tPeriodSearchOptions.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}

	const dealers = await Claim.aggregate(dealerSearchOptions)
	const models = await Claim.aggregate(modelSearchOptions)
	const countries = await Claim.aggregate(countrySearchOptions)
	const tPeriods = await Claim.aggregate(tPeriodSearchOptions)

	let num = 0
	for (let dealer of dealers) {
		num += dealer.count
	}
	if (Array.isArray(division) && division.length > 1) {
		division = 'GROUP'
	}

	res.render('top50/partsanalysis', {
		division,
		dealers,
		models,
		countries,
		tPeriods,
		period,
		num,
		failedPart,
	})
}

// top 50 part update

module.exports.renderTop50EditForm = async (req, res) => {
	let { period, division, type, failedPart } = req.params
	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}

	let searchOptions = {
		division: {
			$in: division,
		},
		active: true,
		failedPart: failedPart,
	}

	const claim = await Claim.findOne(searchOptions)
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}

	// console.log(claim)

	const champions = await Champion.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })

	const fourCIssued = await Claim.aggregate([
		{
			$match: {
				division: {
					$in: division,
				},
				failedPart: failedPart,
				$or: [{ fourC: 'Yes' }, { linked: true }],
			},
		},
		{
			$project: {
				theId: {
					$cond: [{ $eq: ['$fourC', 'Yes'] }, '$_id', '$linkedTo'],
				},
			},
		},
	])

	let fourCIdArr = fourCIssued.map((item) => item.theId)

	const fourCs = await Claim.find({
		_id: { $in: fourCIdArr },
	}).sort({ _id: -1 })

	if (Array.isArray(division) && division.length > 1) {
		division = 'GROUP'
	}

	let theLinkedFourC = {
		_id: 2,
	}
	let linkedAction = ''
	let linkedStatus = ''
	let linkedAsd = ''
	let linkedOpenedDate = ''
	let linkedContainedDate = ''
	let linkedClosedDate = ''
	let linkedContainedNotes = ''

	if (claim.top50Linked) {
		theLinkedFourC = await Claim.findById(claim.top50LinkedTo)

		linkedOpenedDate = moment(theLinkedFourC.vettedAt).format('DD/MM/YYYY')

		if (theLinkedFourC.status === 'Contained') {
			linkedContainedDate = moment(theLinkedFourC.containedAt).format('DD/MM/YYYY')
			linkedContainedNotes = theLinkedFourC.containNotes
		}
		if (theLinkedFourC.status === 'Closed') {
			linkedAction = `
Why did we have the failure? -  ${theLinkedFourC.counterWhyNotes}.
What have has been done to prevent re-occurrence? - ${theLinkedFourC.counterWhatNotes}.
Root Cause - ${theLinkedFourC.rootCause} `

			linkedContainedDate = moment(theLinkedFourC.containedAt).format('DD/MM/YYYY')
			linkedClosedDate = moment(theLinkedFourC.closedAt).format('DD/MM/YYYY')
			linkedContainedNotes = theLinkedFourC.containNotes
		}

		linkedStatus = theLinkedFourC.status
		linkedAsd = theLinkedFourC.asd
	}

	res.render('top50/top50edit', {
		claim,
		type,
		division,
		period,
		failedPart,
		champions,
		fourCs,
		theLinkedFourC,
		linkedAction,
		linkedStatus,
		linkedAsd,
		linkedOpenedDate,
		linkedContainedDate,
		linkedClosedDate,
		linkedContainedNotes,
	})
}

//route to update top 50 part number
module.exports.updatePart = async (req, res) => {
	let { period, division, type, failedPart } = req.params
	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}
	const claims = await Claim.updateMany(
		{
			division: {
				$in: division,
			},
			active: true,
			// failedPart: failedPart,
			failedPart: RegExp(escapeRegex(failedPart), 'gi'),
		},

		{
			...req.body.claim,
			// status : req.body.claim.rag,
			scc: req.body.claim.sccJosh,
			asd: req.body.claim.asdJosh,
		},
		{ new: true }
	)

	if (Array.isArray(division) && division.length > 1) {
		division = 'GROUP'
	}

	req.flash('success', 'Successfully updated')
	res.redirect(`/top50/50/${period}/${division}/all`)
}
// db.claims.update({division:"EM", serviceResBy:""},{ $set: { actioned:"Yes" } },{ multi: true })
// db.claims.update({division:"LP", serviceResBy:""},{ $set: { actioned:"Yes" } },{ multi: true })

module.exports.indexAll = async (req, res) => {
	let { period, division, type } = req.params
	let types = []
	let modes = []

	if (type === 'leak') {
		types = ['O Ring', 'Loose Hose/Adaptor', 'Leaking', 'Ram seal leak']
		modes = ['Hydraulic']
	}
	if (type === 'paint') {
		types = ['Paint Damage', 'Paint adhesion', 'Weld spatter', 'Poor Paint', 'Conndition']
		modes = ['Paint Damage Body', 'Paint Damage Cab']
	}
	if (type === 'electric') {
		types = [
			'Clip up Electrical',
			'Failed Battery',
			'Gouged/Scored/Cut',
			'Harness Connectivity',
			'Harness Routing',
			'Loose',
			'Low Pressure',
			'Misaligned/Assy/Loose',
			'Not Built To Spec',
			'Not Fitted Correctly',
			'Open Circuit',
			'Over Charged',
			'Over Tightened',
			'Part Failure',
			'Routing',
			'Short Circuit',
			'Short Circuit/Burn Out',
			'Software',
			'Software Update',
			'Unconnected',
			'Unconnected/Open Circuit',
			'Water in Connector',
			'Wiring damage',
		]
		modes = ['Electrics']
	}
	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}

	const champions = await Champion.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })
	if (period === 'doa') {
		thePeriod = ['DOA']
	}
	if (period === 't0') {
		thePeriod = ['T000']
	}
	if (period === 't1') {
		thePeriod = ['T000', 'T001']
	}
	if (period === 't3') {
		thePeriod = ['T000', 'T001', 'T002', 'T003']
	}

	if (period === 'doa') {
		theOtherPeriod = ['T000', 'T001', 'T002', 'T003']
	} else {
		theOtherPeriod = ['DOA']
	}

	const inTodayOptions = [
		{
			$match: {
				importedDate: { $gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',
			},
		},
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		inTodayOptions.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}

	if (type === 'cabs') {
		inTodayOptions.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}

	const options = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',
				concern: { $addToSet: '$concern' },
				rag: { $addToSet: '$rag' },
				closureDate: { $addToSet: '$closureDate' },
				asdJosh: { $addToSet: '$asdJosh' },
				action: { $addToSet: '$action' },
				champion: { $addToSet: '$champion' },
				sccJosh: { $addToSet: '$sccJosh' },
				buildDate: {
					$push: {
						$substr: ['$buildDate', 3, 10],
					},
				},

				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		// { $limit: 50 },
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		options.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}

	if (type === 'cabs') {
		options.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}
	if (req.query.rag != null && req.query.rag != '') {
		if (req.query.rag == 'Open') {
			options.push({
				$match: {
					rag: {
						$nin: ['Contained', 'Closed'],
					},
				},
			})
		} else {
			options.push({
				$match: {
					rag: {
						$in: [new RegExp(escapeRegex(req.query.rag), 'gi')],
					},
				},
			})
		}
	}
	if (req.query.champion != null && req.query.champion != '') {
		options.push({
			$match: {
				champion: new RegExp(escapeRegex(req.query.champion), 'gi'),
			},
		})
	}
	if (req.query.asdJosh != null && req.query.asdJosh != '') {
		options.push({
			$match: {
				asdJosh: new RegExp(escapeRegex(req.query.asdJosh), 'gi'),
			},
		})
	}
	if (req.query.sccJosh != null && req.query.sccJosh != '') {
		options.push({
			$match: {
				sccJosh: new RegExp(escapeRegex(req.query.sccJosh), 'gi'),
			},
		})
	}

	const otherOptions = [
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: theOtherPeriod,
				},
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',
				concern: { $addToSet: '$concern' },
				rag: { $addToSet: '$rag' },
				closureDate: { $addToSet: '$closureDate' },
				asdJosh: { $addToSet: '$asdJosh' },
				action: { $addToSet: '$action' },
				champion: { $addToSet: '$champion' },
				sccJosh: { $addToSet: '$sccJosh' },
				buildDate: {
					$push: {
						$substr: ['$buildDate', 3, 10],
					},
				},

				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		// { $limit: 50 },
	]

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		otherOptions.unshift({
			$match: {
				failuretype: { $in: types },
				failuremode: { $in: modes },
			},
		})
	}

	if (type === 'cabs') {
		otherOptions.unshift({
			$match: {
				area: 'Cabs Systems',
			},
		})
	}

	const parts = await Claim.aggregate(options)
	const otherParts = await Claim.aggregate(otherOptions)
	const last48Hours = await Claim.aggregate(inTodayOptions)
	last48HoursParts = []
	otherTParts = []

	for (let p of last48Hours) {
		last48HoursParts.push(p._id)
	}
	for (let p of otherParts) {
		otherTParts.push(p._id)
	}

	let allParts = 0

	if (type === 'leak' || type === 'electric' || type === 'paint') {
		allParts = await Claim.countDocuments({
			division: {
				$in: division,
			},
			active: true,
			tPeriod: {
				$in: thePeriod,
			},
			failuretype: { $in: types },
			failuremode: { $in: modes },
			outcome: {
				$nin: ['Reject', 'Z Code'],
			},
			$or: [
				{ buildDate: { $regex: tenMonthsAgo } },
				{ buildDate: { $regex: nineMonthsAgo } },
				{ buildDate: { $regex: eightMonthsAgo } },
				{ buildDate: { $regex: sevenMonthsAgo } },
				{ buildDate: { $regex: sixMonthsAgo } },
				{ buildDate: { $regex: fiveMonthsAgo } },
				{ buildDate: { $regex: fourMonthsAgo } },
				{ buildDate: { $regex: threeMonthsAgo } },
				{ buildDate: { $regex: twoMonthsAgo } },
				{ buildDate: { $regex: oneMonthAgo } },
				{ buildDate: { $regex: thisMonth } },
			],
		})
	} else if (type === 'cabs') {
		allParts = await Claim.countDocuments({
			division: {
				$in: division,
			},
			active: true,
			area: 'Cabs Systems',
			tPeriod: {
				$in: thePeriod,
			},
			outcome: {
				$nin: ['Reject', 'Z Code'],
			},
			$or: [
				{ buildDate: { $regex: tenMonthsAgo } },
				{ buildDate: { $regex: nineMonthsAgo } },
				{ buildDate: { $regex: eightMonthsAgo } },
				{ buildDate: { $regex: sevenMonthsAgo } },
				{ buildDate: { $regex: sixMonthsAgo } },
				{ buildDate: { $regex: fiveMonthsAgo } },
				{ buildDate: { $regex: fourMonthsAgo } },
				{ buildDate: { $regex: threeMonthsAgo } },
				{ buildDate: { $regex: twoMonthsAgo } },
				{ buildDate: { $regex: oneMonthAgo } },
				{ buildDate: { $regex: thisMonth } },
			],
		})
	} else {
		allParts = await Claim.countDocuments({
			division: {
				$in: division,
			},
			active: true,
			tPeriod: {
				$in: thePeriod,
			},
			outcome: {
				$nin: ['Reject', 'Z Code'],
			},
			$or: [
				{ buildDate: { $regex: tenMonthsAgo } },
				{ buildDate: { $regex: nineMonthsAgo } },
				{ buildDate: { $regex: eightMonthsAgo } },
				{ buildDate: { $regex: sevenMonthsAgo } },
				{ buildDate: { $regex: sixMonthsAgo } },
				{ buildDate: { $regex: fiveMonthsAgo } },
				{ buildDate: { $regex: fourMonthsAgo } },
				{ buildDate: { $regex: threeMonthsAgo } },
				{ buildDate: { $regex: twoMonthsAgo } },
				{ buildDate: { $regex: oneMonthAgo } },
				{ buildDate: { $regex: thisMonth } },
			],
		})
	}

	const refNumbers = await Claim.aggregate([
		{
			$match: {
				division: {
					$in: division,
				},
				active: true,
				tPeriod: {
					$in: thePeriod,
				},
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					// { buildDate: { $regex: tenMonthsAgo } },
					// { buildDate: { $regex: nineMonthsAgo } },
					// { buildDate: { $regex: eightMonthsAgo } },
					// { buildDate: { $regex: sevenMonthsAgo } },
					// { buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',

				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		// { $limit: 150 },
	])

	if (period === 'doa') {
		for (let p of parts) {
			for (let r of refNumbers) {
				if (r._id === p._id) {
					p.totalNum = r.count
					p.count = r.count
				}
			}
		}
		// parts.sort((a, b) => (a.totalNum > b.totalNum ? -1 : 1))
	}

	parts.sort((a, b) => b.totalNum - a.totalNum)

	let month1 = []
	let month2 = []
	let month3 = []
	let month4 = []
	let month5 = []
	let month6 = []
	let month7 = []
	let month8 = []
	let month9 = []
	let month10 = []
	let month11 = []
	function countInArray(array, what, month, part) {
		let count = 0
		for (let i = 0; i < array.length; i++) {
			if (array[i] === what) {
				count++
			}
		}
		// return part + ' ' + count;
		month.push(count)
	}
	parts.forEach((part) => {
		countInArray(part.buildDate, tenMonthsAgo, month1)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, nineMonthsAgo, month2)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, eightMonthsAgo, month3)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, sevenMonthsAgo, month4)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, sixMonthsAgo, month5)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, fiveMonthsAgo, month6)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, fourMonthsAgo, month7)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, threeMonthsAgo, month8)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, twoMonthsAgo, month9)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, oneMonthAgo, month10)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, thisMonth, month11)
	})

	if (Array.isArray(division) && division.length > 1) {
		division = 'GROUP'
	}

	res.render('top50/all', {
		division,
		type,
		parts,
		otherTParts,
		allParts,
		period,
		champions,
		last48HoursParts,
		month1,
		month2,
		month3,
		month4,
		month5,
		month6,
		month7,
		month8,
		month9,
		month10,
		month11,
	})
	// console.log(parts);
}

//cabs section
module.exports.index50cabs = async (req, res) => {
	const division = 'CABS'

	const champions = await Champion.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })

	const thePeriod = ['T000', 'T001', 'T002', 'T003']

	const inTodayOptions = [
		{
			$match: {
				importedDate: { $gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
				area: 'Cabs Systems',

				tPeriod: {
					$in: thePeriod,
				},
				active: true,
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',
			},
		},
	]

	const options = [
		{
			$match: {
				area: 'Cabs Systems',

				tPeriod: {
					$in: thePeriod,
				},
				active: true,
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$failedPart',
				concernCabs: { $addToSet: '$concernCabs' },
				cabsRag: { $addToSet: '$cabsRag' },
				closureDateCabs: { $addToSet: '$closureDateCabs' },
				asdCabs: { $addToSet: '$asdCabs' },
				actionCabs: { $addToSet: '$actionCabs' },
				championCabs: { $addToSet: '$championCabs' },
				sccCabs: { $addToSet: '$sccCabs' },
				buildDate: {
					$push: {
						$substr: ['$buildDate', 3, 10],
					},
				},

				count: { $sum: 1 },
			},
		},
		{ $sort: { count: -1, _id: 1 } },
		{ $limit: 50 },
	]

	if (req.query.cabsRag != null && req.query.cabsRag != '') {
		if (req.query.cabsRag == 'Open') {
			options.push({
				$match: {
					cabsRag: {
						$nin: ['Contained', 'Closed'],
					},
				},
			})
		} else {
			options.push({
				$match: {
					cabsRag: {
						$in: [new RegExp(escapeRegex(req.query.cabsRag), 'gi')],
					},
				},
			})
		}
	}
	if (req.query.champion != null && req.query.champion != '') {
		options.push({
			$match: {
				champion: new RegExp(escapeRegex(req.query.champion), 'gi'),
			},
		})
	}
	if (req.query.asdCabs != null && req.query.asdCabs != '') {
		options.push({
			$match: {
				asdCabs: new RegExp(escapeRegex(req.query.asdCabs), 'gi'),
			},
		})
	}
	if (req.query.sccCabs != null && req.query.sccCabs != '') {
		options.push({
			$match: {
				sccCabs: new RegExp(escapeRegex(req.query.sccCabs), 'gi'),
			},
		})
	}

	const parts = await Claim.aggregate(options)

	const last48Hours = await Claim.aggregate(inTodayOptions)
	last48HoursParts = []
	otherTParts = []

	let allParts = 0

	for (let p of last48Hours) {
		last48HoursParts.push(p._id)
	}

	allParts = await Claim.countDocuments({
		area: 'Cabs Systems',

		tPeriod: {
			$in: thePeriod,
		},
		active: true,
		outcome: {
			$nin: ['Reject', 'Z Code'],
		},
		$or: [
			{ buildDate: { $regex: tenMonthsAgo } },
			{ buildDate: { $regex: nineMonthsAgo } },
			{ buildDate: { $regex: eightMonthsAgo } },
			{ buildDate: { $regex: sevenMonthsAgo } },
			{ buildDate: { $regex: sixMonthsAgo } },
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		],
	})

	let month1 = []
	let month2 = []
	let month3 = []
	let month4 = []
	let month5 = []
	let month6 = []
	let month7 = []
	let month8 = []
	let month9 = []
	let month10 = []
	let month11 = []
	function countInArray(array, what, month, part) {
		let count = 0
		for (let i = 0; i < array.length; i++) {
			if (array[i] === what) {
				count++
			}
		}
		// return part + ' ' + count;
		month.push(count)
	}
	parts.forEach((part) => {
		countInArray(part.buildDate, tenMonthsAgo, month1)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, nineMonthsAgo, month2)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, eightMonthsAgo, month3)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, sevenMonthsAgo, month4)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, sixMonthsAgo, month5)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, fiveMonthsAgo, month6)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, fourMonthsAgo, month7)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, threeMonthsAgo, month8)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, twoMonthsAgo, month9)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, oneMonthAgo, month10)
	})
	parts.forEach((part) => {
		countInArray(part.buildDate, thisMonth, month11)
	})

	res.render('top50-cabs/top50', {
		division,

		parts,

		allParts,

		champions,
		last48HoursParts,
		month1,
		month2,
		month3,
		month4,
		month5,
		month6,
		month7,
		month8,
		month9,
		month10,
		month11,
	})
	// console.log(parts);
}

// get claims by part number
module.exports.partsSearchCabs = async (req, res) => {
	const { failedPart } = req.params
	const thePeriod = ['T000', 'T001', 'T002', 'T003']

	// console.log(failedPart)

	let searchOptions = {
		area: 'Cabs Systems',
		failedPart: new RegExp(escapeRegex(failedPart), 'gi'),

		tPeriod: {
			$in: thePeriod,
		},
		active: true,
		outcome: {
			$nin: ['Reject', 'Z Code'],
		},
		$or: [
			{ buildDate: { $regex: tenMonthsAgo } },
			{ buildDate: { $regex: nineMonthsAgo } },
			{ buildDate: { $regex: eightMonthsAgo } },
			{ buildDate: { $regex: sevenMonthsAgo } },
			{ buildDate: { $regex: sixMonthsAgo } },
			{ buildDate: { $regex: fiveMonthsAgo } },
			{ buildDate: { $regex: fourMonthsAgo } },
			{ buildDate: { $regex: threeMonthsAgo } },
			{ buildDate: { $regex: twoMonthsAgo } },
			{ buildDate: { $regex: oneMonthAgo } },
			{ buildDate: { $regex: thisMonth } },
		],
	}

	// if (req.query.failedPart != null && req.query.failedPart != '') {
	// 	searchOptions.failedPart = new RegExp(
	// 		escapeRegex(req.query.failedPart),
	// 		'gi',
	// 	)
	// }

	const inspectors = await Inspector.find({}).sort({ name: '' })
	const areas = await Area.find({}).sort({ name: '' })
	const detections = await Detection.find({}).sort({ name: '' })
	const models = await Model.find({}).sort({ name: '' })
	const claims = await Claim.find(searchOptions).sort({ vettedAt: '' }).limit(1000)

	let num = 0
	for (let claim of claims) {
		num++
	}

	res.render('top50-cabs/partclaims', {
		inspectors,
		areas,
		detections,
		models,
		claims,
		num,

		failedPart,
	})
}

module.exports.partsAnalysisCabs = async (req, res) => {
	let { failedPart } = req.params

	let division = 'Cabs'

	const thePeriod = ['T000', 'T001', 'T002', 'T003']

	const dealerSearchOptions = [
		{
			$match: {
				area: 'Cabs Systems',
				tPeriod: {
					$in: thePeriod,
				},
				active: true,
				failedPart: new RegExp(escapeRegex(failedPart), 'gi'),
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$dealer',
				count: {
					$sum: 1,
				},
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]

	const modelSearchOptions = [
		{
			$match: {
				area: 'Cabs Systems',
				tPeriod: {
					$in: thePeriod,
				},
				active: true,
				failedPart: new RegExp(escapeRegex(failedPart), 'gi'),
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$baseModel',
				count: {
					$sum: 1,
				},
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]

	const countrySearchOptions = [
		{
			$match: {
				area: 'Cabs Systems',

				tPeriod: {
					$in: thePeriod,
				},
				active: true,
				failedPart: new RegExp(escapeRegex(failedPart), 'gi'),
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$country',
				count: {
					$sum: 1,
				},
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]

	const tPeriodSearchOptions = [
		{
			$match: {
				area: 'Cabs Systems',

				tPeriod: {
					$in: thePeriod,
				},
				active: true,
				failedPart: new RegExp(escapeRegex(failedPart), 'gi'),
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
				$or: [
					{ buildDate: { $regex: tenMonthsAgo } },
					{ buildDate: { $regex: nineMonthsAgo } },
					{ buildDate: { $regex: eightMonthsAgo } },
					{ buildDate: { $regex: sevenMonthsAgo } },
					{ buildDate: { $regex: sixMonthsAgo } },
					{ buildDate: { $regex: fiveMonthsAgo } },
					{ buildDate: { $regex: fourMonthsAgo } },
					{ buildDate: { $regex: threeMonthsAgo } },
					{ buildDate: { $regex: twoMonthsAgo } },
					{ buildDate: { $regex: oneMonthAgo } },
					{ buildDate: { $regex: thisMonth } },
				],
			},
		},

		{
			$group: {
				_id: '$tPeriod',
				count: {
					$sum: 1,
				},
			},
		},
		{ $sort: { count: -1, _id: 1 } },
	]

	const dealers = await Claim.aggregate(dealerSearchOptions)
	const models = await Claim.aggregate(modelSearchOptions)
	const countries = await Claim.aggregate(countrySearchOptions)
	const tPeriods = await Claim.aggregate(tPeriodSearchOptions)

	let num = 0
	for (let dealer of dealers) {
		num += dealer.count
	}

	res.render('top50-cabs/partsanalysis', {
		division,
		dealers,
		models,
		countries,
		tPeriods,
		num,
		failedPart,
	})
}

// top 50 part update

module.exports.renderTop50EditFormCabs = async (req, res) => {
	let { failedPart } = req.params

	let division = 'Cabs'

	let searchOptions = {
		failedPart: failedPart,
	}
	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
	}

	const claim = await Claim.findOne(searchOptions)
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}
	const champions = await Champion.find({
		division: {
			$in: division,
		},
	}).sort({ name: '' })

	res.render('top50-cabs/top50edit', {
		claim,
		division,
		failedPart,
		champions,
	})
}

//route to update top 50 part number
module.exports.updatePartCabs = async (req, res) => {
	let { failedPart } = req.params
	let division = 'Cabs'

	const claim = await Claim.updateMany(
		{
			failedPart: RegExp(escapeRegex(failedPart), 'gi'),
		},
		{
			$set: {
				...req.body.claim,
			},
		},
		{ multi: true }
	)

	req.flash('success', 'Successfully updated')
	res.redirect(`/top50/50cabs`)
}

module.exports.addLinkedClaim = async (req, res) => {
	const { id1, id2 } = req.params

	// console.log(id1)

	// console.log(id2)

	const claimOnTop50 = await Claim.findById(id2)

	const claimToLinkTo = await Claim.findById(id1)

	if (!claimOnTop50 || !claimToLinkTo) {
		req.flash('error', 'Sorry something went wrong')
		res.redirect('/')
		return
	}

	if (claimOnTop50.top50Linked) {
		req.flash('error', 'Claim Already Linked')
		res.redirect(`/top50/edit/${claimOnTop50.tPeriod}/${claimOnTop50.division}/all/${claimOnTop50.failedPart}`)
		return
	}

	const division = claimToLinkTo.division
	const partNumber = claimOnTop50.failedPart
	const linkedToId = claimToLinkTo._id

	// console.log('LINK TO => ', claimToLinkTo)
	// console.log('On Top 50 => ', claimOnTop50.failedPart)

	await Claim.updateMany(
		{
			division: division,
			failedPart: partNumber,
		},
		{
			top50Linked: true,
			top50LinkedTo: linkedToId,
			$addToSet: { top50LinkedClaims: linkedToId },
		}
	)

	req.flash('success', 'Top 50 Item Linked')
	res.redirect(`/top50/edit/${claimOnTop50.tPeriod}/${division}/all/${partNumber}`)

	// const claim = await Claim.find({
	// 	_id: id2,
	// })
	// if (claim || !claim.linked) {
	// 	const masterClaim = await Claim.findByIdAndUpdate(
	// 		id,
	// 		{
	// 			$addToSet: { linkedClaims: id2 },
	// 		},
	// 		{ new: true }
	// 	)
	// 	const slaveClaim = await Claim.findByIdAndUpdate(
	// 		id2,
	// 		{
	// 			linkedTo: id,
	// 			linked: true,
	// 			status: masterClaim.status,
	// 			closeNotes: `See 4C number ${masterClaim.claimNumber} `,
	// 		},
	// 		{ new: true }
	// 	)
	// }
	// 	req.flash('success', 'Claim Linked')
	// 	res.redirect(`/claims/${id2}/edit`)
	// } else {
	// 	req.flash('error', 'Claim Already Linked')
	// 	res.redirect(`/claims/${id2}/edit`)
	//}
}

module.exports.removeLinkedClaim = async (req, res) => {
	const { id1, id2 } = req.params

	// console.log(id1)

	// console.log(id2)

	const claimOnTop50 = await Claim.findById(id2)

	const claimToLinkTo = await Claim.findById(id1)

	if (!claimOnTop50 || !claimToLinkTo) {
		req.flash('error', 'Sorry something went wrong')
		res.redirect('/')
		return
	}

	if (!claimOnTop50.top50Linked) {
		req.flash('error', 'Claim Not Linked')
		res.redirect(`/top50/edit/${claimOnTop50.tPeriod}/${claimOnTop50.division}/all/${claimOnTop50.failedPart}`)
		return
	}

	const division = claimToLinkTo.division
	const partNumber = claimOnTop50.failedPart

	await Claim.updateMany(
		{
			division: division,
			failedPart: partNumber,
		},
		{
			top50Linked: false,
			top50LinkedTo: null,
		}
	)

	req.flash('success', 'Top 50 Item Unlinked')
	res.redirect(`/top50/edit/${claimOnTop50.tPeriod}/${division}/all/${partNumber}`)
}
