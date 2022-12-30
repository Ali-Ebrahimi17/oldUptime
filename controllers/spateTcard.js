require('dotenv').config()

const Stoppage = require('../models/stoppage')
const Update = require('../models/update')
const BConcern = require('../models/breakdownConcern')
const BType = require('../models/breakdownType')
const Machine = require('../models/machine')
const axios = require('axios')
const CronJob = require('cron').CronJob

const moment = require('moment')
const { relativeTimeRounding } = require('moment')
const { ConsoleMessage } = require('puppeteer')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.renderLogin = (req, res) => {
	const { shortBu } = req.params
	res.render('machine/login', { shortBu })
}

module.exports.login = (req, res) => {
	const { shortBu } = req.params
	// req.flash('success', 'welcome back!')
	const redirectUrl = req.session.returnTo || `/equipment-monitoring/admin/${shortBu}`
	delete req.session.returnTo
	res.redirect(redirectUrl)
}

module.exports.logout = (req, res) => {
	const { bu } = req.params
	req.logout()
	// req.flash('success', 'Goodbye!')
	res.redirect(`/equipment-monitoring/business-unit/${bu}`)
}

//  convert ms into HH:MM:SS
function msToTime(duration) {
	let milliseconds = parseInt((duration % 1000) / 100)
	seconds = parseInt((duration / 1000) % 60)
	minutes = parseInt((duration / (1000 * 60)) % 60)
	hours = parseInt(duration / (1000 * 60 * 60))
	hours = hours < 10 ? '0' + hours : hours
	minutes = minutes < 10 ? '0' + minutes : minutes
	seconds = seconds < 10 ? '0' + seconds : seconds
	return hours + ':' + minutes + ':' + seconds
}

module.exports.home = async (req, res) => {
	res.render('machine/home', {})
}

module.exports.dayAnalysis = async (req, res) => {
	const { shortBu, day, month } = req.params
	const year = new Date().getFullYear()

	let startDate = new Date(`${year},${month},${day}`)
	startDate.setHours(0, 0, 0, 0)

	let endDate = new Date(`${year},${month},${day}`)
	endDate.setHours(24, 0, 0, 0)

	let dayOfTheWeekNumber = startDate.getDay()

	let dayOfTheWee = ''

	if (dayOfTheWeekNumber === 0) {
		dayOfTheWeek = 'sunday'
	}
	if (dayOfTheWeekNumber === 1) {
		dayOfTheWeek = 'monday'
	}
	if (dayOfTheWeekNumber === 2) {
		dayOfTheWeek = 'tuesday'
	}
	if (dayOfTheWeekNumber === 3) {
		dayOfTheWeek = 'wednesday'
	}
	if (dayOfTheWeekNumber === 4) {
		dayOfTheWeek = 'thursday'
	}
	if (dayOfTheWeekNumber === 5) {
		dayOfTheWeek = 'friday'
	}
	if (dayOfTheWeekNumber === 6) {
		dayOfTheWeek = 'saturday'
	}

	// console.log(dayOfTheWeek)

	const machines = await Machine.find({
		shortBu,
	})
		.populate({
			path: 'stoppages',

			match: {
				$or: [
					{
						$and: [
							{
								createdAt: {
									$gte: startDate,
								},
							},
							{
								updatedAt: {
									$lte: endDate,
								},
							},
						],
					},
					{
						$and: [
							{
								createdAt: {
									$lte: startDate,
								},
							},
							{
								updatedAt: {
									$gte: startDate,
								},
								updatedAt: {
									$lte: endDate,
								},
							},
						],
					},
					{
						$and: [
							{
								createdAt: {
									$gte: startDate,
								},
								createdAt: {
									$lte: endDate,
								},
							},
							{
								updatedAt: {
									$gte: endDate,
								},
							},
						],
					},
				],
			},
		})
		.populate({
			path: 'updates',
			match: {
				$or: [
					{
						$and: [
							{
								shiftStart: {
									$gte: startDate,
								},
							},
							{
								shiftEnd: {
									$lte: endDate,
								},
							},
						],
					},
					{
						$and: [
							{
								shiftStart: {
									$lte: startDate,
								},
							},
							{
								shiftEnd: {
									$gte: startDate,
								},
								shiftEnd: {
									$lte: endDate,
								},
							},
						],
					},
					{
						$and: [
							{
								shiftStart: {
									$gte: startDate,
								},
								shiftStart: {
									$lte: endDate,
								},
							},
							{
								shiftEnd: {
									$gte: endDate,
								},
							},
						],
					},
				],
			},
		})

	res.render('machine/dayAnalysis', { shortBu, day, month, year, machines })
}

module.exports.divisionEff = async (req, res) => {
	const { shortBu, asset } = req.params

	const machine = await Machine.find({ abbreviatedName: asset })

	const weldingRobotsInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Welding Robot',
		shortBu: shortBu,
	})

	let selection = ''
	const todayDB = new Date()
	todayDB.setHours(0, 0, 0, 0)

	const sixDaysAgoDB = new Date(todayDB)

	sixDaysAgoDB.setDate(sixDaysAgoDB.getDate() - 14)

	let graphOptionsMachine = [
		{
			$match: {
				shortBu: shortBu,
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
				shortBu: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
				bu: { $addToSet: '$shortBu' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: -1 } },
		// 	{ $limit: 1 },
	]

	let vin = 0
	let graphOptionsLDL = []
	if (machine.length > 0) {
		vin = machine[0].vin
		graphOptionsLDL = [
			{
				$match: {
					shortBu: shortBu,
					vin: vin,
					type: 'Welding Robot',
					eff: { $gt: 0 },
					updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
				},
			},
			{
				$project: {
					day: { $dayOfMonth: '$updatedAt' },
					month: { $month: '$updatedAt' },
					eff: 1,
					teff: 1,
				},
			},
			{
				$group: {
					_id: { day: '$day', month: '$month' },
					eff: { $avg: '$eff' },
					teff: { $avg: '$teff' },
				},
			},
			{
				$addFields: {
					averageEff: {
						$round: ['$eff', 0],
					},
				},
			},
			{
				$addFields: {
					averageMTEff: {
						$multiply: [
							{
								$divide: ['$teff', '$eff'],
							},
							100,
						],
					},
				},
			},
			{
				$addFields: {
					averageTEff: {
						$round: ['$averageMTEff', 0],
					},
				},
			},

			{ $sort: { _id: 1 } },
		]
	} else {
		graphOptionsLDL = [
			{
				$match: {
					shortBu: shortBu,
					type: 'Welding Robot',
					eff: { $gt: 0 },

					updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
				},
			},
			{
				$project: {
					day: { $dayOfMonth: '$updatedAt' },
					month: { $month: '$updatedAt' },
					eff: 1,
					teff: 1,
				},
			},
			{
				$group: {
					_id: { day: '$day', month: '$month' },
					eff: { $avg: '$eff' },
					teff: { $avg: '$teff' },
				},
			},
			{
				$addFields: {
					averageEff: {
						$round: ['$eff', 0],
					},
				},
			},
			{
				$addFields: {
					averageMTEff: {
						$multiply: [
							{
								$divide: ['$teff', '$eff'],
							},
							100,
						],
					},
				},
			},
			{
				$addFields: {
					averageTEff: {
						$round: ['$averageMTEff', 0],
					},
				},
			},

			{ $sort: { _id: 1 } },
		]
	}

	bestOptions = [
		{
			$match: {
				shortBu: shortBu,
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: -1 } },
		{ $limit: 1 },
	]

	worstOptions = [
		{
			$match: {
				shortBu: shortBu,
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	let averageOptions = [
		{
			$match: {
				shortBu: shortBu,
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	const bestMachine = await Machine.aggregate(bestOptions)
	const worstMachine = await Machine.aggregate(worstOptions)
	const averageMachine = await Machine.aggregate(averageOptions)

	let totWeldPercent = 0
	let totWeldPercentT = 0
	for (let w of weldingRobotsInShift) {
		totWeldPercent += w.eff
		totWeldPercentT += w.teff
	}
	let weldPercent = Math.round(totWeldPercent / weldingRobotsInShift.length)
	let weldPercentT = Math.round(totWeldPercentT / weldingRobotsInShift.length)

	if (isNaN(weldPercent)) {
		weldPercent = 0
	}

	if (isNaN(weldPercentT)) {
		weldPercentT = 0
	}

	const GraphBHL = await Machine.aggregate(graphOptionsMachine)

	const GraphLDL = await Update.aggregate(graphOptionsLDL)

	const businessUnit = GraphBHL[0].bu
	let fullBusinessUnit

	if (shortBu === 'CABS') {
		fullBusinessUnit = 'Cab Systems'
	}
	if (shortBu === 'BHL') {
		fullBusinessUnit = 'Backhoe Loader'
	}
	if (shortBu === 'LDL') {
		fullBusinessUnit = 'Loadall'
	}
	if (shortBu === 'CP') {
		fullBusinessUnit = 'Compact Products'
	}
	if (shortBu === 'HP') {
		fullBusinessUnit = 'Heavy Products'
	}
	if (shortBu === 'EM') {
		fullBusinessUnit = 'Earth Movers'
	}

	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)

	if (update === null) {
		update = new Date()
	}

	res.render('machine/divisionEff', {
		update,
		shortBu,
		weldPercent,
		weldPercentT,
		GraphBHL,
		GraphLDL,
		businessUnit,
		asset,
		bestMachine,
		worstMachine,
		averageMachine,
		fullBusinessUnit,
	})
}

module.exports.global = async (req, res) => {
	const weldingRobotsInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	})
	const laserCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Laser Cutter',
	})
	const plasmaCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Plasma Cutter',
	})

	let selection = ''
	const todayDB = new Date()
	todayDB.setHours(0, 0, 0, 0)

	const sixDaysAgoDB = new Date(todayDB)

	sixDaysAgoDB.setDate(sixDaysAgoDB.getDate() - 7)

	let graphOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	bestOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]
	bestOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]

	let searchOptionsBHL = { shortBu: 'BHL', inShift: true, signal: true }
	let searchOptionsLDL = { shortBu: 'LDL', inShift: true, signal: true }
	let searchOptionsCP = { shortBu: 'CP', inShift: true, signal: true }
	let searchOptionsHP = { shortBu: 'HP', inShift: true, signal: true }
	let searchOptionsEM = { shortBu: 'EM', inShift: true, signal: true }
	let searchOptionsCABS = { shortBu: 'CABS', inShift: true, signal: true }

	const bestMachineBHL = await Machine.aggregate(bestOptionsBHL)
	const worstMachineBHL = await Machine.aggregate(worstOptionsBHL)

	const bestMachineLDL = await Machine.aggregate(bestOptionsLDL)
	const worstMachineLDL = await Machine.aggregate(worstOptionsLDL)

	const bestMachineCP = await Machine.aggregate(bestOptionsCP)
	const worstMachineCP = await Machine.aggregate(worstOptionsCP)

	const bestMachineHP = await Machine.aggregate(bestOptionsHP)
	const worstMachineHP = await Machine.aggregate(worstOptionsHP)

	// console.log(bestMachineHP)

	const bestMachineEM = await Machine.aggregate(bestOptionsEM)
	const worstMachineEM = await Machine.aggregate(worstOptionsEM)

	const bestMachineCABS = await Machine.aggregate(bestOptionsCABS)
	const worstMachineCABS = await Machine.aggregate(worstOptionsCABS)

	let totWeldPercent = 0
	let totWeldPercentT = 0
	for (let w of weldingRobotsInShift) {
		totWeldPercent += w.eff
		totWeldPercentT += w.teff
	}
	let weldPercent = Math.round(totWeldPercent / weldingRobotsInShift.length)
	let weldPercentT = Math.round(totWeldPercentT / weldingRobotsInShift.length)

	let totLaserPercent = 0
	let totLaserPercentT = 0
	for (let l of laserCuttersInShift) {
		totLaserPercent += l.eff
		totLaserPercentT += l.teff
	}
	let laserPercent = Math.round(totLaserPercent / laserCuttersInShift.length)
	let laserPercentT = Math.round(totLaserPercentT / laserCuttersInShift.length)

	let totPlasmaPercent = 0
	let totPlasmaPercentT = 0
	for (let p of plasmaCuttersInShift) {
		totPlasmaPercent += p.eff
		totPlasmaPercentT += p.teff
	}
	let plasmaPercent = Math.round(totPlasmaPercent / plasmaCuttersInShift.length)
	let plasmaPercentT = Math.round(totPlasmaPercentT / plasmaCuttersInShift.length)

	if (isNaN(weldPercent)) {
		weldPercent = 0
	}
	if (isNaN(laserPercent)) {
		laserPercent = 0
	}
	if (isNaN(plasmaPercent)) {
		plasmaPercent = 0
	}
	if (isNaN(weldPercentT)) {
		weldPercentT = 0
	}
	if (isNaN(laserPercentT)) {
		laserPercentT = 0
	}
	if (isNaN(plasmaPercentT)) {
		plasmaPercentT = 0
	}

	const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length

	const arrSum = (arr) => arr.reduce((a, b) => a + b, 0)

	// get the known breakdown times BHL
	const machinesInShiftClosedKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArray = []
	let tEffArray = []
	for (let machine of machinesInShiftClosedKnownBHL) {
		effArray.push(machine.eff)
		tEffArray.push(machine.teff)
	}

	let totEffBHL = Math.round(average(effArray))
	if (isNaN(totEffBHL)) {
		totEffBHL = 0
	}
	let totTEffBHL = Math.round(average(tEffArray))
	if (isNaN(totTEffBHL)) {
		totTEffBHL = 0
	}

	// console.log(sumOfRunningTime)
	let eff12BHL = totEffBHL
	let teff12BHL = 0

	if (totEffBHL > totTEffBHL) {
		teff12BHL = totTEffBHL
		eff12BHL = totEffBHL - totTEffBHL
	}

	// // Loadall bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayLDL = []
	let tEffArrayLDL = []
	for (let machine of machinesInShiftClosedKnownLDL) {
		effArrayLDL.push(machine.eff)
		tEffArrayLDL.push(machine.teff)
	}

	let totEffLDL = Math.round(average(effArrayLDL))
	if (isNaN(totEffLDL)) {
		totEffLDL = 0
	}
	let totTEffLDL = Math.round(average(tEffArrayLDL))
	if (isNaN(totTEffLDL)) {
		totTEffLDL = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12LDL = totEffLDL
	let teff12LDL = 0

	if (totEffLDL > totTEffLDL) {
		teff12LDL = totTEffLDL
		eff12LDL = totEffLDL - totTEffLDL
	}

	// compact bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayCP = []
	let tEffArrayCP = []
	for (let machine of machinesInShiftClosedKnownCP) {
		effArrayCP.push(machine.eff)
		tEffArrayCP.push(machine.teff)
	}

	let totEffCP = Math.round(average(effArrayCP))
	if (isNaN(totEffCP)) {
		totEffCP = 0
	}
	let totTEffCP = Math.round(average(tEffArrayCP))
	if (isNaN(totTEffCP)) {
		totTEffCP = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12CP = totEffCP
	let teff12CP = 0

	if (totEffCP > totTEffCP) {
		teff12CP = totTEffCP
		eff12CP = totEffCP - totTEffCP
	}

	// heavy products bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayHP = []
	let tEffArrayHP = []
	for (let machine of machinesInShiftClosedKnownHP) {
		effArrayHP.push(machine.eff)
		tEffArrayHP.push(machine.teff)
	}

	let totEffHP = Math.round(average(effArrayHP))
	if (isNaN(totEffHP)) {
		totEffHP = 0
	}
	let totTEffHP = Math.round(average(tEffArrayHP))
	if (isNaN(totTEffHP)) {
		totTEffHP = 0
	}

	let eff12HP = totEffHP
	let teff12HP = 0

	if (totEffHP > totTEffHP) {
		teff12HP = totTEffHP
		eff12HP = totEffHP - totTEffHP
	}

	// // earth movers bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayEM = []
	let tEffArrayEM = []
	for (let machine of machinesInShiftClosedKnownEM) {
		effArrayEM.push(machine.eff)
		tEffArrayEM.push(machine.teff)
	}

	let totEffEM = Math.round(average(effArrayEM))
	if (isNaN(totEffEM)) {
		totEffEM = 0
	}
	let totTEffEM = Math.round(average(tEffArrayEM))
	if (isNaN(totTEffEM)) {
		totTEffEM = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12EM = totEffEM
	let teff12EM = 0

	if (totEffEM > totTEffEM) {
		teff12EM = totTEffEM
		eff12EM = totEffEM - totTEffEM
	}

	// // Cabs bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayCABS = []
	let tEffArrayCABS = []
	for (let machine of machinesInShiftClosedKnownCABS) {
		effArrayCABS.push(machine.eff)
		tEffArrayCABS.push(machine.teff)
	}

	let totEffCABS = Math.round(average(effArrayCABS))
	if (isNaN(totEffCABS)) {
		totEffCABS = 0
	}
	let totTEffCABS = Math.round(average(tEffArrayCABS))
	if (isNaN(totTEffCABS)) {
		totTEffCABS = 0
	}

	let eff12CABS = totEffCABS
	let teff12CABS = 0

	if (totEffCABS > totTEffCABS) {
		teff12CABS = totTEffCABS
		eff12CABS = totEffCABS - totTEffCABS
	}

	const GraphBHL = await Update.aggregate(graphOptionsBHL)

	const GraphLDL = await Update.aggregate(graphOptionsLDL)

	const GraphCP = await Update.aggregate(graphOptionsCP)

	const GraphHP = await Update.aggregate(graphOptionsHP)

	const GraphEM = await Update.aggregate(graphOptionsEM)

	const GraphCABS = await Update.aggregate(graphOptionsCABS)

	// console.log(GraphCP)

	let programmeEffBHL = Math.round((totTEffBHL / totEffBHL) * 100)
	if (isNaN(programmeEffBHL)) {
		programmeEffBHL = 0
	}
	const notProgrammeEffBHL = 100 - programmeEffBHL

	let programmeEffLDL = Math.round((totTEffLDL / totEffLDL) * 100)
	if (isNaN(programmeEffLDL)) {
		programmeEffLDL = 0
	}
	const notProgrammeEffLDL = 100 - programmeEffLDL

	let programmeEffCP = Math.round((totTEffCP / totEffCP) * 100)
	if (isNaN(programmeEffCP)) {
		programmeEffCP = 0
	}
	const notProgrammeEffCP = 100 - programmeEffCP

	let programmeEffHP = Math.round((totTEffHP / totEffHP) * 100)
	if (isNaN(programmeEffHP)) {
		programmeEffHP = 0
	}
	const notProgrammeEffHP = 100 - programmeEffHP

	let programmeEffEM = Math.round((totTEffEM / totEffEM) * 100)
	if (isNaN(programmeEffEM)) {
		programmeEffEM = 0
	}
	const notProgrammeEffEM = 100 - programmeEffEM

	let programmeEffCABS = Math.round((totTEffCABS / totEffCABS) * 100)
	if (isNaN(programmeEffCABS)) {
		programmeEffCABS = 0
	}
	const notProgrammeEffCABS = 100 - programmeEffCABS

	let averageOptions = [
		{
			$match: {
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]
	let averageOptionsPlasma = [
		{
			$match: {
				type: 'Plasma Cutter',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]
	let averageOptionsLaser = [
		{
			$match: {
				type: 'Laser Cutter',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { eff: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]
	let averageOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]
	let averageOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},
		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]

	const averageMachine = await Machine.aggregate(averageOptions)
	const averageMachinePlasma = await Machine.aggregate(averageOptionsPlasma)
	const averageMachineLaser = await Machine.aggregate(averageOptionsLaser)
	const averageMachineLDL = await Machine.aggregate(averageOptionsLDL)
	const averageMachineBHL = await Machine.aggregate(averageOptionsBHL)
	const averageMachineCP = await Machine.aggregate(averageOptionsCP)
	const averageMachineHP = await Machine.aggregate(averageOptionsHP)
	const averageMachineEM = await Machine.aggregate(averageOptionsEM)
	const averageMachineCABS = await Machine.aggregate(averageOptionsCABS)
	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)

	if (update === null) {
		update = new Date()
	}

	res.render('machine/global', {
		update,
		averageMachine,
		averageMachinePlasma,
		averageMachineLaser,
		averageMachineLDL,
		averageMachineBHL,
		averageMachineCP,
		averageMachineHP,
		averageMachineEM,
		averageMachineCABS,
		programmeEffBHL,
		notProgrammeEffBHL,
		programmeEffLDL,
		notProgrammeEffLDL,
		programmeEffCP,
		notProgrammeEffCP,
		programmeEffHP,
		notProgrammeEffHP,
		programmeEffEM,
		notProgrammeEffEM,
		programmeEffCABS,
		notProgrammeEffCABS,
		weldPercent,
		laserPercent,
		plasmaPercent,
		weldPercentT,
		laserPercentT,
		plasmaPercentT,
		//BHL
		teff12BHL,
		eff12BHL,
		totEffBHL,

		bestMachineBHL,
		worstMachineBHL,
		// LDL
		teff12LDL,
		eff12LDL,
		totEffLDL,

		bestMachineLDL,
		worstMachineLDL,
		//CP
		teff12CP,
		eff12CP,
		totEffCP,

		// wireLabelCP,
		bestMachineCP,
		worstMachineCP,
		//HP
		teff12HP,
		eff12HP,
		totEffHP,

		bestMachineHP,
		worstMachineHP,
		//EM
		teff12EM,
		eff12EM,
		totEffEM,

		bestMachineEM,
		worstMachineEM,
		//CABS
		teff12CABS,
		eff12CABS,
		totEffCABS,

		bestMachineCABS,
		worstMachineCABS,

		GraphBHL,
		GraphLDL,
		GraphCP,
		GraphHP,
		GraphEM,
		GraphCABS,

		selection,
	})
}

// eff of programme

module.exports.effOfProgramme = async (req, res) => {
	const weldingRobotsInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	})
	const laserCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Laser Cutter',
	})
	const plasmaCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Plasma Cutter',
	})

	let selection = ''
	const todayDB = new Date()
	todayDB.setHours(0, 0, 0, 0)

	const sixDaysAgoDB = new Date(todayDB)

	sixDaysAgoDB.setDate(sixDaysAgoDB.getDate() - 7)

	let graphOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				type: 'Welding Robot',
				eff: { $gt: 0 },

				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				type: 'Welding Robot',
				eff: { $gt: 0 },

				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				type: 'Welding Robot',
				eff: { $gt: 0 },

				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				type: 'Welding Robot',
				eff: { $gt: 0 },

				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				type: 'Welding Robot',
				eff: { $gt: 0 },

				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				type: 'Welding Robot',
				eff: { $gt: 0 },

				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	bestOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]
	bestOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	let searchOptionsBHL = {
		shortBu: 'BHL',
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	}
	let searchOptionsLDL = {
		shortBu: 'LDL',
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	}
	let searchOptionsCP = {
		shortBu: 'CP',
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	}
	let searchOptionsHP = {
		shortBu: 'HP',
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	}
	let searchOptionsEM = {
		shortBu: 'EM',
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	}
	let searchOptionsCABS = {
		shortBu: 'CABS',
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	}

	const bestMachineBHL = await Machine.aggregate(bestOptionsBHL)
	const worstMachineBHL = await Machine.aggregate(worstOptionsBHL)

	const bestMachineLDL = await Machine.aggregate(bestOptionsLDL)
	const worstMachineLDL = await Machine.aggregate(worstOptionsLDL)

	const bestMachineCP = await Machine.aggregate(bestOptionsCP)
	const worstMachineCP = await Machine.aggregate(worstOptionsCP)

	const bestMachineHP = await Machine.aggregate(bestOptionsHP)
	const worstMachineHP = await Machine.aggregate(worstOptionsHP)

	// console.log(bestMachineHP)

	const bestMachineEM = await Machine.aggregate(bestOptionsEM)
	const worstMachineEM = await Machine.aggregate(worstOptionsEM)

	const bestMachineCABS = await Machine.aggregate(bestOptionsCABS)
	const worstMachineCABS = await Machine.aggregate(worstOptionsCABS)

	let totWeldPercent = 0
	let totWeldPercentT = 0
	for (let w of weldingRobotsInShift) {
		totWeldPercent += w.eff
		totWeldPercentT += w.teff
	}
	let weldPercent = Math.round(totWeldPercent / weldingRobotsInShift.length)
	let weldPercentT = Math.round(totWeldPercentT / weldingRobotsInShift.length)

	let totLaserPercent = 0
	let totLaserPercentT = 0
	for (let l of laserCuttersInShift) {
		totLaserPercent += l.eff
		totLaserPercentT += l.teff
	}
	let laserPercent = Math.round(totLaserPercent / laserCuttersInShift.length)
	let laserPercentT = Math.round(totLaserPercentT / laserCuttersInShift.length)

	let totPlasmaPercent = 0
	let totPlasmaPercentT = 0
	for (let p of plasmaCuttersInShift) {
		totPlasmaPercent += p.eff
		totPlasmaPercentT += p.teff
	}
	let plasmaPercent = Math.round(totPlasmaPercent / plasmaCuttersInShift.length)
	let plasmaPercentT = Math.round(totPlasmaPercentT / plasmaCuttersInShift.length)

	if (isNaN(weldPercent)) {
		weldPercent = 0
	}
	if (isNaN(laserPercent)) {
		laserPercent = 0
	}
	if (isNaN(plasmaPercent)) {
		plasmaPercent = 0
	}
	if (isNaN(weldPercentT)) {
		weldPercentT = 0
	}
	if (isNaN(laserPercentT)) {
		laserPercentT = 0
	}
	if (isNaN(plasmaPercentT)) {
		plasmaPercentT = 0
	}

	const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length

	const arrSum = (arr) => arr.reduce((a, b) => a + b, 0)

	// get the known breakdown times BHL
	const machinesInShiftClosedKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArray = []
	let tEffArray = []
	for (let machine of machinesInShiftClosedKnownBHL) {
		effArray.push(machine.eff)
		tEffArray.push(machine.teff)
	}

	let totEffBHL = Math.round(average(effArray))
	if (isNaN(totEffBHL)) {
		totEffBHL = 0
	}
	let totTEffBHL = Math.round(average(tEffArray))
	if (isNaN(totTEffBHL)) {
		totTEffBHL = 0
	}

	// console.log(sumOfRunningTime)
	let eff12BHL = totEffBHL
	let teff12BHL = 0

	if (totEffBHL > totTEffBHL) {
		teff12BHL = totTEffBHL
		eff12BHL = totEffBHL - totTEffBHL
	}

	// // Loadall bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayLDL = []
	let tEffArrayLDL = []
	for (let machine of machinesInShiftClosedKnownLDL) {
		effArrayLDL.push(machine.eff)
		tEffArrayLDL.push(machine.teff)
	}

	let totEffLDL = Math.round(average(effArrayLDL))
	if (isNaN(totEffLDL)) {
		totEffLDL = 0
	}
	let totTEffLDL = Math.round(average(tEffArrayLDL))
	if (isNaN(totTEffLDL)) {
		totTEffLDL = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12LDL = totEffLDL
	let teff12LDL = 0

	if (totEffLDL > totTEffLDL) {
		teff12LDL = totTEffLDL
		eff12LDL = totEffLDL - totTEffLDL
	}

	// compact bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayCP = []
	let tEffArrayCP = []
	for (let machine of machinesInShiftClosedKnownCP) {
		effArrayCP.push(machine.eff)
		tEffArrayCP.push(machine.teff)
	}

	let totEffCP = Math.round(average(effArrayCP))
	if (isNaN(totEffCP)) {
		totEffCP = 0
	}
	let totTEffCP = Math.round(average(tEffArrayCP))
	if (isNaN(totTEffCP)) {
		totTEffCP = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12CP = totEffCP
	let teff12CP = 0

	if (totEffCP > totTEffCP) {
		teff12CP = totTEffCP
		eff12CP = totEffCP - totTEffCP
	}

	// heavy products bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayHP = []
	let tEffArrayHP = []
	for (let machine of machinesInShiftClosedKnownHP) {
		effArrayHP.push(machine.eff)
		tEffArrayHP.push(machine.teff)
	}

	let totEffHP = Math.round(average(effArrayHP))
	if (isNaN(totEffHP)) {
		totEffHP = 0
	}
	let totTEffHP = Math.round(average(tEffArrayHP))
	if (isNaN(totTEffHP)) {
		totTEffHP = 0
	}

	let eff12HP = totEffHP
	let teff12HP = 0

	if (totEffHP > totTEffHP) {
		teff12HP = totTEffHP
		eff12HP = totEffHP - totTEffHP
	}

	// // earth movers bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayEM = []
	let tEffArrayEM = []
	for (let machine of machinesInShiftClosedKnownEM) {
		effArrayEM.push(machine.eff)
		tEffArrayEM.push(machine.teff)
	}

	let totEffEM = Math.round(average(effArrayEM))
	if (isNaN(totEffEM)) {
		totEffEM = 0
	}
	let totTEffEM = Math.round(average(tEffArrayEM))
	if (isNaN(totTEffEM)) {
		totTEffEM = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12EM = totEffEM
	let teff12EM = 0

	if (totEffEM > totTEffEM) {
		teff12EM = totTEffEM
		eff12EM = totEffEM - totTEffEM
	}

	// // Cabs bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayCABS = []
	let tEffArrayCABS = []
	for (let machine of machinesInShiftClosedKnownCABS) {
		effArrayCABS.push(machine.eff)
		tEffArrayCABS.push(machine.teff)
	}

	let totEffCABS = Math.round(average(effArrayCABS))
	if (isNaN(totEffCABS)) {
		totEffCABS = 0
	}
	let totTEffCABS = Math.round(average(tEffArrayCABS))
	if (isNaN(totTEffCABS)) {
		totTEffCABS = 0
	}

	let eff12CABS = totEffCABS
	let teff12CABS = 0

	if (totEffCABS > totTEffCABS) {
		teff12CABS = totTEffCABS
		eff12CABS = totEffCABS - totTEffCABS
	}

	const GraphBHL = await Update.aggregate(graphOptionsBHL)

	const GraphLDL = await Update.aggregate(graphOptionsLDL)

	const GraphCP = await Update.aggregate(graphOptionsCP)

	const GraphHP = await Update.aggregate(graphOptionsHP)

	const GraphEM = await Update.aggregate(graphOptionsEM)

	const GraphCABS = await Update.aggregate(graphOptionsCABS)

	// console.log(GraphCP)

	let programmeEffBHL = Math.round((totTEffBHL / totEffBHL) * 100)
	if (isNaN(programmeEffBHL)) {
		programmeEffBHL = 0
	}
	const notProgrammeEffBHL = 100 - programmeEffBHL

	let programmeEffLDL = Math.round((totTEffLDL / totEffLDL) * 100)
	if (isNaN(programmeEffLDL)) {
		programmeEffLDL = 0
	}
	const notProgrammeEffLDL = 100 - programmeEffLDL

	let programmeEffCP = Math.round((totTEffCP / totEffCP) * 100)
	if (isNaN(programmeEffCP)) {
		programmeEffCP = 0
	}
	const notProgrammeEffCP = 100 - programmeEffCP

	let programmeEffHP = Math.round((totTEffHP / totEffHP) * 100)
	if (isNaN(programmeEffHP)) {
		programmeEffHP = 0
	}
	const notProgrammeEffHP = 100 - programmeEffHP

	let programmeEffEM = Math.round((totTEffEM / totEffEM) * 100)
	if (isNaN(programmeEffEM)) {
		programmeEffEM = 0
	}
	const notProgrammeEffEM = 100 - programmeEffEM

	let programmeEffCABS = Math.round((totTEffCABS / totEffCABS) * 100)
	if (isNaN(programmeEffCABS)) {
		programmeEffCABS = 0
	}
	const notProgrammeEffCABS = 100 - programmeEffCABS

	let averageOptions = [
		{
			$match: {
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsLDL = [
		{
			$match: {
				type: 'Welding Robot',
				shortBu: 'LDL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]
	let averageOptionsBHL = [
		{
			$match: {
				type: 'Welding Robot',
				shortBu: 'BHL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsCP = [
		{
			$match: {
				type: 'Welding Robot',
				shortBu: 'CP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsHP = [
		{
			$match: {
				type: 'Welding Robot',
				shortBu: 'HP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]
	let averageOptionsEM = [
		{
			$match: {
				type: 'Welding Robot',
				shortBu: 'EM',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsCABS = [
		{
			$match: {
				type: 'Welding Robot',
				shortBu: 'CABS',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$averageMTEff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},

		{ $sort: { averageMTEff: 1 } },
		{ $limit: 1 },
	]

	const averageMachine = await Machine.aggregate(averageOptions)
	const averageMachineLDL = await Machine.aggregate(averageOptionsLDL)
	const averageMachineBHL = await Machine.aggregate(averageOptionsBHL)
	const averageMachineCP = await Machine.aggregate(averageOptionsCP)
	const averageMachineHP = await Machine.aggregate(averageOptionsHP)
	const averageMachineEM = await Machine.aggregate(averageOptionsEM)
	const averageMachineCABS = await Machine.aggregate(averageOptionsCABS)

	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)

	if (update === null) {
		update = new Date()
	}

	res.render('machine/effOfProgramme', {
		update,
		averageMachine,
		averageMachineLDL,
		averageMachineBHL,
		averageMachineCP,
		averageMachineHP,
		averageMachineEM,
		averageMachineCABS,
		programmeEffBHL,
		notProgrammeEffBHL,
		programmeEffLDL,
		notProgrammeEffLDL,
		programmeEffCP,
		notProgrammeEffCP,
		programmeEffHP,
		notProgrammeEffHP,
		programmeEffEM,
		notProgrammeEffEM,
		programmeEffCABS,
		notProgrammeEffCABS,
		weldPercent,
		laserPercent,
		plasmaPercent,
		weldPercentT,
		laserPercentT,
		plasmaPercentT,
		//BHL
		teff12BHL,
		eff12BHL,
		totEffBHL,

		bestMachineBHL,
		worstMachineBHL,
		// LDL
		teff12LDL,
		eff12LDL,
		totEffLDL,

		bestMachineLDL,
		worstMachineLDL,
		//CP
		teff12CP,
		eff12CP,
		totEffCP,

		bestMachineCP,
		worstMachineCP,
		//HP
		teff12HP,
		eff12HP,
		totEffHP,

		bestMachineHP,
		worstMachineHP,
		//EM
		teff12EM,
		eff12EM,
		totEffEM,

		bestMachineEM,
		worstMachineEM,
		//CABS
		teff12CABS,
		eff12CABS,
		totEffCABS,

		bestMachineCABS,
		worstMachineCABS,

		GraphBHL,
		GraphLDL,
		GraphCP,
		GraphHP,
		GraphEM,
		GraphCABS,

		selection,
	})
}

module.exports.shiftp = async (req, res) => {
	const { shortBu, id } = req.params
	const machine = await Machine.findById(id)
	if (!machine) {
		req.flash('error', 'Cannot find that machine')
		res.redirect('/equipment-monitoring/operations')
	}
	res.render('machine/shiftp', { machine, shortBu })
}
module.exports.show = async (req, res) => {
	const { shortBu, id } = req.params
	const machine = await Machine.findById(id).populate({
		path: 'shifts',
	})

	if (!machine) {
		req.flash('error', 'Cannot find that machine')
		res.redirect('/equipment-monitoring/operations')
	}

	res.render('machine/show', { machine, shortBu })
}

module.exports.businessUnitHistory = async (req, res) => {
	const { shortBu } = req.params
	const machines = await Machine.find({
		shortBu: shortBu,
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'updates',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 10,
		})

	res.render('machine/businessUnitHistory', { machines, shortBu })
}
module.exports.ukShifts = async (req, res) => {
	let selectionDiv = ''
	let selectionType = ''

	let searchOptions = {}

	if (req.query.type != null && req.query.type != '') {
		searchOptions.type = new RegExp(escapeRegex(req.query.type), 'gi')
		selectionType = req.query.type
	}
	if (req.query.businessUnit != null && req.query.businessUnit != '') {
		searchOptions.businessUnit = new RegExp(escapeRegex(req.query.businessUnit), 'gi')
		selectionDiv = req.query.businessUnit
	}
	const machines = await Machine.find(searchOptions)
		.sort({
			shortBu: '',
		})
		.populate({ path: 'shifts' })

	res.render('machine/ukShifts', { machines, selectionDiv, selectionType })
}
module.exports.ukShiftsDetail = async (req, res) => {
	const { id } = req.params

	const machine = await Machine.findById(id).populate({
		path: 'shifts',
	})
	if (!machine) {
		req.flash('error', 'Cannot find that machine')
		res.redirect('machine/ukShifts')
	}

	res.render('machine/ukShiftsDetail', { machine })
}

module.exports.businessUnit = async (req, res) => {
	const { shortBu } = req.params

	const weldingRobotsInShift = await Machine.find({
		shortBu: shortBu,
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	})
	const laserCuttersInShift = await Machine.find({
		shortBu: shortBu,
		inShift: true,
		signal: true,
		type: 'Laser Cutter',
	})
	const plasmaCuttersInShift = await Machine.find({
		shortBu: shortBu,
		inShift: true,
		signal: true,
		type: 'Plasma Cutter',
	})

	let totWeldPercent = 0
	let totWeldPercentT = 0
	for (let w of weldingRobotsInShift) {
		totWeldPercent += w.eff
		totWeldPercentT += w.teff
	}
	let weldPercent = Math.round(totWeldPercent / weldingRobotsInShift.length)
	let weldPercentT = Math.round(totWeldPercentT / weldingRobotsInShift.length)

	let totLaserPercent = 0
	let totLaserPercentT = 0
	for (let l of laserCuttersInShift) {
		totLaserPercent += l.eff
		totLaserPercentT += l.teff
	}
	let laserPercent = Math.round(totLaserPercent / laserCuttersInShift.length)
	let laserPercentT = Math.round(totLaserPercentT / laserCuttersInShift.length)

	let totPlasmaPercent = 0
	let totPlasmaPercentT = 0
	for (let p of plasmaCuttersInShift) {
		totPlasmaPercent += p.eff
		totPlasmaPercentT += p.teff
	}
	let plasmaPercent = Math.round(totPlasmaPercent / plasmaCuttersInShift.length)
	let plasmaPercentT = Math.round(totPlasmaPercentT / plasmaCuttersInShift.length)

	if (isNaN(weldPercent)) {
		weldPercent = 0
	}
	if (isNaN(laserPercent)) {
		laserPercent = 0
	}
	if (isNaN(plasmaPercent)) {
		plasmaPercent = 0
	}
	if (isNaN(weldPercentT)) {
		weldPercentT = 0
	}
	if (isNaN(laserPercentT)) {
		laserPercentT = 0
	}
	if (isNaN(plasmaPercentT)) {
		plasmaPercentT = 0
	}

	const weldingRobots = await Machine.find({
		shortBu: shortBu,
		type: 'Welding Robot',
	})
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
		})
		.sort({ area: 1 })
	const laserCutters = await Machine.find({
		shortBu: shortBu,
		type: 'Laser Cutter',
	})
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
		})
		.sort({ area: 1 })
	const plasmaCutters = await Machine.find({
		shortBu: shortBu,
		type: 'Plasma Cutter',
	})
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
		})
		.sort({ area: 1 })
	const machines = await Machine.find({ shortBu: shortBu }).sort({ area: 1 })
	const totalKnownBreakdown = await Machine.countDocuments({
		shortBu: shortBu,
		inShift: true,
		state: 'Known breakdown',
	})
	const totalUnKnownBreakdown = await Machine.countDocuments({
		shortBu: shortBu,
		inShift: true,
		state: 'Unknown breakdown',
	})
	const totalParts = await Machine.countDocuments({
		shortBu: shortBu,
		inShift: true,
		state: 'Waiting for parts',
	})
	const totalWire = await Machine.countDocuments({
		shortBu: shortBu,
		inShift: true,
		state: 'Waiting for wire',
	})

	let businessUnit = ''
	if (machines.length > 0) {
		businessUnit = machines[0].businessUnit
	}
	// get the known breakdown times
	const machinesInShiftClosedKnown = await Machine.find({
		shortBu: shortBu,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({
		shortBu: shortBu,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	//sum up all the known bd time
	let totKnownBdTime = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totKnownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totKnownBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totKnownBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the unknown breakdown times
	const machinesInShiftClosedUnknown = await Machine.find({
		shortBu: shortBu,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Unknown breakdown',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({
		shortBu: shortBu,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unknown breakdown',
		},
	})

	//sum up all the unknown bd time
	let totUnknownBdTime = 0

	for (let machine of machinesInShiftClosedUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totUnknownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totUnknownBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totUnknownBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the parts breakdown times
	const machinesInShiftClosedParts = await Machine.find({
		shortBu: shortBu,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for parts',
		},
	})
	const machinesInShiftOpenParts = await Machine.find({
		shortBu: shortBu,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for parts',
		},
	})

	//sum up all the parts bd time
	let totPartsBdTime = 0

	for (let machine of machinesInShiftClosedParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totPartsBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totPartsBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totPartsBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totPartsBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({
		shortBu: shortBu,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for wire',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({
		shortBu: shortBu,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for wire',
		},
	})

	//sum up all the wire bd time
	let totWireBdTime = 0

	for (let machine of machinesInShiftClosedWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totWireBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totWireBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totWireBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = msToTime(totUnknownBdTime)
	let sumOfPartsTime = msToTime(totPartsBdTime)
	let sumOfWireTime = msToTime(totWireBdTime)
	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)

	if (update === null) {
		update = new Date()
	}

	res.render('machine/business-unit', {
		weldingRobots,
		businessUnit,
		laserCutters,
		plasmaCutters,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		sumOfPartsTime,
		shortBu,
		businessUnit,
		totalKnownBreakdown,
		totalUnKnownBreakdown,
		totalParts,
		totalWire,
		weldPercent,
		laserPercent,
		plasmaPercent,
		weldPercentT,
		laserPercentT,
		plasmaPercentT,
		update,
	})
}
module.exports.operations = async (req, res) => {
	const weldingRobotsInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	})
	const laserCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Laser Cutter',
	})
	const plasmaCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Plasma Cutter',
	})

	let totWeldPercent = 0
	let totWeldPercentT = 0
	for (let w of weldingRobotsInShift) {
		totWeldPercent += w.eff
		totWeldPercentT += w.teff
	}
	let weldPercent = Math.round(totWeldPercent / weldingRobotsInShift.length)
	let weldPercentT = Math.round(totWeldPercentT / weldingRobotsInShift.length)

	let totLaserPercent = 0
	let totLaserPercentT = 0
	for (let l of laserCuttersInShift) {
		totLaserPercent += l.eff
		totLaserPercentT += l.teff
	}
	let laserPercent = Math.round(totLaserPercent / laserCuttersInShift.length)
	let laserPercentT = Math.round(totLaserPercentT / laserCuttersInShift.length)

	let totPlasmaPercent = 0
	let totPlasmaPercentT = 0
	for (let p of plasmaCuttersInShift) {
		totPlasmaPercent += p.eff
		totPlasmaPercentT += p.teff
	}
	let plasmaPercent = Math.round(totPlasmaPercent / plasmaCuttersInShift.length)
	let plasmaPercentT = Math.round(totPlasmaPercentT / plasmaCuttersInShift.length)

	if (isNaN(weldPercent)) {
		weldPercent = 0
	}
	if (isNaN(laserPercent)) {
		laserPercent = 0
	}
	if (isNaN(plasmaPercent)) {
		plasmaPercent = 0
	}
	if (isNaN(weldPercentT)) {
		weldPercentT = 0
	}
	if (isNaN(laserPercentT)) {
		laserPercentT = 0
	}
	if (isNaN(plasmaPercentT)) {
		plasmaPercentT = 0
	}

	const totalKnownBreakdown = await Machine.countDocuments({
		inShift: true,
		state: 'Known breakdown',
	})
	const totalUnKnownBreakdown = await Machine.countDocuments({
		inShift: true,
		state: 'Unknown breakdown',
	})
	const totalParts = await Machine.countDocuments({
		inShift: true,
		state: 'Waiting for parts',
	})
	const totalWire = await Machine.countDocuments({
		inShift: true,
		state: 'Waiting for wire',
	})
	const machines = await Machine.find({})
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
		})
		.sort({ businessUnit: 1, abbreviatedName: 1 })

	// get the known breakdown times
	const machinesInShiftClosedKnown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	const todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	//sum up all the known bd time
	let totKnownBdTime = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totKnownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totKnownBdTime += stoppage.endTime - todaysShifts
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totKnownBdTime += Date.now() - todaysShifts
			}
		})
	}

	// get the unknown breakdown times
	const machinesInShiftClosedUnknown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Unknown breakdown',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unknown breakdown',
		},
	})

	//sum up all the unknown bd time
	let totUnknownBdTime = 0

	for (let machine of machinesInShiftClosedUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totUnknownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totUnknownBdTime += stoppage.endTime - todaysShifts
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totUnknownBdTime += Date.now() - todaysShifts
			}
		})
	}

	// get the parts breakdown times
	const machinesInShiftClosedParts = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for parts',
		},
	})
	const machinesInShiftOpenParts = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for parts',
		},
	})

	//sum up all the parts bd time
	let totPartsBdTime = 0

	for (let machine of machinesInShiftClosedParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totPartsBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totPartsBdTime += stoppage.endTime - todaysShifts
			}
		})
	}

	for (let machine of machinesInShiftOpenParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totPartsBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totPartsBdTime += Date.now() - todaysShifts
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for wire',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for wire',
		},
	})

	//sum up all the wire bd time
	let totWireBdTime = 0

	for (let machine of machinesInShiftClosedWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totWireBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totWireBdTime += stoppage.endTime - todaysShifts
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totWireBdTime += Date.now() - todaysShifts
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = await msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = await msToTime(totUnknownBdTime)
	let sumOfPartsTime = await msToTime(totPartsBdTime)
	let sumOfWireTime = await msToTime(totWireBdTime)
	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)
	if (update === null) {
		update = new Date()
	}

	res.render('machine/operations-view', {
		machines,
		totalKnownBreakdown,
		totalUnKnownBreakdown,
		totalParts,
		totalWire,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		sumOfPartsTime,
		weldPercent,
		laserPercent,
		plasmaPercent,
		weldPercentT,
		laserPercentT,
		plasmaPercentT,
		update,
	})
}

module.exports.machine = async (req, res) => {
	const { id } = req.params

	const types = await BType.find({}).sort({ name: '' })
	const machine = await Machine.findById(id).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	if (!machine) {
		req.flash('error', 'Cannot find that machine')
		res.redirect('/machine/home')
	}

	if (machine.inShift) {
		vin = machine.vin
	} else {
		vin = 0
	}
	const machineType = machine.type
	const concerns = await BConcern.find({ machineType: machineType }).sort({
		name: '',
	})
	let theStart = machine.shiftStart

	const stoppages = await Stoppage.find({
		vin: vin,
		$or: [
			{
				createdAt: { $gte: theStart },
			},
			{
				createdAt: { $lte: theStart },
				open: true,
			},
			{
				updatedAt: { $gte: theStart },
				open: false,
			},
		],
	}).sort({ createdAt: -1 })

	// get the known breakdown times
	const machinesInShiftClosedKnown = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	//sum up all the known bd time
	let totKnownBdTime = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totKnownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totKnownBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totKnownBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the unknown breakdown times
	const machinesInShiftClosedUnknown = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Unknown breakdown',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unknown breakdown',
		},
	})

	//sum up all the unknown bd time
	let totUnknownBdTime = 0

	for (let machine of machinesInShiftClosedUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totUnknownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totUnknownBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totUnknownBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the parts breakdown times
	const machinesInShiftClosedParts = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for parts',
		},
	})
	const machinesInShiftOpenParts = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for parts',
		},
	})

	//sum up all the parts bd time
	let totPartsBdTime = 0

	for (let machine of machinesInShiftClosedParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totPartsBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totPartsBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totPartsBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totPartsBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for wire',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for wire',
		},
	})

	//sum up all the wire bd time
	let totWireBdTime = 0

	for (let machine of machinesInShiftClosedWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totWireBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totWireBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totWireBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = msToTime(totUnknownBdTime)
	let sumOfPartsTime = msToTime(totPartsBdTime)
	let sumOfWireTime = msToTime(totWireBdTime)

	let sumOfStoppages = msToTime(totKnownBdTime + totUnknownBdTime + totPartsBdTime + totWireBdTime)
	theLot = Date.now() - totKnownBdTime + totUnknownBdTime + totPartsBdTime + totWireBdTime
	let totalOpenTime = msToTime(Date.now() - (totKnownBdTime + totUnknownBdTime + totPartsBdTime + totWireBdTime))

	let start = new Date(machine.shiftStart)

	let shiftHours = [] // Results will go here
	let shiftHoursMinus = [] // Results will go here
	let shiftStartHour = new Date(machine.shiftStart).getHours() // Get current hour of the day
	let shiftEndHour = new Date(machine.shiftEnd).getHours() // Get current hour of the day

	if (shiftStartHour < shiftEndHour) {
		// Loop from start to end of shift
		for (let i = shiftStartHour; i <= shiftEndHour; i++) {
			shiftHours.push(i + ':00') // Put loop counter into array with ":00" next to it
		}
	}
	if (shiftStartHour > shiftEndHour) {
		// Loop from current hour number to 23
		for (let i = shiftStartHour; i < 24; i++) {
			shiftHours.push(i + ':00') // Put loop counter into array with ":00" next to it
		}
		// Loop midnight end of shift
		for (let i = 0; i <= shiftEndHour; i++) {
			shiftHours.push(i + ':00') // Put loop counter into array with ":00" next to it
		}
	}

	const shiftHoursArray = await Machine.find(
		{
			vin: vin,
		},
		{ _id: 0, shiftHours: 1 }
	)
	//get the known stoppages today
	const knownStoppages = await Stoppage.find({
		vin: vin,
		createdAt: { $gte: start },
		type: 'Known breakdown',
	})

	//get the unknown stoppages today
	const unKnownStoppages = await Stoppage.find({
		vin: vin,
		createdAt: { $gte: start },
		type: 'Unknown breakdown',
	})
	//get the parts stoppages today
	const partStoppages = await Stoppage.find({
		vin: vin,
		createdAt: { $gte: start },
		type: 'Waiting for parts',
	})
	//get the wire stoppages today
	const wireStoppages = await Stoppage.find({
		vin: vin,
		createdAt: { $gte: start },
		type: 'Waiting for wire',
	})

	let shiftArray = []
	let shiftKnownArray = []
	let shiftUnknownArray = []
	let shiftPartsArray = []
	let shiftWireArray = []

	if (shiftHoursArray.length > 0) {
		shiftArray = shiftHoursArray[0].shiftHours
	}

	for (let hour of shiftArray) {
		let v = 0
		for (let s of knownStoppages) {
			if (s.hour === hour) {
				v++
			}
		}
		shiftKnownArray.push(v)
	}
	for (let hour of shiftArray) {
		let v = 0
		for (let s of unKnownStoppages) {
			if (s.hour === hour) {
				v++
			}
		}
		shiftUnknownArray.push(v)
	}

	for (let hour of shiftArray) {
		let v = 0
		for (let s of wireStoppages) {
			if (s.hour === hour) {
				v++
			}
		}
		shiftWireArray.push(v)
	}
	for (let hour of shiftArray) {
		let v = 0

		for (let s of partStoppages) {
			if (s.hour === hour) {
				v++
			}
		}
		shiftPartsArray.push(v)
	}
	for (let hour of shiftArray) {
		let v = 0

		for (let s of wireStoppages) {
			if (s.hour === hour) {
				v++
			}
		}
		shiftWireArray.push(v)
	}

	// console.log(shiftKnownArray)
	// console.log(shiftUnknownArray)

	const myDate = new Date(machine.shiftStart)
	myDate.setHours(myDate.getHours() + 1)

	const myDate2 = new Date()
	myDate2.setHours(myDate2.getHours() + 1)

	let d = new Date(myDate),
		e = new Date(myDate2)
	let msSinceEight = e - d

	let totKnownBdTimeSeconds = totKnownBdTime / 1000
	let totUnKnownBdTimeSeconds = totUnknownBdTime / 1000
	let totWireTimeSeconds = totWireBdTime / 1000
	let totPartsTimeSeconds = totPartsBdTime / 1000

	let secondsSinceEight = msSinceEight / 1000

	if (totKnownBdTimeSeconds > 0) {
		knownBdPercent = Math.round((totKnownBdTimeSeconds / secondsSinceEight) * 100)
	} else {
		knownBdPercent = 0
	}

	if (knownBdPercent > 100) {
		knownBdPercent = 100
	}

	if (totUnKnownBdTimeSeconds > 0) {
		unKnownBdPercent = Math.round((totUnKnownBdTimeSeconds / secondsSinceEight) * 100)
	} else {
		unKnownBdPercent = 0
	}

	if (unKnownBdPercent > 100) {
		unKnownBdPercent = 100
	}

	if (totWireTimeSeconds > 0) {
		wireTimePercent = Math.round((totWireTimeSeconds / secondsSinceEight) * 100)
	} else {
		wireTimePercent = 0
	}

	if (wireTimePercent > 100) {
		wireTimePercent = 100
	}

	if (totPartsTimeSeconds > 0) {
		partsTimePercent = Math.round((totPartsTimeSeconds / secondsSinceEight) * 100)
	} else {
		partsTimePercent = 0
	}

	if (partsTimePercent > 100) {
		partsTimePercent = 100
	}

	let sumOfRunningTime = new Date(machine.runningTime * 1000).toISOString().substr(11, 8)

	// console.log(sumOfRunningTime)
	let eff12 = machine.eff
	let teff12 = 0

	if (machine.eff > machine.teff) {
		teff12 = machine.teff
		eff12 = eff12 - teff12
	}

	let remaining = 0
	let totalAllTime = eff12 + teff12 + knownBdPercent + unKnownBdPercent + partsTimePercent + wireTimePercent

	if (totalAllTime < 100) {
		remaining = 100 - totalAllTime
	}

	let margin = 0

	if (teff12 > 0 && eff12 < 5) {
		margin = -35
	}
	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)
	if (update === null) {
		update = new Date()
	}

	// console.log(shiftStartHour) // show results
	// console.log(shiftEndHour) // show results
	// console.log(shiftHours) // show results

	res.render('machine/machine', {
		sumOfRunningTime,
		machine,
		stoppages,
		concerns,
		types,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		sumOfPartsTime,
		sumOfStoppages,
		knownBdPercent,
		unKnownBdPercent,
		wireTimePercent,
		partsTimePercent,
		remaining,
		totalOpenTime,
		eff12,
		teff12,
		shiftHours,
		shiftKnownArray,
		shiftUnknownArray,
		shiftPartsArray,
		shiftWireArray,
		margin,
		update,
	})
}

module.exports.shiftAdmin = async (req, res) => {
	const { shortBu } = req.params
	let start = new Date()
	start.setHours(01, 0, 0, 0)
	const machines = await Machine.find({ shortBu: shortBu })
		.sort({ area: 1 })
		.populate({
			path: 'shifts',
			match: {
				inShift: true,
			},
		})

	let businessUnit = machines[0].businessUnit

	res.render('machine/admin', {
		machines,
		shortBu,
		businessUnit,
	})
}

module.exports.vsHours = async (req, res) => {
	res.render('machine/vsHours', {})
}

//touch time

module.exports.touch = async (req, res) => {
	const weldingRobotsInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	})
	const laserCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Laser Cutter',
	})
	const plasmaCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Plasma Cutter',
	})

	let selection = ''
	const todayDB = new Date()
	todayDB.setHours(0, 0, 0, 0)

	const sixDaysAgoDB = new Date(todayDB)

	sixDaysAgoDB.setDate(sixDaysAgoDB.getDate() - 7)

	let graphOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
				updatedAt: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		// {
		// 	$addFields : { cats: '$createdAt' },
		// },
		{ $sort: { _id: 1 } },
	]

	bestOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]
	bestOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]

	bestOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: -1 } },
		{ $limit: 1 },
	]

	worstOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				abbreviatedName: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$abbreviatedName',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]

	let searchOptionsBHL = { shortBu: 'BHL', inShift: true, signal: true }
	let searchOptionsLDL = { shortBu: 'LDL', inShift: true, signal: true }
	let searchOptionsCP = { shortBu: 'CP', inShift: true, signal: true }
	let searchOptionsHP = { shortBu: 'HP', inShift: true, signal: true }
	let searchOptionsEM = { shortBu: 'EM', inShift: true, signal: true }
	let searchOptionsCABS = { shortBu: 'CABS', inShift: true, signal: true }

	const bestMachineBHL = await Machine.aggregate(bestOptionsBHL)
	const worstMachineBHL = await Machine.aggregate(worstOptionsBHL)

	const bestMachineLDL = await Machine.aggregate(bestOptionsLDL)
	const worstMachineLDL = await Machine.aggregate(worstOptionsLDL)

	const bestMachineCP = await Machine.aggregate(bestOptionsCP)
	const worstMachineCP = await Machine.aggregate(worstOptionsCP)

	const bestMachineHP = await Machine.aggregate(bestOptionsHP)
	const worstMachineHP = await Machine.aggregate(worstOptionsHP)

	// console.log(bestMachineHP)

	const bestMachineEM = await Machine.aggregate(bestOptionsEM)
	const worstMachineEM = await Machine.aggregate(worstOptionsEM)

	const bestMachineCABS = await Machine.aggregate(bestOptionsCABS)
	const worstMachineCABS = await Machine.aggregate(worstOptionsCABS)

	let totWeldPercent = 0
	let totWeldPercentT = 0
	for (let w of weldingRobotsInShift) {
		totWeldPercent += w.eff
		totWeldPercentT += w.teff
	}
	let weldPercent = Math.round(totWeldPercent / weldingRobotsInShift.length)
	let weldPercentT = Math.round(totWeldPercentT / weldingRobotsInShift.length)

	let totLaserPercent = 0
	let totLaserPercentT = 0
	for (let l of laserCuttersInShift) {
		totLaserPercent += l.eff
		totLaserPercentT += l.teff
	}
	let laserPercent = Math.round(totLaserPercent / laserCuttersInShift.length)
	let laserPercentT = Math.round(totLaserPercentT / laserCuttersInShift.length)

	let totPlasmaPercent = 0
	let totPlasmaPercentT = 0
	for (let p of plasmaCuttersInShift) {
		totPlasmaPercent += p.eff
		totPlasmaPercentT += p.teff
	}
	let plasmaPercent = Math.round(totPlasmaPercent / plasmaCuttersInShift.length)
	let plasmaPercentT = Math.round(totPlasmaPercentT / plasmaCuttersInShift.length)

	if (isNaN(weldPercent)) {
		weldPercent = 0
	}
	if (isNaN(laserPercent)) {
		laserPercent = 0
	}
	if (isNaN(plasmaPercent)) {
		plasmaPercent = 0
	}
	if (isNaN(weldPercentT)) {
		weldPercentT = 0
	}
	if (isNaN(laserPercentT)) {
		laserPercentT = 0
	}
	if (isNaN(plasmaPercentT)) {
		plasmaPercentT = 0
	}

	const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length

	const arrSum = (arr) => arr.reduce((a, b) => a + b, 0)

	// get the known breakdown times BHL
	const machinesInShiftClosedKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArray = []
	let tEffArray = []
	for (let machine of machinesInShiftClosedKnownBHL) {
		effArray.push(machine.eff)
		tEffArray.push(machine.teff)
	}

	let totEffBHL = Math.round(average(effArray))
	if (isNaN(totEffBHL)) {
		totEffBHL = 0
	}
	let totTEffBHL = Math.round(average(tEffArray))
	if (isNaN(totTEffBHL)) {
		totTEffBHL = 0
	}

	// console.log(sumOfRunningTime)
	let eff12BHL = totEffBHL
	let teff12BHL = 0

	if (totEffBHL > totTEffBHL) {
		teff12BHL = totTEffBHL
		eff12BHL = totEffBHL - totTEffBHL
	}

	// // Loadall bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayLDL = []
	let tEffArrayLDL = []
	for (let machine of machinesInShiftClosedKnownLDL) {
		effArrayLDL.push(machine.eff)
		tEffArrayLDL.push(machine.teff)
	}

	let totEffLDL = Math.round(average(effArrayLDL))
	if (isNaN(totEffLDL)) {
		totEffLDL = 0
	}
	let totTEffLDL = Math.round(average(tEffArrayLDL))
	if (isNaN(totTEffLDL)) {
		totTEffLDL = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12LDL = totEffLDL
	let teff12LDL = 0

	if (totEffLDL > totTEffLDL) {
		teff12LDL = totTEffLDL
		eff12LDL = totEffLDL - totTEffLDL
	}

	// compact bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayCP = []
	let tEffArrayCP = []
	for (let machine of machinesInShiftClosedKnownCP) {
		effArrayCP.push(machine.eff)
		tEffArrayCP.push(machine.teff)
	}

	let totEffCP = Math.round(average(effArrayCP))
	if (isNaN(totEffCP)) {
		totEffCP = 0
	}
	let totTEffCP = Math.round(average(tEffArrayCP))
	if (isNaN(totTEffCP)) {
		totTEffCP = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12CP = totEffCP
	let teff12CP = 0

	if (totEffCP > totTEffCP) {
		teff12CP = totTEffCP
		eff12CP = totEffCP - totTEffCP
	}

	// heavy products bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayHP = []
	let tEffArrayHP = []
	for (let machine of machinesInShiftClosedKnownHP) {
		effArrayHP.push(machine.eff)
		tEffArrayHP.push(machine.teff)
	}

	let totEffHP = Math.round(average(effArrayHP))
	if (isNaN(totEffHP)) {
		totEffHP = 0
	}
	let totTEffHP = Math.round(average(tEffArrayHP))
	if (isNaN(totTEffHP)) {
		totTEffHP = 0
	}

	let eff12HP = totEffHP
	let teff12HP = 0

	if (totEffHP > totTEffHP) {
		teff12HP = totTEffHP
		eff12HP = totEffHP - totTEffHP
	}

	// // earth movers bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayEM = []
	let tEffArrayEM = []
	for (let machine of machinesInShiftClosedKnownEM) {
		effArrayEM.push(machine.eff)
		tEffArrayEM.push(machine.teff)
	}

	let totEffEM = Math.round(average(effArrayEM))
	if (isNaN(totEffEM)) {
		totEffEM = 0
	}
	let totTEffEM = Math.round(average(tEffArrayEM))
	if (isNaN(totTEffEM)) {
		totTEffEM = 0
	}

	// console.log(totEffBHL)
	// console.log(totTEffBHL)

	// console.log(sumOfRunningTime)
	let eff12EM = totEffEM
	let teff12EM = 0

	if (totEffEM > totTEffEM) {
		teff12EM = totTEffEM
		eff12EM = totEffEM - totTEffEM
	}

	// // Cabs bar chart

	// get the known breakdown times LDL
	const machinesInShiftClosedKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	// sort out backhoe running & t time
	let effArrayCABS = []
	let tEffArrayCABS = []
	for (let machine of machinesInShiftClosedKnownCABS) {
		effArrayCABS.push(machine.eff)
		tEffArrayCABS.push(machine.teff)
	}

	let totEffCABS = Math.round(average(effArrayCABS))
	if (isNaN(totEffCABS)) {
		totEffCABS = 0
	}
	let totTEffCABS = Math.round(average(tEffArrayCABS))
	if (isNaN(totTEffCABS)) {
		totTEffCABS = 0
	}

	let eff12CABS = totEffCABS
	let teff12CABS = 0

	if (totEffCABS > totTEffCABS) {
		teff12CABS = totTEffCABS
		eff12CABS = totEffCABS - totTEffCABS
	}

	const GraphBHL = await Update.aggregate(graphOptionsBHL)

	const GraphLDL = await Update.aggregate(graphOptionsLDL)

	const GraphCP = await Update.aggregate(graphOptionsCP)

	const GraphHP = await Update.aggregate(graphOptionsHP)

	const GraphEM = await Update.aggregate(graphOptionsEM)

	const GraphCABS = await Update.aggregate(graphOptionsCABS)

	// console.log(GraphCP)

	let programmeEffBHL = Math.round((totTEffBHL / totEffBHL) * 100)
	if (isNaN(programmeEffBHL)) {
		programmeEffBHL = 0
	}
	const notProgrammeEffBHL = 100 - programmeEffBHL

	let programmeEffLDL = Math.round((totTEffLDL / totEffLDL) * 100)
	if (isNaN(programmeEffLDL)) {
		programmeEffLDL = 0
	}
	const notProgrammeEffLDL = 100 - programmeEffLDL

	let programmeEffCP = Math.round((totTEffCP / totEffCP) * 100)
	if (isNaN(programmeEffCP)) {
		programmeEffCP = 0
	}
	const notProgrammeEffCP = 100 - programmeEffCP

	let programmeEffHP = Math.round((totTEffHP / totEffHP) * 100)
	if (isNaN(programmeEffHP)) {
		programmeEffHP = 0
	}
	const notProgrammeEffHP = 100 - programmeEffHP

	let programmeEffEM = Math.round((totTEffEM / totEffEM) * 100)
	if (isNaN(programmeEffEM)) {
		programmeEffEM = 0
	}
	const notProgrammeEffEM = 100 - programmeEffEM

	let programmeEffCABS = Math.round((totTEffCABS / totEffCABS) * 100)
	if (isNaN(programmeEffCABS)) {
		programmeEffCABS = 0
	}
	const notProgrammeEffCABS = 100 - programmeEffCABS

	let averageOptions = [
		{
			$match: {
				type: 'Welding Robot',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsPlasma = [
		{
			$match: {
				type: 'Plasma Cutter',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsLaser = [
		{
			$match: {
				type: 'Laser Cutter',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				type: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$type',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { teff: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]
	let averageOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]
	let averageOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]

	let averageOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				inShift: true,
				signal: true,
				eff: { $gt: 0 },
			},
		},
		{
			$project: {
				shortBu: 1,
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: '$shortBu',
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{
			$addFields: {
				remaining: {
					$subtract: [100, '$averageTEff'],
				},
			},
		},
		{
			$addFields: {
				remainingR: {
					$subtract: [100, '$averageEff'],
				},
			},
		},

		{ $sort: { _id: 1 } },
		{ $limit: 1 },
	]

	const averageMachine = await Machine.aggregate(averageOptions)
	const averageMachinePlasma = await Machine.aggregate(averageOptionsPlasma)
	const averageMachineLaser = await Machine.aggregate(averageOptionsLaser)
	const averageMachineLDL = await Machine.aggregate(averageOptionsLDL)
	const averageMachineBHL = await Machine.aggregate(averageOptionsBHL)
	const averageMachineCP = await Machine.aggregate(averageOptionsCP)
	const averageMachineHP = await Machine.aggregate(averageOptionsHP)
	const averageMachineEM = await Machine.aggregate(averageOptionsEM)
	const averageMachineCABS = await Machine.aggregate(averageOptionsCABS)

	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)

	if (update === null) {
		update = new Date()
	}

	// console.log(averageMachineLDL)

	res.render('machine/touch', {
		update,
		averageMachine,
		averageMachinePlasma,
		averageMachineLaser,
		averageMachineLDL,
		averageMachineBHL,
		averageMachineCP,
		averageMachineHP,
		averageMachineEM,
		averageMachineCABS,
		programmeEffBHL,
		notProgrammeEffBHL,
		programmeEffLDL,
		notProgrammeEffLDL,
		programmeEffCP,
		notProgrammeEffCP,
		programmeEffHP,
		notProgrammeEffHP,
		programmeEffEM,
		notProgrammeEffEM,
		programmeEffCABS,
		notProgrammeEffCABS,
		weldPercent,
		laserPercent,
		plasmaPercent,
		weldPercentT,
		laserPercentT,
		plasmaPercentT,
		//BHL
		teff12BHL,
		eff12BHL,
		totEffBHL,

		bestMachineBHL,
		worstMachineBHL,
		// LDL
		teff12LDL,
		eff12LDL,
		totEffLDL,

		bestMachineLDL,
		worstMachineLDL,
		//CP
		teff12CP,
		eff12CP,
		totEffCP,

		// wireLabelCP,
		bestMachineCP,
		worstMachineCP,
		//HP
		teff12HP,
		eff12HP,
		totEffHP,

		bestMachineHP,
		worstMachineHP,
		//EM
		teff12EM,
		eff12EM,
		totEffEM,

		bestMachineEM,
		worstMachineEM,
		//CABS
		teff12CABS,
		eff12CABS,
		totEffCABS,

		bestMachineCABS,
		worstMachineCABS,

		GraphBHL,
		GraphLDL,
		GraphCP,
		GraphHP,
		GraphEM,
		GraphCABS,

		selection,
	})
}

// down-time

module.exports.downTime = async (req, res) => {
	const weldingRobotsInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Welding Robot',
	})
	const laserCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Laser Cutter',
	})
	const plasmaCuttersInShift = await Machine.find({
		inShift: true,
		signal: true,
		type: 'Plasma Cutter',
	})

	let selection = ''
	const todayDB = new Date()
	todayDB.setHours(0, 0, 0, 0)

	const sixDaysAgoDB = new Date(todayDB)

	sixDaysAgoDB.setDate(sixDaysAgoDB.getDate() - 7)

	let graphOptionsBHL = [
		{
			$match: {
				shortBu: 'BHL',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsLDL = [
		{
			$match: {
				shortBu: 'LDL',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsCP = [
		{
			$match: {
				shortBu: 'CP',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsHP = [
		{
			$match: {
				shortBu: 'HP',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsEM = [
		{
			$match: {
				shortBu: 'EM',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		{ $sort: { _id: 1 } },
	]

	let graphOptionsCABS = [
		{
			$match: {
				shortBu: 'CABS',
				eff: { $gt: 0 },
				updatedAt: { $gte: sixDaysAgoDB, $lt: todayDB },
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$updatedAt' },
				month: { $month: '$updatedAt' },
				eff: 1,
				teff: 1,
				updatedAt: 1,
			},
		},
		{
			$group: {
				_id: { day: '$day', month: '$month' },
				eff: { $avg: '$eff' },
				teff: { $avg: '$teff' },
			},
		},
		{
			$addFields: {
				averageEff: {
					$round: ['$eff', 0],
				},
			},
		},
		{
			$addFields: {
				averageMTEff: {
					$multiply: [
						{
							$divide: ['$teff', '$eff'],
						},
						100,
					],
				},
			},
		},
		{
			$addFields: {
				averageTEff: {
					$round: ['$teff', 0],
				},
			},
		},
		// {
		// 	$addFields : { cats: '$createdAt' },
		// },
		{ $sort: { _id: 1 } },
	]

	const GraphBHL = await Update.aggregate(graphOptionsBHL)

	const GraphLDL = await Update.aggregate(graphOptionsLDL)

	const GraphCP = await Update.aggregate(graphOptionsCP)

	const GraphHP = await Update.aggregate(graphOptionsHP)

	const GraphEM = await Update.aggregate(graphOptionsEM)

	const GraphCABS = await Update.aggregate(graphOptionsCABS)

	// console.log(GraphCP)

	// new bits

	// get the known breakdown times
	const machinesInShiftClosedKnown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	const todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	let numOfKnown = 0
	let numOfUnKnown = 0
	let numOfParts = 0
	let numOfConsumables = 0

	// bhl breakdowns
	let numOfKnownBHL = 0
	let numOfUnKnownBHL = 0
	let numOfPartsBHL = 0
	let numOfConsumablesBHL = 0

	// cabs breakdowns
	let numOfKnownCabs = 0
	let numOfUnKnownCabs = 0
	let numOfPartsCabs = 0
	let numOfConsumablesCabs = 0

	// cp breakdowns
	let numOfKnownCP = 0
	let numOfUnKnownCP = 0
	let numOfPartsCP = 0
	let numOfConsumablesCP = 0

	// em breakdowns
	let numOfKnownEM = 0
	let numOfUnKnownEM = 0
	let numOfPartsEM = 0
	let numOfConsumablesEM = 0

	// hp breakdowns
	let numOfKnownHP = 0
	let numOfUnKnownHP = 0
	let numOfPartsHP = 0
	let numOfConsumablesHP = 0

	// ldl breakdowns
	let numOfKnownLDL = 0
	let numOfUnKnownLDL = 0
	let numOfPartsLDL = 0
	let numOfConsumablesLDL = 0

	//sum up all the known bd time
	let totKnownBdTime = 0

	let totBdTimeBHL = 0
	let totBdTimeCabs = 0
	let totBdTimeCP = 0
	let totBdTimeEM = 0
	let totBdTimeHP = 0
	let totBdTimeLDL = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totKnownBdTime += stoppage.totalTime
				numOfKnown++
				if (machine.shortBu === 'BHL') {
					numOfKnownBHL++
					totBdTimeBHL += stoppage.totalTime
				}
				if (machine.shortBu === 'CABS') {
					numOfKnownCabs++
					totBdTimeCabs += stoppage.totalTime
				}
				if (machine.shortBu === 'CP') {
					numOfKnownCP++
					totBdTimeCP += stoppage.totalTime
				}
				if (machine.shortBu === 'EM') {
					numOfKnownEM++
					totBdTimeEM += stoppage.totalTime
				}
				if (machine.shortBu === 'HP') {
					numOfKnownHP++
					totBdTimeHP += stoppage.totalTime
				}
				if (machine.shortBu === 'LDL') {
					numOfKnownLDL++
					totBdTimeLDL += stoppage.totalTime
				}
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totKnownBdTime += stoppage.endTime - todaysShifts
				numOfKnown++
				if (machine.shortBu === 'BHL') {
					numOfKnownBHL++
					totBdTimeBHL += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfKnownCabs++
					totBdTimeCabs += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfKnownCP++
					totBdTimeCP += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfKnownEM++
					totBdTimeEM += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfKnownHP++
					totBdTimeHP += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfKnownLDL++
					totBdTimeLDL += stoppage.endTime - todaysShifts
				}
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
				numOfKnown++
				if (machine.shortBu === 'BHL') {
					numOfKnownBHL++
					totBdTimeBHL += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'CABS') {
					numOfKnownCabs++
					totBdTimeCabs += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'CP') {
					numOfKnownCP++
					totBdTimeCP += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'EM') {
					numOfKnownEM++
					totBdTimeEM += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'HP') {
					numOfKnownHP++
					totBdTimeHP += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'LDL') {
					numOfKnownLDL++
					totBdTimeLDL += Date.now() - new Date(stoppage.createdAt)
				}
			} else {
				totKnownBdTime += Date.now() - todaysShifts
				numOfKnown++
				if (machine.shortBu === 'BHL') {
					numOfKnownBHL++
					totBdTimeBHL += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfKnownCabs++
					totBdTimeCabs += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfKnownCP++
					totBdTimeCP += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfKnownEM++
					totBdTimeEM += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfKnownHP++
					totBdTimeHP += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfKnownLDL++
					totBdTimeLDL += Date.now() - todaysShifts
				}
			}
		})
	}

	// get the unknown breakdown times
	const machinesInShiftClosedUnknown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Unknown breakdown',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unknown breakdown',
		},
	})

	//sum up all the unknown bd time
	let totUnknownBdTime = 0

	for (let machine of machinesInShiftClosedUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totUnknownBdTime += stoppage.totalTime
				numOfUnKnown++
				if (machine.shortBu === 'BHL') {
					numOfUnKnownBHL++
					totBdTimeBHL += stoppage.totalTime
				}
				if (machine.shortBu === 'CABS') {
					numOfUnKnownCabs++
					totBdTimeCabs += stoppage.totalTime
				}
				if (machine.shortBu === 'CP') {
					numOfUnKnownCP++
					totBdTimeCP += stoppage.totalTime
				}
				if (machine.shortBu === 'EM') {
					numOfUnKnownEM++
					totBdTimeEM += stoppage.totalTime
				}
				if (machine.shortBu === 'HP') {
					numOfUnKnownHP++
					totBdTimeHP += stoppage.totalTime
				}
				if (machine.shortBu === 'LDL') {
					numOfUnKnownLDL++
					totBdTimeLDL += stoppage.totalTime
				}
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totUnknownBdTime += stoppage.endTime - todaysShifts
				numOfUnKnown++
				if (machine.shortBu === 'BHL') {
					numOfUnKnownBHL++
					totBdTimeBHL += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfUnKnownCabs++
					totBdTimeCabs += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfUnKnownCP++
					totBdTimeCP += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfUnKnownEM++
					totBdTimeEM += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfUnKnownHP++
					totBdTimeHP += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfUnKnownLDL++
					totBdTimeLDL += stoppage.endTime - todaysShifts
				}
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
				numOfUnKnown++
				if (machine.shortBu === 'BHL') {
					numOfUnKnownBHL++
					totBdTimeBHL += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'CABS') {
					numOfUnKnownCabs++
					totBdTimeCabs += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'CP') {
					numOfUnKnownCP++
					totBdTimeCP += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'EM') {
					numOfUnKnownEM++
					totBdTimeEM += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'HP') {
					numOfUnKnownHP++
					totBdTimeHP += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'LDL') {
					numOfUnKnownLDL++
					totBdTimeLDL += Date.now() - new Date(stoppage.createdAt)
				}
			} else {
				totUnknownBdTime += Date.now() - todaysShifts
				numOfUnKnown++
				if (machine.shortBu === 'BHL') {
					numOfUnKnownBHL++
					totBdTimeBHL += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfUnKnownCabs++
					totBdTimeCabs += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfUnKnownCP++
					totBdTimeCP += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfUnKnownEM++
					totBdTimeEM += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfUnKnownHP++
					totBdTimeHP += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfUnKnownLDL++
					totBdTimeLDL += Date.now() - todaysShifts
				}
			}
		})
	}

	// get the parts breakdown times
	const machinesInShiftClosedParts = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for parts',
		},
	})
	const machinesInShiftOpenParts = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for parts',
		},
	})

	//sum up all the parts bd time
	let totPartsBdTime = 0

	for (let machine of machinesInShiftClosedParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totPartsBdTime += stoppage.totalTime
				numOfParts++
				if (machine.shortBu === 'BHL') {
					numOfPartsBHL++
					totBdTimeBHL += stoppage.totalTime
				}
				if (machine.shortBu === 'CABS') {
					numOfPartsCabs++
					totBdTimeCabs += stoppage.totalTime
				}
				if (machine.shortBu === 'CP') {
					numOfPartsCP++
					totBdTimeCP += stoppage.totalTime
				}
				if (machine.shortBu === 'EM') {
					numOfPartsEM++
					totBdTimeEM += stoppage.totalTime
				}
				if (machine.shortBu === 'HP') {
					numOfPartsHP++
					totBdTimeHP += stoppage.totalTime
				}
				if (machine.shortBu === 'LDL') {
					numOfPartsLDL++
					totBdTimeLDL += stoppage.totalTime
				}
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totPartsBdTime += stoppage.endTime - todaysShifts
				numOfParts++
				if (machine.shortBu === 'BHL') {
					numOfPartsBHL++
					totBdTimeBHL += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfPartsCabs++
					totBdTimeCabs += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfPartsCP++
					totBdTimeCP += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfPartsEM++
					totBdTimeEM += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfPartsHP++
					totBdTimeHP += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfPartsLDL++
					totBdTimeLDL += stoppage.endTime - todaysShifts
				}
			}
		})
	}

	for (let machine of machinesInShiftOpenParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totPartsBdTime += Date.now() - new Date(stoppage.createdAt)
				numOfParts++
				if (machine.shortBu === 'BHL') {
					numOfPartsBHL++
					totBdTimeBHL += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'CABS') {
					numOfPartsCabs++
					totBdTimeCabs += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'CP') {
					numOfPartsCP++
					totBdTimeCP += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'EM') {
					numOfPartsEM++
					totBdTimeEM += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'HP') {
					numOfPartsHP++
					totBdTimeHP += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'LDL') {
					numOfPartsLDL++
					totBdTimeLDL += Date.now() - new Date(stoppage.createdAt)
				}
			} else {
				totPartsBdTime += Date.now() - todaysShifts
				numOfParts++
				if (machine.shortBu === 'BHL') {
					numOfPartsBHL++
					totBdTimeBHL += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfPartsCabs++
					totBdTimeCabs += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfPartsCP++
					totBdTimeCP += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfPartsEM++
					totBdTimeEM += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfPartsHP++
					totBdTimeHP += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfPartsLDL++
				}
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for wire',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for wire',
		},
	})

	//sum up all the wire bd time
	let totWireBdTime = 0

	for (let machine of machinesInShiftClosedWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totWireBdTime += stoppage.totalTime
				numOfConsumables++
				if (machine.shortBu === 'BHL') {
					numOfConsumablesBHL++
					totBdTimeBHL += stoppage.totalTime
				}
				if (machine.shortBu === 'CABS') {
					numOfConsumablesCabs++
					totBdTimeCabs += stoppage.totalTime
				}
				if (machine.shortBu === 'CP') {
					numOfConsumablesCP++
					totBdTimeCP += stoppage.totalTime
				}
				if (machine.shortBu === 'EM') {
					numOfConsumablesEM++
					totBdTimeEM += stoppage.totalTime
				}
				if (machine.shortBu === 'HP') {
					numOfConsumablesHP++
					totBdTimeHP += stoppage.totalTime
				}
				if (machine.shortBu === 'LDL') {
					numOfConsumablesLDL++
					totBdTimeLDL += stoppage.totalTime
				}
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totWireBdTime += stoppage.endTime - todaysShifts
				numOfConsumables++
				if (machine.shortBu === 'BHL') {
					numOfConsumablesBHL++
					totBdTimeBHL += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfConsumablesCabs++
					totBdTimeCabs += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfConsumablesCP++
					totBdTimeCP += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfConsumablesEM++
					totBdTimeEM += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfConsumablesHP++
					totBdTimeHP += stoppage.endTime - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfConsumablesLDL++
					totBdTimeLDL += stoppage.endTime - todaysShifts
				}
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
				numOfConsumables++
				if (machine.shortBu === 'BHL') {
					numOfConsumablesBHL++
					totBdTimeBHL += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'CABS') {
					numOfConsumablesCabs++
					totBdTimeCabs += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'CP') {
					numOfConsumablesCP++
					totBdTimeCP += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'EM') {
					numOfConsumablesEM++
					totBdTimeEM += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'HP') {
					numOfConsumablesHP++
					totBdTimeHP += Date.now() - new Date(stoppage.createdAt)
				}
				if (machine.shortBu === 'LDL') {
					numOfConsumablesLDL++
					totBdTimeLDL += Date.now() - new Date(stoppage.createdAt)
				}
			} else {
				totWireBdTime += Date.now() - todaysShifts
				numOfConsumables++
				if (machine.shortBu === 'BHL') {
					numOfConsumablesBHL++
					totBdTimeBHL += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfConsumablesCabs++
					totBdTimeCabs += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfConsumablesCP++
					totBdTimeCP += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfConsumablesEM++
					totBdTimeEM += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfConsumablesHP++
					totBdTimeHP += Date.now() - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfConsumablesLDL++
					totBdTimeLDL += Date.now() - todaysShifts
				}
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = await msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = await msToTime(totUnknownBdTime)
	let sumOfPartsTime = await msToTime(totPartsBdTime)
	let sumOfWireTime = await msToTime(totWireBdTime)

	let sumOfBDBHL = await msToTime(totBdTimeBHL)
	let sumOfBDCabs = await msToTime(totBdTimeCabs)
	let sumOfBDCP = await msToTime(totBdTimeCP)
	let sumOfBDEM = await msToTime(totBdTimeEM)
	let sumOfBDHP = await msToTime(totBdTimeHP)
	let sumOfBDLDL = await msToTime(totBdTimeLDL)

	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)
	if (update === null) {
		update = new Date()
	}
	const theTimeNow = new Date()
	let totaltimeBHL = 0
	// get the updates created today
	const updtesFromTodayBHL = await Update.aggregate([
		{
			$match: {
				createdAt: { $gte: todaysShifts },
				shortBu: 'BHL',
			},
		},
	])

	for (let u of updtesFromTodayBHL) {
		if (u.shiftStart < todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeBHL += u.shiftEnd - todaysShifts
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeBHL += u.shiftEnd - u.shiftEnd
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd > theTimeNow) {
			totaltimeBHL += theTimeNow - u.shiftStart
		}
	}
	let totaltimeCabs = 0
	// get the updates created today
	const updtesFromTodayCabs = await Update.aggregate([
		{
			$match: {
				updatedAt: { $gte: todaysShifts },
				shortBu: 'CABS',
			},
		},
	])

	for (let u of updtesFromTodayCabs) {
		if (u.shiftStart < todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeCabs += u.shiftEnd - todaysShifts
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeCabs += u.shiftEnd - u.shiftEnd
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd > theTimeNow) {
			totaltimeCabs += theTimeNow - u.shiftStart
		}
	}
	let totaltimeCP = 0
	// get the updates created today
	const updtesFromTodayCP = await Update.aggregate([
		{
			$match: {
				updatedAt: { $gte: todaysShifts },
				shortBu: 'CP',
			},
		},
	])

	for (let u of updtesFromTodayCP) {
		if (u.shiftStart < todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeCP += u.shiftEnd - todaysShifts
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeCP += u.shiftEnd - u.shiftEnd
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd > theTimeNow) {
			totaltimeCP += theTimeNow - u.shiftStart
		}
	}
	let totaltimeEM = 0
	// get the updates created today
	const updtesFromTodayEM = await Update.aggregate([
		{
			$match: {
				updatedAt: { $gte: todaysShifts },
				shortBu: 'EM',
			},
		},
	])

	for (let u of updtesFromTodayEM) {
		if (u.shiftStart < todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeEM += u.shiftEnd - todaysShifts
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeEM += u.shiftEnd - u.shiftEnd
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd > theTimeNow) {
			totaltimeEM += theTimeNow - u.shiftStart
		}
	}
	let totaltimeHP = 0
	// get the updates created today
	const updtesFromTodayHP = await Update.aggregate([
		{
			$match: {
				updatedAt: { $gte: todaysShifts },
				shortBu: 'HP',
			},
		},
	])

	for (let u of updtesFromTodayHP) {
		if (u.shiftStart < todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeHP += u.shiftEnd - todaysShifts
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeHP += u.shiftEnd - u.shiftEnd
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd > theTimeNow) {
			totaltimeHP += theTimeNow - u.shiftStart
		}
	}

	let totaltimeLDL = 0
	// get the updates created today
	const updtesFromTodayLDL = await Update.aggregate([
		{
			$match: {
				updatedAt: { $gte: todaysShifts },
				shortBu: 'LDL',
			},
		},
	])

	for (let u of updtesFromTodayLDL) {
		if (u.shiftStart < todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeLDL += u.shiftEnd - todaysShifts
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd < theTimeNow) {
			totaltimeLDL += u.shiftEnd - u.shiftEnd
		}
		if (u.shiftStart > todaysShifts && u.shiftEnd > theTimeNow) {
			totaltimeLDL += theTimeNow - u.shiftStart
		}
	}

	const totBDBHL = numOfKnownBHL + numOfUnKnownBHL + numOfPartsBHL + numOfConsumablesBHL
	const totBDCabs = numOfKnownCabs + numOfUnKnownCabs + numOfPartsCabs + numOfConsumablesCabs
	const totBDCP = numOfKnownCP + numOfUnKnownCP + numOfPartsCP + numOfConsumablesCP
	const totBDEM = numOfKnownEM + numOfUnKnownEM + numOfPartsEM + numOfConsumablesEM
	const totBDHP = numOfKnownHP + numOfUnKnownHP + numOfPartsHP + numOfConsumablesHP
	const totBDLDL = numOfKnownLDL + numOfUnKnownLDL + numOfPartsLDL + numOfConsumablesLDL

	const downtimePercTodayBHL = ((totBdTimeBHL / totaltimeBHL) * 100).toFixed(1)
	const downtimePercTodayCabs = ((totBdTimeCabs / totaltimeCabs) * 100).toFixed(1)
	const downtimePercTodayCP = ((totBdTimeCP / totaltimeCP) * 100).toFixed(1)
	const downtimePercTodayEM = ((totBdTimeEM / totaltimeEM) * 100).toFixed(1)
	const downtimePercTodayHP = ((totBdTimeHP / totaltimeHP) * 100).toFixed(1)
	const downtimePercTodayLDL = ((totBdTimeLDL / totaltimeLDL) * 100).toFixed(1)

	// start of graph side

	const sevenDaysAgoString = moment().subtract(7, 'days').format('YYYY, MM, DD')

	const sevenDaysAgo = new Date(sevenDaysAgoString)
	sevenDaysAgo.setHours(0, 0, 0, 0)

	console.log(sevenDaysAgo)
	console.log(todaysShifts)

	todayDayNumber = moment().dayOfYear()
	oneDayAgoNumber = moment().dayOfYear() - 1
	twoDaysAgoNumber = moment().dayOfYear() - 2
	threeDaysAgoNumber = moment().dayOfYear() - 3
	fourDaysAgoNumber = moment().dayOfYear() - 4
	fiveDaysAgoNumber = moment().dayOfYear() - 5
	sixDaysAgoNumber = moment().dayOfYear() - 6
	sevenDaysAgoNumber = moment().dayOfYear() - 7

	const shiftsLastSevenDays = await Update.aggregate([
		{
			$match: {
				updatedAt: { $gt: sevenDaysAgo },
			},
		},
		{
			$project: {
				startDay: { $dayOfYear: '$shiftStart' },
				endDay: { $dayOfYear: '$shiftEnd' },
				shortBu: 1,
				updatedAt: 1,
				shiftStart: 1,
				shiftEnd: 1,
				midnight: new Date(),
			},
		},
	])

	let timeArraySevenDaysAgoBHL = 0
	let timeArraySixDaysAgoBHL = 0
	let timeArrayFiveDaysAgoBHL = 0
	let timeArrayFourDaysAgoBHL = 0
	let timeArrayThreeDaysAgoBHL = 0
	let timeArrayTwoDaysAgoBHL = 0
	let timeArrayOneDayAgoBHL = 0

	for (let s of shiftsLastSevenDays) {
		if (s.endDay > s.startDay) {
			s.midnight = new Date(s.shiftEnd)
			s.midnight.setHours(0, 0, 0, 0)
			s.theDayBeforeTime = s.midnight - s.shiftStart
			s.theDayTime = s.shiftEnd - s.midnight
			if (s.shortBu === 'BHL' && s.endDay === sixDaysAgoNumber) {
				timeArraySevenDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.endDay === fiveDaysAgoNumber) {
				timeArraySixDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.endDay === fourDaysAgoNumber) {
				timeArrayFiveDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.endDay === threeDaysAgoNumber) {
				timeArrayFourDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.endDay === twoDaysAgoNumber) {
				timeArrayThreeDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.endDay === oneDayAgoNumber) {
				timeArrayTwoDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.endDay === todayDayNumber) {
				timeArrayOneDayAgoBHL += s.theDayBeforeTime
			}
		}
		if (s.endDay === s.startDay) {
			s.theDayTime = s.shiftEnd - s.shiftStart
			if (s.shortBu === 'BHL' && s.endDay === sevenDaysAgoNumber) {
				timeArraySevenDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.endDay === sixDaysAgoNumber) {
				timeArraySixDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.endDay === fiveDaysAgoNumber) {
				timeArrayFiveDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.endDay === fourDaysAgoNumber) {
				timeArrayFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.endDay === threeDaysAgoNumber) {
				timeArrayThreeDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.endDay === twoDaysAgoNumber) {
				timeArrayTwoDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.endDay === oneDayAgoNumber) {
				timeArrayOneDayAgoBHL += s.theDayTime
			}
		}
	}
	//known times bhl
	let timeArrayKnownSevenDaysAgoBHL = 0
	let timeArrayKnownSixDaysAgoBHL = 0
	let timeArrayKnownFiveDaysAgoBHL = 0
	let timeArrayKnownFourDaysAgoBHL = 0
	let timeArrayKnownThreeDaysAgoBHL = 0
	let timeArrayKnownTwoDaysAgoBHL = 0
	let timeArrayKnownOneDayAgoBHL = 0

	//Unknown times bhl
	let timeArrayUnknownSevenDaysAgoBHL = 0
	let timeArrayUnkKnownSixDaysAgoBHL = 0
	let timeArrayUnknownFiveDaysAgoBHL = 0
	let timeArrayUnknownFourDaysAgoBHL = 0
	let timeArrayUnknownThreeDaysAgoBHL = 0
	let timeArrayUnknownTwoDaysAgoBHL = 0
	let timeArrayUnknownOneDayAgoBHL = 0

	//parts times bhl
	let timeArrayPartsSevenDaysAgoBHL = 0
	let timeArrayUPartsSixDaysAgoBHL = 0
	let timeArrayPartsFiveDaysAgoBHL = 0
	let timeArrayPartsFourDaysAgoBHL = 0
	let timeArrayPartsThreeDaysAgoBHL = 0
	let timeArrayPartsTwoDaysAgoBHL = 0
	let timeArrayPartsOneDayAgoBHL = 0

	//wire times bhl
	let timeArrayWireSevenDaysAgoBHL = 0
	let timeArrayUWireSixDaysAgoBHL = 0
	let timeArrayWireFiveDaysAgoBHL = 0
	let timeArrayWireFourDaysAgoBHL = 0
	let timeArrayWireThreeDaysAgoBHL = 0
	let timeArrayWireTwoDaysAgoBHL = 0
	let timeArrayWireOneDayAgoBHL = 0

	const stoppagesLastSevenDaysClosed = await Stoppage.aggregate([
		{
			$match: {
				updatedAt: { $gt: sevenDaysAgo },
				open: false,
			},
		},
		{
			$project: {
				startDay: { $dayOfYear: '$createdAt' },
				endDay: { $dayOfYear: '$updatedAt' },
				shortBu: 1,
				updatedAt: 1,
				createdAt: 1,
				type: 1,
				midnight: new Date(),
			},
		},
	])
	const stoppagesLastSevenDaysOpen = await Stoppage.aggregate([
		{
			$match: {
				updatedAt: { $gt: sevenDaysAgo },
				open: true,
			},
		},
		{
			$project: {
				startDay: { $dayOfYear: '$createdAt' },
				endDay: { $dayOfYear: new Date() },
				shortBu: 1,
				updatedAt: new Date(),
				createdAt: 1,
				type: 1,
				midnight: new Date(),
			},
		},
	])

	const stoppagesLastSevenDays = [...stoppagesLastSevenDaysClosed, ...stoppagesLastSevenDaysOpen]

	// console.log(...stoppagesLastSevenDaysOpen)

	for (let s of stoppagesLastSevenDays) {
		if (s.endDay > s.startDay) {
			s.midnight = new Date(s.updatedAt)
			s.midnight.setHours(0, 0, 0, 0)
			s.theDayBeforeTime = s.midnight - s.createdAt
			s.theDayTime = s.updatedAt - s.midnight
			//Kown times
			//day before
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownSixDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownFourDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownTwoDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === todayDayNumber) {
				timeArrayKnownOneDayAgoBHL += s.theDayBeforeTime
			}

			//unknown
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownTwoDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === todayDayNumber) {
				timeArrayUnknownOneDayAgoBHL += s.theDayBeforeTime
			}

			//parts

			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoBHL += s.theDayBeforeTime
				console.log(s)
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsSixDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsFourDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsTwoDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === todayDayNumber) {
				timeArrayPartsOneDayAgoBHL += s.theDayBeforeTime
			}

			//wire
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSevenDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireSixDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFiveDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireFourDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireThreeDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === oneDayAgoNumber) {
				timeArrayWireTwoDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === todayDayNumber) {
				timeArrayWireOneDayAgoBHL += s.theDayBeforeTime
			}
		}

		//same day
		if (s.endDay === s.startDay) {
			s.theDayTime = s.updatedAt - s.createdAt
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === sevenDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSixDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownTwoDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Known breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownOneDayAgoBHL += s.theDayTime
			}

			//unknown breakdown
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === sevenDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownTwoDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unknown breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownOneDayAgoBHL += s.theDayTime
			}
			// parts

			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === sevenDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoBHL += s.theDayTime
				console.log(s)
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSixDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsTwoDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsOneDayAgoBHL += s.theDayTime
			}

			//wire bhl
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === sevenDaysAgoNumber) {
				timeArrayWireSevenDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSixDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireFiveDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireThreeDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireTwoDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Waiting for wire' && s.endDay === oneDayAgoNumber) {
				timeArrayWireOneDayAgoBHL += s.theDayTime
			}
		}
	}

	console.log(timeArraySevenDaysAgoBHL)
	// console.log(timeArrayKnownSevenDaysAgoBHL)
	// console.log(timeArrayUnknownSevenDaysAgoBHL)
	console.log(timeArrayPartsSevenDaysAgoBHL)
	// console.log(timeArrayWireSevenDaysAgoBHL)

	console.log((timeArrayKnownSevenDaysAgoBHL / timeArrayPartsSevenDaysAgoBHL) * 100)

	res.render('machine/downTime', {
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfPartsTime,
		sumOfWireTime,
		update,
		numOfKnown,
		numOfUnKnown,
		numOfParts,
		numOfConsumables,

		// bhl breakdowns
		numOfKnownBHL,
		numOfUnKnownBHL,
		numOfPartsBHL,
		numOfConsumablesBHL,
		totBDBHL,
		sumOfBDBHL,
		downtimePercTodayBHL,

		// cabs breakdowns
		numOfKnownCabs,
		numOfUnKnownCabs,
		numOfPartsCabs,
		numOfConsumablesCabs,
		totBDCabs,
		sumOfBDCabs,
		downtimePercTodayCabs,

		// cp breakdowns
		numOfKnownCP,
		numOfUnKnownCP,
		numOfPartsCP,
		numOfConsumablesCP,
		totBDCP,
		sumOfBDCP,
		downtimePercTodayCP,

		// em breakdowns
		numOfKnownEM,
		numOfUnKnownEM,
		numOfPartsEM,
		numOfConsumablesEM,
		totBDEM,
		sumOfBDEM,
		downtimePercTodayEM,

		// hp breakdowns
		numOfKnownHP,
		numOfUnKnownHP,
		numOfPartsHP,
		numOfConsumablesHP,
		totBDHP,
		sumOfBDHP,
		downtimePercTodayHP,

		// ldl breakdowns
		numOfKnownLDL,
		numOfUnKnownLDL,
		numOfPartsLDL,
		numOfConsumablesLDL,
		totBDLDL,
		sumOfBDLDL,
		downtimePercTodayLDL,

		GraphBHL,
		GraphLDL,
		GraphCP,
		GraphHP,
		GraphEM,
		GraphCABS,

		selection,
	})
}

///-------------------------------------------------new eff---------------------------------------------------- ///

let resetMachine = new CronJob('5 */10 * * * *', async function (req, res) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	try {
		// console.log('update started')
		const dateTomorrow = new Date()
		dateTomorrow.setDate(dateTomorrow.getDate() + 1)

		const machines = await Machine.find({}).populate({ path: 'shifts' })
		for (let machine of machines) {
			machine.inShift = false
			machine.eff = 0
			machine.teff = 0
			machine.runningTime = 0
			machine.touchTime = 0
			machine.shiftStart = null
			machine.shiftEnd = null

			await machine.save()

			machine.shifts.forEach(async function (shift) {
				let shiftType = 'days'
				let timeNow = moment().format('YYYY-MM-DDTHH:mm:ss')
				let inShift = false
				let dayNow = moment().format('dddd').toLowerCase()
				let dayNowCheck = moment().format('dddd').toLowerCase()

				const startHour = +shift.startTimeString.substring(0, 2)
				const endHour = +shift.endTimeString.substring(0, 2)

				let startTime = moment().format(`YYYY-MM-DDT${shift.startTimeString}:00`)
				let endTime = moment().format(`YYYY-MM-DDT${shift.endTimeString}:00`)

				if (endHour > 0 && endHour < startHour) {
					shiftType = 'nights'
					startTime = moment().subtract(1, 'days').format(`YYYY-MM-DDT${shift.startTimeString}:00`)
					dayNow = moment().subtract(1, 'days').format('dddd').toLowerCase()
				}
				if (endHour === 0) {
					endTime = moment().add(1, 'days').format(`YYYY-MM-DDT${shift.endTimeString}:00`)
				}

				if (timeNow > startTime && timeNow < endTime && shift._doc.hasOwnProperty(dayNow)) {
					inShift = true
					machine.inShift = inShift
					machine.shiftStart = startTime
					machine.shiftEnd = endTime
					machine.dayNow = dayNow
					await machine.save()
					// console.log(machine)
				}

				shift.inShift = inShift
				shift.startTime = startTime
				shift.endTime = endTime

				await shift.save()
			})

			if (machine.inShift) {
				let vin = machine.vin
				let rTimePercentForEff = 0
				let tTimePercentForEff = 0
				let startOfToday = moment(machine.shiftStart).subtract(1, 'hours').format('YYYY-MM-DDTHH:mm:ss')
				let startOfTodayAdd1Hour = moment(machine.shiftStart)
				let timeNow = moment().format('YYYY-MM-DDTHH:mm:ss')
				let timeNowStamp = moment().format('HH:mm:ss')
				let rTime = []
				let tTime = []
				let runningTime = 0
				let touchTime = 0

				const myDate = new Date(machine.shiftStart)
				myDate.setHours(myDate.getHours() + 1)

				const myDate2 = new Date()
				myDate2.setHours(myDate2.getHours() + 1)

				let d = new Date(myDate),
					e = new Date(myDate2)
				let msSinceEight = e - d
				let secondsSinceEight = msSinceEight / 1000

				let headers = { 'x-api-key': process.env.MACHINE_API }

				let response = await axios(`https://ycveq39z4i.execute-api.eu-west-1.amazonaws.com/dev/v1/data/${vin}?from=${startOfToday}Z&to=${timeNow}Z`, {
					headers,
				})

				// let theData = []

				if (response.data[0]) {
					let number = 0
					let addedTime = 0
					if (response.data && response.data[0].inputChannel0Value) {
						if (response.data[0] && response.data[0].inputChannel0Value != null) {
							number = response.data[0].inputChannel0Value.length - 1
							if (response.data[0].inputChannel0Value[number].state === '1') {
								// console.log(response.data[0].inputChannel0Value)
								const start = new Date(response.data[0].inputChannel0Value[number].time)
								// console.log(response.data[0].inputChannel0Value[number])
								start.setHours(start.getHours() + 1)
								// console.log(start)
								const millis = Date.now() - start
								addedTime = Math.floor(millis / 1000)
							}
						}
					}

					let number1 = 0
					let addedTime1 = 0
					if (response.data[0] && response.data[0].inputChannel1Value != null) {
						number1 = response.data[0].inputChannel1Value.length - 1
						if (response.data[0].inputChannel1Value[number1].state === '1') {
							// console.log(response.data[0].inputChannel0Value)
							const start1 = new Date(response.data[0].inputChannel1Value[number1].time)
							// console.log(response.data[0].inputChannel1Value[number1])
							start1.setHours(start1.getHours() + 1)
							// console.log(start)
							const millis1 = Date.now() - start1
							addedTime1 = Math.floor(millis1 / 1000)
						}
					}

					for (let x of response.data) {
						rTime.push(x.inputChannel0Value_duration + addedTime)
						tTime.push(x.inputChannel1Value_duration + addedTime1)
						if (x.inputChannel0Value_duration != null) {
							runningTime = x.inputChannel0Value_duration + addedTime
						}
						if (x.inputChannel1Value_duration != null) {
							touchTime = x.inputChannel1Value_duration + addedTime1
						}
					}

					if (rTime.length > 0) {
						rTimePercentForEff = Math.round((rTime / secondsSinceEight) * 100)
					} else {
						rTimePercentForEff = 0
					}
					if (tTime.length > 0) {
						tTimePercentForEff = Math.round((tTime / secondsSinceEight) * 100)
					} else {
						tTimePercentForEff = 0
					}
				}

				let idNumber = machine.id
				// let signal = false

				// console.log(response.data)

				// if (response.data.length > 0) {
				// 	signal = true
				// }

				if (isNaN(rTimePercentForEff)) {
					rTimePercentForEff = 0
				}
				if (isNaN(tTimePercentForEff)) {
					tTimePercentForEff = 0
				}
				let shiftHours = [] // Results will go here
				let shiftStartHour = new Date(machine.shiftStart).getHours() // Get current hour of the day
				let shiftEndHour = new Date(machine.shiftEnd).getHours() // Get current hour of the day

				if (shiftStartHour < shiftEndHour) {
					// Loop from start to end of shift
					for (let i = shiftStartHour; i <= shiftEndHour; i++) {
						shiftHours.push(i) // Put loop counter into array with ":00" next to it
					}
				}
				if (shiftStartHour > shiftEndHour) {
					// Loop from current hour number to 23
					for (let i = shiftStartHour; i < 24; i++) {
						shiftHours.push(i) // Put loop counter into array with ":00" next to it
					}
					// Loop midnight end of shift
					for (let i = 0; i <= shiftEndHour; i++) {
						shiftHours.push(i) // Put loop counter into array with ":00" next to it
					}
				}

				const machineForUpdate = await Machine.findById(idNumber).populate({
					path: 'updates',
					options: { sort: { _id: -1 }, limit: 1 },
				})

				let dataForUpdate = {}

				if (machineForUpdate.method === 'old') {
					dataForUpdate = {
						vin: vin,
						date: new Date(),
						day: machineForUpdate.dayNow,
						eff: rTimePercentForEff,
						teff: tTimePercentForEff,
						shiftStart: machineForUpdate.shiftStart,
						shiftEnd: machineForUpdate.shiftEnd,
						shortBu: machineForUpdate.shortBu,
						machineName: machineForUpdate.machineName,
						type: machineForUpdate.type,
					}
				}
				if (machineForUpdate.method === 'running') {
					dataForUpdate = {
						vin: vin,
						date: new Date(),
						day: machineForUpdate.dayNow,
						eff: rTimePercentForEff,
						teff: rTimePercentForEff,
						shiftStart: machineForUpdate.shiftStart,
						shiftEnd: machineForUpdate.shiftEnd,
						shortBu: machineForUpdate.shortBu,
						machineName: machineForUpdate.machineName,
						type: machineForUpdate.type,
					}
				}
				if (machineForUpdate.method === 'touch') {
					dataForUpdate = {
						vin: vin,
						date: new Date(),
						day: machineForUpdate.dayNow,
						eff: tTimePercentForEff,
						teff: tTimePercentForEff,
						shiftStart: machineForUpdate.shiftStart,
						shiftEnd: machineForUpdate.shiftEnd,
						shortBu: machineForUpdate.shortBu,
						machineName: machineForUpdate.machineName,
						type: machineForUpdate.type,
					}
				}

				const update = await new Update(dataForUpdate)

				if (machineForUpdate.updates.length > 0) {
					const updateId = machineForUpdate.updates[0]._id
					let date1 = new Date(machineForUpdate.updates[0].shiftStart)
					let date2 = new Date(machineForUpdate.shiftStart)
					let seconds1 = date1.getTime() / 1000
					let seconds2 = date2.getTime() / 1000

					if (seconds1 === seconds2) {
						await Update.findByIdAndUpdate(updateId, {
							eff: rTimePercentForEff,
							teff: tTimePercentForEff,
						})
						await machineForUpdate.save()
						// console.log(`Just updated old value on ${machineForUpdate.machineName}`)
					} else {
						machineForUpdate.updates.push(update)
						await update.save()
						// console.log(`Just aded a new update to ${machineForUpdate.machineName}`)
						await machineForUpdate.save()
					}
				} else {
					machineForUpdate.updates.push(update)
					await update.save()
					// console.log(`Just aded a new update to ${machineForUpdate.machineName}`)
					await machineForUpdate.save()
				}

				if (machineForUpdate.method === 'old') {
					await Machine.findByIdAndUpdate(idNumber, {
						eff: rTimePercentForEff,
						shiftHours: shiftHours,
						teff: tTimePercentForEff,
						// signal      : signal,
						runningTime: runningTime,
						touchTime: touchTime,
						lastUpdate: Date.now(),
					})
				}
				if (machineForUpdate.method === 'running') {
					await Machine.findByIdAndUpdate(idNumber, {
						eff: rTimePercentForEff,
						shiftHours: shiftHours,
						teff: rTimePercentForEff,
						// signal      : signal,
						runningTime: runningTime,
						touchTime: touchTime,
						lastUpdate: Date.now(),
					})
				}
				if (machineForUpdate.method === 'touch') {
					await Machine.findByIdAndUpdate(idNumber, {
						eff: tTimePercentForEff,
						shiftHours: shiftHours,
						teff: tTimePercentForEff,
						// signal      : signal,
						runningTime: runningTime,
						touchTime: touchTime,
						lastUpdate: Date.now(),
					})
				}
			}
		}
		// console.log('update finished')
	} catch (error) {
		console.log(error)
	}
})

// resetMachine.start()

module.exports.screen = async (req, res) => {
	const { shortBu, screenName } = req.params

	const machines = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
	}).sort({ area: 1 })

	let screen = screenName
	let machineType = ''

	if (machines.length > 0) {
		machineType = machines[0].type
	}

	const concerns = await BConcern.find({ machineType: machineType }).sort({
		name: '',
	})
	const types = await BType.find({}).sort({ name: '' })

	const laserCuttersInShift = await Machine.find({
		shortBu: shortBu,
		inShift: true,
		signal: true,
		screenName: screenName,
	})

	let totLaserPercent = 0
	let totLaserPercentT = 0
	for (let l of laserCuttersInShift) {
		totLaserPercent += l.eff
		totLaserPercentT += l.teff
	}
	let laserPercent = Math.round(totLaserPercent / laserCuttersInShift.length)
	let laserPercentT = Math.round(totLaserPercentT / laserCuttersInShift.length)

	if (isNaN(laserPercent)) {
		laserPercent = 0
	}

	if (isNaN(laserPercentT)) {
		laserPercentT = 0
	}

	const laserCutters = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
	})
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
		})
		.sort({ area: 1 })

	const totalKnownBreakdown = await Machine.countDocuments({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
		state: 'Known breakdown',
	})
	const totalUnKnownBreakdown = await Machine.countDocuments({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
		state: 'Unknown breakdown',
	})
	const totalParts = await Machine.countDocuments({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
		state: 'Waiting for parts',
	})
	const totalWire = await Machine.countDocuments({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
		state: 'Waiting for wire',
	})

	let businessUnit = ''
	let type = ''
	if (machines.length > 0) {
		businessUnit = machines[0].businessUnit
		type = `${machines[0].type}s`
	}
	// get the known breakdown times
	const machinesInShiftClosedKnown = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Known breakdown',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Known breakdown',
		},
	})

	//sum up all the known bd time
	let totKnownBdTime = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totKnownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totKnownBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totKnownBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the unknown breakdown times
	const machinesInShiftClosedUnknown = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Unknown breakdown',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unknown breakdown',
		},
	})

	//sum up all the unknown bd time
	let totUnknownBdTime = 0

	for (let machine of machinesInShiftClosedUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totUnknownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totUnknownBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totUnknownBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the parts breakdown times
	const machinesInShiftClosedParts = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for parts',
		},
	})
	const machinesInShiftOpenParts = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for parts',
		},
	})

	//sum up all the parts bd time
	let totPartsBdTime = 0

	for (let machine of machinesInShiftClosedParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totPartsBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totPartsBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totPartsBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totPartsBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Waiting for wire',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({
		shortBu: shortBu,
		screenName: screenName,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Waiting for wire',
		},
	})

	//sum up all the wire bd time
	let totWireBdTime = 0

	for (let machine of machinesInShiftClosedWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totWireBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > new Date(machine.shiftStart) && stoppage.createdAt < new Date(machine.shiftStart)) {
				totWireBdTime += stoppage.endTime - new Date(machine.shiftStart)
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > new Date(machine.shiftStart)) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
			} else {
				totWireBdTime += Date.now() - new Date(machine.shiftStart)
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = msToTime(totUnknownBdTime)
	let sumOfPartsTime = msToTime(totPartsBdTime)
	let sumOfWireTime = msToTime(totWireBdTime)
	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)

	if (update === null) {
		update = new Date()
	}

	res.render('machine/screen', {
		screen,
		concerns,
		types,
		businessUnit,
		laserCutters,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		sumOfPartsTime,
		shortBu,
		businessUnit,
		totalKnownBreakdown,
		totalUnKnownBreakdown,
		totalParts,
		totalWire,
		laserPercent,
		laserPercentT,
		update,
		type,
	})
}
