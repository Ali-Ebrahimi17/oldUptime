require('dotenv').config()

const Stoppage = require('../models/stoppage')
const Update = require('../models/update')
const BConcern = require('../models/breakdownConcern')
const BType = require('../models/breakdownType')
const Machine = require('../models/machine')
const MachineUser = require('../models/machineUser')
const Notification = require('../models/notification')
const MachineNote = require('../models/machineNote')
const MachineContact = require('../models/machineContact')
const Role = require('../models/roles')
const AType = require('../models/andonType')
const AConcern = require('../models/andonConcern')
const Andon = require('../models/andon')
const Shift = require('../models/shift')

const nodemailer = require('nodemailer')

const axios = require('axios')
const CronJob = require('cron').CronJob

const Json2csvParser = require('json2csv').Parser

const fs = require('fs')

const moment = require('moment')

const stoppage = require('../models/stoppage')
const machine = require('../models/machine')
const andon = require('../models/andon')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

const calculateDate = (date) => {
	const formattedDate = new Date(date)

	return moment(formattedDate).format('dddd')
}

// show users
module.exports.contactAdmin = async (req, res) => {
	const { shortBu } = req.params

	const roles = await Role.distinct('name', {})

	const foundUser = await MachineUser.findById(req.user._id)

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	const userAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})
	const shiftAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})

	// const userAccess = true
	// const shiftAccess = true

	const machines = await Machine.find({ shortBu: shortBu })

	let businessUnit = machines[0].businessUnit

	const contacts = await MachineUser.aggregate([
		{
			$match: {
				division: shortBu,
				active: true,
			},
		},
	])

	res.render('machine/contacts', {
		machines,
		shortBu,
		businessUnit,
		contacts,
		roles,
		userAccess,
		shiftAccess,
	})
}

module.exports.register = async (req, res, next) => {
	const { firstName, lastName, role, email, password, mobile, shortBu } = req.body
	const createdBy = req.user._id
	// const createdBy = '6089821c3ab4c91a04e4ddf3'
	try {
		const lastPart = email.slice(-8).toLowerCase()
		if (lastPart === '@jcb.com') {
			const foundEmail = await MachineUser.findOne({
				email,
			})
			const foundClockNum = await MachineUser.findOne({
				clockNumber: password,
			})

			if (foundEmail) {
				req.flash('error', 'User already regsitered with this email')
				res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
				return
			}
			if (foundClockNum) {
				req.flash('error', 'User already regsitered with this clock number')
				res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
				return
			}
			const user = new MachineUser({
				firstName,
				lastName,
				division: req.body.shortBu,
				clockNumber: req.body.password,
				role,
				email,
				mobile,
				createdBy,
				username: email,
			})

			await MachineUser.register(user, password)
			// req.login(registeredUser, (err) => {
			// 	if (err) return next(err)
			req.flash('success', 'User Created')
			res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
			//})
		} else {
			req.flash('error', 'Must be a JCB email address')
			res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
		}
	} catch (e) {
		req.flash('error', e.message)
		res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
	}
	// req.flash('success', 'User Created')
	// res.redirect('/equipment-monitoring/operations')
}

module.exports.editUser = async (req, res) => {
	const { id } = req.params

	const { email, role, shortBu } = req.body

	const updatedBy = req.user._id

	if (req.user._id === id) {
		const lastPart = email.slice(-8).toLowerCase()
		if (lastPart !== '@jcb.com') {
			req.flash('error', 'Must be a JCB email address')
			res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
			return
		}
		const foundUser = await MachineUser.findOne({
			email,
			_id: { $ne: req.user._id },
		})

		if (foundUser) {
			req.flash('error', 'User already regsitered with this email')
			res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
			return
		}
		machineUser = await MachineUser.findByIdAndUpdate(
			id,
			{
				email,
				username: email,
				updatedBy: req.user._id,
			},
			{ new: true }
		)
	} else {
		machineUser = await MachineUser.findByIdAndUpdate(
			id,
			{
				role,
				updatedBy: req.user._id,
			},
			{ new: true }
		)
	}

	res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
}

module.exports.softDeleteUser = async (req, res) => {
	const { id } = req.params

	const updatedBy = req.user._id

	const machineUser = await MachineUser.findByIdAndUpdate(
		id,
		{
			active: false,
			updatedBy: req.user._id,
		},
		{ new: true }
	)

	const shortBu = machineUser.division

	res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
}

module.exports.home = async (req, res) => {
	res.render('machine/home', {})
}

module.exports.renderLogin = (req, res) => {
	const { shortBu } = req.params
	res.render('machine/login', { shortBu })
}

module.exports.login = (req, res) => {
	const { shortBu } = req.params
	// req.flash('success', 'welcome back!')
	// const redirectUrl = req.session.returnTo || `/equipment-monitoring/history/${shortBu}`
	const redirectUrl = `/equipment-monitoring/history/${shortBu}`
	// delete req.session.returnTo
	res.redirect(redirectUrl)
}

module.exports.logout = (req, res) => {
	req.logout()
	req.flash('success', 'Logged Out')
	res.redirect(`/equipment-monitoring/operations`)
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

module.exports.dayAnalysis = async (req, res) => {
	const { shortBu, day, month } = req.params
	const year = new Date().getFullYear()
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

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
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

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
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)
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

	// get the Planned Stoppage times BHL
	const machinesInShiftClosedKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)
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

	// get the Planned Stoppage times BHL
	const machinesInShiftClosedKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)
	const machine = await Machine.findById(id)
	if (!machine) {
		req.flash('error', 'Cannot find that machine')
		res.redirect('/equipment-monitoring/operations')
	}
	res.render('machine/shiftp', { machine, shortBu })
}
module.exports.show = async (req, res) => {
	const { shortBu, id } = req.params
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)
	const machine = await Machine.findById(id).populate({
		path: 'shifts',
		match: {
			active: true,
		},
	})

	if (!machine) {
		req.flash('error', 'Cannot find that machine')
		res.redirect('/equipment-monitoring/operations')
	}

	res.render('machine/show', { machine, shortBu })
}

module.exports.businessUnitHistory = async (req, res) => {
	const { shortBu } = req.params
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)
	const machines = await Machine.find({
		shortBu: shortBu,
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'updates',
			match: {
				shiftStart: { $ne: null },
				shiftEnd: { $ne: null },
			},
			options: { sort: { _id: -1 } },
			perDocumentLimit: 10,
		})

	let businessUnit = machines[0].businessUnit

	const foundUser = await MachineUser.findById(req.user._id)

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	const userAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})
	const shiftAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})

	res.render('machine/businessUnitHistory', {
		machines,
		shortBu,
		businessUnit,
		userAccess,
		shiftAccess,
	})
}
module.exports.ukShifts = async (req, res) => {
	let selectionDiv = ''
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)
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
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

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
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	const screens = await Machine.distinct('screenName', { shortBu, screenName: { $nin: ['screen0', 'screen1'] } }).sort()

	const yesterday = new Date()
	yesterday.setDate(yesterday.getDate() - 1)

	const weldingRobotsInShift = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
			signal: true,
			type: 'Welding Robot',
		},
		{ updates: 0 }
	)

	const laserCuttersInShift = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
			signal: true,
			type: 'Laser Cutter',
		},
		{ updates: 0 }
	)
	const plasmaCuttersInShift = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
			signal: true,
			type: 'Plasma Cutter',
		},
		{ updates: 0 }
	)

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

	const weldingRobots = await Machine.find(
		{
			shortBu: shortBu,
			type: 'Welding Robot',
		},
		{ updates: 0 }
	)
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
		})
		.sort({ area: 1 })
	const laserCutters = await Machine.find(
		{
			shortBu: shortBu,
			type: 'Laser Cutter',
		},
		{ updates: 0 }
	)
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
		})
		.sort({ area: 1 })
	const plasmaCutters = await Machine.find(
		{
			shortBu: shortBu,
			type: 'Plasma Cutter',
		},
		{ updates: 0 }
	)
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
		state: 'Planned Stoppage',
	})
	const totalUnKnownBreakdown = await Machine.countDocuments({
		shortBu: shortBu,
		inShift: true,
		state: 'Unplanned Stoppage',
	})

	const totalWire = await Machine.countDocuments({
		shortBu: shortBu,
		inShift: true,
		state: 'Breakdown',
	})

	let businessUnit = ''
	if (machines.length > 0) {
		businessUnit = machines[0].businessUnit
	}
	// get the Planned Stoppage times
	const machinesInShiftClosedKnown = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
		},
		{ updates: 0 }
	).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
		},
		{ updates: 0 }
	).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
		},
	})

	//sum up all the known bd time
	let totKnownBdTime = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totKnownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totKnownBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totKnownBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totKnownBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// get the Unplanned Stoppage times
	const machinesInShiftClosedUnknown = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
		},
		{ updates: 0 }
	).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Unplanned Stoppage',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
		},
		{ updates: 0 }
	).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unplanned Stoppage',
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
				totUnknownBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totUnknownBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totUnknownBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
		},
		{ updates: 0 }
	).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Breakdown',
		},
	})
	const machinesInShiftOpenWire = await Machine.find(
		{
			shortBu: shortBu,
			inShift: true,
		},
		{ updates: 0 }
	).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Breakdown',
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
				totWireBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totWireBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totWireBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = msToTime(totUnknownBdTime)

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

	const notes = await MachineNote.find({
		shortBu: shortBu,
		createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
	}).sort({
		createdAt: 'desc',
	})

	const unReadNotes = await MachineNote.countDocuments({
		shortBu: shortBu,
		createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
		read: false,
	})

	res.render('machine/business-unit', {
		screens,
		notes,
		unReadNotes,
		weldingRobots,
		businessUnit,
		laserCutters,
		plasmaCutters,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		// sumOfPartsTime,
		shortBu,
		businessUnit,
		totalKnownBreakdown,
		totalUnKnownBreakdown,
		// totalParts,
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
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	const yesterday = new Date()
	yesterday.setDate(yesterday.getDate() - 1)

	const weldingRobotsInShift = await Machine.find(
		{
			inShift: true,
			signal: true,
			type: 'Welding Robot',
		},
		{ updates: 0 }
	)
	const laserCuttersInShift = await Machine.find(
		{
			inShift: true,
			signal: true,
			type: 'Laser Cutter',
		},
		{ updates: 0 }
	)
	const plasmaCuttersInShift = await Machine.find(
		{
			inShift: true,
			signal: true,
			type: 'Plasma Cutter',
		},
		{ updates: 0 }
	)

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
		state: 'Planned Stoppage',
	})
	const totalUnKnownBreakdown = await Machine.countDocuments({
		inShift: true,
		state: 'Unplanned Stoppage',
	})

	const totalWire = await Machine.countDocuments({
		inShift: true,
		state: 'Breakdown',
	})
	const machines = await Machine.find({}, { updates: 0, shifts: 0 })
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
			perDocumentLimit: 1,
		})
		.sort({ businessUnit: 1, abbreviatedName: 1 })

	// get the Planned Stoppage times
	const machinesInShiftClosedKnown = await Machine.find({}, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({}, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
		},
	})

	//sum up all the known bd time
	let totKnownBdTime = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totKnownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totKnownBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totKnownBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totKnownBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// get the Unplanned Stoppage times
	const machinesInShiftClosedUnknown = await Machine.find({}, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Unplanned Stoppage',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({}, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unplanned Stoppage',
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
				totUnknownBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totUnknownBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totUnknownBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({}, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Breakdown',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({}, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Breakdown',
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
				totWireBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totWireBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totWireBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = msToTime(totUnknownBdTime)

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

	res.render('machine/operations-view', {
		machines,
		totalKnownBreakdown,
		totalUnKnownBreakdown,
		totalWire,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		weldPercent,
		laserPercent,
		plasmaPercent,
		weldPercentT,
		laserPercentT,
		plasmaPercentT,
		update,
	})
}

module.exports.operationsNew = async (req, res) => {
	const machines = await Machine.aggregate([
		{
			$match: {},
		},
		{
			$sort: { shortBu: 1 },
		},
		{
			$project: {
				_id: 1,
				shortBu: 1,
				machineName: 1,
			},
		},
	])

	console.log(machines)

	res.render('machine/operations-view-new', {
		machines,
	})
}

module.exports.operationsWeekly = async (req, res) => {
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	const yesterday = new Date()
	yesterday.setDate(yesterday.getDate() - 1)

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
		state: 'Planned Stoppage',
	})
	const totalUnKnownBreakdown = await Machine.countDocuments({
		inShift: true,
		state: 'Unplanned Stoppage',
	})

	const totalWire = await Machine.countDocuments({
		inShift: true,
		state: 'Breakdown',
	})
	const machines = await Machine.find({}, { updates: 0, shifts: 0 })
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
			perDocumentLimit: 1,
		})
		.sort({ businessUnit: 1, abbreviatedName: 1 })

	// get the Planned Stoppage times
	const machinesInShiftClosedKnown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
		},
	})

	//sum up all the known bd time
	let totKnownBdTime = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totKnownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totKnownBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totKnownBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totKnownBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// get the Unplanned Stoppage times
	const machinesInShiftClosedUnknown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Unplanned Stoppage',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unplanned Stoppage',
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
				totUnknownBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totUnknownBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totUnknownBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Breakdown',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Breakdown',
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
				totWireBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totWireBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totWireBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = msToTime(totUnknownBdTime)

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

	res.render('machine/operations-view-weekly', {
		machines,
		totalKnownBreakdown,
		totalUnKnownBreakdown,
		totalWire,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		weldPercent,
		laserPercent,
		plasmaPercent,
		weldPercentT,
		laserPercentT,
		plasmaPercentT,
		update,
	})
}

module.exports.createNewAndon = async (req, res) => {
	const { id, concern, type } = req.body

	const machine = await Machine.findById(id)

	if (!machine) {
		req.flash('error', 'Sorry something went wrong')
		res.redirect(`/equipment-monitoring/machine/${id}`)
		return
	}
	if (!concern || !type) {
		req.flash('error', 'Form not complete. Please try again')
		res.redirect(`/equipment-monitoring/machine/${id}`)
		return
	}

	const openAndons = await Andon.distinct('concern', {
		open: true,
		vin: machine.vin,
	})

	const alreadyOpen = openAndons.includes(concern)

	if (alreadyOpen) {
		req.flash('error', 'Sorry already an open upcoming stoppage for this')
		res.redirect(`/equipment-monitoring/machine/${id}`)
		return
	}

	const newAndon = new Andon({
		concern,
		type,
		vin: machine.vin,
		shiftStart: machine.shiftStart,
		shiftEnd: machine.shiftEnd,
		vin: machine.vin,
		shortBu: machine.shortBu,
		machineType: machine.type,
		name: 'andon',
	})

	// topFive.status = 'Open'
	// topFive.division = division

	machine.andon = true

	await machine.save()

	await newAndon.save()

	const teamLeaderEmails = await MachineUser.distinct('email', {
		division: newAndon.shortBu,
		role: 'Team Leader',
	})
	// const teamLeaderEmails = ['Ali.Ebrahimi@jcb.com', 'Josh.Wilcox@jcb.com']

	const transporter = nodemailer.createTransport({
		host: process.env.HOST, //Host
		port: process.env.PORT, // Port
		tls: {
			rejectUnauthorized: false,
		},
	})

	let stopDate = moment().format('DD/MM/YYYY')
	let stopTime = moment().format('HH:mm')

	let mailOptions = {
		from: 'JCB-Equipment.LiveLink@jcb.com',
		to: teamLeaderEmails,
		subject: `*Upcoming Stoppage on ${machine.machineName} in ${type}*`,
		html:
			`<p>${machine.machineName} has an upcoming stoppage in ${type}</p>` +
			`<p>It was raised at ${stopTime} on ${stopDate}</p>` +
			`<p>The reason for the stoppage is ${concern}</p>` +
			`<p>Thanks</p>` +
			`<p>JCB Equipment LiveLink</p>`,
	}
	// send the email
	// transporter.sendMail(mailOptions, () => {})

	res.redirect(`/equipment-monitoring/machine/${id}`)
}

module.exports.removeAndon = async (req, res) => {
	const { id, mId } = req.params

	const updatedAndon = await Andon.findByIdAndUpdate(id, {
		// change the andon to not open
		open: false,
		endTime: Date.now(),
	})

	const machine = await Machine.findById(mId)

	machine.andon = false

	await machine.save()

	res.redirect(`/equipment-monitoring/machine/${mId}`)
}

module.exports.machine = async (req, res) => {
	const { id } = req.params
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)
	// const roles = await Role.distinct('name', {})
	const roles = ['Maintenance', 'Setter', 'Team Leader']

	const types = await BType.find({}).sort({ name: '' })
	const machine = await Machine.findById(id, {
		updates: 0,
		shifts: 0,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Breakdown',
		},
	})
	if (!machine) {
		req.flash('error', 'Cannot find that machine')
		res.redirect('/machine/home')
	}

	const openAndons = await Andon.distinct('concern', {
		open: true,
		vin: machine.vin,
	})

	const openAndonArr = await Andon.find({
		open: true,
		vin: machine.vin,
	}).sort({ _id: -1 })

	const andonTypes = await AType.find({})

	const andonConcerns = await AConcern.find({
		name: { $nin: openAndons },
	}).sort({ name: 1 })

	let theStart = new Date()

	if (machine.inShift) {
		vin = machine.vin
		theStart = machine.shiftStart
	} else {
		vin = 0
	}

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

	// get the Planned Stoppage times
	const machinesInShiftClosedKnown = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Unplanned Stoppage times
	const machinesInShiftClosedUnknown = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Unplanned Stoppage',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unplanned Stoppage',
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
				$gte: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
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
				$gte: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Breakdown',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({
		_id: id,
		inShift: true,
	}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Breakdown',
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

	let sumOfRunningTime = new Date('2021, 01, 01').toISOString().substr(11, 8)

	if (machine.runningTime) {
		sumOfRunningTime = new Date(machine.runningTime * 1000).toISOString().substr(11, 8)
	}

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

	const breakdownConcerns = await BConcern.find({
		header: 'Breakdown',
		machineType: machine.type,
	}).sort({
		name: '',
	})
	const plannedConcerns = await BConcern.find({
		header: 'Planned Stoppage',
		machineType: machine.type,
	}).sort({
		name: '',
	})
	const unplannedConcerns = await BConcern.find({
		header: 'Unplanned Stoppage',
		machineType: machine.type,
	}).sort({
		name: '',
	})

	// const path = './PDF/help.pdf'
	// if (fs.existsSync(path)) {
	// 	res.contentType('application/pdf')
	// 	fs.createReadStream(path).pipe(res)
	// // } else {
	// // 	console.log('error with help pdf')
	// }

	const notes = await MachineNote.find({
		vin: machine.vin,
		createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
	}).sort({
		createdAt: 'desc',
	})
	const unReadNotes = await MachineNote.countDocuments({
		vin: machine.vin,
		createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
		read: false,
	})

	const graphStoppages = await Stoppage.aggregate([
		{
			$match: {
				vin: machine.vin,
				$or: [
					{
						createdAt: { $gte: start },
					},
					{
						createdAt: { $lt: start },
						open: true,
					},
					{
						createdAt: { $lt: start },
						updatedAt: { $gte: start },
					},
				],
			},
		},
		{
			$addFields: {
				total_ms: {
					$switch: {
						branches: [
							{
								// andon started before shift and still open
								case: {
									$and: [{ $lt: ['$createdAt', start] }, { $eq: ['$open', true] }],
								},
								//time since start of shift until now
								then: { $subtract: [new Date(), start] },
							},
							{
								// andon started before shift and closed
								case: {
									$and: [{ $lt: ['$createdAt', start] }, { $eq: ['$open', false] }],
								},
								//time since start of shift until stopage ended
								then: { $subtract: ['$updatedAt', start] },
							},
							{
								// andon started during shift and closed
								case: {
									$and: [{ $gte: ['$createdAt', start] }, { $eq: ['$open', false] }],
								},
								//total time of the stoppage
								then: '$totalTime',
							},
						],
						// default if none of above are true (opened during shift and still open)
						default: { $subtract: [Date.parse(new Date()), '$startTime'] },
					},
				},
			},
		},
		{
			$addFields: {
				total_min: {
					$round: [{ $divide: ['$total_ms', 60000] }, 0],
				},
			},
		},

		{
			$group: {
				_id: {
					concern: '$concern',
					type: '$type',
				},
				sum_of_mins: {
					$sum: '$total_min',
				},
				sum_of_ms: {
					$sum: '$total_ms',
				},
				count: { $sum: 1 },
			},
		},
		{
			$addFields: {
				percent: '',
			},
		},
		{
			$addFields: {
				color: '',
			},
		},
		{ $sort: { sum_of_mins: -1, _id: 1 } },
	])

	for (let x of graphStoppages) {
		if (x._id.type === 'Breakdown') {
			x.color = 'rgb(238, 28, 37)'
		}
		if (x._id.type === 'Planned Stoppage') {
			x.color = 'grey'
		}
		if (x._id.type === 'Unplanned Stoppage') {
			x.color = 'rgb(0, 173, 238)'
		}
	}
	for (let x of graphStoppages) {
		x.percent = ((x.sum_of_ms / 1000 / secondsSinceEight) * 100).toFixed(1)
	}

	// console.log(graphStoppages)
	let axisLabels = []
	let secondLabels = []
	let data = []
	let colors = []

	for (let g of graphStoppages) {
		if (g.sum_of_mins === 1) {
			secondLabels.push(`${g.sum_of_mins} min - ${g.percent}%`)
		} else if (g.sum_of_mins === 0) {
			secondLabels.push(`< 1 min - ${g.percent}%`)
		} else {
			secondLabels.push(`${g.sum_of_mins} mins - ${g.percent}%`)
		}
		data.push(g.sum_of_mins)
		axisLabels.push(`${g._id.concern} (${g.count})`)
		colors.push(`${g.color}`)
	}

	const max = (Math.max(...data) / 100) * 130

	const stoppagesAll = [...openAndonArr, ...stoppages]

	res.render('machine/machine', {
		roles,
		andonTypes,
		andonConcerns,
		stoppagesAll,
		notes,
		unReadNotes,
		sumOfRunningTime,
		machine,
		stoppages,
		breakdownConcerns,
		plannedConcerns,
		unplannedConcerns,
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
		// shiftHours,
		// shiftKnownArray,
		// shiftUnknownArray,
		// shiftPartsArray,
		// shiftWireArray,
		margin,
		update,

		axisLabels,
		secondLabels,
		data,
		colors,
		max,
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
				active: true,
			},
		})

	let businessUnit = machines[0].businessUnit

	const foundUser = await MachineUser.findById(req.user._id)

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	const userAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})
	const shiftAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})

	res.render('machine/admin', {
		machines,
		shortBu,
		businessUnit,
		userAccess,
		shiftAccess,
	})
}

module.exports.vsHours = async (req, res) => {
	res.render('machine/vsHours', {})
}

//touch time

module.exports.touch = async (req, res) => {
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)
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

	// get the Planned Stoppage times BHL
	const machinesInShiftClosedKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownBHL = await Machine.find(searchOptionsBHL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownLDL = await Machine.find(searchOptionsLDL).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownCP = await Machine.find(searchOptionsCP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownHP = await Machine.find(searchOptionsHP).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownEM = await Machine.find(searchOptionsEM).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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

	// get the Planned Stoppage times LDL
	const machinesInShiftClosedKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnownCABS = await Machine.find(searchOptionsCABS).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
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
	let selection = ''
	const todayDB = new Date()
	todayDB.setHours(0, 0, 0, 0)
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	const sixDaysAgoDB = new Date(todayDB)

	sixDaysAgoDB.setDate(sixDaysAgoDB.getDate() - 7)

	// new bits

	// get the Planned Stoppage times
	const machinesInShiftClosedKnown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
		},
	})

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
				totKnownBdTime += stoppage.endTime - stoppage.shiftStart
				numOfKnown++
				if (machine.shortBu === 'BHL') {
					numOfKnownBHL++
					totBdTimeBHL += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'CABS') {
					numOfKnownCabs++
					totBdTimeCabs += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'CP') {
					numOfKnownCP++
					totBdTimeCP += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'EM') {
					numOfKnownEM++
					totBdTimeEM += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'HP') {
					numOfKnownHP++
					totBdTimeHP += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'LDL') {
					numOfKnownLDL++
					totBdTimeLDL += stoppage.endTime - stoppage.shiftStart
				}
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
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
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totKnownBdTime += Date.now() - new Date(machine.shiftStart)
				numOfKnown++
				if (machine.shortBu === 'BHL') {
					numOfKnownBHL++
					totBdTimeBHL += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'CABS') {
					numOfKnownCabs++
					totBdTimeCabs += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'CP') {
					numOfKnownCP++
					totBdTimeCP += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'EM') {
					numOfKnownEM++
					totBdTimeEM += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'HP') {
					numOfKnownHP++
					totBdTimeHP += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'LDL') {
					numOfKnownLDL++
					totBdTimeLDL += Date.now() - new Date(machine.shiftStart)
				}
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totKnownBdTime += machine.shiftEnd - todaysShifts
				numOfKnown++
				if (machine.shortBu === 'BHL') {
					numOfKnownBHL++
					totBdTimeBHL += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfKnownCabs++
					totBdTimeCabs += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfKnownCP++
					totBdTimeCP += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfKnownEM++
					totBdTimeEM += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfKnownHP++
					totBdTimeHP += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfKnownLDL++
					totBdTimeLDL += machine.shiftEnd - todaysShifts
				}
			}
		})
	}

	// get the Unplanned Stoppage times
	const machinesInShiftClosedUnknown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Unplanned Stoppage',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unplanned Stoppage',
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
				totUnknownBdTime += stoppage.endTime - stoppage.shiftStart
				numOfUnKnown++
				if (machine.shortBu === 'BHL') {
					numOfUnKnownBHL++
					totBdTimeBHL += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'CABS') {
					numOfUnKnownCabs++
					totBdTimeCabs += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'CP') {
					numOfUnKnownCP++
					totBdTimeCP += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'EM') {
					numOfUnKnownEM++
					totBdTimeEM += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'HP') {
					numOfUnKnownHP++
					totBdTimeHP += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'LDL') {
					numOfUnKnownLDL++
					totBdTimeLDL += stoppage.endTime - stoppage.shiftStart
				}
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
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
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totUnknownBdTime += Date.now() - new Date(machine.shiftStart)
				numOfUnKnown++
				if (machine.shortBu === 'BHL') {
					numOfUnKnownBHL++
					totBdTimeBHL += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'CABS') {
					numOfUnKnownCabs++
					totBdTimeCabs += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'CP') {
					numOfUnKnownCP++
					totBdTimeCP += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'EM') {
					numOfUnKnownEM++
					totBdTimeEM += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'HP') {
					numOfUnKnownHP++
					totBdTimeHP += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'LDL') {
					numOfUnKnownLDL++
					totBdTimeLDL += Date.now() - new Date(machine.shiftStart)
				}
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totUnKnownBdTime += machine.shiftEnd - todaysShifts
				numOfUnKnown++
				if (machine.shortBu === 'BHL') {
					numOfUnKnownBHL++
					totBdTimeBHL += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfUnKnownCabs++
					totBdTimeCabs += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfUnKnownCP++
					totBdTimeCP += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfUnKnownEM++
					totBdTimeEM += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfUnKnownHP++
					totBdTimeHP += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfUnKnownLDL++
					totBdTimeLDL += machine.shiftEnd - todaysShifts
				}
			}
		})
	}

	// get the parts breakdown times
	const machinesInShiftClosedParts = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
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
				totPartsBdTime += stoppage.endTime - stoppage.shiftStart
				numOfParts++
				if (machine.shortBu === 'BHL') {
					numOfPartsBHL++
					totBdTimeBHL += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'CABS') {
					numOfPartsCabs++
					totBdTimeCabs += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'CP') {
					numOfPartsCP++
					totBdTimeCP += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'EM') {
					numOfPartsEM++
					totBdTimeEM += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'HP') {
					numOfPartsHP++
					totBdTimeHP += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'LDL') {
					numOfPartsLDL++
					totBdTimeLDL += stoppage.endTime - stoppage.shiftStart
				}
			}
		})
	}

	for (let machine of machinesInShiftOpenParts) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
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
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totPartsBdTime += Date.now() - new Date(machine.shiftStart)
				numOfParts++
				if (machine.shortBu === 'BHL') {
					numOfPartsBHL++
					totBdTimeBHL += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'CABS') {
					numOfPartsCabs++
					totBdTimeCabs += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'CP') {
					numOfPartsCP++
					totBdTimeCP += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'EM') {
					numOfPartsEM++
					totBdTimeEM += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'HP') {
					numOfPartsHP++
					totBdTimeHP += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'LDL') {
					numOfPartsLDL++
					totBdTimeLDL += Date.now() - new Date(machine.shiftStart)
				}
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totPartsBdTime += machine.shiftEnd - todaysShifts
				numOfParts++
				if (machine.shortBu === 'BHL') {
					numOfPartsBHL++
					totBdTimeBHL += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfPartsCabs++
					totBdTimeCabs += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfPartsCP++
					totBdTimeCP += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfPartsEM++
					totBdTimeEM += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfPartsHP++
					totBdTimeHP += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfParts++
					totBdTimeLDL += machine.shiftEnd - todaysShifts
				}
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
			open: false,
			type: 'Breakdown',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({}).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Breakdown',
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
				totWireBdTime += stoppage.endTime - stoppage.shiftStart
				numOfConsumables++
				if (machine.shortBu === 'BHL') {
					numOfConsumablesBHL++
					totBdTimeBHL += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'CABS') {
					numOfConsumablesCabs++
					totBdTimeCabs += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'CP') {
					numOfConsumablesCP++
					totBdTimeCP += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'EM') {
					numOfConsumablesEM++
					totBdTimeEM += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'HP') {
					numOfConsumablesHP++
					totBdTimeHP += stoppage.endTime - stoppage.shiftStart
				}
				if (machine.shortBu === 'LDL') {
					numOfConsumablesLDL++
					totBdTimeLDL += stoppage.endTime - stoppage.shiftStart
				}
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
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
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totWireBdTime += Date.now() - new Date(machine.shiftStart)
				numOfConsumables++
				if (machine.shortBu === 'BHL') {
					numOfConsumablesBHL++
					totBdTimeBHL += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'CABS') {
					numOfConsumablesCabs++
					totBdTimeCabs += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'CP') {
					numOfConsumablesCP++
					totBdTimeCP += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'EM') {
					numOfConsumablesEM++
					totBdTimeEM += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'HP') {
					numOfConsumablesHP++
					totBdTimeHP += Date.now() - new Date(machine.shiftStart)
				}
				if (machine.shortBu === 'LDL') {
					numOfConsumablesLDL++
					totBdTimeLDL += Date.now() - new Date(machine.shiftStart)
				}
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totWireBdTime += machine.shiftEnd - todaysShifts
				numOfConsumables++
				if (machine.shortBu === 'BHL') {
					numOfConsumablesBHL++
					totBdTimeBHL += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'CABS') {
					numOfConsumablesCabs++
					totBdTimeCabs += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'CP') {
					numOfConsumablesCP++
					totBdTimeCP += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'EM') {
					numOfConsumablesEM++
					totBdTimeEM += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'HP') {
					numOfConsumablesHP++
					totBdTimeHP += machine.shiftEnd - todaysShifts
				}
				if (machine.shortBu === 'LDL') {
					numOfConsumablesLDL++
					totBdTimeLDL += machine.shiftEnd - todaysShifts
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
			totaltimeBHL += u.shiftEnd - u.shiftStart
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
			totaltimeCabs += u.shiftEnd - u.shiftStart
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
			totaltimeCP += u.shiftEnd - u.shiftStart
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
			totaltimeEM += u.shiftEnd - u.shiftStart
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
			totaltimeHP += u.shiftEnd - u.shiftStart
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
			totaltimeLDL += u.shiftEnd - u.shiftStart
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

	let timeArraySevenDaysAgoLDL = 0
	let timeArraySixDaysAgoLDL = 0
	let timeArrayFiveDaysAgoLDL = 0
	let timeArrayFourDaysAgoLDL = 0
	let timeArrayThreeDaysAgoLDL = 0
	let timeArrayTwoDaysAgoLDL = 0
	let timeArrayOneDayAgoLDL = 0

	let timeArraySevenDaysAgoCABS = 0
	let timeArraySixDaysAgoCABS = 0
	let timeArrayFiveDaysAgoCABS = 0
	let timeArrayFourDaysAgoCABS = 0
	let timeArrayThreeDaysAgoCABS = 0
	let timeArrayTwoDaysAgoCABS = 0
	let timeArrayOneDayAgoCABS = 0

	let timeArraySevenDaysAgoCP = 0
	let timeArraySixDaysAgoCP = 0
	let timeArrayFiveDaysAgoCP = 0
	let timeArrayFourDaysAgoCP = 0
	let timeArrayThreeDaysAgoCP = 0
	let timeArrayTwoDaysAgoCP = 0
	let timeArrayOneDayAgoCP = 0

	let timeArraySevenDaysAgoHP = 0
	let timeArraySixDaysAgoHP = 0
	let timeArrayFiveDaysAgoHP = 0
	let timeArrayFourDaysAgoHP = 0
	let timeArrayThreeDaysAgoHP = 0
	let timeArrayTwoDaysAgoHP = 0
	let timeArrayOneDayAgoHP = 0

	let timeArraySevenDaysAgoEM = 0
	let timeArraySixDaysAgoEM = 0
	let timeArrayFiveDaysAgoEM = 0
	let timeArrayFourDaysAgoEM = 0
	let timeArrayThreeDaysAgoEM = 0
	let timeArrayTwoDaysAgoEM = 0
	let timeArrayOneDayAgoEM = 0

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
			if (s.shortBu === 'CABS' && s.endDay === sixDaysAgoNumber) {
				timeArraySevenDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.endDay === fiveDaysAgoNumber) {
				timeArraySixDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.endDay === fourDaysAgoNumber) {
				timeArrayFiveDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.endDay === threeDaysAgoNumber) {
				timeArrayFourDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.endDay === twoDaysAgoNumber) {
				timeArrayThreeDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.endDay === oneDayAgoNumber) {
				timeArrayTwoDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.endDay === todayDayNumber) {
				timeArrayOneDayAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.endDay === sixDaysAgoNumber) {
				timeArraySevenDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.endDay === fiveDaysAgoNumber) {
				timeArraySixDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.endDay === fourDaysAgoNumber) {
				timeArrayFiveDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.endDay === threeDaysAgoNumber) {
				timeArrayFourDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.endDay === twoDaysAgoNumber) {
				timeArrayThreeDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.endDay === oneDayAgoNumber) {
				timeArrayTwoDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.endDay === todayDayNumber) {
				timeArrayOneDayAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.endDay === sixDaysAgoNumber) {
				timeArraySevenDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.endDay === fiveDaysAgoNumber) {
				timeArraySixDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.endDay === fourDaysAgoNumber) {
				timeArrayFiveDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.endDay === threeDaysAgoNumber) {
				timeArrayFourDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.endDay === twoDaysAgoNumber) {
				timeArrayThreeDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.endDay === oneDayAgoNumber) {
				timeArrayTwoDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.endDay === todayDayNumber) {
				timeArrayOneDayAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.endDay === sixDaysAgoNumber) {
				timeArraySevenDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.endDay === fiveDaysAgoNumber) {
				timeArraySixDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.endDay === fourDaysAgoNumber) {
				timeArrayFiveDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.endDay === threeDaysAgoNumber) {
				timeArrayFourDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.endDay === twoDaysAgoNumber) {
				timeArrayThreeDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.endDay === oneDayAgoNumber) {
				timeArrayTwoDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.endDay === todayDayNumber) {
				timeArrayOneDayAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.endDay === sixDaysAgoNumber) {
				timeArraySevenDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.endDay === fiveDaysAgoNumber) {
				timeArraySixDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.endDay === fourDaysAgoNumber) {
				timeArrayFiveDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.endDay === threeDaysAgoNumber) {
				timeArrayFourDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.endDay === twoDaysAgoNumber) {
				timeArrayThreeDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.endDay === oneDayAgoNumber) {
				timeArrayTwoDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.endDay === todayDayNumber) {
				timeArrayOneDayAgoLDL += s.theDayBeforeTime
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
			if (s.shortBu === 'CABS' && s.endDay === sevenDaysAgoNumber) {
				timeArraySevenDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.endDay === sixDaysAgoNumber) {
				timeArraySixDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.endDay === fiveDaysAgoNumber) {
				timeArrayFiveDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.endDay === fourDaysAgoNumber) {
				timeArrayFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.endDay === threeDaysAgoNumber) {
				timeArrayThreeDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.endDay === twoDaysAgoNumber) {
				timeArrayTwoDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.endDay === oneDayAgoNumber) {
				timeArrayOneDayAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.endDay === sevenDaysAgoNumber) {
				timeArraySevenDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.endDay === sixDaysAgoNumber) {
				timeArraySixDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.endDay === fiveDaysAgoNumber) {
				timeArrayFiveDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.endDay === fourDaysAgoNumber) {
				timeArrayFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.endDay === threeDaysAgoNumber) {
				timeArrayThreeDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.endDay === twoDaysAgoNumber) {
				timeArrayTwoDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.endDay === oneDayAgoNumber) {
				timeArrayOneDayAgoCP += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.endDay === sevenDaysAgoNumber) {
				timeArraySevenDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.endDay === sixDaysAgoNumber) {
				timeArraySixDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.endDay === fiveDaysAgoNumber) {
				timeArrayFiveDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.endDay === fourDaysAgoNumber) {
				timeArrayFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.endDay === threeDaysAgoNumber) {
				timeArrayThreeDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.endDay === twoDaysAgoNumber) {
				timeArrayTwoDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.endDay === oneDayAgoNumber) {
				timeArrayOneDayAgoEM += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.endDay === sevenDaysAgoNumber) {
				timeArraySevenDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.endDay === sixDaysAgoNumber) {
				timeArraySixDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.endDay === fiveDaysAgoNumber) {
				timeArrayFiveDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.endDay === fourDaysAgoNumber) {
				timeArrayFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.endDay === threeDaysAgoNumber) {
				timeArrayThreeDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.endDay === twoDaysAgoNumber) {
				timeArrayTwoDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.endDay === oneDayAgoNumber) {
				timeArrayOneDayAgoHP += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.endDay === sevenDaysAgoNumber) {
				timeArraySevenDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.endDay === sixDaysAgoNumber) {
				timeArraySixDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.endDay === fiveDaysAgoNumber) {
				timeArrayFiveDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.endDay === fourDaysAgoNumber) {
				timeArrayFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.endDay === threeDaysAgoNumber) {
				timeArrayThreeDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.endDay === twoDaysAgoNumber) {
				timeArrayTwoDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.endDay === oneDayAgoNumber) {
				timeArrayOneDayAgoLDL += s.theDayTime
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
	let timeArrayUnknownSixDaysAgoBHL = 0
	let timeArrayUnknownFiveDaysAgoBHL = 0
	let timeArrayUnknownFourDaysAgoBHL = 0
	let timeArrayUnknownThreeDaysAgoBHL = 0
	let timeArrayUnknownTwoDaysAgoBHL = 0
	let timeArrayUnknownOneDayAgoBHL = 0

	//parts times bhl
	let timeArrayPartsSevenDaysAgoBHL = 0
	let timeArrayPartsSixDaysAgoBHL = 0
	let timeArrayPartsFiveDaysAgoBHL = 0
	let timeArrayPartsFourDaysAgoBHL = 0
	let timeArrayPartsThreeDaysAgoBHL = 0
	let timeArrayPartsTwoDaysAgoBHL = 0
	let timeArrayPartsOneDayAgoBHL = 0

	//wire times bhl
	let timeArrayWireSevenDaysAgoBHL = 0
	let timeArrayWireSixDaysAgoBHL = 0
	let timeArrayWireFiveDaysAgoBHL = 0
	let timeArrayWireFourDaysAgoBHL = 0
	let timeArrayWireThreeDaysAgoBHL = 0
	let timeArrayWireTwoDaysAgoBHL = 0
	let timeArrayWireOneDayAgoBHL = 0

	//known times LDL
	let timeArrayKnownSevenDaysAgoLDL = 0
	let timeArrayKnownSixDaysAgoLDL = 0
	let timeArrayKnownFiveDaysAgoLDL = 0
	let timeArrayKnownFourDaysAgoLDL = 0
	let timeArrayKnownThreeDaysAgoLDL = 0
	let timeArrayKnownTwoDaysAgoLDL = 0
	let timeArrayKnownOneDayAgoLDL = 0

	//Unknown times LDL
	let timeArrayUnknownSevenDaysAgoLDL = 0
	let timeArrayUnknownSixDaysAgoLDL = 0
	let timeArrayUnknownFiveDaysAgoLDL = 0
	let timeArrayUnknownFourDaysAgoLDL = 0
	let timeArrayUnknownThreeDaysAgoLDL = 0
	let timeArrayUnknownTwoDaysAgoLDL = 0
	let timeArrayUnknownOneDayAgoLDL = 0

	//parts times LDL
	let timeArrayPartsSevenDaysAgoLDL = 0
	let timeArrayPartsSixDaysAgoLDL = 0
	let timeArrayPartsFiveDaysAgoLDL = 0
	let timeArrayPartsFourDaysAgoLDL = 0
	let timeArrayPartsThreeDaysAgoLDL = 0
	let timeArrayPartsTwoDaysAgoLDL = 0
	let timeArrayPartsOneDayAgoLDL = 0

	//wire times LDL
	let timeArrayWireSevenDaysAgoLDL = 0
	let timeArrayWireSixDaysAgoLDL = 0
	let timeArrayWireFiveDaysAgoLDL = 0
	let timeArrayWireFourDaysAgoLDL = 0
	let timeArrayWireThreeDaysAgoLDL = 0
	let timeArrayWireTwoDaysAgoLDL = 0
	let timeArrayWireOneDayAgoLDL = 0

	//cp

	//known times CP
	let timeArrayKnownSevenDaysAgoCP = 0
	let timeArrayKnownSixDaysAgoCP = 0
	let timeArrayKnownFiveDaysAgoCP = 0
	let timeArrayKnownFourDaysAgoCP = 0
	let timeArrayKnownThreeDaysAgoCP = 0
	let timeArrayKnownTwoDaysAgoCP = 0
	let timeArrayKnownOneDayAgoCP = 0

	//Unknown times CP
	let timeArrayUnknownSevenDaysAgoCP = 0
	let timeArrayUnknownSixDaysAgoCP = 0
	let timeArrayUnknownFiveDaysAgoCP = 0
	let timeArrayUnknownFourDaysAgoCP = 0
	let timeArrayUnknownThreeDaysAgoCP = 0
	let timeArrayUnknownTwoDaysAgoCP = 0
	let timeArrayUnknownOneDayAgoCP = 0

	//parts times CP
	let timeArrayPartsSevenDaysAgoCP = 0
	let timeArrayPartsSixDaysAgoCP = 0
	let timeArrayPartsFiveDaysAgoCP = 0
	let timeArrayPartsFourDaysAgoCP = 0
	let timeArrayPartsThreeDaysAgoCP = 0
	let timeArrayPartsTwoDaysAgoCP = 0
	let timeArrayPartsOneDayAgoCP = 0

	//wire times CP
	let timeArrayWireSevenDaysAgoCP = 0
	let timeArrayWireSixDaysAgoCP = 0
	let timeArrayWireFiveDaysAgoCP = 0
	let timeArrayWireFourDaysAgoCP = 0
	let timeArrayWireThreeDaysAgoCP = 0
	let timeArrayWireTwoDaysAgoCP = 0
	let timeArrayWireOneDayAgoCP = 0

	//hp

	//known times HP
	let timeArrayKnownSevenDaysAgoHP = 0
	let timeArrayKnownSixDaysAgoHP = 0
	let timeArrayKnownFiveDaysAgoHP = 0
	let timeArrayKnownFourDaysAgoHP = 0
	let timeArrayKnownThreeDaysAgoHP = 0
	let timeArrayKnownTwoDaysAgoHP = 0
	let timeArrayKnownOneDayAgoHP = 0

	//Unknown times HP
	let timeArrayUnknownSevenDaysAgoHP = 0
	let timeArrayUnknownSixDaysAgoHP = 0
	let timeArrayUnknownFiveDaysAgoHP = 0
	let timeArrayUnknownFourDaysAgoHP = 0
	let timeArrayUnknownThreeDaysAgoHP = 0
	let timeArrayUnknownTwoDaysAgoHP = 0
	let timeArrayUnknownOneDayAgoHP = 0

	//parts times HP
	let timeArrayPartsSevenDaysAgoHP = 0
	let timeArrayPartsSixDaysAgoHP = 0
	let timeArrayPartsFiveDaysAgoHP = 0
	let timeArrayPartsFourDaysAgoHP = 0
	let timeArrayPartsThreeDaysAgoHP = 0
	let timeArrayPartsTwoDaysAgoHP = 0
	let timeArrayPartsOneDayAgoHP = 0

	//wire times HP
	let timeArrayWireSevenDaysAgoHP = 0
	let timeArrayWireSixDaysAgoHP = 0
	let timeArrayWireFiveDaysAgoHP = 0
	let timeArrayWireFourDaysAgoHP = 0
	let timeArrayWireThreeDaysAgoHP = 0
	let timeArrayWireTwoDaysAgoHP = 0
	let timeArrayWireOneDayAgoHP = 0

	//em
	//known times EM
	let timeArrayKnownSevenDaysAgoEM = 0
	let timeArrayKnownSixDaysAgoEM = 0
	let timeArrayKnownFiveDaysAgoEM = 0
	let timeArrayKnownFourDaysAgoEM = 0
	let timeArrayKnownThreeDaysAgoEM = 0
	let timeArrayKnownTwoDaysAgoEM = 0
	let timeArrayKnownOneDayAgoEM = 0

	//Unknown times EM
	let timeArrayUnknownSevenDaysAgoEM = 0
	let timeArrayUnknownSixDaysAgoEM = 0
	let timeArrayUnknownFiveDaysAgoEM = 0
	let timeArrayUnknownFourDaysAgoEM = 0
	let timeArrayUnknownThreeDaysAgoEM = 0
	let timeArrayUnknownTwoDaysAgoEM = 0
	let timeArrayUnknownOneDayAgoEM = 0

	//parts times EM
	let timeArrayPartsSevenDaysAgoEM = 0
	let timeArrayPartsSixDaysAgoEM = 0
	let timeArrayPartsFiveDaysAgoEM = 0
	let timeArrayPartsFourDaysAgoEM = 0
	let timeArrayPartsThreeDaysAgoEM = 0
	let timeArrayPartsTwoDaysAgoEM = 0
	let timeArrayPartsOneDayAgoEM = 0

	//wire times EM
	let timeArrayWireSevenDaysAgoEM = 0
	let timeArrayWireSixDaysAgoEM = 0
	let timeArrayWireFiveDaysAgoEM = 0
	let timeArrayWireFourDaysAgoEM = 0
	let timeArrayWireThreeDaysAgoEM = 0
	let timeArrayWireTwoDaysAgoEM = 0
	let timeArrayWireOneDayAgoEM = 0

	//cabs
	//known times cabs
	let timeArrayKnownSevenDaysAgoCABS = 0
	let timeArrayKnownSixDaysAgoCABS = 0
	let timeArrayKnownFiveDaysAgoCABS = 0
	let timeArrayKnownFourDaysAgoCABS = 0
	let timeArrayKnownThreeDaysAgoCABS = 0
	let timeArrayKnownTwoDaysAgoCABS = 0
	let timeArrayKnownOneDayAgoCABS = 0

	//Unknown times cabs
	let timeArrayUnknownSevenDaysAgoCABS = 0
	let timeArrayUnknownSixDaysAgoCABS = 0
	let timeArrayUnknownFiveDaysAgoCABS = 0
	let timeArrayUnknownFourDaysAgoCABS = 0
	let timeArrayUnknownThreeDaysAgoCABS = 0
	let timeArrayUnknownTwoDaysAgoCABS = 0
	let timeArrayUnknownOneDayAgoCABS = 0

	//parts times cabs
	let timeArrayPartsSevenDaysAgoCABS = 0
	let timeArrayPartsSixDaysAgoCABS = 0
	let timeArrayPartsFiveDaysAgoCABS = 0
	let timeArrayPartsFourDaysAgoCABS = 0
	let timeArrayPartsThreeDaysAgoCABS = 0
	let timeArrayPartsTwoDaysAgoCABS = 0
	let timeArrayPartsOneDayAgoCABS = 0

	//wire times cabs
	let timeArrayWireSevenDaysAgoCABS = 0
	let timeArrayWireSixDaysAgoCABS = 0
	let timeArrayWireFiveDaysAgoCABS = 0
	let timeArrayWireFourDaysAgoCABS = 0
	let timeArrayWireThreeDaysAgoCABS = 0
	let timeArrayWireTwoDaysAgoCABS = 0
	let timeArrayWireOneDayAgoCABS = 0

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

	//bhl

	for (let s of stoppagesLastSevenDays) {
		if (s.endDay > s.startDay) {
			s.midnight = new Date(s.updatedAt)
			s.midnight.setHours(0, 0, 0, 0)
			s.theDayBeforeTime = s.midnight - s.createdAt
			s.theDayTime = s.updatedAt - s.midnight
			//Kown times
			//day before
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownSixDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownFourDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownTwoDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayKnownOneDayAgoBHL += s.theDayBeforeTime
			}

			//unknown
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownTwoDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayUnknownOneDayAgoBHL += s.theDayBeforeTime
			}

			//parts

			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoBHL += s.theDayBeforeTime
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
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSevenDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireSixDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFiveDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireFourDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireThreeDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireTwoDaysAgoBHL += s.theDayBeforeTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === todayDayNumber) {
				timeArrayWireOneDayAgoBHL += s.theDayBeforeTime
			}

			//loadall graph day before

			//day before
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownSixDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownFourDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownTwoDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayKnownOneDayAgoLDL += s.theDayBeforeTime
			}

			//unknown
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownTwoDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayUnknownOneDayAgoLDL += s.theDayBeforeTime
			}

			//parts

			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsSixDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsFourDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsTwoDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === todayDayNumber) {
				timeArrayPartsOneDayAgoLDL += s.theDayBeforeTime
			}

			//wire
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSevenDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireSixDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFiveDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireFourDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireThreeDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireTwoDaysAgoLDL += s.theDayBeforeTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === todayDayNumber) {
				timeArrayWireOneDayAgoLDL += s.theDayBeforeTime
			}

			// cp graph day before

			//day before
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownSixDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownFourDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownTwoDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayKnownOneDayAgoCP += s.theDayBeforeTime
			}

			//unknown
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownTwoDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayUnknownOneDayAgoCP += s.theDayBeforeTime
			}

			//parts

			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsSixDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsFourDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsTwoDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === todayDayNumber) {
				timeArrayPartsOneDayAgoCP += s.theDayBeforeTime
			}

			//wire
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSevenDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireSixDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFiveDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireFourDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireThreeDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireTwoDaysAgoCP += s.theDayBeforeTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === todayDayNumber) {
				timeArrayWireOneDayAgoCP += s.theDayBeforeTime
			}

			//hp day before
			//day before
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownSixDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownFourDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownTwoDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayKnownOneDayAgoHP += s.theDayBeforeTime
			}

			//unknown
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownTwoDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayUnknownOneDayAgoHP += s.theDayBeforeTime
			}

			//parts

			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsSixDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsFourDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsTwoDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === todayDayNumber) {
				timeArrayPartsOneDayAgoHP += s.theDayBeforeTime
			}

			//wire
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSevenDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireSixDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFiveDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireFourDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireThreeDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireTwoDaysAgoHP += s.theDayBeforeTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === todayDayNumber) {
				timeArrayWireOneDayAgoHP += s.theDayBeforeTime
			}

			//em day before
			//day before
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownSixDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownFourDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownTwoDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayKnownOneDayAgoEM += s.theDayBeforeTime
			}

			//unknown
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownTwoDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayUnknownOneDayAgoEM += s.theDayBeforeTime
			}

			//parts

			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsSixDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsFourDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsTwoDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === todayDayNumber) {
				timeArrayPartsOneDayAgoEM += s.theDayBeforeTime
			}

			//wire
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSevenDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireSixDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFiveDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireFourDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireThreeDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireTwoDaysAgoEM += s.theDayBeforeTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === todayDayNumber) {
				timeArrayWireOneDayAgoEM += s.theDayBeforeTime
			}

			//cabs day before
			//day before
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownSixDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownFourDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownTwoDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayKnownOneDayAgoCABS += s.theDayBeforeTime
			}

			//unknown
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownTwoDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === todayDayNumber) {
				timeArrayUnknownOneDayAgoCABS += s.theDayBeforeTime
			}

			//parts

			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsSixDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsFourDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsTwoDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === todayDayNumber) {
				timeArrayPartsOneDayAgoCABS += s.theDayBeforeTime
			}

			//wire
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSevenDaysAgoECABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireSixDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFiveDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireFourDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireThreeDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireTwoDaysAgoCABS += s.theDayBeforeTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === todayDayNumber) {
				timeArrayWireOneDayAgoCABS += s.theDayBeforeTime
			}
		}

		//same day
		if (s.endDay === s.startDay) {
			s.theDayTime = s.updatedAt - s.createdAt
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSixDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownTwoDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownOneDayAgoBHL += s.theDayTime
			}

			//Unplanned Stoppage
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownTwoDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownOneDayAgoBHL += s.theDayTime
			}
			// parts

			if (s.shortBu === 'BHL' && s.type === 'Waiting for parts' && s.endDay === sevenDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoBHL += s.theDayTime
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
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === sevenDaysAgoNumber) {
				timeArrayWireSevenDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSixDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireFiveDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireThreeDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireTwoDaysAgoBHL += s.theDayTime
			}
			if (s.shortBu === 'BHL' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireOneDayAgoBHL += s.theDayTime
			}

			//same day loadall
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSixDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownTwoDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownOneDayAgoLDL += s.theDayTime
			}

			//Unplanned Stoppage
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownTwoDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownOneDayAgoLDL += s.theDayTime
			}
			// parts

			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === sevenDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSixDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsTwoDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsOneDayAgoLDL += s.theDayTime
			}

			//wire bhl
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === sevenDaysAgoNumber) {
				timeArrayWireSevenDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSixDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireFiveDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireThreeDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireTwoDaysAgoLDL += s.theDayTime
			}
			if (s.shortBu === 'LDL' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireOneDayAgoLDL += s.theDayTime
			}

			//cp same day
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSixDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownTwoDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownOneDayAgoCP += s.theDayTime
			}

			//Unplanned Stoppage
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownTwoDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownOneDayAgoCP += s.theDayTime
			}
			// parts

			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === sevenDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSixDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsTwoDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsOneDayAgoCP += s.theDayTime
			}

			//wire bhl
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === sevenDaysAgoNumber) {
				timeArrayWireSevenDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSixDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireFiveDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireThreeDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireTwoDaysAgoCP += s.theDayTime
			}
			if (s.shortBu === 'CP' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireOneDayAgoCP += s.theDayTime
			}

			// hp same day
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSixDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownTwoDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownOneDayAgoHP += s.theDayTime
			}

			//Unplanned Stoppage
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownTwoDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownOneDayAgoHP += s.theDayTime
			}
			// parts

			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === sevenDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSixDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsTwoDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsOneDayAgoHP += s.theDayTime
			}

			//wire bhl
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === sevenDaysAgoNumber) {
				timeArrayWireSevenDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSixDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireFiveDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireThreeDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireTwoDaysAgoHP += s.theDayTime
			}
			if (s.shortBu === 'HP' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireOneDayAgoHP += s.theDayTime
			}

			//em same day
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSixDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownTwoDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownOneDayAgoEM += s.theDayTime
			}

			//Unplanned Stoppage
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownTwoDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownOneDayAgoEM += s.theDayTime
			}
			// parts

			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === sevenDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSixDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsTwoDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsOneDayAgoEM += s.theDayTime
			}

			//wire bhl
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === sevenDaysAgoNumber) {
				timeArrayWireSevenDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSixDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireFiveDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireThreeDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireTwoDaysAgoEM += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireOneDayAgoEM += s.theDayTime
			}

			//cabs same day
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayKnownSevenDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayKnownSixDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayKnownFiveDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayKnownFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayKnownThreeDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayKnownTwoDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Planned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayKnownOneDayAgoCABS += s.theDayTime
			}

			//Unplanned Stoppage
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === sevenDaysAgoNumber) {
				timeArrayUnknownSevenDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === sixDaysAgoNumber) {
				timeArrayUnknownSixDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'EM' && s.type === 'Unplanned Stoppage' && s.endDay === fiveDaysAgoNumber) {
				timeArrayUnknownFiveDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === fourDaysAgoNumber) {
				timeArrayUnknownFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === threeDaysAgoNumber) {
				timeArrayUnknownThreeDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === twoDaysAgoNumber) {
				timeArrayUnknownTwoDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Unplanned Stoppage' && s.endDay === oneDayAgoNumber) {
				timeArrayUnknownOneDayAgoCABS += s.theDayTime
			}
			// parts

			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === sevenDaysAgoNumber) {
				timeArrayPartsSevenDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === sixDaysAgoNumber) {
				timeArrayPartsSixDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === fiveDaysAgoNumber) {
				timeArrayPartsFiveDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === fourDaysAgoNumber) {
				timeArrayPartsFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === threeDaysAgoNumber) {
				timeArrayPartsThreeDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === twoDaysAgoNumber) {
				timeArrayPartsTwoDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Waiting for parts' && s.endDay === oneDayAgoNumber) {
				timeArrayPartsOneDayAgoCABS += s.theDayTime
			}

			//wire bhl
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === sevenDaysAgoNumber) {
				timeArrayWireSevenDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === sixDaysAgoNumber) {
				timeArrayWireSixDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === fiveDaysAgoNumber) {
				timeArrayWireFiveDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === fourDaysAgoNumber) {
				timeArrayWireFourDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === threeDaysAgoNumber) {
				timeArrayWireThreeDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === twoDaysAgoNumber) {
				timeArrayWireTwoDaysAgoCABS += s.theDayTime
			}
			if (s.shortBu === 'CABS' && s.type === 'Breakdown' && s.endDay === oneDayAgoNumber) {
				timeArrayWireOneDayAgoCABS += s.theDayTime
			}
		}
	}

	//bhl graph data
	let knownPercentSevenDaysAgoBHL = ((timeArrayKnownSevenDaysAgoBHL / timeArraySevenDaysAgoBHL) * 100).toFixed(1)
	let UnknownPercentSevenDaysAgoBHL = ((timeArrayUnknownSevenDaysAgoBHL / timeArraySevenDaysAgoBHL) * 100).toFixed(1)
	let partsPercentSevenDaysAgoBHL = ((timeArrayPartsSevenDaysAgoBHL / timeArraySevenDaysAgoBHL) * 100).toFixed(1)
	let wirePercentSevenDaysAgoBHL = ((timeArrayWireSevenDaysAgoBHL / timeArraySevenDaysAgoBHL) * 100).toFixed(1)

	let knownPercentSixDaysAgoBHL = ((timeArrayKnownSixDaysAgoBHL / timeArraySixDaysAgoBHL) * 100).toFixed(1)
	let UnknownPercentSixDaysAgoBHL = ((timeArrayUnknownSixDaysAgoBHL / timeArraySixDaysAgoBHL) * 100).toFixed(1)
	let partsPercentSixDaysAgoBHL = ((timeArrayPartsSixDaysAgoBHL / timeArraySixDaysAgoBHL) * 100).toFixed(1)
	let wirePercentSixDaysAgoBHL = ((timeArrayWireSixDaysAgoBHL / timeArraySixDaysAgoBHL) * 100).toFixed(1)

	let knownPercentFiveDaysAgoBHL = ((timeArrayKnownFiveDaysAgoBHL / timeArrayFiveDaysAgoBHL) * 100).toFixed(1)
	let UnknownPercentFiveDaysAgoBHL = ((timeArrayUnknownFiveDaysAgoBHL / timeArrayFiveDaysAgoBHL) * 100).toFixed(1)
	let partsPercentFiveDaysAgoBHL = ((timeArrayPartsFiveDaysAgoBHL / timeArrayFiveDaysAgoBHL) * 100).toFixed(1)
	let wirePercentFiveDaysAgoBHL = ((timeArrayWireFiveDaysAgoBHL / timeArrayFiveDaysAgoBHL) * 100).toFixed(1)

	let knownPercentFourDaysAgoBHL = ((timeArrayKnownFourDaysAgoBHL / timeArrayFourDaysAgoBHL) * 100).toFixed(1)
	let UnknownPercentFourDaysAgoBHL = ((timeArrayUnknownFourDaysAgoBHL / timeArrayFourDaysAgoBHL) * 100).toFixed(1)
	let partsPercentFourDaysAgoBHL = ((timeArrayPartsFourDaysAgoBHL / timeArrayFourDaysAgoBHL) * 100).toFixed(1)
	let wirePercentFourDaysAgoBHL = ((timeArrayWireFourDaysAgoBHL / timeArrayFourDaysAgoBHL) * 100).toFixed(1)

	let knownPercentThreeDaysAgoBHL = ((timeArrayKnownThreeDaysAgoBHL / timeArrayThreeDaysAgoBHL) * 100).toFixed(1)
	let UnknownPercentThreeDaysAgoBHL = ((timeArrayUnknownThreeDaysAgoBHL / timeArrayThreeDaysAgoBHL) * 100).toFixed(1)
	let partsPercentThreeDaysAgoBHL = ((timeArrayPartsThreeDaysAgoBHL / timeArrayThreeDaysAgoBHL) * 100).toFixed(1)
	let wirePercentThreeDaysAgoBHL = ((timeArrayWireThreeDaysAgoBHL / timeArrayThreeDaysAgoBHL) * 100).toFixed(1)

	let knownPercentTwoDaysAgoBHL = ((timeArrayKnownTwoDaysAgoBHL / timeArrayTwoDaysAgoBHL) * 100).toFixed(1)
	let UnknownPercentTwoDaysAgoBHL = ((timeArrayUnknownTwoDaysAgoBHL / timeArrayTwoDaysAgoBHL) * 100).toFixed(1)
	let partsPercentTwoDaysAgoBHL = ((timeArrayPartsTwoDaysAgoBHL / timeArrayTwoDaysAgoBHL) * 100).toFixed(1)
	let wirePercentTwoDaysAgoBHL = ((timeArrayWireTwoDaysAgoBHL / timeArrayTwoDaysAgoBHL) * 100).toFixed(1)

	let knownPercentOneDayAgoBHL = ((timeArrayKnownOneDayAgoBHL / timeArrayOneDayAgoBHL) * 100).toFixed(1)
	let UnknownPercentOneDayAgoBHL = ((timeArrayUnknownOneDayAgoBHL / timeArrayOneDayAgoBHL) * 100).toFixed(1)
	let partsPercentOneDayAgoBHL = ((timeArrayPartsOneDayAgoBHL / timeArrayOneDayAgoBHL) * 100).toFixed(1)
	let wirePercentOneDayAgoBHL = ((timeArrayWireOneDayAgoBHL / timeArrayOneDayAgoBHL) * 100).toFixed(1)

	//ldl graph data
	let knownPercentSevenDaysAgoLDL = ((timeArrayKnownSevenDaysAgoLDL / timeArraySevenDaysAgoLDL) * 100).toFixed(1)
	let UnknownPercentSevenDaysAgoLDL = ((timeArrayUnknownSevenDaysAgoLDL / timeArraySevenDaysAgoLDL) * 100).toFixed(1)
	let partsPercentSevenDaysAgoLDL = ((timeArrayPartsSevenDaysAgoLDL / timeArraySevenDaysAgoLDL) * 100).toFixed(1)
	let wirePercentSevenDaysAgoLDL = ((timeArrayWireSevenDaysAgoLDL / timeArraySevenDaysAgoLDL) * 100).toFixed(1)

	let knownPercentSixDaysAgoLDL = ((timeArrayKnownSixDaysAgoLDL / timeArraySixDaysAgoLDL) * 100).toFixed(1)
	let UnknownPercentSixDaysAgoLDL = ((timeArrayUnknownSixDaysAgoLDL / timeArraySixDaysAgoLDL) * 100).toFixed(1)
	let partsPercentSixDaysAgoLDL = ((timeArrayPartsSixDaysAgoLDL / timeArraySixDaysAgoLDL) * 100).toFixed(1)
	let wirePercentSixDaysAgoLDL = ((timeArrayWireSixDaysAgoLDL / timeArraySixDaysAgoLDL) * 100).toFixed(1)

	let knownPercentFiveDaysAgoLDL = ((timeArrayKnownFiveDaysAgoLDL / timeArrayFiveDaysAgoLDL) * 100).toFixed(1)
	let UnknownPercentFiveDaysAgoLDL = ((timeArrayUnknownFiveDaysAgoLDL / timeArrayFiveDaysAgoLDL) * 100).toFixed(1)
	let partsPercentFiveDaysAgoLDL = ((timeArrayPartsFiveDaysAgoLDL / timeArrayFiveDaysAgoLDL) * 100).toFixed(1)
	let wirePercentFiveDaysAgoLDL = ((timeArrayWireFiveDaysAgoLDL / timeArrayFiveDaysAgoLDL) * 100).toFixed(1)

	let knownPercentFourDaysAgoLDL = ((timeArrayKnownFourDaysAgoLDL / timeArrayFourDaysAgoLDL) * 100).toFixed(1)
	let UnknownPercentFourDaysAgoLDL = ((timeArrayUnknownFourDaysAgoLDL / timeArrayFourDaysAgoLDL) * 100).toFixed(1)
	let partsPercentFourDaysAgoLDL = ((timeArrayPartsFourDaysAgoLDL / timeArrayFourDaysAgoLDL) * 100).toFixed(1)
	let wirePercentFourDaysAgoLDL = ((timeArrayWireFourDaysAgoLDL / timeArrayFourDaysAgoLDL) * 100).toFixed(1)

	let knownPercentThreeDaysAgoLDL = ((timeArrayKnownThreeDaysAgoLDL / timeArrayThreeDaysAgoLDL) * 100).toFixed(1)
	let UnknownPercentThreeDaysAgoLDL = ((timeArrayUnknownThreeDaysAgoLDL / timeArrayThreeDaysAgoLDL) * 100).toFixed(1)
	let partsPercentThreeDaysAgoLDL = ((timeArrayPartsThreeDaysAgoLDL / timeArrayThreeDaysAgoLDL) * 100).toFixed(1)
	let wirePercentThreeDaysAgoLDL = ((timeArrayWireThreeDaysAgoLDL / timeArrayThreeDaysAgoLDL) * 100).toFixed(1)

	let knownPercentTwoDaysAgoLDL = ((timeArrayKnownTwoDaysAgoLDL / timeArrayTwoDaysAgoLDL) * 100).toFixed(1)
	let UnknownPercentTwoDaysAgoLDL = ((timeArrayUnknownTwoDaysAgoLDL / timeArrayTwoDaysAgoLDL) * 100).toFixed(1)
	let partsPercentTwoDaysAgoLDL = ((timeArrayPartsTwoDaysAgoLDL / timeArrayTwoDaysAgoLDL) * 100).toFixed(1)
	let wirePercentTwoDaysAgoLDL = ((timeArrayWireTwoDaysAgoLDL / timeArrayTwoDaysAgoLDL) * 100).toFixed(1)

	let knownPercentOneDayAgoLDL = ((timeArrayKnownOneDayAgoLDL / timeArrayOneDayAgoLDL) * 100).toFixed(1)
	let UnknownPercentOneDayAgoLDL = ((timeArrayUnknownOneDayAgoLDL / timeArrayOneDayAgoLDL) * 100).toFixed(1)
	let partsPercentOneDayAgoLDL = ((timeArrayPartsOneDayAgoLDL / timeArrayOneDayAgoLDL) * 100).toFixed(1)
	let wirePercentOneDayAgoLDL = ((timeArrayWireOneDayAgoLDL / timeArrayOneDayAgoLDL) * 100).toFixed(1)

	//cabs graph data

	let knownPercentSevenDaysAgoCABS = ((timeArrayKnownSevenDaysAgoCABS / timeArraySevenDaysAgoCABS) * 100).toFixed(1)
	let UnknownPercentSevenDaysAgoCABS = ((timeArrayUnknownSevenDaysAgoCABS / timeArraySevenDaysAgoCABS) * 100).toFixed(1)
	let partsPercentSevenDaysAgoCABS = ((timeArrayPartsSevenDaysAgoCABS / timeArraySevenDaysAgoCABS) * 100).toFixed(1)
	let wirePercentSevenDaysAgoCABS = ((timeArrayWireSevenDaysAgoCABS / timeArraySevenDaysAgoCABS) * 100).toFixed(1)

	let knownPercentSixDaysAgoCABS = ((timeArrayKnownSixDaysAgoCABS / timeArraySixDaysAgoCABS) * 100).toFixed(1)
	let UnknownPercentSixDaysAgoCABS = ((timeArrayUnknownSixDaysAgoCABS / timeArraySixDaysAgoCABS) * 100).toFixed(1)
	let partsPercentSixDaysAgoCABS = ((timeArrayPartsSixDaysAgoCABS / timeArraySixDaysAgoCABS) * 100).toFixed(1)
	let wirePercentSixDaysAgoCABS = ((timeArrayWireSixDaysAgoCABS / timeArraySixDaysAgoCABS) * 100).toFixed(1)

	let knownPercentFiveDaysAgoCABS = ((timeArrayKnownFiveDaysAgoCABS / timeArrayFiveDaysAgoCABS) * 100).toFixed(1)
	let UnknownPercentFiveDaysAgoCABS = ((timeArrayUnknownFiveDaysAgoCABS / timeArrayFiveDaysAgoCABS) * 100).toFixed(1)
	let partsPercentFiveDaysAgoCABS = ((timeArrayPartsFiveDaysAgoCABS / timeArrayFiveDaysAgoCABS) * 100).toFixed(1)
	let wirePercentFiveDaysAgoCABS = ((timeArrayWireFiveDaysAgoCABS / timeArrayFiveDaysAgoCABS) * 100).toFixed(1)

	let knownPercentFourDaysAgoCABS = ((timeArrayKnownFourDaysAgoCABS / timeArrayFourDaysAgoCABS) * 100).toFixed(1)
	let UnknownPercentFourDaysAgoCABS = ((timeArrayUnknownFourDaysAgoCABS / timeArrayFourDaysAgoCABS) * 100).toFixed(1)
	let partsPercentFourDaysAgoCABS = ((timeArrayPartsFourDaysAgoCABS / timeArrayFourDaysAgoCABS) * 100).toFixed(1)
	let wirePercentFourDaysAgoCABS = ((timeArrayWireFourDaysAgoCABS / timeArrayFourDaysAgoCABS) * 100).toFixed(1)

	let knownPercentThreeDaysAgoCABS = ((timeArrayKnownThreeDaysAgoCABS / timeArrayThreeDaysAgoCABS) * 100).toFixed(1)
	let UnknownPercentThreeDaysAgoCABS = ((timeArrayUnknownThreeDaysAgoCABS / timeArrayThreeDaysAgoCABS) * 100).toFixed(1)
	let partsPercentThreeDaysAgoCABS = ((timeArrayPartsThreeDaysAgoCABS / timeArrayThreeDaysAgoCABS) * 100).toFixed(1)
	let wirePercentThreeDaysAgoCABS = ((timeArrayWireThreeDaysAgoCABS / timeArrayThreeDaysAgoCABS) * 100).toFixed(1)

	let knownPercentTwoDaysAgoCABS = ((timeArrayKnownTwoDaysAgoCABS / timeArrayTwoDaysAgoCABS) * 100).toFixed(1)
	let UnknownPercentTwoDaysAgoCABS = ((timeArrayUnknownTwoDaysAgoCABS / timeArrayTwoDaysAgoCABS) * 100).toFixed(1)
	let partsPercentTwoDaysAgoCABS = ((timeArrayPartsTwoDaysAgoCABS / timeArrayTwoDaysAgoCABS) * 100).toFixed(1)
	let wirePercentTwoDaysAgoCABS = ((timeArrayWireTwoDaysAgoCABS / timeArrayTwoDaysAgoCABS) * 100).toFixed(1)

	let knownPercentOneDayAgoCABS = ((timeArrayKnownOneDayAgoCABS / timeArrayOneDayAgoCABS) * 100).toFixed(1)
	let UnknownPercentOneDayAgoCABS = ((timeArrayUnknownOneDayAgoCABS / timeArrayOneDayAgoCABS) * 100).toFixed(1)
	let partsPercentOneDayAgoCABS = ((timeArrayPartsOneDayAgoCABS / timeArrayOneDayAgoCABS) * 100).toFixed(1)
	let wirePercentOneDayAgoCABS = ((timeArrayWireOneDayAgoCABS / timeArrayOneDayAgoCABS) * 100).toFixed(1)

	//cp graph data

	let knownPercentSevenDaysAgoCP = ((timeArrayKnownSevenDaysAgoCP / timeArraySevenDaysAgoCP) * 100).toFixed(1)
	let UnknownPercentSevenDaysAgoCP = ((timeArrayUnknownSevenDaysAgoCP / timeArraySevenDaysAgoCP) * 100).toFixed(1)
	let partsPercentSevenDaysAgoCP = ((timeArrayPartsSevenDaysAgoCP / timeArraySevenDaysAgoCP) * 100).toFixed(1)
	let wirePercentSevenDaysAgoCP = ((timeArrayWireSevenDaysAgoCP / timeArraySevenDaysAgoCP) * 100).toFixed(1)

	let knownPercentSixDaysAgoCP = ((timeArrayKnownSixDaysAgoCP / timeArraySixDaysAgoCP) * 100).toFixed(1)

	let UnknownPercentSixDaysAgoCP = ((timeArrayUnknownSixDaysAgoCP / timeArraySixDaysAgoCP) * 100).toFixed(1)
	let partsPercentSixDaysAgoCP = ((timeArrayPartsSixDaysAgoCP / timeArraySixDaysAgoCP) * 100).toFixed(1)
	let wirePercentSixDaysAgoCP = ((timeArrayWireSixDaysAgoCP / timeArraySixDaysAgoCP) * 100).toFixed(1)

	let knownPercentFiveDaysAgoCP = ((timeArrayKnownFiveDaysAgoCP / timeArrayFiveDaysAgoCP) * 100).toFixed(1)
	let UnknownPercentFiveDaysAgoCP = ((timeArrayUnknownFiveDaysAgoCP / timeArrayFiveDaysAgoCP) * 100).toFixed(1)
	let partsPercentFiveDaysAgoCP = ((timeArrayPartsFiveDaysAgoCP / timeArrayFiveDaysAgoCP) * 100).toFixed(1)
	let wirePercentFiveDaysAgoCP = ((timeArrayWireFiveDaysAgoCP / timeArrayFiveDaysAgoCP) * 100).toFixed(1)

	let knownPercentFourDaysAgoCP = ((timeArrayKnownFourDaysAgoCP / timeArrayFourDaysAgoLDL) * 100).toFixed(1)
	let UnknownPercentFourDaysAgoCP = ((timeArrayUnknownFourDaysAgoCP / timeArrayFourDaysAgoCP) * 100).toFixed(1)
	let partsPercentFourDaysAgoCP = ((timeArrayPartsFourDaysAgoCP / timeArrayFourDaysAgoCP) * 100).toFixed(1)
	let wirePercentFourDaysAgoCP = ((timeArrayWireFourDaysAgoCP / timeArrayFourDaysAgoLDL) * 100).toFixed(1)

	let knownPercentThreeDaysAgoCP = ((timeArrayKnownThreeDaysAgoCP / timeArrayThreeDaysAgoCP) * 100).toFixed(1)

	let UnknownPercentThreeDaysAgoCP = ((timeArrayUnknownThreeDaysAgoCP / timeArrayThreeDaysAgoCP) * 100).toFixed(1)
	let partsPercentThreeDaysAgoCP = ((timeArrayPartsThreeDaysAgoCP / timeArrayThreeDaysAgoLDL) * 100).toFixed(1)
	let wirePercentThreeDaysAgoCP = ((timeArrayWireThreeDaysAgoCP / timeArrayThreeDaysAgoCP) * 100).toFixed(1)

	let knownPercentTwoDaysAgoCP = ((timeArrayKnownTwoDaysAgoCP / timeArrayTwoDaysAgoLDL) * 100).toFixed(1)
	let UnknownPercentTwoDaysAgoCP = ((timeArrayUnknownTwoDaysAgoCP / timeArrayTwoDaysAgoLDL) * 100).toFixed(1)
	let partsPercentTwoDaysAgoCP = ((timeArrayPartsTwoDaysAgoCP / timeArrayTwoDaysAgoLDL) * 100).toFixed(1)
	let wirePercentTwoDaysAgoCP = ((timeArrayWireTwoDaysAgoCP / timeArrayTwoDaysAgoCP) * 100).toFixed(1)

	let knownPercentOneDayAgoCP = ((timeArrayKnownOneDayAgoCP / timeArrayOneDayAgoLDL) * 100).toFixed(1)
	let UnknownPercentOneDayAgoCP = ((timeArrayUnknownOneDayAgoCP / timeArrayOneDayAgoLDL) * 100).toFixed(1)
	let partsPercentOneDayAgoCP = ((timeArrayPartsOneDayAgoCP / timeArrayOneDayAgoLDL) * 100).toFixed(1)
	let wirePercentOneDayAgoCP = ((timeArrayWireOneDayAgoCP / timeArrayOneDayAgoLDL) * 100).toFixed(1)

	//hp graph data

	let knownPercentSevenDaysAgoHP = ((timeArrayKnownSevenDaysAgoHP / timeArraySevenDaysAgoHP) * 100).toFixed(1)
	let UnknownPercentSevenDaysAgoHP = ((timeArrayUnknownSevenDaysAgoHP / timeArraySevenDaysAgoHP) * 100).toFixed(1)
	let partsPercentSevenDaysAgoHP = ((timeArrayPartsSevenDaysAgoHP / timeArraySevenDaysAgoHP) * 100).toFixed(1)
	let wirePercentSevenDaysAgoHP = ((timeArrayWireSevenDaysAgoHP / timeArraySevenDaysAgoHP) * 100).toFixed(1)

	let knownPercentSixDaysAgoHP = ((timeArrayKnownSixDaysAgoHP / timeArraySixDaysAgoHP) * 100).toFixed(1)
	let UnknownPercentSixDaysAgoHP = ((timeArrayUnknownSixDaysAgoHP / timeArraySixDaysAgoHP) * 100).toFixed(1)
	let partsPercentSixDaysAgoHP = ((timeArrayPartsSixDaysAgoHP / timeArraySixDaysAgoHP) * 100).toFixed(1)
	let wirePercentSixDaysAgoHP = ((timeArrayWireSixDaysAgoHP / timeArraySixDaysAgoHP) * 100).toFixed(1)

	let knownPercentFiveDaysAgoHP = ((timeArrayKnownFiveDaysAgoHP / timeArrayFiveDaysAgoHP) * 100).toFixed(1)
	let UnknownPercentFiveDaysAgoHP = ((timeArrayUnknownFiveDaysAgoHP / timeArrayFiveDaysAgoHP) * 100).toFixed(1)
	let partsPercentFiveDaysAgoHP = ((timeArrayPartsFiveDaysAgoHP / timeArrayFiveDaysAgoHP) * 100).toFixed(1)
	let wirePercentFiveDaysAgoHP = ((timeArrayWireFiveDaysAgoHP / timeArrayFiveDaysAgoHP) * 100).toFixed(1)

	let knownPercentFourDaysAgoHP = ((timeArrayKnownFourDaysAgoHP / timeArrayFourDaysAgoHP) * 100).toFixed(1)
	let UnknownPercentFourDaysAgoHP = ((timeArrayUnknownFourDaysAgoHP / timeArrayFourDaysAgoHP) * 100).toFixed(1)
	let partsPercentFourDaysAgoHP = ((timeArrayPartsFourDaysAgoHP / timeArrayFourDaysAgoHP) * 100).toFixed(1)
	let wirePercentFourDaysAgoHP = ((timeArrayWireFourDaysAgoHP / timeArrayFourDaysAgoHP) * 100).toFixed(1)

	let knownPercentThreeDaysAgoHP = ((timeArrayKnownThreeDaysAgoHP / timeArrayThreeDaysAgoHP) * 100).toFixed(1)
	let UnknownPercentThreeDaysAgoHP = ((timeArrayUnknownThreeDaysAgoHP / timeArrayThreeDaysAgoHP) * 100).toFixed(1)
	let partsPercentThreeDaysAgoHP = ((timeArrayPartsThreeDaysAgoHP / timeArrayThreeDaysAgoHP) * 100).toFixed(1)
	let wirePercentThreeDaysAgoHP = ((timeArrayWireThreeDaysAgoHP / timeArrayThreeDaysAgoHP) * 100).toFixed(1)

	let knownPercentTwoDaysAgoHP = ((timeArrayKnownTwoDaysAgoHP / timeArrayTwoDaysAgoHP) * 100).toFixed(1)

	let UnknownPercentTwoDaysAgoHP = ((timeArrayUnknownTwoDaysAgoHP / timeArrayTwoDaysAgoHP) * 100).toFixed(1)
	let partsPercentTwoDaysAgoHP = ((timeArrayPartsTwoDaysAgoHP / timeArrayTwoDaysAgoHP) * 100).toFixed(1)
	let wirePercentTwoDaysAgoHP = ((timeArrayWireTwoDaysAgoHP / timeArrayTwoDaysAgoHP) * 100).toFixed(1)

	let knownPercentOneDayAgoHP = ((timeArrayKnownOneDayAgoHP / timeArrayOneDayAgoHP) * 100).toFixed(1)
	let UnknownPercentOneDayAgoHP = ((timeArrayUnknownOneDayAgoHP / timeArrayOneDayAgoHP) * 100).toFixed(1)
	let partsPercentOneDayAgoHP = ((timeArrayPartsOneDayAgoHP / timeArrayOneDayAgoHP) * 100).toFixed(1)
	let wirePercentOneDayAgoHP = ((timeArrayWireOneDayAgoHP / timeArrayOneDayAgoHP) * 100).toFixed(1)

	// em graph data

	let knownPercentSevenDaysAgoEM = ((timeArrayKnownSevenDaysAgoEM / timeArraySevenDaysAgoEM) * 100).toFixed(1)
	let UnknownPercentSevenDaysAgoEM = ((timeArrayUnknownSevenDaysAgoEM / timeArraySevenDaysAgoEM) * 100).toFixed(1)
	let partsPercentSevenDaysAgoEM = ((timeArrayPartsSevenDaysAgoEM / timeArraySevenDaysAgoEM) * 100).toFixed(1)
	let wirePercentSevenDaysAgoEM = ((timeArrayWireSevenDaysAgoEM / timeArraySevenDaysAgoEM) * 100).toFixed(1)

	let knownPercentSixDaysAgoEM = ((timeArrayKnownSixDaysAgoEM / timeArraySixDaysAgoEM) * 100).toFixed(1)
	let UnknownPercentSixDaysAgoEM = ((timeArrayUnknownSixDaysAgoEM / timeArraySixDaysAgoEM) * 100).toFixed(1)
	let partsPercentSixDaysAgoEM = ((timeArrayPartsSixDaysAgoEM / timeArraySixDaysAgoEM) * 100).toFixed(1)
	let wirePercentSixDaysAgoEM = ((timeArrayWireSixDaysAgoEM / timeArraySixDaysAgoEM) * 100).toFixed(1)

	let knownPercentFiveDaysAgoEM = ((timeArrayKnownFiveDaysAgoEM / timeArrayFiveDaysAgoEM) * 100).toFixed(1)
	let UnknownPercentFiveDaysAgoEM = ((timeArrayUnknownFiveDaysAgoEM / timeArrayFiveDaysAgoEM) * 100).toFixed(1)
	let partsPercentFiveDaysAgoEM = ((timeArrayPartsFiveDaysAgoEM / timeArrayFiveDaysAgoEM) * 100).toFixed(1)
	let wirePercentFiveDaysAgoEM = ((timeArrayWireFiveDaysAgoEM / timeArrayFiveDaysAgoEM) * 100).toFixed(1)

	let knownPercentFourDaysAgoEM = ((timeArrayKnownFourDaysAgoEM / timeArrayFourDaysAgoEM) * 100).toFixed(1)
	let UnknownPercentFourDaysAgoEM = ((timeArrayUnknownFourDaysAgoEM / timeArrayFourDaysAgoEM) * 100).toFixed(1)
	let partsPercentFourDaysAgoEM = ((timeArrayPartsFourDaysAgoEM / timeArrayFourDaysAgoEM) * 100).toFixed(1)
	let wirePercentFourDaysAgoEM = ((timeArrayWireFourDaysAgoEM / timeArrayFourDaysAgoEM) * 100).toFixed(1)

	let knownPercentThreeDaysAgoEM = ((timeArrayKnownThreeDaysAgoEM / timeArrayThreeDaysAgoEM) * 100).toFixed(1)
	let UnknownPercentThreeDaysAgoEM = ((timeArrayUnknownThreeDaysAgoEM / timeArrayThreeDaysAgoEM) * 100).toFixed(1)
	let partsPercentThreeDaysAgoEM = ((timeArrayPartsThreeDaysAgoEM / timeArrayThreeDaysAgoEM) * 100).toFixed(1)
	let wirePercentThreeDaysAgoEM = ((timeArrayWireThreeDaysAgoEM / timeArrayThreeDaysAgoEM) * 100).toFixed(1)

	let knownPercentTwoDaysAgoEM = ((timeArrayKnownTwoDaysAgoEM / timeArrayTwoDaysAgoEM) * 100).toFixed(1)
	let UnknownPercentTwoDaysAgoEM = ((timeArrayUnknownTwoDaysAgoEM / timeArrayTwoDaysAgoEM) * 100).toFixed(1)
	let partsPercentTwoDaysAgoEM = ((timeArrayPartsTwoDaysAgoEM / timeArrayTwoDaysAgoEM) * 100).toFixed(1)
	let wirePercentTwoDaysAgoEM = ((timeArrayWireTwoDaysAgoEM / timeArrayTwoDaysAgoEM) * 100).toFixed(1)

	let knownPercentOneDayAgoEM = ((timeArrayKnownOneDayAgoEM / timeArrayOneDayAgoEM) * 100).toFixed(1)
	let UnknownPercentOneDayAgoEM = ((timeArrayUnknownOneDayAgoEM / timeArrayOneDayAgoEM) * 100).toFixed(1)
	let partsPercentOneDayAgoEM = ((timeArrayPartsOneDayAgoEM / timeArrayOneDayAgoEM) * 100).toFixed(1)
	let wirePercentOneDayAgoEM = ((timeArrayWireOneDayAgoEM / timeArrayOneDayAgoEM) * 100).toFixed(1)

	let totPercentSevenDaysAgoBHL = (
		+knownPercentSevenDaysAgoBHL +
		+UnknownPercentSevenDaysAgoBHL +
		+partsPercentSevenDaysAgoBHL +
		+wirePercentSevenDaysAgoBHL
	).toFixed(1)

	let totPercentSixDaysAgoBHL = (
		+knownPercentSixDaysAgoBHL +
		+UnknownPercentSixDaysAgoBHL +
		+partsPercentSixDaysAgoBHL +
		+wirePercentSixDaysAgoBHL
	).toFixed(1)

	let totPercentFiveDaysAgoBHL = (
		+knownPercentFiveDaysAgoBHL +
		+UnknownPercentFiveDaysAgoBHL +
		+partsPercentFiveDaysAgoBHL +
		+wirePercentFiveDaysAgoBHL
	).toFixed(1)

	let totPercentFourDaysAgoBHL = (
		+knownPercentFourDaysAgoBHL +
		+UnknownPercentFourDaysAgoBHL +
		+partsPercentFourDaysAgoBHL +
		+wirePercentFourDaysAgoBHL
	).toFixed(1)

	let totPercentThreeDaysAgoBHL = (
		+knownPercentThreeDaysAgoBHL +
		+UnknownPercentThreeDaysAgoBHL +
		+partsPercentThreeDaysAgoBHL +
		+wirePercentThreeDaysAgoBHL
	).toFixed(1)

	let totPercentTwoDaysAgoBHL = (
		+knownPercentTwoDaysAgoBHL +
		+UnknownPercentTwoDaysAgoBHL +
		+partsPercentTwoDaysAgoBHL +
		+wirePercentTwoDaysAgoBHL
	).toFixed(1)

	let totPercentOneDayAgoBHL = (
		+knownPercentOneDayAgoBHL +
		+UnknownPercentOneDayAgoBHL +
		+partsPercentOneDayAgoBHL +
		+wirePercentOneDayAgoBHL
	).toFixed(1)

	let totPercentSevenDaysAgoLDL = (
		+knownPercentSevenDaysAgoLDL +
		+UnknownPercentSevenDaysAgoLDL +
		+partsPercentSevenDaysAgoLDL +
		+wirePercentSevenDaysAgoLDL
	).toFixed(1)

	let totPercentSixDaysAgoLDL = (
		+knownPercentSixDaysAgoLDL +
		+UnknownPercentSixDaysAgoLDL +
		+partsPercentSixDaysAgoLDL +
		+wirePercentSixDaysAgoLDL
	).toFixed(1)

	let totPercentFiveDaysAgoLDL = (
		+knownPercentFiveDaysAgoLDL +
		+UnknownPercentFiveDaysAgoLDL +
		+partsPercentFiveDaysAgoLDL +
		+wirePercentFiveDaysAgoLDL
	).toFixed(1)

	let totPercentFourDaysAgoLDL = (
		+knownPercentFourDaysAgoLDL +
		+UnknownPercentFourDaysAgoLDL +
		+partsPercentFourDaysAgoLDL +
		+wirePercentFourDaysAgoLDL
	).toFixed(1)

	let totPercentThreeDaysAgoLDL = (
		+knownPercentThreeDaysAgoLDL +
		+UnknownPercentThreeDaysAgoLDL +
		+partsPercentThreeDaysAgoLDL +
		+wirePercentThreeDaysAgoLDL
	).toFixed(1)

	let totPercentTwoDaysAgoLDL = (
		+knownPercentTwoDaysAgoLDL +
		+UnknownPercentTwoDaysAgoLDL +
		+partsPercentTwoDaysAgoLDL +
		+wirePercentTwoDaysAgoLDL
	).toFixed(1)

	let totPercentOneDayAgoLDL = (
		+knownPercentOneDayAgoLDL +
		+UnknownPercentOneDayAgoLDL +
		+partsPercentOneDayAgoLDL +
		+wirePercentOneDayAgoLDL
	).toFixed(1)

	let totPercentSevenDaysAgoCP = (
		+knownPercentSevenDaysAgoCP +
		+UnknownPercentSevenDaysAgoCP +
		+partsPercentSevenDaysAgoCP +
		+wirePercentSevenDaysAgoCP
	).toFixed(1)

	let totPercentSixDaysAgoCP = (
		+knownPercentSixDaysAgoCP +
		+UnknownPercentSixDaysAgoCP +
		+partsPercentSixDaysAgoCP +
		+wirePercentSixDaysAgoCP
	).toFixed(1)

	let totPercentFiveDaysAgoCP = (
		+knownPercentFiveDaysAgoCP +
		+UnknownPercentFiveDaysAgoCP +
		+partsPercentFiveDaysAgoCP +
		+wirePercentFiveDaysAgoCP
	).toFixed(1)

	let totPercentFourDaysAgoCP = (
		+knownPercentFourDaysAgoCP +
		+UnknownPercentFourDaysAgoCP +
		+partsPercentFourDaysAgoCP +
		+wirePercentFourDaysAgoCP
	).toFixed(1)

	let totPercentThreeDaysAgoCP = (
		+knownPercentThreeDaysAgoCP +
		+UnknownPercentThreeDaysAgoCP +
		+partsPercentThreeDaysAgoCP +
		+wirePercentThreeDaysAgoCP
	).toFixed(1)

	let totPercentTwoDaysAgoCP = (
		+knownPercentTwoDaysAgoCP +
		+UnknownPercentTwoDaysAgoCP +
		+partsPercentTwoDaysAgoCP +
		+wirePercentTwoDaysAgoCP
	).toFixed(1)

	let totPercentOneDayAgoCP = (+knownPercentOneDayAgoCP + +UnknownPercentOneDayAgoCP + +partsPercentOneDayAgoCP + +wirePercentOneDayAgoCP).toFixed(1)

	let totPercentSevenDaysAgoHP = (
		+knownPercentSevenDaysAgoHP +
		+UnknownPercentSevenDaysAgoHP +
		+partsPercentSevenDaysAgoHP +
		+wirePercentSevenDaysAgoHP
	).toFixed(1)

	let totPercentSixDaysAgoHP = (
		+knownPercentSixDaysAgoHP +
		+UnknownPercentSixDaysAgoHP +
		+partsPercentSixDaysAgoHP +
		+wirePercentSixDaysAgoHP
	).toFixed(1)

	let totPercentFiveDaysAgoHP = (
		+knownPercentFiveDaysAgoHP +
		+UnknownPercentFiveDaysAgoHP +
		+partsPercentFiveDaysAgoHP +
		+wirePercentFiveDaysAgoHP
	).toFixed(1)

	let totPercentFourDaysAgoHP = (
		+knownPercentFourDaysAgoHP +
		+UnknownPercentFourDaysAgoHP +
		+partsPercentFourDaysAgoHP +
		+wirePercentFourDaysAgoHP
	).toFixed(1)

	let totPercentThreeDaysAgoHP = (
		+knownPercentThreeDaysAgoHP +
		+UnknownPercentThreeDaysAgoHP +
		+partsPercentThreeDaysAgoHP +
		+wirePercentThreeDaysAgoHP
	).toFixed(1)

	let totPercentTwoDaysAgoHP = (
		+knownPercentTwoDaysAgoHP +
		+UnknownPercentTwoDaysAgoHP +
		+partsPercentTwoDaysAgoHP +
		+wirePercentTwoDaysAgoHP
	).toFixed(1)

	let totPercentOneDayAgoHP = (+knownPercentOneDayAgoHP + +UnknownPercentOneDayAgoHP + +partsPercentOneDayAgoHP + +wirePercentOneDayAgoHP).toFixed(1)

	let totPercentSevenDaysAgoEM = (
		+knownPercentSevenDaysAgoEM +
		+UnknownPercentSevenDaysAgoEM +
		+partsPercentSevenDaysAgoEM +
		+wirePercentSevenDaysAgoEM
	).toFixed(1)

	let totPercentSixDaysAgoEM = (
		+knownPercentSixDaysAgoEM +
		+UnknownPercentSixDaysAgoEM +
		+partsPercentSixDaysAgoEM +
		+wirePercentSixDaysAgoEM
	).toFixed(1)

	let totPercentFiveDaysAgoEM = (
		+knownPercentFiveDaysAgoEM +
		+UnknownPercentFiveDaysAgoEM +
		+partsPercentFiveDaysAgoEM +
		+wirePercentFiveDaysAgoEM
	).toFixed(1)

	let totPercentFourDaysAgoEM = (
		+knownPercentFourDaysAgoEM +
		+UnknownPercentFourDaysAgoEM +
		+partsPercentFourDaysAgoEM +
		+wirePercentFourDaysAgoEM
	).toFixed(1)

	let totPercentThreeDaysAgoEM = (
		+knownPercentThreeDaysAgoEM +
		+UnknownPercentThreeDaysAgoEM +
		+partsPercentThreeDaysAgoEM +
		+wirePercentThreeDaysAgoEM
	).toFixed(1)

	let totPercentTwoDaysAgoEM = (
		+knownPercentTwoDaysAgoEM +
		+UnknownPercentTwoDaysAgoEM +
		+partsPercentTwoDaysAgoEM +
		+wirePercentTwoDaysAgoEM
	).toFixed(1)

	let totPercentOneDayAgoEM = (+knownPercentOneDayAgoEM + +UnknownPercentOneDayAgoEM + +partsPercentOneDayAgoEM + +wirePercentOneDayAgoEM).toFixed(1)

	let totPercentSevenDaysAgoCABS = (
		+knownPercentSevenDaysAgoCABS +
		+UnknownPercentSevenDaysAgoCABS +
		+partsPercentSevenDaysAgoCABS +
		+wirePercentSevenDaysAgoCABS
	).toFixed(1)

	let totPercentSixDaysAgoCABS = (
		+knownPercentSixDaysAgoCABS +
		+UnknownPercentSixDaysAgoCABS +
		+partsPercentSixDaysAgoCABS +
		+wirePercentSixDaysAgoCABS
	).toFixed(1)

	let totPercentFiveDaysAgoCABS = (
		+knownPercentFiveDaysAgoCABS +
		+UnknownPercentFiveDaysAgoCABS +
		+partsPercentFiveDaysAgoCABS +
		+wirePercentFiveDaysAgoCABS
	).toFixed(1)

	let totPercentFourDaysAgoCABS = (
		+knownPercentFourDaysAgoCABS +
		+UnknownPercentFourDaysAgoCABS +
		+partsPercentFourDaysAgoCABS +
		+wirePercentFourDaysAgoCABS
	).toFixed(1)

	let totPercentThreeDaysAgoCABS = (
		+knownPercentThreeDaysAgoCABS +
		+UnknownPercentThreeDaysAgoCABS +
		+partsPercentThreeDaysAgoCABS +
		+wirePercentThreeDaysAgoCABS
	).toFixed(1)

	let totPercentTwoDaysAgoCABS = (
		+knownPercentTwoDaysAgoCABS +
		+UnknownPercentTwoDaysAgoCABS +
		+partsPercentTwoDaysAgoCABS +
		+wirePercentTwoDaysAgoCABS
	).toFixed(1)

	let totPercentOneDayAgoCABS = (
		+knownPercentOneDayAgoCABS +
		+UnknownPercentOneDayAgoCABS +
		+partsPercentOneDayAgoCABS +
		+wirePercentOneDayAgoCABS
	).toFixed(1)

	const sevenDaysAgoForGraph = moment().subtract(7, 'days').format('DD/MM')
	const sixDaysAgoForGraph = moment().subtract(6, 'days').format('DD/MM')
	const fiveDaysAgoForGraph = moment().subtract(5, 'days').format('DD/MM')
	const fourDaysAgoForGraph = moment().subtract(4, 'days').format('DD/MM')
	const threeDaysAgoForGraph = moment().subtract(3, 'days').format('DD/MM')
	const twoDaysAgoForGraph = moment().subtract(2, 'days').format('DD/MM')
	const oneDayAgoForGraph = moment().subtract(1, 'days').format('DD/MM')

	if (isNaN(totPercentSevenDaysAgoBHL)) {
		totPercentSevenDaysAgoBHL = 0
	}
	if (isNaN(totPercentSixDaysAgoBHL)) {
		totPercentSixDaysAgoBHL = 0
	}
	if (isNaN(totPercentFiveDaysAgoBHL)) {
		totPercentFiveDaysAgoBHL = 0
	}
	if (isNaN(totPercentFourDaysAgoBHL)) {
		totPercentFourDaysAgoBHL = 0
	}
	if (isNaN(totPercentThreeDaysAgoBHL)) {
		totPercentThreeDaysAgoBHL = 0
	}
	if (isNaN(totPercentTwoDaysAgoBHL)) {
		totPercentTwoDaysAgoBHL = 0
	}
	if (isNaN(totPercentOneDayAgoBHL)) {
		totPercentOneDayAgoBHL = 0
	}
	if (isNaN(totPercentSevenDaysAgoLDL)) {
		totPercentSevenDaysAgoLDL = 0
	}
	if (isNaN(totPercentSixDaysAgoLDL)) {
		totPercentSixDaysAgoLDL = 0
	}
	if (isNaN(totPercentFiveDaysAgoLDL)) {
		totPercentFiveDaysAgoLDL = 0
	}
	if (isNaN(totPercentFourDaysAgoBHL)) {
		totPercentFourDaysAgoLDL = 0
	}
	if (isNaN(totPercentThreeDaysAgoLDL)) {
		totPercentThreeDaysAgoLDL = 0
	}
	if (isNaN(totPercentTwoDaysAgoLDL)) {
		totPercentTwoDaysAgoLDL = 0
	}
	if (isNaN(totPercentOneDayAgoLDL)) {
		totPercentOneDayAgoLDL = 0
	}
	if (isNaN(totPercentSevenDaysAgoCP)) {
		totPercentSevenDaysAgoCP = 0
	}
	if (isNaN(totPercentSixDaysAgoCP)) {
		totPercentSixDaysAgoCP = 0
	}
	if (isNaN(totPercentFiveDaysAgoCP)) {
		totPercentFiveDaysAgoCP = 0
	}
	if (isNaN(totPercentFourDaysAgoCP)) {
		totPercentFourDaysAgoCP = 0
	}
	if (isNaN(totPercentThreeDaysAgoCP)) {
		totPercentThreeDaysAgoCP = 0
	}
	if (isNaN(totPercentTwoDaysAgoCP)) {
		totPercentTwoDaysAgoCP = 0
	}
	if (isNaN(totPercentOneDayAgoCP)) {
		totPercentOneDayAgoCP = 0
	}
	if (isNaN(totPercentSevenDaysAgoHP)) {
		totPercentSevenDaysAgoHP = 0
	}
	if (isNaN(totPercentSixDaysAgoHP)) {
		totPercentSixDaysAgoHP = 0
	}
	if (isNaN(totPercentFiveDaysAgoHP)) {
		totPercentFiveDaysAgoHP = 0
	}
	if (isNaN(totPercentFourDaysAgoHP)) {
		totPercentFourDaysAgoHP = 0
	}
	if (isNaN(totPercentThreeDaysAgoHP)) {
		totPercentThreeDaysAgoHP = 0
	}
	if (isNaN(totPercentTwoDaysAgoHP)) {
		totPercentTwoDaysAgoHP = 0
	}
	if (isNaN(totPercentOneDayAgoHP)) {
		totPercentOneDayAgoHP = 0
	}
	if (isNaN(totPercentSevenDaysAgoEM)) {
		totPercentSevenDaysAgoEM = 0
	}
	if (isNaN(totPercentSixDaysAgoEM)) {
		totPercentSixDaysAgoEM = 0
	}
	if (isNaN(totPercentFiveDaysAgoEM)) {
		totPercentFiveDaysAgoEM = 0
	}
	if (isNaN(totPercentFourDaysAgoEM)) {
		totPercentFourDaysAgoEM = 0
	}
	if (isNaN(totPercentThreeDaysAgoEM)) {
		totPercentThreeDaysAgoEM = 0
	}
	if (isNaN(totPercentTwoDaysAgoEM)) {
		totPercentTwoDaysAgoEM = 0
	}
	if (isNaN(totPercentOneDayAgoEM)) {
		totPercentOneDayAgoEM = 0
	}
	if (isNaN(totPercentSevenDaysAgoCABS)) {
		totPercentSevenDaysAgoCABS = 0
	}
	if (isNaN(totPercentSixDaysAgoCABS)) {
		totPercentSixDaysAgoCABS = 0
	}
	if (isNaN(totPercentFiveDaysAgoCABS)) {
		totPercentFiveDaysAgoCABS = 0
	}
	if (isNaN(totPercentFourDaysAgoCABS)) {
		totPercentFourDaysAgoCABS = 0
	}
	if (isNaN(totPercentThreeDaysAgoCABS)) {
		totPercentThreeDaysAgoCABS = 0
	}
	if (isNaN(totPercentTwoDaysAgoCABS)) {
		totPercentTwoDaysAgoCABS = 0
	}
	if (isNaN(totPercentOneDayAgoCABS)) {
		totPercentOneDayAgoCABS = 0
	}
	// bhl here
	if (isNaN(knownPercentSevenDaysAgoBHL)) {
		knownPercentSevenDaysAgoBHL = 0
	}
	if (isNaN(knownPercentSixDaysAgoBHL)) {
		knownPercentSixDaysAgoBHL = 0
	}
	if (isNaN(knownPercentFiveDaysAgoBHL)) {
		knownPercentFiveDaysAgoBHL = 0
	}
	if (isNaN(knownPercentFourDaysAgoBHL)) {
		knownPercentFourDaysAgoBHL = 0
	}
	if (isNaN(knownPercentThreeDaysAgoBHL)) {
		knownPercentThreeDaysAgoBHL = 0
	}
	if (isNaN(knownPercentTwoDaysAgoBHL)) {
		knownPercentTwoDaysAgoBHL = 0
	}
	if (isNaN(knownPercentOneDayAgoBHL)) {
		knownPercentOneDayAgoBHL = 0
	}
	if (isNaN(UnknownPercentSevenDaysAgoBHL)) {
		UnknownPercentSevenDaysAgoBHL = 0
	}
	if (isNaN(UnknownPercentSixDaysAgoBHL)) {
		UnknownPercentSixDaysAgoBHL = 0
	}
	if (isNaN(UnknownPercentFiveDaysAgoBHL)) {
		UnknownPercentFiveDaysAgoBHL = 0
	}
	if (isNaN(UnknownPercentFourDaysAgoBHL)) {
		UnknownPercentFourDaysAgoBHL = 0
	}
	if (isNaN(UnknownPercentThreeDaysAgoBHL)) {
		UnknownPercentThreeDaysAgoBHL = 0
	}
	if (isNaN(UnknownPercentTwoDaysAgoBHL)) {
		UnknownPercentTwoDaysAgoBHL = 0
	}
	if (isNaN(UnknownPercentOneDayAgoBHL)) {
		UnknownPercentOneDayAgoBHL = 0
	}
	if (isNaN(partsPercentSevenDaysAgoBHL)) {
		partsPercentSevenDaysAgoBHL = 0
	}
	if (isNaN(partsPercentSixDaysAgoBHL)) {
		partsPercentSixDaysAgoBHL = 0
	}
	if (isNaN(partsPercentFiveDaysAgoBHL)) {
		partsPercentFiveDaysAgoBHL = 0
	}
	if (isNaN(partsPercentFourDaysAgoBHL)) {
		partsPercentFourDaysAgoBHL = 0
	}
	if (isNaN(partsPercentThreeDaysAgoBHL)) {
		partsPercentThreeDaysAgoBHL = 0
	}
	if (isNaN(partsPercentTwoDaysAgoBHL)) {
		partsPercentTwoDaysAgoBHL = 0
	}
	if (isNaN(partsPercentOneDayAgoBHL)) {
		partsPercentOneDayAgoBHL = 0
	}
	if (isNaN(wirePercentSevenDaysAgoBHL)) {
		wirePercentSevenDaysAgoBHL = 0
	}
	if (isNaN(wirePercentSixDaysAgoBHL)) {
		wirePercentSixDaysAgoBHL = 0
	}
	if (isNaN(wirePercentFiveDaysAgoBHL)) {
		wirePercentFiveDaysAgoBHL = 0
	}
	if (isNaN(wirePercentFourDaysAgoBHL)) {
		wirePercentFourDaysAgoBHL = 0
	}
	if (isNaN(wirePercentThreeDaysAgoBHL)) {
		wirePercentThreeDaysAgoBHL = 0
	}
	if (isNaN(wirePercentTwoDaysAgoBHL)) {
		wirePercentTwoDaysAgoBHL = 0
	}
	if (isNaN(wirePercentOneDayAgoBHL)) {
		wirePercentOneDayAgoBHL = 0
	}

	// ldl here
	if (isNaN(knownPercentSevenDaysAgoLDL)) {
		knownPercentSevenDaysAgoLDL = 0
	}
	if (isNaN(knownPercentSixDaysAgoLDL)) {
		knownPercentSixDaysAgoLDL = 0
	}
	if (isNaN(knownPercentFiveDaysAgoLDL)) {
		knownPercentFiveDaysAgoLDL = 0
	}
	if (isNaN(knownPercentFourDaysAgoLDL)) {
		knownPercentFourDaysAgoLDL = 0
	}
	if (isNaN(knownPercentThreeDaysAgoLDL)) {
		knownPercentThreeDaysAgoLDL = 0
	}
	if (isNaN(knownPercentTwoDaysAgoLDL)) {
		knownPercentTwoDaysAgoLDL = 0
	}
	if (isNaN(knownPercentOneDayAgoLDL)) {
		knownPercentOneDayAgoLDL = 0
	}
	if (isNaN(UnknownPercentSevenDaysAgoLDL)) {
		UnknownPercentSevenDaysAgoLDL = 0
	}
	if (isNaN(UnknownPercentSixDaysAgoLDL)) {
		UnknownPercentSixDaysAgoLDL = 0
	}
	if (isNaN(UnknownPercentFiveDaysAgoLDL)) {
		UnknownPercentFiveDaysAgoLDL = 0
	}
	if (isNaN(UnknownPercentFourDaysAgoLDL)) {
		UnknownPercentFourDaysAgoLDL = 0
	}
	if (isNaN(UnknownPercentThreeDaysAgoLDL)) {
		UnknownPercentThreeDaysAgoLDL = 0
	}
	if (isNaN(UnknownPercentTwoDaysAgoLDL)) {
		UnknownPercentTwoDaysAgoLDL = 0
	}
	if (isNaN(UnknownPercentOneDayAgoLDL)) {
		UnknownPercentOneDayAgoLDL = 0
	}
	if (isNaN(partsPercentSevenDaysAgoLDL)) {
		partsPercentSevenDaysAgoLDL = 0
	}
	if (isNaN(partsPercentSixDaysAgoLDL)) {
		partsPercentSixDaysAgoLDL = 0
	}
	if (isNaN(partsPercentFiveDaysAgoLDL)) {
		partsPercentFiveDaysAgoLDL = 0
	}
	if (isNaN(partsPercentFourDaysAgoLDL)) {
		partsPercentFourDaysAgoLDL = 0
	}
	if (isNaN(partsPercentThreeDaysAgoLDL)) {
		partsPercentThreeDaysAgoLDL = 0
	}
	if (isNaN(partsPercentTwoDaysAgoLDL)) {
		partsPercentTwoDaysAgoLDL = 0
	}
	if (isNaN(partsPercentOneDayAgoLDL)) {
		partsPercentOneDayAgoLDL = 0
	}
	if (isNaN(wirePercentSevenDaysAgoLDL)) {
		wirePercentSevenDaysAgoLDL = 0
	}
	if (isNaN(wirePercentSixDaysAgoLDL)) {
		wirePercentSixDaysAgoLDL = 0
	}
	if (isNaN(wirePercentFiveDaysAgoLDL)) {
		wirePercentFiveDaysAgoLDL = 0
	}
	if (isNaN(wirePercentFourDaysAgoLDL)) {
		wirePercentFourDaysAgoLDL = 0
	}
	if (isNaN(wirePercentThreeDaysAgoLDL)) {
		wirePercentThreeDaysAgoLDL = 0
	}
	if (isNaN(wirePercentTwoDaysAgoLDL)) {
		wirePercentTwoDaysAgoLDL = 0
	}
	if (isNaN(wirePercentOneDayAgoLDL)) {
		wirePercentOneDayAgoLDL = 0
	}

	// cp here
	if (isNaN(knownPercentSevenDaysAgoCP)) {
		knownPercentSevenDaysAgoCP = 0
	}
	if (isNaN(knownPercentSixDaysAgoCP)) {
		knownPercentSixDaysAgoCP = 0
	}
	if (isNaN(knownPercentFiveDaysAgoCP)) {
		knownPercentFiveDaysAgoCP = 0
	}
	if (isNaN(knownPercentFourDaysAgoCP)) {
		knownPercentFourDaysAgoCP = 0
	}
	if (isNaN(knownPercentThreeDaysAgoCP)) {
		knownPercentThreeDaysAgoCP = 0
	}
	if (isNaN(knownPercentTwoDaysAgoCP)) {
		knownPercentTwoDaysAgoCP = 0
	}
	if (isNaN(knownPercentOneDayAgoCP)) {
		knownPercentOneDayAgoCP = 0
	}
	if (isNaN(UnknownPercentSevenDaysAgoCP)) {
		UnknownPercentSevenDaysAgoCP = 0
	}
	if (isNaN(UnknownPercentSixDaysAgoCP)) {
		UnknownPercentSixDaysAgoCP = 0
	}
	if (isNaN(UnknownPercentFiveDaysAgoCP)) {
		UnknownPercentFiveDaysAgoCP = 0
	}
	if (isNaN(UnknownPercentFourDaysAgoCP)) {
		UnknownPercentFourDaysAgoCP = 0
	}
	if (isNaN(UnknownPercentThreeDaysAgoCP)) {
		UnknownPercentThreeDaysAgoCP = 0
	}
	if (isNaN(UnknownPercentTwoDaysAgoCP)) {
		UnknownPercentTwoDaysAgoCP = 0
	}
	if (isNaN(UnknownPercentOneDayAgoCP)) {
		UnknownPercentOneDayAgoCP = 0
	}
	if (isNaN(partsPercentSevenDaysAgoCP)) {
		partsPercentSevenDaysAgoCP = 0
	}
	if (isNaN(partsPercentSixDaysAgoCP)) {
		partsPercentSixDaysAgoCP = 0
	}
	if (isNaN(partsPercentFiveDaysAgoCP)) {
		partsPercentFiveDaysAgoCP = 0
	}
	if (isNaN(partsPercentFourDaysAgoCP)) {
		partsPercentFourDaysAgoCP = 0
	}
	if (isNaN(partsPercentThreeDaysAgoCP)) {
		partsPercentThreeDaysAgoCP = 0
	}
	if (isNaN(partsPercentTwoDaysAgoCP)) {
		partsPercentTwoDaysAgoCP = 0
	}
	if (isNaN(partsPercentOneDayAgoCP)) {
		partsPercentOneDayAgoCP = 0
	}
	if (isNaN(wirePercentSevenDaysAgoCP)) {
		wirePercentSevenDaysAgoCP = 0
	}
	if (isNaN(wirePercentSixDaysAgoCP)) {
		wirePercentSixDaysAgoCP = 0
	}
	if (isNaN(wirePercentFiveDaysAgoCP)) {
		wirePercentFiveDaysAgoCP = 0
	}
	if (isNaN(wirePercentFourDaysAgoCP)) {
		wirePercentFourDaysAgoCP = 0
	}
	if (isNaN(wirePercentThreeDaysAgoCP)) {
		wirePercentThreeDaysAgoCP = 0
	}
	if (isNaN(wirePercentTwoDaysAgoCP)) {
		wirePercentTwoDaysAgoCP = 0
	}
	if (isNaN(wirePercentOneDayAgoCP)) {
		wirePercentOneDayAgoCP = 0
	}

	//HP here
	if (isNaN(knownPercentSevenDaysAgoHP)) {
		knownPercentSevenDaysAgoHP = 0
	}
	if (isNaN(knownPercentSixDaysAgoHP)) {
		knownPercentSixDaysAgoHP = 0
	}
	if (isNaN(knownPercentFiveDaysAgoHP)) {
		knownPercentFiveDaysAgoHP = 0
	}
	if (isNaN(knownPercentFourDaysAgoHP)) {
		knownPercentFourDaysAgoHP = 0
	}
	if (isNaN(knownPercentThreeDaysAgoHP)) {
		knownPercentThreeDaysAgoHP = 0
	}
	if (isNaN(knownPercentTwoDaysAgoHP)) {
		knownPercentTwoDaysAgoHP = 0
	}
	if (isNaN(knownPercentOneDayAgoHP)) {
		knownPercentOneDayAgoHP = 0
	}
	if (isNaN(UnknownPercentSevenDaysAgoHP)) {
		UnknownPercentSevenDaysAgoHP = 0
	}
	if (isNaN(UnknownPercentSixDaysAgoHP)) {
		UnknownPercentSixDaysAgoHP = 0
	}
	if (isNaN(UnknownPercentFiveDaysAgoHP)) {
		UnknownPercentFiveDaysAgoHP = 0
	}
	if (isNaN(UnknownPercentFourDaysAgoHP)) {
		UnknownPercentFourDaysAgoHP = 0
	}
	if (isNaN(UnknownPercentThreeDaysAgoHP)) {
		UnknownPercentThreeDaysAgoHP = 0
	}
	if (isNaN(UnknownPercentTwoDaysAgoHP)) {
		UnknownPercentTwoDaysAgoHP = 0
	}
	if (isNaN(UnknownPercentOneDayAgoHP)) {
		UnknownPercentOneDayAgoHP = 0
	}
	if (isNaN(partsPercentSevenDaysAgoHP)) {
		partsPercentSevenDaysAgoHP = 0
	}
	if (isNaN(partsPercentSixDaysAgoHP)) {
		partsPercentSixDaysAgoHP = 0
	}
	if (isNaN(partsPercentFiveDaysAgoHP)) {
		partsPercentFiveDaysAgoHP = 0
	}
	if (isNaN(partsPercentFourDaysAgoHP)) {
		partsPercentFourDaysAgoHP = 0
	}
	if (isNaN(partsPercentThreeDaysAgoHP)) {
		partsPercentThreeDaysAgoHP = 0
	}
	if (isNaN(partsPercentTwoDaysAgoHP)) {
		partsPercentTwoDaysAgoHP = 0
	}
	if (isNaN(partsPercentOneDayAgoHP)) {
		partsPercentOneDayAgoHP = 0
	}
	if (isNaN(wirePercentSevenDaysAgoHP)) {
		wirePercentSevenDaysAgoHP = 0
	}
	if (isNaN(wirePercentSixDaysAgoHP)) {
		wirePercentSixDaysAgoHP = 0
	}
	if (isNaN(wirePercentFiveDaysAgoHP)) {
		wirePercentFiveDaysAgoHP = 0
	}
	if (isNaN(wirePercentFourDaysAgoHP)) {
		wirePercentFourDaysAgoHP = 0
	}
	if (isNaN(wirePercentThreeDaysAgoHP)) {
		wirePercentThreeDaysAgoHP = 0
	}
	if (isNaN(wirePercentTwoDaysAgoHP)) {
		wirePercentTwoDaysAgoHP = 0
	}
	if (isNaN(wirePercentOneDayAgoHP)) {
		wirePercentOneDayAgoHP = 0
	}

	//em here
	if (isNaN(knownPercentSevenDaysAgoEM)) {
		knownPercentSevenDaysAgoEM = 0
	}
	if (isNaN(knownPercentSixDaysAgoEM)) {
		knownPercentSixDaysAgoEM = 0
	}
	if (isNaN(knownPercentFiveDaysAgoEM)) {
		knownPercentFiveDaysAgoEM = 0
	}
	if (isNaN(knownPercentFourDaysAgoEM)) {
		knownPercentFourDaysAgoEM = 0
	}
	if (isNaN(knownPercentThreeDaysAgoEM)) {
		knownPercentThreeDaysAgoEM = 0
	}
	if (isNaN(knownPercentTwoDaysAgoEM)) {
		knownPercentTwoDaysAgoEM = 0
	}
	if (isNaN(knownPercentOneDayAgoEM)) {
		knownPercentOneDayAgoEM = 0
	}
	if (isNaN(UnknownPercentSevenDaysAgoEM)) {
		UnknownPercentSevenDaysAgoEM = 0
	}
	if (isNaN(UnknownPercentSixDaysAgoEM)) {
		UnknownPercentSixDaysAgoEM = 0
	}
	if (isNaN(UnknownPercentFiveDaysAgoEM)) {
		UnknownPercentFiveDaysAgoEM = 0
	}
	if (isNaN(UnknownPercentFourDaysAgoEM)) {
		UnknownPercentFourDaysAgoEM = 0
	}
	if (isNaN(UnknownPercentThreeDaysAgoEM)) {
		UnknownPercentThreeDaysAgoEM = 0
	}
	if (isNaN(UnknownPercentTwoDaysAgoEM)) {
		UnknownPercentTwoDaysAgoEM = 0
	}
	if (isNaN(UnknownPercentOneDayAgoEM)) {
		UnknownPercentOneDayAgoEM = 0
	}
	if (isNaN(partsPercentSevenDaysAgoEM)) {
		partsPercentSevenDaysAgoEM = 0
	}
	if (isNaN(partsPercentSixDaysAgoEM)) {
		partsPercentSixDaysAgoEM = 0
	}
	if (isNaN(partsPercentFiveDaysAgoEM)) {
		partsPercentFiveDaysAgoEM = 0
	}
	if (isNaN(partsPercentFourDaysAgoEM)) {
		partsPercentFourDaysAgoEM = 0
	}
	if (isNaN(partsPercentThreeDaysAgoEM)) {
		partsPercentThreeDaysAgoEM = 0
	}
	if (isNaN(partsPercentTwoDaysAgoEM)) {
		partsPercentTwoDaysAgoEM = 0
	}
	if (isNaN(partsPercentOneDayAgoEM)) {
		partsPercentOneDayAgoEM = 0
	}
	if (isNaN(wirePercentSevenDaysAgoEM)) {
		wirePercentSevenDaysAgoEM = 0
	}
	if (isNaN(wirePercentSixDaysAgoEM)) {
		wirePercentSixDaysAgoEM = 0
	}
	if (isNaN(wirePercentFiveDaysAgoEM)) {
		wirePercentFiveDaysAgoEM = 0
	}
	if (isNaN(wirePercentFourDaysAgoEM)) {
		wirePercentFourDaysAgoEM = 0
	}
	if (isNaN(wirePercentThreeDaysAgoEM)) {
		wirePercentThreeDaysAgoEM = 0
	}
	if (isNaN(wirePercentTwoDaysAgoEM)) {
		wirePercentTwoDaysAgoEM = 0
	}
	if (isNaN(wirePercentOneDayAgoEM)) {
		wirePercentOneDayAgoEM = 0
	}

	//cabs here

	if (isNaN(knownPercentSevenDaysAgoCABS)) {
		knownPercentSevenDaysAgoCABS = 0
	}
	if (isNaN(knownPercentSixDaysAgoCABS)) {
		knownPercentSixDaysAgoCABS = 0
	}
	if (isNaN(knownPercentFiveDaysAgoCABS)) {
		knownPercentFiveDaysAgoCABS = 0
	}
	if (isNaN(knownPercentFourDaysAgoCABS)) {
		knownPercentFourDaysAgoCABS = 0
	}
	if (isNaN(knownPercentThreeDaysAgoCABS)) {
		knownPercentThreeDaysAgoCABS = 0
	}
	if (isNaN(knownPercentTwoDaysAgoCABS)) {
		knownPercentTwoDaysAgoCABS = 0
	}
	if (isNaN(knownPercentSevenDaysAgoCABS)) {
		knownPercentOneDayAgoCABS = 0
	}
	if (isNaN(UnknownPercentSevenDaysAgoCABS)) {
		UnknownPercentSevenDaysAgoCABS = 0
	}
	if (isNaN(UnknownPercentSixDaysAgoCABS)) {
		UnknownPercentSixDaysAgoCABS = 0
	}
	if (isNaN(UnknownPercentFiveDaysAgoCABS)) {
		UnknownPercentFiveDaysAgoCABS = 0
	}
	if (isNaN(UnknownPercentFourDaysAgoCABS)) {
		UnknownPercentFourDaysAgoCABS = 0
	}
	if (isNaN(UnknownPercentThreeDaysAgoCABS)) {
		UnknownPercentThreeDaysAgoCABS = 0
	}
	if (isNaN(UnknownPercentTwoDaysAgoCABS)) {
		UnknownPercentTwoDaysAgoCABS = 0
	}
	if (isNaN(UnknownPercentSevenDaysAgoCABS)) {
		UnknownPercentOneDayAgoCABS = 0
	}
	if (isNaN(partsPercentSevenDaysAgoCABS)) {
		partsPercentSevenDaysAgoCABS = 0
	}
	if (isNaN(partsPercentSixDaysAgoCABS)) {
		partsPercentSixDaysAgoCABS = 0
	}
	if (isNaN(partsPercentFiveDaysAgoCABS)) {
		partsPercentFiveDaysAgoCABS = 0
	}
	if (isNaN(partsPercentFourDaysAgoCABS)) {
		partsPercentFourDaysAgoCABS = 0
	}
	if (isNaN(partsPercentThreeDaysAgoCABS)) {
		partsPercentThreeDaysAgoCABS = 0
	}
	if (isNaN(partsPercentTwoDaysAgoCABS)) {
		partsPercentTwoDaysAgoCABS = 0
	}
	if (isNaN(partsPercentSevenDaysAgoCABS)) {
		partsPercentOneDayAgoCABS = 0
	}
	if (isNaN(wirePercentSevenDaysAgoCABS)) {
		wirePercentSevenDaysAgoCABS = 0
	}
	if (isNaN(wirePercentSixDaysAgoCABS)) {
		wirePercentSixDaysAgoCABS = 0
	}
	if (isNaN(wirePercentFiveDaysAgoCABS)) {
		wirePercentFiveDaysAgoCABS = 0
	}
	if (isNaN(wirePercentFourDaysAgoCABS)) {
		wirePercentFourDaysAgoCABS = 0
	}
	if (isNaN(wirePercentThreeDaysAgoCABS)) {
		wirePercentThreeDaysAgoCABS = 0
	}
	if (isNaN(wirePercentTwoDaysAgoCABS)) {
		wirePercentTwoDaysAgoCABS = 0
	}
	if (isNaN(wirePercentSevenDaysAgoCABS)) {
		wirePercentOneDayAgoCABS = 0
	}

	res.render('machine/downTime', {
		sevenDaysAgoForGraph,
		sixDaysAgoForGraph,
		fiveDaysAgoForGraph,
		fourDaysAgoForGraph,
		threeDaysAgoForGraph,
		twoDaysAgoForGraph,
		oneDayAgoForGraph,

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
		//graph
		knownPercentSevenDaysAgoBHL,
		UnknownPercentSevenDaysAgoBHL,
		partsPercentSevenDaysAgoBHL,
		wirePercentSevenDaysAgoBHL,

		knownPercentSixDaysAgoBHL,
		UnknownPercentSixDaysAgoBHL,
		partsPercentSixDaysAgoBHL,
		wirePercentSixDaysAgoBHL,

		knownPercentFiveDaysAgoBHL,
		UnknownPercentFiveDaysAgoBHL,
		partsPercentFiveDaysAgoBHL,
		wirePercentFiveDaysAgoBHL,

		knownPercentFourDaysAgoBHL,
		UnknownPercentFourDaysAgoBHL,
		partsPercentFourDaysAgoBHL,
		wirePercentFourDaysAgoBHL,

		knownPercentThreeDaysAgoBHL,
		UnknownPercentThreeDaysAgoBHL,
		partsPercentThreeDaysAgoBHL,
		wirePercentThreeDaysAgoBHL,

		knownPercentTwoDaysAgoBHL,
		UnknownPercentTwoDaysAgoBHL,
		partsPercentTwoDaysAgoBHL,
		wirePercentTwoDaysAgoBHL,

		knownPercentOneDayAgoBHL,
		UnknownPercentOneDayAgoBHL,
		partsPercentOneDayAgoBHL,
		wirePercentOneDayAgoBHL,

		totPercentSevenDaysAgoBHL,
		totPercentSixDaysAgoBHL,
		totPercentFiveDaysAgoBHL,
		totPercentFourDaysAgoBHL,
		totPercentThreeDaysAgoBHL,
		totPercentTwoDaysAgoBHL,
		totPercentOneDayAgoBHL,

		// cabs breakdowns
		numOfKnownCabs,
		numOfUnKnownCabs,
		numOfPartsCabs,
		numOfConsumablesCabs,
		totBDCabs,
		sumOfBDCabs,
		downtimePercTodayCabs,

		//graph
		knownPercentSevenDaysAgoCABS,
		UnknownPercentSevenDaysAgoCABS,
		partsPercentSevenDaysAgoCABS,
		wirePercentSevenDaysAgoCABS,

		knownPercentSixDaysAgoCABS,
		UnknownPercentSixDaysAgoCABS,
		partsPercentSixDaysAgoCABS,
		wirePercentSixDaysAgoCABS,

		knownPercentFiveDaysAgoCABS,
		UnknownPercentFiveDaysAgoCABS,
		partsPercentFiveDaysAgoCABS,
		wirePercentFiveDaysAgoCABS,

		knownPercentFourDaysAgoCABS,
		UnknownPercentFourDaysAgoCABS,
		partsPercentFourDaysAgoCABS,
		wirePercentFourDaysAgoCABS,

		knownPercentThreeDaysAgoCABS,
		UnknownPercentThreeDaysAgoCABS,
		partsPercentThreeDaysAgoCABS,
		wirePercentThreeDaysAgoCABS,

		knownPercentTwoDaysAgoCABS,
		UnknownPercentTwoDaysAgoCABS,
		partsPercentTwoDaysAgoCABS,
		wirePercentTwoDaysAgoCABS,

		knownPercentOneDayAgoCABS,
		UnknownPercentOneDayAgoCABS,
		partsPercentOneDayAgoCABS,
		wirePercentOneDayAgoCABS,

		totPercentSevenDaysAgoCABS,
		totPercentSixDaysAgoCABS,
		totPercentFiveDaysAgoCABS,
		totPercentFourDaysAgoCABS,
		totPercentThreeDaysAgoCABS,
		totPercentTwoDaysAgoCABS,
		totPercentOneDayAgoCABS,

		// cp breakdowns
		numOfKnownCP,
		numOfUnKnownCP,
		numOfPartsCP,
		numOfConsumablesCP,
		totBDCP,
		sumOfBDCP,
		downtimePercTodayCP,

		//graph
		knownPercentSevenDaysAgoCP,
		UnknownPercentSevenDaysAgoCP,
		partsPercentSevenDaysAgoCP,
		wirePercentSevenDaysAgoCP,

		knownPercentSixDaysAgoCP,
		UnknownPercentSixDaysAgoCP,
		partsPercentSixDaysAgoCP,
		wirePercentSixDaysAgoCP,

		knownPercentFiveDaysAgoCP,
		UnknownPercentFiveDaysAgoCP,
		partsPercentFiveDaysAgoCP,
		wirePercentFiveDaysAgoCP,

		knownPercentFourDaysAgoCP,
		UnknownPercentFourDaysAgoCP,
		partsPercentFourDaysAgoCP,
		wirePercentFourDaysAgoCP,

		knownPercentThreeDaysAgoCP,
		UnknownPercentThreeDaysAgoCP,
		partsPercentThreeDaysAgoCP,
		wirePercentThreeDaysAgoCP,

		knownPercentTwoDaysAgoCP,
		UnknownPercentTwoDaysAgoCP,
		partsPercentTwoDaysAgoCP,
		wirePercentTwoDaysAgoCP,

		knownPercentOneDayAgoCP,
		UnknownPercentOneDayAgoCP,
		partsPercentOneDayAgoCP,
		wirePercentOneDayAgoCP,

		totPercentSevenDaysAgoCP,
		totPercentSixDaysAgoCP,
		totPercentFiveDaysAgoCP,
		totPercentFourDaysAgoCP,
		totPercentThreeDaysAgoCP,
		totPercentTwoDaysAgoCP,
		totPercentOneDayAgoCP,

		// em breakdowns
		numOfKnownEM,
		numOfUnKnownEM,
		numOfPartsEM,
		numOfConsumablesEM,
		totBDEM,
		sumOfBDEM,
		downtimePercTodayEM,

		//graph
		knownPercentSevenDaysAgoEM,
		UnknownPercentSevenDaysAgoEM,
		partsPercentSevenDaysAgoEM,
		wirePercentSevenDaysAgoEM,

		knownPercentSixDaysAgoEM,
		UnknownPercentSixDaysAgoEM,
		partsPercentSixDaysAgoEM,
		wirePercentSixDaysAgoEM,

		knownPercentFiveDaysAgoEM,
		UnknownPercentFiveDaysAgoEM,
		partsPercentFiveDaysAgoEM,
		wirePercentFiveDaysAgoEM,

		knownPercentFourDaysAgoEM,
		UnknownPercentFourDaysAgoEM,
		partsPercentFourDaysAgoEM,
		wirePercentFourDaysAgoEM,

		knownPercentThreeDaysAgoEM,
		UnknownPercentThreeDaysAgoEM,
		partsPercentThreeDaysAgoEM,
		wirePercentThreeDaysAgoEM,

		knownPercentTwoDaysAgoEM,
		UnknownPercentTwoDaysAgoEM,
		partsPercentTwoDaysAgoEM,
		wirePercentTwoDaysAgoEM,

		knownPercentOneDayAgoEM,
		UnknownPercentOneDayAgoEM,
		partsPercentOneDayAgoEM,
		wirePercentOneDayAgoEM,

		totPercentSevenDaysAgoEM,
		totPercentSixDaysAgoEM,
		totPercentFiveDaysAgoEM,
		totPercentFourDaysAgoEM,
		totPercentThreeDaysAgoEM,
		totPercentTwoDaysAgoEM,
		totPercentOneDayAgoEM,

		// hp breakdowns
		numOfKnownHP,
		numOfUnKnownHP,
		numOfPartsHP,
		numOfConsumablesHP,
		totBDHP,
		sumOfBDHP,
		downtimePercTodayHP,

		//graph
		knownPercentSevenDaysAgoHP,
		UnknownPercentSevenDaysAgoHP,
		partsPercentSevenDaysAgoHP,
		wirePercentSevenDaysAgoHP,

		knownPercentSixDaysAgoHP,
		UnknownPercentSixDaysAgoHP,
		partsPercentSixDaysAgoHP,
		wirePercentSixDaysAgoHP,

		knownPercentFiveDaysAgoHP,
		UnknownPercentFiveDaysAgoHP,
		partsPercentFiveDaysAgoHP,
		wirePercentFiveDaysAgoHP,

		knownPercentFourDaysAgoHP,
		UnknownPercentFourDaysAgoHP,
		partsPercentFourDaysAgoHP,
		wirePercentFourDaysAgoHP,

		knownPercentThreeDaysAgoHP,
		UnknownPercentThreeDaysAgoHP,
		partsPercentThreeDaysAgoHP,
		wirePercentThreeDaysAgoHP,

		knownPercentTwoDaysAgoHP,
		UnknownPercentTwoDaysAgoHP,
		partsPercentTwoDaysAgoHP,
		wirePercentTwoDaysAgoHP,

		knownPercentOneDayAgoHP,
		UnknownPercentOneDayAgoHP,
		partsPercentOneDayAgoHP,
		wirePercentOneDayAgoHP,

		totPercentSevenDaysAgoHP,
		totPercentSixDaysAgoHP,
		totPercentFiveDaysAgoHP,
		totPercentFourDaysAgoHP,
		totPercentThreeDaysAgoHP,
		totPercentTwoDaysAgoHP,
		totPercentOneDayAgoHP,

		// HP breakdowns
		numOfKnownLDL,
		numOfUnKnownLDL,
		numOfPartsLDL,
		numOfConsumablesLDL,
		totBDLDL,
		sumOfBDLDL,
		downtimePercTodayLDL,

		//graph
		knownPercentSevenDaysAgoLDL,
		UnknownPercentSevenDaysAgoLDL,
		partsPercentSevenDaysAgoLDL,
		wirePercentSevenDaysAgoLDL,

		knownPercentSixDaysAgoLDL,
		UnknownPercentSixDaysAgoLDL,
		partsPercentSixDaysAgoLDL,
		wirePercentSixDaysAgoLDL,

		knownPercentFiveDaysAgoLDL,
		UnknownPercentFiveDaysAgoLDL,
		partsPercentFiveDaysAgoLDL,
		wirePercentFiveDaysAgoLDL,

		knownPercentFourDaysAgoLDL,
		UnknownPercentFourDaysAgoLDL,
		partsPercentFourDaysAgoLDL,
		wirePercentFourDaysAgoLDL,

		knownPercentThreeDaysAgoLDL,
		UnknownPercentThreeDaysAgoLDL,
		partsPercentThreeDaysAgoLDL,
		wirePercentThreeDaysAgoLDL,

		knownPercentTwoDaysAgoLDL,
		UnknownPercentTwoDaysAgoLDL,
		partsPercentTwoDaysAgoLDL,
		wirePercentTwoDaysAgoLDL,

		knownPercentOneDayAgoLDL,
		UnknownPercentOneDayAgoLDL,
		partsPercentOneDayAgoLDL,
		wirePercentOneDayAgoLDL,

		totPercentSevenDaysAgoLDL,
		totPercentSixDaysAgoLDL,
		totPercentFiveDaysAgoLDL,
		totPercentFourDaysAgoLDL,
		totPercentThreeDaysAgoLDL,
		totPercentTwoDaysAgoLDL,
		totPercentOneDayAgoLDL,

		selection,
	})
}

// let john = new  CronJob('5 */5 * * * *', async function(req, res) {

// 	const
// }
// // john.start()

///-------------------------------------------------new eff---------------------------------------------------- ///

// let deleteDupShifts = new CronJob('5 */4 * * * *', async function (req, res) {
// 	console.log('Started Dups')

// 	const startDateDups = new Date('2022, 04, 01')
// 	const listForDups = await Update.find({
// 		shiftStart: { $gte: startDateDups },
// 	})

// 	const arrToDelete = []

// 	for (let d of listForDups) {
// 		let toDelete = await Update.findOne({
// 			eff: { $lte: d.eff },
// 			vin: d.vin,
// 			shiftStart: d.shiftStart,
// 			shiftEnd: d.shiftEnd,
// 			_id: { $ne: d._id },
// 		})
// 		// console.log(toDelete)

// 		if (toDelete) {
// 			await Update.findByIdAndDelete(toDelete._id)
// 		}
// 	}

// 	console.log('Ended Dups')
// })
// deleteDupShifts.start()

// let resetMachine = new CronJob('5 */5 * * * *', async function (req, res) {
// 	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// 	const theHour = 1

// 	// ////////////////////////////////////////////////// start

// 	const machines = await Machine.find({ programming: false }).populate({
// 		path: 'shifts',
// 		match: {
// 			active: true,
// 		},
// 	})

// 	const machineStoppagesForUpdate = await Machine.find({
// 		programming: false,
// 		inShift: false,
// 	}).populate({
// 		path: 'stoppages',
// 		match: {
// 			open: true,
// 		},
// 	})

// 	for (let machine of machines) {
// 		const oldData = machine.touchTime
// 		const oldDataR = machine.runningTime
// 		let thelastSignal = machine.thelastSignal
// 		let thelastSignalAll = machine.thelastSignal

// 		// console.log(oldData)
// 		try {
// 			machine.inShift = false
// 			machine.eff = 0
// 			machine.teff = 0
// 			machine.runningTime = 0
// 			machine.touchTime = 0
// 			machine.shiftStart = null
// 			machine.shiftEnd = null

// 			await machine.save()

// 			machine.shifts.forEach(async function (shift) {
// 				let shiftType = 'days'
// 				let timeNow = moment().format('YYYY-MM-DDTHH:mm:ss')
// 				let inShift = false
// 				let dayNow = moment().format('dddd').toLowerCase()
// 				let dayYesterday = moment().subtract(1, 'days').format('dddd').toLowerCase()
// 				let dayNowCheck = moment().format('dddd').toLowerCase()

// 				const startHour = +shift.startTimeString.substring(0, 2)
// 				const endHour = +shift.endTimeString.substring(0, 2)

// 				let startTime = moment().format(`YYYY-MM-DDT${shift.startTimeString}:00`)
// 				let endTime = moment().format(`YYYY-MM-DDT${shift.endTimeString}:00`)

// 				let d = new Date()
// 				let theHour = d.getHours()

// 				if (theHour < 18) {
// 					if (endHour > 0 && endHour < startHour) {
// 						shiftType = 'nights'
// 						startTime = moment().subtract(1, 'days').format(`YYYY-MM-DDT${shift.startTimeString}:00`)
// 						dayNow = moment().subtract(1, 'days').format('dddd').toLowerCase()
// 					}
// 				} else {
// 					if (endHour > 0 && endHour < startHour) {
// 						shiftType = 'nights'
// 						endTime = moment().add(1, 'days').format(`YYYY-MM-DDT${shift.endTimeString}:00`)
// 					}
// 				}

// 				if (endHour === 0) {
// 					endTime = moment().add(1, 'days').format(`YYYY-MM-DDT${shift.endTimeString}:00`)
// 				}

// 				// if (theHour > 17 && shift._doc.hasOwnProperty(dayNow) && endHour < 8) {
// 				// 	console.log(shift.vin)
// 				// }

// 				if (theHour < 7) {
// 					if (shiftType === 'days' && timeNow > startTime && timeNow < endTime && shift._doc.hasOwnProperty(dayNow)) {
// 						inShift = true
// 						machine.inShift = inShift
// 						machine.shiftStart = startTime
// 						machine.shiftEnd = endTime
// 						machine.dayNow = dayNow
// 						await machine.save()
// 						// console.log(machine)
// 						// console.log(shift.vin)
// 						// console.log(`${startTime} - ${endTime}`)
// 					}
// 					if (
// 						shiftType === 'nights' &&
// 						timeNow > startTime &&
// 						timeNow < endTime &&
// 						(shift._doc.hasOwnProperty(dayNow) || shift._doc.hasOwnProperty(dayYesterday))
// 					) {
// 						inShift = true
// 						machine.inShift = inShift
// 						machine.shiftStart = startTime
// 						machine.shiftEnd = endTime
// 						machine.dayNow = dayNow
// 						await machine.save()
// 						// console.log(machine)
// 						// console.log(shift.vin)
// 						// console.log(`${startTime} - ${endTime}`)
// 					}
// 				} else {
// 					if (shiftType === 'days' && timeNow > startTime && timeNow < endTime && shift._doc.hasOwnProperty(dayNow)) {
// 						inShift = true
// 						machine.inShift = inShift
// 						machine.shiftStart = startTime
// 						machine.shiftEnd = endTime
// 						machine.dayNow = dayNow
// 						await machine.save()
// 						// console.log(machine)
// 						// console.log(shift.vin)
// 						// console.log(`${startTime} - ${endTime}`)
// 					}
// 					if (shiftType === 'nights' && timeNow > startTime && timeNow < endTime && shift._doc.hasOwnProperty(dayNow)) {
// 						inShift = true
// 						machine.inShift = inShift
// 						machine.shiftStart = startTime
// 						machine.shiftEnd = endTime
// 						machine.dayNow = dayNow
// 						await machine.save()
// 						// console.log(machine)
// 						// console.log(shift.vin)
// 						// console.log(`${startTime} - ${endTime}`)
// 					}
// 				}

// 				shift.inShift = inShift
// 				shift.startTime = startTime
// 				shift.endTime = endTime

// 				await shift.save()
// 			})

// 			if (machine.inShift) {
// 				let vin = machine.vin
// 				let rTimePercentForEff = 0
// 				let tTimePercentForEff = 0
// 				let startOfToday = moment(machine.shiftStart).subtract(theHour, 'hours').format('YYYY-MM-DDTHH:mm:ss')
// 				let startOfTodayAdd1Hour = moment(machine.shiftStart)
// 				let timeNow = moment().format('YYYY-MM-DDTHH:mm:ss')
// 				let timeNowStamp = moment().format('HH:mm:ss')
// 				let rTime = []
// 				let tTime = []
// 				let runningTime = 0
// 				let touchTime = 0

// 				const myDate = new Date(machine.shiftStart)
// 				myDate.setHours(myDate.getHours() + theHour)

// 				// const myDate2 = new Date(machine.thelastSignal)
// 				const myDate2 = new Date()
// 				myDate2.setHours(myDate2.getHours() + theHour)

// 				let d = new Date(myDate),
// 					e = new Date(myDate2)
// 				let msSinceEight = e - d
// 				let secondsSinceEight = msSinceEight / 1000

// 				let headers = { 'x-api-key': process.env.MACHINE_API }

// 				let response = await axios(
// 					`https://e0ssp9czi7.execute-api.eu-west-1.amazonaws.com/prod/v1/data/${vin}?from=${startOfToday}Z&to=${timeNow}Z`,
// 					{ headers }
// 				)

// 				// let theData = []

// 				let number = 0
// 				let addedTime = 0

// 				let number1 = 0
// 				let addedTime1 = 0

// 				let lastRun = 0
// 				let lastRunStop = 0
// 				let lastTouch = 0
// 				let lastTouchStop = 0

// 				let start = 0
// 				let start1 = 0
// 				let start10 = 0
// 				let end = 0
// 				let end1 = 0

// 				let millis

// 				let beforeMillis = 0

// 				let addedTimeAtStart = 0
// 				const updatedStart = new Date(machine.shiftStart)

// 				if (response.data[0]) {
// 					if (response.data && response.data[0].inputChannel0Value) {
// 						if (response.data[0] && response.data[0].inputChannel0Value != null) {
// 							number = response.data[0].inputChannel0Value.length - 1
// 							if (response.data[0].inputChannel0Value[number].state === '1') {
// 								// console.log(response.data[0].inputChannel0Value)
// 								start = new Date(response.data[0].inputChannel0Value[number].time)
// 								// console.log(response.data[0].inputChannel0Value[number])
// 								start.setHours(start.getHours() + theHour)
// 								// console.log(start)
// 								millis = Date.now() - start

// 								/////////////////////////////////

// 								addedTime = Math.floor(millis / 1000)

// 								lastRun = start
// 							}
// 							///////////////////////////////
// 							if (response.data[0].inputChannel0Value[0].state === '0') {
// 								start10 = new Date(response.data[0].inputChannel0Value[0].time)

// 								start10.setHours(start10.getHours() + theHour)
// 								// console.log(start)

// 								beforeMillis = start10 - updatedStart
// 								// addedTimeAtStart = +Math.abs(Math.round(beforeMillis / 1000) / 60 + 60).toFixed(2)
// 							}

// 							addedTimeAtStart = Math.floor(beforeMillis / 1000)

// 							if (response.data[0].inputChannel0Value[number].state === '0') {
// 								end = new Date(response.data[0].inputChannel0Value[number].time)

// 								end.setHours(end.getHours() + theHour)

// 								lastRunStop = end
// 							}
// 						}
// 					}
// 					const totalTimeAdded = addedTime + addedTimeAtStart
// 					// if (machine.vin === 'JCBUKBHLIGMBOOM42') {
// 					// 	// console.log('MS Before => ', beforeMillis)
// 					// 	// console.log('MS After => ', millis)
// 					// 	console.log('START ADDED => ', addedTimeAtStart)
// 					// 	console.log('END ADDED => ', addedTime)
// 					// 	console.log('TOTAL ADDED => ', totalTimeAdded)
// 					// }

// 					if (response.data[0] && response.data[0].inputChannel1Value != null) {
// 						number1 = response.data[0].inputChannel1Value.length - 1
// 						if (response.data[0].inputChannel1Value[number1].state === '1') {
// 							// console.log(response.data[0].inputChannel0Value)
// 							start1 = new Date(response.data[0].inputChannel1Value[number1].time)
// 							// console.log(response.data[0].inputChannel1Value[number1])
// 							start1.setHours(start1.getHours() + theHour)
// 							// console.log(start)
// 							const millis1 = Date.now() - start1
// 							addedTime1 = Math.floor(millis1 / 1000)

// 							lastTouch = start1
// 						}
// 						if (response.data[0].inputChannel1Value[number1].state === '0') {
// 							// console.log(response.data[0].inputChannel0Value)
// 							end1 = new Date(response.data[0].inputChannel1Value[number1].time)
// 							// console.log(response.data[0].inputChannel1Value[number1])
// 							end1.setHours(end1.getHours() + theHour)

// 							lastTouchStop = end1
// 						}
// 					}

// 					for (let x of response.data) {
// 						rTime.push(x.inputChannel0Value_duration + totalTimeAdded)
// 						tTime.push(x.inputChannel1Value_duration)
// 						if (x.inputChannel0Value_duration != null) {
// 							runningTime = x.inputChannel0Value_duration + totalTimeAdded
// 						}
// 						if (x.inputChannel1Value_duration != null) {
// 							touchTime = x.inputChannel1Value_duration
// 						}
// 					}

// 					if (lastRun || lastTouch > 0) {
// 						if (lastTouch > lastRun) {
// 							thelastSignal = lastTouch
// 						} else {
// 							thelastSignal = lastRun
// 						}
// 					}

// 					const dateArr = [lastRun, lastTouch, lastRunStop, lastTouchStop]

// 					const sortedDateArr = dateArr.sort(function (a, b) {
// 						return b - a
// 					})

// 					if (sortedDateArr[0] !== 0) {
// 						thelastSignalAll = sortedDateArr[0]
// 					}

// 					if (rTime.length > 0) {
// 						rTimePercentForEff = Math.round((rTime / ((new Date() - machine.shiftStart) / 1000)) * 100)
// 					} else {
// 						rTimePercentForEff = 0
// 					}
// 					if (tTime.length > 0) {
// 						tTimePercentForEff = Math.round((tTime / ((new Date() - machine.shiftStart) / 1000)) * 100)
// 					} else {
// 						tTimePercentForEff = 0
// 					}
// 				}

// 				let idNumber = machine.id

// 				if (isNaN(rTimePercentForEff)) {
// 					rTimePercentForEff = 0
// 				}
// 				if (isNaN(tTimePercentForEff)) {
// 					tTimePercentForEff = 0
// 				}
// 				let shiftHours = [] // Results will go here
// 				let shiftStartHour = new Date(machine.shiftStart).getHours() // Get current hour of the day
// 				let shiftEndHour = new Date(machine.shiftEnd).getHours() // Get current hour of the day

// 				if (shiftStartHour < shiftEndHour) {
// 					// Loop from start to end of shift
// 					for (let i = shiftStartHour; i <= shiftEndHour; i++) {
// 						shiftHours.push(i) // Put loop counter into array with ":00" next to it
// 					}
// 				}
// 				if (shiftStartHour > shiftEndHour) {
// 					// Loop from current hour number to 23
// 					for (let i = shiftStartHour; i < 24; i++) {
// 						shiftHours.push(i) // Put loop counter into array with ":00" next to it
// 					}
// 					// Loop midnight end of shift
// 					for (let i = 0; i <= shiftEndHour; i++) {
// 						shiftHours.push(i) // Put loop counter into array with ":00" next to it
// 					}
// 				}

// 				const machineForUpdate = await Machine.findById(idNumber)
// 					.populate({
// 						path: 'updates',
// 						options: { sort: { _id: -1 }, limit: 1 },
// 					})
// 					.populate({
// 						path: 'stoppages',
// 						match: {
// 							open: true,
// 						},
// 					})

// 				let dataForUpdate = {}

// 				if (machineForUpdate.method === 'old') {
// 					dataForUpdate = {
// 						vin: vin,
// 						date: new Date(),
// 						day: machineForUpdate.dayNow,
// 						eff: rTimePercentForEff,
// 						teff: tTimePercentForEff,
// 						shiftStart: machineForUpdate.shiftStart,
// 						shiftEnd: machineForUpdate.shiftEnd,
// 						shortBu: machineForUpdate.shortBu,
// 						machineName: machineForUpdate.machineName,
// 						type: machineForUpdate.type,
// 						thelastSignal: thelastSignalAll,
// 					}
// 				}
// 				if (machineForUpdate.method === 'running') {
// 					dataForUpdate = {
// 						vin: vin,
// 						date: new Date(),
// 						day: machineForUpdate.dayNow,
// 						eff: rTimePercentForEff,
// 						teff: rTimePercentForEff,
// 						shiftStart: machineForUpdate.shiftStart,
// 						shiftEnd: machineForUpdate.shiftEnd,
// 						shortBu: machineForUpdate.shortBu,
// 						machineName: machineForUpdate.machineName,
// 						type: machineForUpdate.type,
// 						thelastSignal: thelastSignalAll,
// 					}
// 				}
// 				if (machineForUpdate.method === 'touch') {
// 					dataForUpdate = {
// 						vin: vin,
// 						date: new Date(),
// 						day: machineForUpdate.dayNow,
// 						eff: tTimePercentForEff,
// 						teff: tTimePercentForEff,
// 						shiftStart: machineForUpdate.shiftStart,
// 						shiftEnd: machineForUpdate.shiftEnd,
// 						shortBu: machineForUpdate.shortBu,
// 						machineName: machineForUpdate.machineName,
// 						type: machineForUpdate.type,
// 						thelastSignal: thelastSignalAll,
// 					}
// 				}

// 				const update = new Update(dataForUpdate)

// 				if (machineForUpdate.updates.length > 0) {
// 					const updateId = machineForUpdate.updates[0]._id
// 					let date1 = new Date(machineForUpdate.updates[0].shiftStart)
// 					let date2 = new Date(machineForUpdate.shiftStart)
// 					let seconds1 = date1.getTime() / 1000
// 					let seconds2 = date2.getTime() / 1000

// 					if (seconds1 === seconds2) {
// 						await Update.findByIdAndUpdate(updateId, {
// 							eff: dataForUpdate.eff,
// 							teff: dataForUpdate.teff,
// 							thelastSignal: thelastSignalAll,
// 						})
// 						await machineForUpdate.save()
// 						// console.log(`Just updated old value on ${machineForUpdate.machineName}`)
// 					} else {
// 						machineForUpdate.updates.push(update)
// 						await update.save()
// 						// console.log(`Just aded a new update to ${machineForUpdate.machineName}`)
// 						await machineForUpdate.save()
// 					}
// 				} else {
// 					machineForUpdate.updates.push(update)
// 					await update.save()
// 					// console.log(`Just aded a new update to ${machineForUpdate.machineName}`)
// 					await machineForUpdate.save()
// 				}

// 				if (touchTime >= runningTime) {
// 					runningTime = touchTime
// 					rTimePercentForEff = tTimePercentForEff
// 				}

// 				// if (thelastSignal > 0) {
// 				// 	theStoppage = await Stoppage.findOne({
// 				// 		vin       : vin,
// 				// 		open      : true,
// 				// 		createdAt : { $gte: thelastSignal },
// 				// 	})
// 				// }

// 				const theStoppage = await Stoppage.findOne({
// 					vin: vin,
// 					open: true,
// 					createdAt: { $gte: machineForUpdate.lastUpdate },
// 				})

// 				if (!theStoppage && machine.method !== 'running' && touchTime - oldData > 0 && machineForUpdate.state !== 'Running') {
// 					let machineWithStoppage = await Machine.findById(idNumber).populate({
// 						path: 'stoppages',
// 						options: { sort: { _id: -1 }, limit: 1 },
// 					})

// 					if (machineWithStoppage && machineWithStoppage.stoppages && machineWithStoppage.stoppages.length > 0) {
// 						let theLastStoppage = machineWithStoppage.stoppages[0]

// 						if (theLastStoppage.type === 'Breakdown' && theLastStoppage.concern === 'Unknown') {
// 							console.log('Not this time')
// 							// console.log(theLastStoppage)
// 						} else {
// 							let theDate = new Date()
// 							// theDate.setMinutes(theDate)
// 							theDate.setMilliseconds(0)
// 							let stoppage = await Stoppage.findOneAndUpdate(
// 								{
// 									vin: vin,
// 									open: true,
// 								},
// 								{
// 									endTime: theDate,
// 									open: false,
// 									closeNotes: 'Stoppage ended by system as machine is now running',
// 								}
// 							)
// 							let machine = await Machine.findOneAndUpdate(
// 								{
// 									vin: vin,
// 								},
// 								{
// 									state: 'Running',
// 								}
// 							)
// 							let totalTime = theDate - stoppage.startTime
// 							stoppage.totalTime = totalTime
// 							await stoppage.save()
// 							await machine.save()
// 						}
// 					}
// 				}
// 				if (!theStoppage && machine.method === 'running' && runningTime - oldDataR > 0 && machineForUpdate.state !== 'Running') {
// 					// console.log('Old time', oldData)
// 					// console.log('New time', touchTime)
// 					// const diff = touchTime - oldData
// 					// console.log('difference', diff)
// 					let theDate = new Date()
// 					// theDate.setMinutes(theDate)
// 					theDate.setMilliseconds(0)
// 					let stoppage = await Stoppage.findOneAndUpdate(
// 						{
// 							vin: vin,
// 							open: true,
// 						},
// 						{
// 							endTime: theDate,
// 							open: false,
// 							closeNotes: 'Stoppage ended by system as machine is now running',
// 						}
// 					)
// 					let machine = await Machine.findOneAndUpdate(
// 						{
// 							vin: vin,
// 						},
// 						{
// 							state: 'Running',
// 						}
// 					)
// 					let totalTime = theDate - stoppage.startTime
// 					stoppage.totalTime = totalTime
// 					await stoppage.save()
// 					await machine.save()
// 				}

// 				if (machineForUpdate.method === 'old') {
// 					await Machine.findByIdAndUpdate(idNumber, {
// 						eff: rTimePercentForEff,
// 						shiftHours: shiftHours,
// 						teff: tTimePercentForEff,
// 						// signal      : signal,
// 						runningTime: runningTime,
// 						touchTime: touchTime,
// 						lastUpdate: Date.now(),
// 						thelastSignal: thelastSignalAll,
// 					})
// 				}
// 				if (machineForUpdate.method === 'running') {
// 					await Machine.findByIdAndUpdate(idNumber, {
// 						eff: rTimePercentForEff,
// 						shiftHours: shiftHours,
// 						teff: rTimePercentForEff,
// 						// signal      : signal,
// 						runningTime: runningTime,
// 						touchTime: touchTime,
// 						lastUpdate: Date.now(),
// 						thelastSignal: thelastSignalAll,
// 					})
// 				}
// 				if (machineForUpdate.method === 'touch') {
// 					await Machine.findByIdAndUpdate(idNumber, {
// 						eff: tTimePercentForEff,
// 						shiftHours: shiftHours,
// 						teff: tTimePercentForEff,
// 						// signal      : signal,
// 						runningTime: runningTime,
// 						touchTime: touchTime,
// 						lastUpdate: Date.now(),
// 						thelastSignal: thelastSignalAll,
// 					})
// 				}

// 				//return the first monday of any week by the week number this year
// 				const getFirstMondayOfWeek = (weekNo) => {
// 					const thisWeek = moment().isoWeek()

// 					if (weekNo > thisWeek) {
// 						firstMonday = new Date(new Date().getFullYear() - 1, 0, 4, 0, 0, 0, 0)
// 					} else {
// 						firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)
// 					}

// 					// let firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)

// 					while (firstMonday.getDay() != 1) {
// 						firstMonday.setDate(firstMonday.getDate() - 1)
// 					}
// 					if (1 <= weekNo && weekNo <= 52) return firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))

// 					firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))
// 					if ((weekNo = 53 && firstMonday.getDate() >= 22 && firstMonday.getDate() <= 28)) return firstMonday
// 					return null
// 				}
// 				const thisWeekIso = moment().isoWeek()
// 				const mondayThisWeek = new Date(getFirstMondayOfWeek(thisWeekIso))

// 				const theDateToday = new Date()
// 				const eightHoursAgo = theDateToday.setHours(theDateToday.getHours() - 4)

// 				const dayNumber = theDateToday.getDay()

// 				// console.log(new Date(eightHoursAgo))
// 				// console.log(dayNumber)

// 				if (dayNumber === 1) {
// 					theHoursAgo = new Date()
// 				} else {
// 					theHoursAgo = new Date(eightHoursAgo)
// 				}

// 				// console.log(mondayThisWeek)

// 				const result = await Update.aggregate([
// 					{
// 						$match: {
// 							createdAt: { $gt: mondayThisWeek, $lt: theHoursAgo },
// 							eff: { $exists: true, $gt: -1 },
// 							vin: vin,
// 						},
// 					},

// 					{
// 						$project: {
// 							_id: 0,
// 							eff: 1,
// 							teff: 1,
// 							createdAt: 1,
// 							shiftStart: 1,
// 							shiftEnd: 1,
// 							createdAt: 1,
// 							availableMins: 1,
// 							runningMins: 1,
// 							machineName: 1,
// 						},
// 					},
// 					//get total available time
// 					{
// 						$addFields: {
// 							totalTime: {
// 								$subtract: ['$shiftEnd', '$shiftStart'],
// 							},
// 						},
// 					},
// 					//get available mins
// 					{
// 						$addFields: {
// 							avMinutes: {
// 								$floor: {
// 									$divide: ['$totalTime', 60000],
// 								},
// 							},
// 						},
// 					},
// 					//get running mins
// 					{
// 						$addFields: {
// 							rnningMins: {
// 								$multiply: [
// 									{
// 										$divide: ['$avMinutes', 100],
// 									},
// 									'$eff',
// 								],
// 							},
// 						},
// 					},
// 					//get touch mins

// 					{
// 						$project: {
// 							vin: 1,
// 							eff: 1,
// 							teff: 1,
// 							updated: 1,
// 							machineName: 1,
// 							avMinutes: {
// 								$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
// 							},
// 							rnningMins: {
// 								$cond: [{ $not: ['$runningMins'] }, '$rnningMins', '$runningMins'],
// 							},
// 						},
// 					},
// 					// {
// 					// 	$addFields : {
// 					// 		touchMins : {
// 					// 			$multiply : [
// 					// 				{
// 					// 					$divide : [ '$avMinutes', 100 ],
// 					// 				},
// 					// 				'$teff',
// 					// 			],
// 					// 		},
// 					// 	},
// 					// },
// 					{
// 						$addFields: {
// 							touchMins: {
// 								$cond: [
// 									{ $gt: ['$avMinutes', 0] },

// 									{
// 										$multiply: [
// 											{
// 												$divide: ['$avMinutes', 100],
// 											},
// 											'$teff',
// 										],
// 									},
// 									0,
// 								],
// 							},
// 						},
// 					},

// 					{
// 						$group: {
// 							_id: '$machineName',

// 							sum_of_avv_mins: {
// 								$sum: '$avMinutes',
// 							},
// 							sum_of_running_mins: {
// 								$sum: '$rnningMins',
// 							},
// 							sum_of_touch_mins: {
// 								$sum: '$touchMins',
// 							},

// 							// count           : { $sum: 1 },
// 						},
// 					},
// 					{
// 						$addFields: {
// 							averageMEff: {
// 								$cond: [
// 									{ $gt: ['$sum_of_avv_mins', 0] },
// 									{
// 										$multiply: [
// 											{
// 												$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
// 											},
// 											100,
// 										],
// 									},
// 									0,
// 								],
// 							},
// 						},
// 					},
// 					{
// 						$addFields: {
// 							averageMTEff: {
// 								$cond: [
// 									{ $gt: ['$sum_of_avv_mins', 0] },
// 									{
// 										$multiply: [
// 											{
// 												$divide: ['$sum_of_touch_mins', '$sum_of_avv_mins'],
// 											},
// 											100,
// 										],
// 									},
// 									0,
// 								],
// 							},
// 						},
// 					},
// 					{
// 						$addFields: {
// 							averageEff: {
// 								$round: ['$averageMEff', 0],
// 							},
// 						},
// 					},
// 					{
// 						$addFields: {
// 							averageTEff: {
// 								$round: ['$averageMTEff', 0],
// 							},
// 						},
// 					},
// 				])
// 				// console.log('MACHINE => ', machine.machinename)
// 				// console.log('RESULT => ', result)
// 				const weeklyId = machine._id

// 				if (result) {
// 					await Machine.findByIdAndUpdate(weeklyId, {
// 						weeklyEff: result[0].averageEff,
// 						weeklyTeff: result[0].averageTEff,
// 					})
// 				}
// 			}
// 		} catch (error) {
// 			console.log(error)
// 		}
// 	}
// 	console.log('update finished')

// 	// const updateRunning = await Machine.find({
// 	// 	method : 'running',
// 	// })
// 	// const updateTouch = await Machine.find({
// 	// 	method : 'touch',
// 	// })

// 	// const runningVins = updateRunning.map((r) => r.vin)

// 	// // console.log(runningVins)

// 	// const runningUpdates = await Update.find({
// 	// 	vin : { $in: runningVins },
// 	// })

// 	// for (let r of runningUpdates) {
// 	// 	r.teff = r.eff
// 	// 	await r.save()
// 	// }

// 	// const touchVins = updateTouch.map((r) => r.vin)
// 	// const touchUpdates = await Update.find({
// 	// 	vin : { $in: touchVins },
// 	// })
// 	// for (let t of touchUpdates) {
// 	// 	t.eff = t.teff
// 	// 	await t.save()

// 	// }
// })

// resetMachine.start()

////////////// end of old stuff ///////////////////

// let resetMachine = new  CronJob('5 */5 * * * *', async function (req, res) {
// 	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// 	const theHour = 1

// 	// const oxy3 = await Update.find({
// 	// 	vin : 'JCBUKBHLPLAOXY003',
// 	// })

// 	// for (let x of oxy3) {
// 	// 	await Update.findByIdAndUpdate(x.id, { $set: { eff: x.teff } })
// 	// }

// 	// await Machine.updateMany(
// 	// 	{ programming: true },
// 	// 	{
// 	// 		$set : {
// 	// 			runningTime : 0,
// 	// 			touchTime   : 0,
// 	// 			eff         : 0,
// 	// 			teff        : 0,
// 	// 			// state       : 'Running',
// 	// 		},
// 	// 	},
// 	// )

// 	const machines = await Machine.find({ programming: false }).populate({
// 		path: 'shifts',
// 		match: {
// 			active: true,
// 		},
// 	})

// 	const machineStoppagesForUpdate = await Machine.find({
// 		programming: false,
// 		inShift: false,
// 	}).populate({
// 		path: 'stoppages',
// 		match: {
// 			open: true,
// 		},
// 	})

// 	// for (let m of machineStoppagesForUpdate) {
// 	// 	if (m.stoppages.length > 0) {
// 	// 		let theDate = new Date()
// 	// 		// console.log(m)

// 	// 		theDate.setMilliseconds(0)

// 	// 		let stoppage = await Stoppage.findOneAndUpdate(
// 	// 			{
// 	// 				vin  : m.vin,
// 	// 				open : true,
// 	// 			},
// 	// 			{ open: false, endTime: theDate },
// 	// 		)
// 	// 		let machine = await Machine.findOneAndUpdate(
// 	// 			{
// 	// 				vin : m.vin,
// 	// 			},
// 	// 			{ state: 'Running' },
// 	// 		)
// 	// 		let totalTime = theDate - stoppage.startTime
// 	// 		stoppage.totalTime = totalTime
// 	// 		await stoppage.save()
// 	// 		await machine.save()
// 	// 	}
// 	// }

// 	for (let machine of machines) {
// 		const oldData = machine.touchTime
// 		const oldDataR = machine.runningTime
// 		let thelastSignal = machine.thelastSignal
// 		let thelastSignalAll = machine.thelastSignal

// 		// console.log(oldData)
// 		try {
// 			machine.inShift = false
// 			machine.eff = 0
// 			machine.teff = 0
// 			machine.runningTime = 0
// 			machine.touchTime = 0
// 			machine.shiftStart = null
// 			machine.shiftEnd = null

// 			await machine.save()

// 			machine.shifts.forEach(async function (shift) {
// 				let shiftType = 'days'
// 				let timeNow = moment().format('YYYY-MM-DDTHH:mm:ss')
// 				let inShift = false
// 				let dayNow = moment().format('dddd').toLowerCase()
// 				let dayYesterday = moment().subtract(1, 'days').format('dddd').toLowerCase()
// 				let dayNowCheck = moment().format('dddd').toLowerCase()

// 				const startHour = +shift.startTimeString.substring(0, 2)
// 				const endHour = +shift.endTimeString.substring(0, 2)

// 				let startTime = moment().format(`YYYY-MM-DDT${shift.startTimeString}:00`)
// 				let endTime = moment().format(`YYYY-MM-DDT${shift.endTimeString}:00`)

// 				let d = new Date()
// 				let theHour = d.getHours()

// 				if (theHour < 18) {
// 					if (endHour > 0 && endHour < startHour) {
// 						shiftType = 'nights'
// 						startTime = moment().subtract(1, 'days').format(`YYYY-MM-DDT${shift.startTimeString}:00`)
// 						dayNow = moment().subtract(1, 'days').format('dddd').toLowerCase()
// 					}
// 				} else {
// 					if (endHour > 0 && endHour < startHour) {
// 						shiftType = 'nights'
// 						endTime = moment().add(1, 'days').format(`YYYY-MM-DDT${shift.endTimeString}:00`)
// 					}
// 				}

// 				if (endHour === 0) {
// 					endTime = moment().add(1, 'days').format(`YYYY-MM-DDT${shift.endTimeString}:00`)
// 				}

// 				// if (theHour > 17 && shift._doc.hasOwnProperty(dayNow) && endHour < 8) {
// 				// 	console.log(shift.vin)
// 				// }

// 				if (theHour < 7) {
// 					if (shiftType === 'days' && timeNow > startTime && timeNow < endTime && shift._doc.hasOwnProperty(dayNow)) {
// 						inShift = true
// 						machine.inShift = inShift
// 						machine.shiftStart = startTime
// 						machine.shiftEnd = endTime
// 						machine.dayNow = dayNow
// 						await machine.save()
// 						// console.log(machine)
// 						// console.log(shift.vin)
// 						// console.log(`${startTime} - ${endTime}`)
// 					}
// 					if (
// 						shiftType === 'nights' &&
// 						timeNow > startTime &&
// 						timeNow < endTime &&
// 						(shift._doc.hasOwnProperty(dayNow) || shift._doc.hasOwnProperty(dayYesterday))
// 					) {
// 						inShift = true
// 						machine.inShift = inShift
// 						machine.shiftStart = startTime
// 						machine.shiftEnd = endTime
// 						machine.dayNow = dayNow
// 						await machine.save()
// 						// console.log(machine)
// 						// console.log(shift.vin)
// 						// console.log(`${startTime} - ${endTime}`)
// 					}
// 				} else {
// 					if (shiftType === 'days' && timeNow > startTime && timeNow < endTime && shift._doc.hasOwnProperty(dayNow)) {
// 						inShift = true
// 						machine.inShift = inShift
// 						machine.shiftStart = startTime
// 						machine.shiftEnd = endTime
// 						machine.dayNow = dayNow
// 						await machine.save()
// 						// console.log(machine)
// 						// console.log(shift.vin)
// 						// console.log(`${startTime} - ${endTime}`)
// 					}
// 				if (shiftType === 'nights' && timeNow > startTime && timeNow < endTime && shift._doc.hasOwnProperty(dayNow)) {
// 						inShift = true
// 						machine.inShift = inShift
// 						machine.shiftStart = startTime
// 						machine.shiftEnd = endTime
// 						machine.dayNow = dayNow
// 						await machine.save()
// 						// console.log(machine)
// 						// console.log(shift.vin)
// 						// console.log(`${startTime} - ${endTime}`)
// 					}
// 				}

// 				shift.inShift = inShift
// 				shift.startTime = startTime
// 				shift.endTime = endTime

// 				await shift.save()
// 			})

// 			if (machine.inShift) {
// 				let vin = machine.vin
// 				let rTimePercentForEff = 0
// 				let tTimePercentForEff = 0
// 				let startOfToday = moment(machine.shiftStart).subtract(theHour, 'hours').format('YYYY-MM-DDTHH:mm:ss')
// 				let startOfTodayAdd1Hour = moment(machine.shiftStart)
// 				let timeNow = moment().format('YYYY-MM-DDTHH:mm:ss')
// 				let timeNowStamp = moment().format('HH:mm:ss')
// 				let rTime = []
// 				let tTime = []
// 				let runningTime = 0
// 				let touchTime = 0

// 				const myDate = new Date(machine.shiftStart)
// 				myDate.setHours(myDate.getHours() + theHour)

// 				const myDate2 = new Date(machine.thelastSignal)
// 				myDate2.setHours(myDate2.getHours() + theHour)

// 				let d = new Date(myDate),
// 					e = new Date(myDate2)
// 				let msSinceEight = e - d
// 				let secondsSinceEight = msSinceEight / 1000

// 				let headers = { 'x-api-key': process.env.MACHINE_API }

// 				let response = await axios(
// 					`https://e0ssp9czi7.execute-api.eu-west-1.amazonaws.com/prod/v1/data/${vin}?from=${startOfToday}Z&to=${timeNow}Z`,
// 					{ headers }
// 				)

// 				// let theData = []

// 				let number = 0
// 				let addedTime = 0

// 				let number1 = 0
// 				let addedTime1 = 0

// 				let lastRun = 0
// 				let lastRunStop = 0
// 				let lastTouch = 0
// 				let lastTouchStop = 0

// 				let start = 0
// 				let start1 = 0
// 				let end = 0
// 				let end1 = 0

// 				if (response.data[0]) {
// 					if (response.data && response.data[0].inputChannel0Value) {
// 						if (response.data[0] && response.data[0].inputChannel0Value != null) {
// 							number = response.data[0].inputChannel0Value.length - 1
// 							if (response.data[0].inputChannel0Value[number].state === '1') {
// 								// console.log(response.data[0].inputChannel0Value)
// 								start = new Date(response.data[0].inputChannel0Value[number].time)
// 								// console.log(response.data[0].inputChannel0Value[number])
// 								start.setHours(start.getHours() + theHour)
// 								// console.log(start)
// 								millis = Date.now() - start
// 								addedTime = Math.floor(millis / 1000)

// 								lastRun = start
// 							}
// 							if (response.data[0].inputChannel0Value[number].state === '0') {
// 								end = new Date(response.data[0].inputChannel0Value[number].time)

// 								end.setHours(end.getHours() + theHour)

// 								lastRunStop = end
// 							}
// 						}
// 					}

// 					if (response.data[0] && response.data[0].inputChannel1Value != null) {
// 						number1 = response.data[0].inputChannel1Value.length - 1
// 						if (response.data[0].inputChannel1Value[number1].state === '1') {
// 							// console.log(response.data[0].inputChannel0Value)
// 							start1 = new Date(response.data[0].inputChannel1Value[number1].time)
// 							// console.log(response.data[0].inputChannel1Value[number1])
// 							start1.setHours(start1.getHours() + theHour)
// 							// console.log(start)
// 							const millis1 = Date.now() - start1
// 							addedTime1 = Math.floor(millis1 / 1000)

// 							lastTouch = start1
// 						}
// 						if (response.data[0].inputChannel1Value[number1].state === '0') {
// 							// console.log(response.data[0].inputChannel0Value)
// 							end1 = new Date(response.data[0].inputChannel1Value[number1].time)
// 							// console.log(response.data[0].inputChannel1Value[number1])
// 							end1.setHours(end1.getHours() + theHour)

// 							lastTouchStop = end1
// 						}
// 					}

// 					for (let x of response.data) {
// 						rTime.push(x.inputChannel0Value_duration)
// 						tTime.push(x.inputChannel1Value_duration)
// 						if (x.inputChannel0Value_duration != null) {
// 							runningTime = x.inputChannel0Value_duration
// 						}
// 						if (x.inputChannel1Value_duration != null) {
// 							touchTime = x.inputChannel1Value_duration
// 						}
// 					}

// 					if (lastRun || lastTouch > 0) {
// 						if (lastTouch > lastRun) {
// 							thelastSignal = lastTouch
// 						} else {
// 							thelastSignal = lastRun
// 						}
// 					}

// 					const dateArr = [lastRun, lastTouch, lastRunStop, lastTouchStop]

// 					const sortedDateArr = dateArr.sort(function (a, b) {
// 						// Turn your strings into dates, and then subtract them
// 						// to get a value that is either negative, positive, or zero.
// 						return b - a
// 					})

// 					// console.log('Machine => ', machine.machineName)
// 					// console.log(sortedDateArr)

// 					if (sortedDateArr[0] !== 0) {
// 						thelastSignalAll = sortedDateArr[0]
// 						// thelastSignalAll.setHours(thelastSignalAll.getHours() + theHour)
// 					}

// 					if (rTime.length > 0) {
// 						rTimePercentForEff = Math.round((rTime / ((thelastSignalAll - machine.shiftStart) / 1000)) * 100)
// 					} else {
// 						rTimePercentForEff = 0
// 					}
// 					if (tTime.length > 0) {
// 						tTimePercentForEff = Math.round((tTime / ((thelastSignalAll - machine.shiftStart) / 1000)) * 100)
// 					} else {
// 						tTimePercentForEff = 0
// 					}

// 					// if (machine.machineName === 'Cloos Yoke') {
// 					// 	console.log('Name =>', machine.machineName)
// 					// 	console.log('Shift Start =>', machine.shiftStart)
// 					// 	console.log('Last Signal =>', thelastSignalAll)
// 					// 	console.log('Available mins =>', (thelastSignalAll - machine.shiftStart) / 1000)
// 					// 	console.log('Run =>', rTime)
// 					// }
// 				}

// 				let idNumber = machine.id
// 				// let signal = false

// 				// console.log(response.data)

// 				// if (response.data.length > 0) {
// 				// 	signal = true
// 				// }

// 				if (isNaN(rTimePercentForEff)) {
// 					rTimePercentForEff = 0
// 				}
// 				if (isNaN(tTimePercentForEff)) {
// 					tTimePercentForEff = 0
// 				}
// 				let shiftHours = [] // Results will go here
// 				let shiftStartHour = new Date(machine.shiftStart).getHours() // Get current hour of the day
// 				let shiftEndHour = new Date(machine.shiftEnd).getHours() // Get current hour of the day

// 				if (shiftStartHour < shiftEndHour) {
// 					// Loop from start to end of shift
// 					for (let i = shiftStartHour; i <= shiftEndHour; i++) {
// 						shiftHours.push(i) // Put loop counter into array with ":00" next to it
// 					}
// 				}
// 				if (shiftStartHour > shiftEndHour) {
// 					// Loop from current hour number to 23
// 					for (let i = shiftStartHour; i < 24; i++) {
// 						shiftHours.push(i) // Put loop counter into array with ":00" next to it
// 					}
// 					// Loop midnight end of shift
// 					for (let i = 0; i <= shiftEndHour; i++) {
// 						shiftHours.push(i) // Put loop counter into array with ":00" next to it
// 					}
// 				}

// 				const machineForUpdate = await Machine.findById(idNumber)
// 					.populate({
// 						path: 'updates',
// 						options: { sort: { _id: -1 }, limit: 1 },
// 					})
// 					.populate({
// 						path: 'stoppages',
// 						match: {
// 							open: true,
// 						},
// 					})

// 				let dataForUpdate = {}

// 				if (machineForUpdate.method === 'old') {
// 					dataForUpdate = {
// 						vin: vin,
// 						date: new Date(),
// 						day: machineForUpdate.dayNow,
// 						eff: rTimePercentForEff,
// 						teff: tTimePercentForEff,
// 						shiftStart: machineForUpdate.shiftStart,
// 						shiftEnd: machineForUpdate.shiftEnd,
// 						shortBu: machineForUpdate.shortBu,
// 						machineName: machineForUpdate.machineName,
// 						type: machineForUpdate.type,
// 						thelastSignal: thelastSignalAll,
// 					}
// 				}
// 				if (machineForUpdate.method === 'running') {
// 					dataForUpdate = {
// 						vin: vin,
// 						date: new Date(),
// 						day: machineForUpdate.dayNow,
// 						eff: rTimePercentForEff,
// 						teff: rTimePercentForEff,
// 						shiftStart: machineForUpdate.shiftStart,
// 						shiftEnd: machineForUpdate.shiftEnd,
// 						shortBu: machineForUpdate.shortBu,
// 						machineName: machineForUpdate.machineName,
// 						type: machineForUpdate.type,
// 						thelastSignal: thelastSignalAll,
// 					}
// 				}
// 				if (machineForUpdate.method === 'touch') {
// 					dataForUpdate = {
// 						vin: vin,
// 						date: new Date(),
// 						day: machineForUpdate.dayNow,
// 						eff: tTimePercentForEff,
// 						teff: tTimePercentForEff,
// 						shiftStart: machineForUpdate.shiftStart,
// 						shiftEnd: machineForUpdate.shiftEnd,
// 						shortBu: machineForUpdate.shortBu,
// 						machineName: machineForUpdate.machineName,
// 						type: machineForUpdate.type,
// 						thelastSignal: thelastSignalAll,
// 					}
// 				}

// 				const update = new Update(dataForUpdate)

// 				if (machineForUpdate.updates.length > 0) {
// 					const updateId = machineForUpdate.updates[0]._id
// 					let date1 = new Date(machineForUpdate.updates[0].shiftStart)
// 					let date2 = new Date(machineForUpdate.shiftStart)
// 					let seconds1 = date1.getTime() / 1000
// 					let seconds2 = date2.getTime() / 1000

// 					if (seconds1 === seconds2) {
// 						await Update.findByIdAndUpdate(updateId, {
// 							eff: dataForUpdate.eff,
// 							teff: dataForUpdate.teff,
// 							thelastSignal: thelastSignalAll,
// 						})
// 						await machineForUpdate.save()
// 						// console.log(`Just updated old value on ${machineForUpdate.machineName}`)
// 					} else {
// 						machineForUpdate.updates.push(update)
// 						await update.save()
// 						// console.log(`Just aded a new update to ${machineForUpdate.machineName}`)
// 						await machineForUpdate.save()
// 					}
// 				} else {
// 					machineForUpdate.updates.push(update)
// 					await update.save()
// 					// console.log(`Just aded a new update to ${machineForUpdate.machineName}`)
// 					await machineForUpdate.save()
// 				}

// 				if (touchTime >= runningTime) {
// 					runningTime = touchTime
// 					rTimePercentForEff = tTimePercentForEff
// 				}

// 				// if (thelastSignal > 0) {
// 				// 	theStoppage = await Stoppage.findOne({
// 				// 		vin       : vin,
// 				// 		open      : true,
// 				// 		createdAt : { $gte: thelastSignal },
// 				// 	})
// 				// }

// 				const theStoppage = await Stoppage.findOne({
// 					vin: vin,
// 					open: true,
// 					createdAt: { $gte: machineForUpdate.lastUpdate },
// 				})

// 				if (!theStoppage && machine.method !== 'running' && touchTime - oldData > 0 && machineForUpdate.state !== 'Running') {
// 					// console.log('Old time', oldData)
// 					// console.log('New time', touchTime)
// 					// const diff = touchTime - oldData
// 					// console.log('difference', diff)
// 					let theDate = new Date()
// 					// theDate.setMinutes(theDate)
// 					theDate.setMilliseconds(0)
// 					let stoppage = await Stoppage.findOneAndUpdate(
// 						{
// 							vin: vin,
// 							open: true,
// 						},
// 						{
// 							endTime: theDate,
// 							open: false,
// 							closeNotes: 'Stoppage ended by system as machine is now running',
// 						}
// 					)
// 					let machine = await Machine.findOneAndUpdate(
// 						{
// 							vin: vin,
// 						},
// 						{
// 							state: 'Running',
// 						}
// 					)
// 					let totalTime = theDate - stoppage.startTime
// 					stoppage.totalTime = totalTime
// 					await stoppage.save()
// 					await machine.save()
// 				}
// 				if (!theStoppage && machine.method === 'running' && runningTime - oldDataR > 0 && machineForUpdate.state !== 'Running') {
// 					// console.log('Old time', oldData)
// 					// console.log('New time', touchTime)
// 					// const diff = touchTime - oldData
// 					// console.log('difference', diff)
// 					let theDate = new Date()
// 					// theDate.setMinutes(theDate)
// 					theDate.setMilliseconds(0)
// 					let stoppage = await Stoppage.findOneAndUpdate(
// 						{
// 							vin: vin,
// 							open: true,
// 						},
// 						{
// 							endTime: theDate,
// 							open: false,
// 							closeNotes: 'Stoppage ended by system as machine is now running',
// 						}
// 					)
// 					let machine = await Machine.findOneAndUpdate(
// 						{
// 							vin: vin,
// 						},
// 						{
// 							state: 'Running',
// 						}
// 					)
// 					let totalTime = theDate - stoppage.startTime
// 					stoppage.totalTime = totalTime
// 					await stoppage.save()
// 					await machine.save()
// 				}

// 				if (machineForUpdate.method === 'old') {
// 					await Machine.findByIdAndUpdate(idNumber, {
// 						eff: rTimePercentForEff,
// 						shiftHours: shiftHours,
// 						teff: tTimePercentForEff,
// 						// signal      : signal,
// 						runningTime: runningTime,
// 						touchTime: touchTime,
// 						lastUpdate: Date.now(),
// 						thelastSignal: thelastSignalAll,
// 					})
// 				}
// 				if (machineForUpdate.method === 'running') {
// 					await Machine.findByIdAndUpdate(idNumber, {
// 						eff: rTimePercentForEff,
// 						shiftHours: shiftHours,
// 						teff: rTimePercentForEff,
// 						// signal      : signal,
// 						runningTime: runningTime,
// 						touchTime: touchTime,
// 						lastUpdate: Date.now(),
// 						thelastSignal: thelastSignalAll,
// 					})
// 				}
// 				if (machineForUpdate.method === 'touch') {
// 					await Machine.findByIdAndUpdate(idNumber, {
// 						eff: tTimePercentForEff,
// 						shiftHours: shiftHours,
// 						teff: tTimePercentForEff,
// 						// signal      : signal,
// 						runningTime: runningTime,
// 						touchTime: touchTime,
// 						lastUpdate: Date.now(),
// 						thelastSignal: thelastSignalAll,
// 					})
// 				}

// 				//return the first monday of any week by the week number this year
// 				const getFirstMondayOfWeek = (weekNo) => {
// 					const thisWeek = moment().isoWeek()

// 					if (weekNo > thisWeek) {
// 						firstMonday = new Date(new Date().getFullYear() - 1, 0, 4, 0, 0, 0, 0)
// 					} else {
// 						firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)
// 					}

// 					// let firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)

// 					while (firstMonday.getDay() != 1) {
// 						firstMonday.setDate(firstMonday.getDate() - 1)
// 					}
// 					if (1 <= weekNo && weekNo <= 52) return firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))

// 					firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))
// 					if ((weekNo = 53 && firstMonday.getDate() >= 22 && firstMonday.getDate() <= 28)) return firstMonday
// 					return null
// 				}
// 				const thisWeekIso = moment().isoWeek()
// 				const mondayThisWeek = new Date(getFirstMondayOfWeek(thisWeekIso))

// 				const theDateToday = new Date()
// 				const eightHoursAgo = theDateToday.setHours(theDateToday.getHours() - 4)

// 				const dayNumber = theDateToday.getDay()

// 				// console.log(new Date(eightHoursAgo))
// 				// console.log(dayNumber)

// 				if (dayNumber === 1) {
// 					theHoursAgo = new Date()
// 				} else {
// 					theHoursAgo = new Date(eightHoursAgo)
// 				}

// 				// console.log(mondayThisWeek)

// 				const result = await Update.aggregate([
// 					{
// 						$match: {
// 							createdAt: { $gt: mondayThisWeek, $lt: theHoursAgo },
// 							eff: { $exists: true, $gt: -1 },
// 							vin: vin,
// 						},
// 					},

// 					{
// 						$project: {
// 							_id: 0,
// 							eff: 1,
// 							teff: 1,
// 							createdAt: 1,
// 							shiftStart: 1,
// 							shiftEnd: 1,
// 							createdAt: 1,
// 							availableMins: 1,
// 							runningMins: 1,
// 							machineName: 1,
// 						},
// 					},
// 					//get total available time
// 					{
// 						$addFields: {
// 							totalTime: {
// 								$subtract: ['$shiftEnd', '$shiftStart'],
// 							},
// 						},
// 					},
// 					//get available mins
// 					{
// 						$addFields: {
// 							avMinutes: {
// 								$floor: {
// 									$divide: ['$totalTime', 60000],
// 								},
// 							},
// 						},
// 					},
// 					//get running mins
// 					{
// 						$addFields: {
// 							rnningMins: {
// 								$multiply: [
// 									{
// 										$divide: ['$avMinutes', 100],
// 									},
// 									'$eff',
// 								],
// 							},
// 						},
// 					},
// 					//get touch mins

// 					{
// 						$project: {
// 							vin: 1,
// 							eff: 1,
// 							teff: 1,
// 							updated: 1,
// 							machineName: 1,
// 							avMinutes: {
// 								$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
// 							},
// 							rnningMins: {
// 								$cond: [{ $not: ['$runningMins'] }, '$rnningMins', '$runningMins'],
// 							},
// 						},
// 					},
// 					// {
// 					// 	$addFields : {
// 					// 		touchMins : {
// 					// 			$multiply : [
// 					// 				{
// 					// 					$divide : [ '$avMinutes', 100 ],
// 					// 				},
// 					// 				'$teff',
// 					// 			],
// 					// 		},
// 					// 	},
// 					// },
// 					{
// 						$addFields: {
// 							touchMins: {
// 								$cond: [
// 									{ $gt: ['$avMinutes', 0] },

// 									{
// 										$multiply: [
// 											{
// 												$divide: ['$avMinutes', 100],
// 											},
// 											'$teff',
// 										],
// 									},
// 									0,
// 								],
// 							},
// 						},
// 					},

// 					{
// 						$group: {
// 							_id: '$machineName',

// 							sum_of_avv_mins: {
// 								$sum: '$avMinutes',
// 							},
// 							sum_of_running_mins: {
// 								$sum: '$rnningMins',
// 							},
// 							sum_of_touch_mins: {
// 								$sum: '$touchMins',
// 							},

// 							// count           : { $sum: 1 },
// 						},
// 					},
// 					{
// 						$addFields: {
// 							averageMEff: {
// 								$cond: [
// 									{ $gt: ['$sum_of_avv_mins', 0] },
// 									{
// 										$multiply: [
// 											{
// 												$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
// 											},
// 											100,
// 										],
// 									},
// 									0,
// 								],
// 							},
// 						},
// 					},
// 					{
// 						$addFields: {
// 							averageMTEff: {
// 								$cond: [
// 									{ $gt: ['$sum_of_avv_mins', 0] },
// 									{
// 										$multiply: [
// 											{
// 												$divide: ['$sum_of_touch_mins', '$sum_of_avv_mins'],
// 											},
// 											100,
// 										],
// 									},
// 									0,
// 								],
// 							},
// 						},
// 					},
// 					{
// 						$addFields: {
// 							averageEff: {
// 								$round: ['$averageMEff', 0],
// 							},
// 						},
// 					},
// 					{
// 						$addFields: {
// 							averageTEff: {
// 								$round: ['$averageMTEff', 0],
// 							},
// 						},
// 					},
// 				])
// 				// console.log('MACHINE => ', machine.machinename)
// 				// console.log('RESULT => ', result)
// 				const weeklyId = machine._id

// 				if (result) {
// 					await Machine.findByIdAndUpdate(weeklyId, {
// 						weeklyEff: result[0].averageEff,
// 						weeklyTeff: result[0].averageTEff,
// 					})
// 				}
// 			}
// 		} catch (error) {
// 			console.log(error)
// 		}
// 	}
// 	console.log('update finished')

// 	// const updateRunning = await Machine.find({
// 	// 	method : 'running',
// 	// })
// 	// const updateTouch = await Machine.find({
// 	// 	method : 'touch',
// 	// })

// 	// const runningVins = updateRunning.map((r) => r.vin)

// 	// // console.log(runningVins)

// 	// const runningUpdates = await Update.find({
// 	// 	vin : { $in: runningVins },
// 	// })

// 	// for (let r of runningUpdates) {
// 	// 	r.teff = r.eff
// 	// 	await r.save()
// 	// }

// 	// const touchVins = updateTouch.map((r) => r.vin)
// 	// const touchUpdates = await Update.find({
// 	// 	vin : { $in: touchVins },
// 	// })
// 	// for (let t of touchUpdates) {
// 	// 	t.eff = t.teff
// 	// 	await t.save()

// 	// }
// })

// resetMachine.start()

////////////// end of old stuff ///////////////////

module.exports.screen = async (req, res) => {
	const { shortBu, screenName } = req.params
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	const yesterday = new Date()
	yesterday.setDate(yesterday.getDate() - 1)

	const screens = await Machine.distinct('screenName', { shortBu, screenName: { $nin: ['screen0', 'screen1'] } }).sort()

	const weldingRobotsInShift = await Machine.find(
		{
			inShift: true,
			signal: true,
			type: 'Welding Robot',
			screenName,
		},
		{ updates: 0 }
	)
	const laserCuttersInShift = await Machine.find(
		{
			inShift: true,
			signal: true,
			type: 'Laser Cutter',
			screenName,
		},
		{ updates: 0 }
	)
	const plasmaCuttersInShift = await Machine.find(
		{
			inShift: true,
			signal: true,
			type: 'Plasma Cutter',
			screenName,
		},
		{ updates: 0 }
	)

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
		state: 'Planned Stoppage',
		screenName,
	})
	const totalUnKnownBreakdown = await Machine.countDocuments({
		inShift: true,
		state: 'Unplanned Stoppage',
		screenName,
	})

	const totalWire = await Machine.countDocuments({
		inShift: true,
		state: 'Breakdown',
		screenName,
	})
	const machines = await Machine.find({ screenName }, { updates: 0, shifts: 0 })
		.populate({
			path: 'stoppages',
			match: {
				open: true,
			},
			perDocumentLimit: 1,
		})
		.sort({ businessUnit: 1, abbreviatedName: 1 })

	// get the Planned Stoppage times
	const machinesInShiftClosedKnown = await Machine.find({ screenName }, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Planned Stoppage',
		},
	})
	const machinesInShiftOpenKnown = await Machine.find({ screenName }, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Planned Stoppage',
		},
	})

	//sum up all the known bd time
	let totKnownBdTime = 0

	for (let machine of machinesInShiftClosedKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts) {
				totKnownBdTime += stoppage.totalTime
			}
			if (stoppage.updatedAt > todaysShifts && stoppage.createdAt < todaysShifts) {
				totKnownBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenKnown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totKnownBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totKnownBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totKnownBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// get the Unplanned Stoppage times
	const machinesInShiftClosedUnknown = await Machine.find({ screenName }, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Unplanned Stoppage',
		},
	})
	const machinesInShiftOpenUnknown = await Machine.find({ screenName }, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Unplanned Stoppage',
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
				totUnknownBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenUnknown) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totUnknownBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totUnknownBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totUnknownBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// get the wire breakdown times
	const machinesInShiftClosedWire = await Machine.find({ screenName }, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			createdAt: {
				$gte: yesterday,
			},
			open: false,
			type: 'Breakdown',
		},
	})
	const machinesInShiftOpenWire = await Machine.find({ screenName }, { updates: 0, shifts: 0 }).populate({
		path: 'stoppages',
		match: {
			open: true,
			type: 'Breakdown',
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
				totWireBdTime += stoppage.endTime - stoppage.shiftStart
			}
		})
	}

	for (let machine of machinesInShiftOpenWire) {
		machine.stoppages.forEach(async function (stoppage) {
			if (stoppage.createdAt > todaysShifts && stoppage.shiftStart > todaysShifts) {
				totWireBdTime += Date.now() - new Date(stoppage.createdAt)
			}
			if (stoppage.createdAt < todaysShifts && machine.inShift) {
				totWireBdTime += Date.now() - new Date(machine.shiftStart)
			}
			if (stoppage.createdAt < todaysShifts && !machine.inShift && machine.shiftEnd > todaysShifts) {
				totWireBdTime += machine.shiftEnd - todaysShifts
			}
		})
	}

	// convert times into HH:MM:SS
	let sumOfBdTime = msToTime(totKnownBdTime)
	let sumOfUnknownBdTime = msToTime(totUnknownBdTime)

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
		screenName,
		screens,
		shortBu,
		machines,
		totalKnownBreakdown,
		totalUnKnownBreakdown,
		totalWire,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		weldPercent,
		laserPercent,
		plasmaPercent,
		weldPercentT,
		laserPercentT,
		plasmaPercentT,
		update,
	})
}

module.exports.divisionRunning = async (req, res) => {
	const { shortBu, asset } = req.params
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

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

		{ $sort: { averageEff: -1 } },
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
						$round: ['$teff', 0],
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
						$round: ['$teff', 0],
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
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { averageEff: -1 } },
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
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { averageEff: 1 } },
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
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { averageEff: 1 } },
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

	res.render('machine/divisionRunning', {
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

module.exports.divisionTouch = async (req, res) => {
	const { shortBu, asset } = req.params
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

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

		{ $sort: { averageTEff: -1 } },
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
						$round: ['$teff', 0],
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
						$round: ['$teff', 0],
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
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { averageTEff: -1 } },
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
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { averageTEff: 1 } },
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
					$round: ['$teff', 0],
				},
			},
		},

		{ $sort: { averageTEff: 1 } },
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

	res.render('machine/divisionTouch', {
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

module.exports.machineAnalysis = async (req, res) => {
	let { id, type, stoppage, reason, start, end } = req.params
	const types = await BType.find({}).sort({ name: '' })
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	console.log('here')

	const lastSevenDaysString = moment().subtract(14, 'days').format('YYYY, MM, DD')
	const lastSevenDays = new Date(lastSevenDaysString)
	lastSevenDays.setHours(1, 0, 0, 0)

	let splitId = []

	if (req.body.ids) {
		if (Array.isArray(req.body.ids)) {
			splitId = [...req.body.ids]
		} else {
			splitId = req.body.ids.split(',')
		}
	} else {
		splitId = id.split(',')
	}

	let donorMachines = await Machine.find({
		_id: { $in: splitId },
	})

	let donorMachine = donorMachines[0]

	let allAssets = await Machine.find({
		shortBu: donorMachine.shortBu,
	})

	let theVins = []
	let theIds = []

	if (type === '1') {
		theVins = allAssets.map((asset) => asset.vin)
		theIds = allAssets.map((asset) => asset._id)
	} else {
		theVins = donorMachines.map((asset) => asset.vin)
		theIds = splitId
	}

	// console.log(theVins)
	// console.log(theIds)

	if (stoppage === '1') {
		allTypes = ['Planned Stoppage', 'Unplanned Stoppage', 'Breakdown']
	} else {
		allTypes = [stoppage]
	}

	const assets = await Machine.find({
		shortBu: donorMachine.shortBu,
	})
	const robots = await Machine.find({
		shortBu: donorMachine.shortBu,
		type: 'Welding Robot',
	})
	const lasers = await Machine.find({
		shortBu: donorMachine.shortBu,
		type: 'Laser Cutter',
	})
	const plasmas = await Machine.find({
		shortBu: donorMachine.shortBu,
		type: 'Plasma Cutter',
	})

	Date.prototype.addHours = function (h) {
		this.setHours(this.getHours() + h)
		return this
	}

	if (req.body.startTime) {
		startDate = req.body.startDate
		startTime = req.body.startTime
		newStart = new Date(`${req.body.startDate},${req.body.startTime}`)
	} else if (start !== '1') {
		newStart = new Date(start).addHours(1)
	} else {
		newStart = lastSevenDays
	}
	if (req.body.endTime) {
		endDate = req.body.endDate
		endTime = req.body.endTime
		newEnd = new Date(`${req.body.endDate},${req.body.endTime}`)
	} else if (end !== '1') {
		newEnd = new Date(end).addHours(1)
	} else {
		newEnd = new Date().addHours(1)
	}

	if (newStart < new Date('2021, 09, 15')) {
		newStart = new Date('2021, 09, 15')
	}

	const totalNumberOfPlanned = await Stoppage.countDocuments({
		vin: { $in: theVins },
		$or: [{ createdAt: { $gte: newStart, $lte: newEnd } }, { createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } }],
		// createdAt : { $gte: newStart, $lte: newEnd },
		concern: { $nin: [null, ''] },
		shiftStart: { $nin: [null, ''] },
		open: false,
		type: 'Planned Stoppage',
	})
	const totalNumberOfUnplanned = await Stoppage.countDocuments({
		vin: { $in: theVins },
		$or: [{ createdAt: { $gte: newStart, $lte: newEnd } }, { createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } }],
		// createdAt : { $gte: newStart, $lte: newEnd },
		concern: { $nin: [null, ''] },
		shiftStart: { $nin: [null, ''] },
		open: false,
		type: 'Unplanned Stoppage',
	})
	const totalNumberOfBreakdowns = await Stoppage.countDocuments({
		vin: { $in: theVins },
		$or: [{ createdAt: { $gte: newStart, $lte: newEnd } }, { createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } }],
		// createdAt : { $gte: newStart, $lte: newEnd },
		concern: { $nin: [null, ''] },
		shiftStart: { $nin: [null, ''] },
		open: false,
		type: 'Breakdown',
	})

	const allStoppagesByType = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				$or: [{ createdAt: { $gte: newStart, $lte: newEnd } }, { createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } }],
				// createdAt : { $gte: newStart, $lte: newEnd },
				concern: { $nin: [null, ''] },
				shiftStart: { $nin: [null, ''] },
				shiftEnd: { $nin: [null, ''] },
				open: false,
				type: { $in: allTypes },
			},
		},
		{
			$addFields: {
				all_ms: {
					$switch: {
						branches: [
							{
								// stoppage started before shift and closed during
								case: {
									$and: [{ $lt: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//time since start of shift until stoppage end
								then: { $subtract: ['$updatedAt', newStart] },
							},
							{
								// stoppage started during shift and ended after
								case: {
									$and: [{ $gt: ['$createdAt', newStart] }, { $gt: ['$updatedAt', newEnd] }],
								},
								//time since start of stoppage until end of shift
								then: { $subtract: [newEnd, '$updatedAt'] },
							},
							{
								// andon started during shift and ended during shift
								case: {
									$and: [{ $gte: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//total time of the stoppage
								then: '$totalTime',
							},
						],
						// default if none of above are true open full shift
						default: { $subtract: [newEnd, newStart] },
					},
				},
			},
		},
		{
			$group: {
				_id: '$concern',
				total_ms: {
					$sum: '$all_ms',

					// count    : { $sum: 1 },
				},
			},
		},

		{
			$addFields: {
				total_min: {
					$round: [{ $divide: ['$total_ms', 60000] }, 0],
				},
			},
		},

		{ $sort: { total_min: -1 } },
		{ $limit: 10 },
	])

	const graph1axis = allStoppagesByType.map((stoppage) => stoppage._id)
	const graph1Data = allStoppagesByType.map((stoppage) => stoppage.total_min)

	if (reason === '1') {
		if (allStoppagesByType.length > 0) {
			concerns = [allStoppagesByType[0]._id]
		} else {
			concerns = []
		}
	} else {
		concerns = [reason]
	}

	const second1 = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				$or: [{ createdAt: { $gte: newStart, $lte: newEnd } }, { createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } }],
				// createdAt : { $gte: newStart, $lte: newEnd },
				concern: { $nin: [null, ''] },
				open: false,
				concern: { $in: concerns },
				type: { $in: allTypes },
			},
		},
		{
			$addFields: {
				all_ms: {
					$switch: {
						branches: [
							{
								// stoppage started before shift and closed during
								case: {
									$and: [{ $lt: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//time since start of shift until stoppage end
								then: { $subtract: ['$updatedAt', newStart] },
							},
							{
								// stoppage started during shift and ended after
								case: {
									$and: [{ $gt: ['$createdAt', newStart] }, { $gt: ['$updatedAt', newEnd] }],
								},
								//time since start of stoppage until end of shift
								then: { $subtract: [newEnd, '$updatedAt'] },
							},
							{
								// andon started during shift and ended during shift
								case: {
									$and: [{ $gte: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//total time of the stoppage
								then: '$totalTime',
							},
						],
						// default if none of above are true open full shift
						default: { $subtract: [newEnd, newStart] },
					},
				},
			},
		},

		{
			$project: {
				day: { $dayOfMonth: '$createdAt' },
				month: { $month: '$createdAt' },
				all_ms: 1,
			},
		},
		{
			$group: {
				_id: { month: '$month', day: '$day' },
				total_ms: {
					$sum: '$all_ms',
				},
			},
		},

		{
			$addFields: {
				total_min: {
					$round: [{ $divide: ['$total_ms', 60000] }, 0],
				},
			},
		},

		{ $sort: { _id: 1 } },
	])

	// console.log(allStoppagesByType)
	// console.log(second1)

	const graph2axis = second1.map((stoppage) => stoppage._id.day + '/' + stoppage._id.month)
	const graph2Data = second1.map((stoppage) => stoppage.total_min)

	///starts here //////

	allShiftsInDateRange = await Update.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				// $or : [
				// 	{ createdAt: { $gte: newStart, $lte: newEnd } },
				// 	{ createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } },
				// ],
				createdAt: { $gte: newStart, $lte: newEnd },
				eff: { $exists: true, $gt: -1 },
				shiftStart: { $nin: [null, ''] },
				shiftEnd: { $nin: [null, ''] },

				// $or       : [
				// 	{
				// 		eff : { $gt: 0 },
				// 	},
				// 	{
				// 		teff : { $gt: 0 },
				// 	},
				// ],
			},
		},
		{
			$addFields: {
				newStart: newStart,
				newEnd: newEnd,
			},
		},
		{
			$addFields: {
				total_ms: {
					$switch: {
						branches: [
							{
								// time is more than the full shift
								case: {
									$gte: [{ $subtract: ['$newEnd', '$newStart'] }, { $subtract: ['$shiftEnd', '$shiftStart'] }],
								},
								then: { $subtract: ['$shiftEnd', '$shiftStart'] },
							},
							{
								// time is less than the full shift
								case: {
									$lt: [{ $subtract: ['$newEnd', '$newStart'] }, { $subtract: ['$shiftEnd', '$shiftStart'] }],
								},
								then: { $subtract: ['$newEnd', '$newStart'] },
							},
						],
						// default if none of above are true
						default: { $subtract: ['$shiftEnd', '$shiftStart'] },
					},
				},
			},
		},
		// {
		// 	$addFields : {
		// 		total_ms : { $subtract: [ '$shiftEnd', '$shiftStart' ] },
		// 	},
		// },
		{
			$addFields: {
				total_min: {
					$round: [{ $divide: ['$total_ms', 60000] }, 0],
				},
			},
		},
		{
			$addFields: {
				total_min: {
					$cond: [{ $not: ['$availableMins'] }, '$total_min', '$availableMins'],
				},
			},
		},
		{
			$addFields: {
				total_running_mins: {
					$round: [
						{
							$multiply: [{ $divide: ['$eff', 100] }, '$total_min'],
						},
						0,
					],
				},
			},
		},
		{
			$addFields: {
				running_mins: {
					$cond: [{ $not: ['$runningMins'] }, '$total_running_mins', '$runningMins'],
				},
			},
		},
		{
			$project: {
				startDay: { $dayOfMonth: '$shiftStart' },
				startMonth: { $month: '$shiftStart' },
				endDay: { $dayOfMonth: '$shiftEnd' },
				endMonth: { $month: '$shiftEnd' },
				shiftStart: 1,
				total_running_mins: 1,
				total_min: 1,
				date: 1,
				total_ms: 1,
			},
		},
		{
			$group: {
				_id: {
					date: {
						$substr: ['$createdAt', 0, 10],
					},
					startMonth: '$startMonth',
					startDay: '$startDay',
					endMonth: '$endMonth',
					endDay: '$endDay',
					shiftStart: '$shiftStart',
				},
				sum_of_total_running_mins: {
					$sum: '$total_running_mins',
				},
				sum_of_total_mins: {
					$sum: '$total_min',
				},
			},
		},
		{
			$addFields: {
				total_breakdown_mins: 0,
				total_planed_mins: 0,
				total_unplaned_mins: 0,
				total_missing_mins: 0,
			},
		},
		{ $sort: { _id: 1 } },
	])

	// console.log('SHIFTS => ', allShiftsInDateRange)

	allBreakdownsInRange = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				$or: [{ createdAt: { $gte: newStart, $lte: newEnd } }, { createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } }],
				// createdAt : { $gte: newStart, $lte: newEnd },
				// createdAt : { $gte: newStart },
				// updatedAt : { $lte: newEnd },
				concern: { $nin: [null, ''] },
				open: false,
				type: 'Breakdown',
			},
		},
		{
			$addFields: {
				all_ms: {
					$switch: {
						branches: [
							{
								// stoppage started before shift and closed during
								case: {
									$and: [{ $lt: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//time since start of shift until stoppage end
								then: { $subtract: ['$updatedAt', newStart] },
							},
							{
								// stoppage started during shift and ended after
								case: {
									$and: [{ $gt: ['$createdAt', newStart] }, { $gt: ['$updatedAt', newEnd] }],
								},
								//time since start of stoppage until end of shift
								then: { $subtract: [newEnd, '$updatedAt'] },
							},
							{
								// andon started during shift and ended during shift
								case: {
									$and: [{ $gte: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//total time of the stoppage
								then: '$totalTime',
							},
						],
						// default if none of above are true open full shift
						default: { $subtract: [newEnd, newStart] },
					},
				},
			},
		},
		// {
		// 	$addFields : {
		// 		total_min : {
		// 			$round : [ { $divide: [ '$total_ms', 60000 ] }, 0 ],
		// 		},
		// 	},
		// },
		{
			$project: {
				day: { $dayOfMonth: '$createdAt' },
				month: { $month: '$createdAt' },
				total_min: 1,
				shiftStart: 1,
				all_ms: 1,
			},
		},
		{
			$addFields: {
				total_mins: {
					$round: [{ $divide: ['$all_ms', 60000] }, 0],
				},
			},
		},
		{
			$group: {
				_id: {
					shiftStart: '$shiftStart',
					month: '$month',
					day: '$day',
				},
				total_breakdown: {
					$sum: '$total_mins',

					// count    : { $sum: 1 },
				},

				// count    : { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	])

	// console.log('BREAKDOWNS => ', allBreakdownsInRange)

	allPlnnedInRange = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				$or: [{ createdAt: { $gte: newStart, $lte: newEnd } }, { createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } }],
				// createdAt : { $gte: newStart, $lte: newEnd },
				// createdAt : { $gte: newStart },
				// updatedAt : { $lte: newEnd },
				concern: { $nin: [null, ''] },
				open: false,
				type: 'Planned Stoppage',
			},
		},
		{
			$addFields: {
				all_ms: {
					$switch: {
						branches: [
							{
								// stoppage started before shift and closed during
								case: {
									$and: [{ $lt: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//time since start of shift until stoppage end
								then: { $subtract: ['$updatedAt', newStart] },
							},
							{
								// stoppage started during shift and ended after
								case: {
									$and: [{ $gt: ['$createdAt', newStart] }, { $gt: ['$updatedAt', newEnd] }],
								},
								//time since start of stoppage until end of shift
								then: { $subtract: [newEnd, '$updatedAt'] },
							},
							{
								// andon started during shift and ended during shift
								case: {
									$and: [{ $gte: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//total time of the stoppage
								then: '$totalTime',
							},
						],
						// default if none of above are true open full shift
						default: { $subtract: [newEnd, newStart] },
					},
				},
			},
		},
		// {
		// 	$addFields : {
		// 		total_min : {
		// 			$round : [ { $divide: [ '$total_ms', 60000 ] }, 0 ],
		// 		},
		// 	},
		// },
		{
			$project: {
				day: { $dayOfMonth: '$createdAt' },
				month: { $month: '$createdAt' },
				total_min: 1,
				shiftStart: 1,
				all_ms: 1,
			},
		},
		{
			$addFields: {
				total_mins: {
					$round: [{ $divide: ['$all_ms', 60000] }, 0],
				},
			},
		},
		{
			$group: {
				_id: {
					shiftStart: '$shiftStart',
					month: '$month',
					day: '$day',
				},
				total_planned: {
					$sum: '$total_mins',

					// count    : { $sum: 1 },
				},

				// count    : { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	])

	// console.log('PLANNED => ', allPlnnedInRange)

	allUnplnnedInRange = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				$or: [{ createdAt: { $gte: newStart, $lte: newEnd } }, { createdAt: { $lte: newStart }, updatedAt: { $gte: newEnd } }],
				// createdAt : { $gte: newStart, $lte: newEnd },
				// createdAt : { $gte: newStart },
				// updatedAt : { $lte: newEnd },
				concern: { $nin: [null, ''] },
				open: false,
				type: 'Unplanned Stoppage',
			},
		},
		{
			$addFields: {
				all_ms: {
					$switch: {
						branches: [
							{
								// stoppage started before shift and closed during
								case: {
									$and: [{ $lt: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//time since start of shift until stoppage end
								then: { $subtract: ['$updatedAt', newStart] },
							},
							{
								// stoppage started during shift and ended after
								case: {
									$and: [{ $gt: ['$createdAt', newStart] }, { $gt: ['$updatedAt', newEnd] }],
								},
								//time since start of stoppage until end of shift
								then: { $subtract: [newEnd, '$updatedAt'] },
							},
							{
								// andon started during shift and ended during shift
								case: {
									$and: [{ $gte: ['$createdAt', newStart] }, { $lt: ['$updatedAt', newEnd] }],
								},
								//total time of the stoppage
								then: '$totalTime',
							},
						],
						// default if none of above are true open full shift
						default: { $subtract: [newEnd, newStart] },
					},
				},
			},
		},
		// {
		// 	$addFields : {
		// 		total_min : {
		// 			$round : [ { $divide: [ '$total_ms', 60000 ] }, 0 ],
		// 		},
		// 	},
		// },
		{
			$project: {
				day: { $dayOfMonth: '$createdAt' },
				month: { $month: '$createdAt' },
				total_min: 1,
				shiftStart: 1,
				all_ms: 1,
			},
		},
		{
			$addFields: {
				total_mins: {
					$round: [{ $divide: ['$all_ms', 60000] }, 0],
				},
			},
		},
		{
			$group: {
				_id: {
					shiftStart: '$shiftStart',
					month: '$month',
					day: '$day',
				},
				total_unplanned: {
					$sum: '$total_mins',

					// count    : { $sum: 1 },
				},

				// count    : { $sum: 1 },
			},
		},
		{ $sort: { _id: 1 } },
	])

	// console.log('UNPLANNED => ', allUnplnnedInRange)

	let totalRunningPie = 0
	let totalPlannedPie = 0
	let totalUnplannedPie = 0
	let totalBreakdownPie = 0
	let totalMissingPie = 0

	for (let s of allShiftsInDateRange) {
		for (let b of allBreakdownsInRange) {
			if ((b._id.day === s._id.startDay && b._id.month === s._id.startMonth) || (b._id.day === s._id.endDay && b._id.month === s._id.endMonth)) {
				s.total_breakdown_mins += b.total_breakdown
			}
		}
		for (let b of allPlnnedInRange) {
			if ((b._id.day === s._id.startDay && b._id.month === s._id.startMonth) || (b._id.day === s._id.endDay && b._id.month === s._id.endMonth)) {
				s.total_planed_mins += b.total_planned
			}
		}
		for (let b of allUnplnnedInRange) {
			if ((b._id.day === s._id.startDay && b._id.month === s._id.startMonth) || (b._id.day === s._id.endDay && b._id.month === s._id.endMonth)) {
				s.total_unplaned_mins += b.total_unplanned
			}
		}
		s.total_missing_mins = s.sum_of_total_mins - s.sum_of_total_running_mins - s.total_breakdown_mins - s.total_planed_mins - s.total_unplaned_mins

		totalRunningPie += s.sum_of_total_running_mins
		totalPlannedPie += s.total_planed_mins
		totalUnplannedPie += s.total_unplaned_mins
		totalBreakdownPie += s.total_breakdown_mins
		totalMissingPie += s.total_missing_mins
	}

	if (totalMissingPie < 0) totalMissingPie = 0

	// console.log('RUNNING => ', totalRunningPie)
	// console.log('PLANNED => ', totalPlannedPie)
	// console.log('UNPLANNED => ', totalUnplannedPie)
	// console.log('BREAKDOWN => ', totalBreakdownPie)
	// console.log('MISSING => ', totalMissingPie)

	// console.log(allBreakdownsInRange)

	// convert times into HH:MM:SS
	let sumOfRunningTime = msToTime(totalRunningPie * 60000)
	let sumOfBdTime = msToTime(totalPlannedPie * 60000)
	let sumOfUnknownBdTime = msToTime(totalUnplannedPie * 60000)
	let sumOfWireTime = msToTime(totalBreakdownPie * 60000)

	const lineLabels1 = allShiftsInDateRange.map((label) => label._id.startDay + '/' + label._id.startMonth)

	let lineLabels = [...new Set(lineLabels1)]

	const lineRunning = allShiftsInDateRange.map((point) => point.sum_of_total_running_mins)
	const linePlanned = allShiftsInDateRange.map((point) => point.total_planed_mins)
	const lineUnplanned = allShiftsInDateRange.map((point) => point.total_unplaned_mins)
	const lineBreakdown = allShiftsInDateRange.map((point) => point.total_breakdown_mins)

	// end of new stuff

	// const machine = await Machine.findById(id).populate({
	// 	path  : 'stoppages',
	// 	match : {
	// 		createdAt : {
	// 			$gte : new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
	// 		},
	// 		open      : false,
	// 		type      : 'Breakdown',
	// 	},
	// })

	// if (!machine) {
	// 	req.flash('error', 'Cannot find that machine')
	// 	res.redirect('/equipment-monitoring/operations')
	// }

	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)

	if (update === null) {
		update = new Date()
	}

	let highest = Math.max.apply(Math, graph2Data)

	// console.log('START =>', newStart)
	// console.log('END =>', newEnd)

	newStart = newStart.addHours(0)
	newEnd = newEnd.addHours(0)

	res.render('machine/machineAnalysis', {
		assets,
		robots,
		lasers,
		plasmas,
		allAssets,
		graph1axis,
		graph1Data,
		graph2axis,
		graph2Data,
		donorMachine,
		type,
		stoppage,
		newStart,
		newEnd,
		totalNumberOfPlanned,
		totalNumberOfUnplanned,
		totalNumberOfBreakdowns,

		totalRunningPie,
		totalPlannedPie,
		totalUnplannedPie,
		totalBreakdownPie,
		totalMissingPie,
		lineLabels,
		lineRunning,
		linePlanned,
		lineUnplanned,
		lineBreakdown,
		sumOfRunningTime,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		theVins,
		theIds,
		reason,
		highest,
		donorMachine,

		update,
	})
}

module.exports.machineAnalysis2 = async (req, res) => {
	let { id, type, stoppage, reason, start, end } = req.params
	const types = await BType.find({}).sort({ name: '' })
	let todaysShifts = new Date()
	todaysShifts.setHours(0, 0, 0, 0)

	const lastSevenDaysString = moment().subtract(14, 'days').format('YYYY, MM, DD')
	const lastSevenDays = new Date(lastSevenDaysString)
	lastSevenDays.setHours(1, 0, 0, 0)

	let splitId = []

	if (req.body.ids) {
		if (Array.isArray(req.body.ids)) {
			splitId = [...req.body.ids]
		} else {
			splitId = req.body.ids.split(',')
		}
	} else {
		splitId = id.split(',')
	}

	let donorMachines = await Machine.find({
		_id: { $in: splitId },
	})

	let donorMachine = donorMachines[0]

	let allAssets = await Machine.find({
		shortBu: donorMachine.shortBu,
	})

	let theVins = []
	let theIds = []

	if (type === '1') {
		theVins = allAssets.map((asset) => asset.vin)
		theIds = allAssets.map((asset) => asset._id)
	} else {
		theVins = donorMachines.map((asset) => asset.vin)
		theIds = splitId
	}

	// console.log(theVins)
	// console.log(theIds)

	if (stoppage === '1') {
		allTypes = ['Planned Stoppage', 'Unplanned Stoppage', 'Breakdown']
	} else {
		allTypes = [stoppage]
	}

	const assets = await Machine.find({
		shortBu: donorMachine.shortBu,
	})
	const robots = await Machine.find({
		shortBu: donorMachine.shortBu,
		type: 'Welding Robot',
	})
	const lasers = await Machine.find({
		shortBu: donorMachine.shortBu,
		type: 'Laser Cutter',
	})
	const plasmas = await Machine.find({
		shortBu: donorMachine.shortBu,
		type: 'Plasma Cutter',
	})

	if (req.body.startTime) {
		startDate = req.body.startDate
		startTime = req.body.startTime
		newStart = new Date(`${req.body.startDate},${req.body.startTime}`)
	} else if (start !== '1') {
		newStart = new Date(start)
	} else {
		newStart = lastSevenDays
	}
	if (req.body.endTime) {
		endDate = req.body.endDate
		endTime = req.body.endTime
		newEnd = new Date(`${req.body.endDate},${req.body.endTime}`)
	} else if (end !== '1') {
		newEnd = new Date(end)
	} else {
		newEnd = new Date()
	}

	if (newStart < new Date('2021, 09, 15')) {
		newStart = new Date('2021, 09, 15')
	}

	const totalNumberOfPlanned = await Stoppage.countDocuments({
		vin: { $in: theVins },
		$or: [
			//started & ended during shift
			{
				createdAt: {
					$gte: newStart,
					$lte: newEnd,
				},
				updatedAt: { $lt: newEnd },
				open: false,
			},
			//started during shift & ended after
			{
				createdAt: {
					$gte: newStart,
					$lte: newEnd,
				},
				updatedAt: { $gt: newEnd },
				open: false,
			},
			//started before shift ended during
			{
				createdAt: { $lt: newStart },
				updatedAt: { $gt: newStart, $lt: newEnd },
				open: false,
			},
			//started before shift ended after
			{
				createdAt: { $lt: newStart },
				updatedAt: { $gt: newEnd },
				open: false,
			},
		],
		concern: { $nin: [null, ''] },
		// open: false,
		type: 'Planned Stoppage',
	})

	const totalNumberOfUnplanned = await Stoppage.countDocuments({
		vin: { $in: theVins },
		$or: [
			//started & ended during shift
			{
				createdAt: {
					$gte: newStart,
					$lte: newEnd,
				},
				updatedAt: { $lt: newEnd },
				open: false,
			},
			//started during shift & ended after
			{
				createdAt: {
					$gte: newStart,
					$lte: newEnd,
				},
				updatedAt: { $gt: newEnd },
				open: false,
			},
			//started before shift ended during
			{
				createdAt: { $lt: newStart },
				updatedAt: { $gt: newStart, $lt: newEnd },
				open: false,
			},
			//started before shift ended after
			{
				createdAt: { $lt: newStart },
				updatedAt: { $gt: newEnd },
				open: false,
			},
		],
		concern: { $nin: [null, ''] },
		// open: false,
		type: 'Unplanned Stoppage',
	})
	const totalNumberOfBreakdowns = await Stoppage.countDocuments({
		vin: { $in: theVins },
		$or: [
			//started & ended during shift
			{
				createdAt: {
					$gte: newStart,
					$lte: newEnd,
				},
				updatedAt: { $lt: newEnd },
				open: false,
			},
			//started during shift & ended after
			{
				createdAt: {
					$gte: newStart,
					$lte: newEnd,
				},
				updatedAt: { $gt: newEnd },
				open: false,
			},
			//started before shift ended during
			{
				createdAt: { $lt: newStart },
				updatedAt: { $gt: newStart, $lt: newEnd },
				open: false,
			},
			//started before shift ended after
			{
				createdAt: { $lt: newStart },
				updatedAt: { $gt: newEnd },
				open: false,
			},
		],
		concern: { $nin: [null, ''] },
		// open: false,
		type: 'Breakdown',
	})

	const allStoppagesByType = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				// createdAt: {
				// 	$gte: newStart,
				// 	$lte: newEnd,
				// },

				$or: [
					//started & ended during shift
					{
						createdAt: {
							$gte: newStart,
							$lte: newEnd,
						},
						updatedAt: { $lt: newEnd },
						open: false,
					},
					//started during shift & ended after
					{
						createdAt: {
							$gte: newStart,
							$lte: newEnd,
						},
						updatedAt: { $gt: newEnd },
						open: false,
					},
					//started before shift ended during
					{
						createdAt: { $lt: newStart },
						updatedAt: { $gt: newStart, $lt: newEnd },
						open: false,
					},
					//started before shift ended after
					{
						createdAt: { $lt: newStart },
						updatedAt: { $gt: newEnd },
						open: false,
					},
				],

				concern: { $nin: [null, ''] },
				// open: false,
				type: { $in: allTypes },
			},
		},
		{
			$project: {
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				type: 1,
				concern: 1,
				started_before_ended_during: {
					$cond: [
						{
							$and: [
								{ $lte: ['$shiftEnd', newStart] },
								// { $lte: ['$updatedAt', '$shiftEnd'] },
								{ $lte: ['$createdAt', newStart] },
								{ $lte: ['$updatedAt', newEnd] },
							],
						},
						{ $subtract: ['$updatedAt', newStart] },
						0,
					],
				},
				all_during_shift: {
					$cond: [
						{
							$and: [
								{ $gte: ['$createdAt', '$shiftStart'] },
								{ $lte: ['$updatedAt', '$shiftEnd'] },
								{ $gte: ['$createdAt', newStart] },
								{ $lte: ['$updatedAt', newEnd] },
							],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},

				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }, { $gte: ['$createdAt', newStart] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},

		{
			$addFields: {
				total_time: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		{
			$group: {
				_id: '$concern',

				total_min: {
					$sum: '$total_time',
					// $sum: '$totalTime',
				},

				// count    : { $sum: 1 },
			},
		},

		{ $sort: { total_min: -1 } },
		{ $limit: 10 },
	])

	const allStoppagesByType1 = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				// createdAt: {
				// 	$gte: newStart,
				// 	$lte: newEnd,
				// },

				$or: [
					//started & ended during shift
					{
						createdAt: {
							$gte: newStart,
							$lte: newEnd,
						},
						updatedAt: { $lt: newEnd },
						open: false,
					},
					//started during shift & ended after
					{
						createdAt: {
							$gte: newStart,
							$lte: newEnd,
						},
						updatedAt: { $gt: newEnd },
						open: false,
					},
					//started before shift ended during
					{
						createdAt: { $lt: newStart },
						updatedAt: { $gt: newStart, $lt: newEnd },
						open: false,
					},
					//started before shift ended after
					{
						createdAt: { $lt: newStart },
						updatedAt: { $gt: newEnd },
						open: false,
					},
				],

				concern: { $nin: [null, ''] },
				// open: false,
				// type: { $in: allTypes },
			},
		},
		{
			$project: {
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				type: 1,
				concern: 1,
				started_before_ended_during: {
					$cond: [
						{
							$and: [
								{ $lte: ['$shiftEnd', newStart] },
								// { $lte: ['$updatedAt', '$shiftEnd'] },
								{ $lte: ['$createdAt', newStart] },
								{ $lte: ['$updatedAt', newEnd] },
							],
						},
						{ $subtract: ['$updatedAt', newStart] },
						0,
					],
				},
				all_during_shift: {
					$cond: [
						{
							$and: [
								{ $gte: ['$createdAt', '$shiftStart'] },
								{ $lte: ['$updatedAt', '$shiftEnd'] },
								{ $gte: ['$createdAt', newStart] },
								{ $lte: ['$updatedAt', newEnd] },
							],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},

				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }, { $gte: ['$createdAt', newStart] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},

		{
			$addFields: {
				total_time: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		{
			$group: {
				_id: '$type',

				total_min: {
					$sum: '$total_time',
					// $sum: '$totalTime',
				},

				// count    : { $sum: 1 },
			},
		},

		{ $sort: { total_min: -1 } },
	])

	const graph1axis = allStoppagesByType.map((stoppage) => stoppage._id)
	const graph1Data = allStoppagesByType.map((stoppage) => stoppage.total_min)

	if (reason === '1') {
		if (allStoppagesByType.length > 0) {
			concerns = [allStoppagesByType[0]._id]
		} else {
			concerns = []
		}
	} else {
		concerns = [reason]
	}

	const second1 = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				// createdAt: { $gte: newStart, $lte: newEnd },
				concern: { $nin: [null, ''] },
				// open: false,
				concern: { $in: concerns },
				type: { $in: allTypes },
				$or: [
					//started & ended during shift
					{
						createdAt: {
							$gte: newStart,
							$lte: newEnd,
						},
						updatedAt: { $lt: newEnd },
						open: false,
					},
					//started during shift & ended after
					{
						createdAt: {
							$gte: newStart,
							$lte: newEnd,
						},
						updatedAt: { $gt: newEnd },
						open: false,
					},
					//started before shift ended during
					{
						createdAt: { $lt: newStart },
						updatedAt: { $gt: newStart, $lt: newEnd },
						open: false,
					},
					//started before shift ended after
					{
						createdAt: { $lt: newStart },
						updatedAt: { $gt: newEnd },
						open: false,
					},
				],
			},
		},
		{
			$project: {
				day: { $dayOfMonth: '$createdAt' },
				month: { $month: '$createdAt' },
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				concern: 1,
				all_during_shift: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},
				started_before_ended_during: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$shiftStart'] },
						0,
					],
				},
				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},
		{
			$addFields: {
				total_time: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		{
			$group: {
				_id: { month: '$month', day: '$day' },
				total_min: {
					$sum: '$total_time',
				},
			},
		},

		{ $sort: { _id: 1 } },
	])

	// console.log(allStoppagesByType)
	// console.log(second1)

	const graph2axis = second1.map((stoppage) => stoppage._id.day + '/' + stoppage._id.month)
	const graph2Data = second1.map((stoppage) => stoppage.total_min)

	let totalRunningPie = 0
	let totalPlannedPie = 0
	let totalUnplannedPie = 0
	let totalBreakdownPie = 0
	// let totalMissingPie = 0
	let totalAvailableMins = 0

	for (let a of allStoppagesByType1) {
		if (a._id === 'Breakdown') {
			totalBreakdownPie = a.total_min
		}
		if (a._id === 'Planned Stoppage') {
			totalPlannedPie = a.total_min
		}
		if (a._id === 'Unplanned Stoppage') {
			totalUnplannedPie = a.total_min
		}
	}

	let totalMissingPie = totalAvailableMins - totalRunningPie - totalPlannedPie - totalUnplannedPie - totalBreakdownPie

	if (totalMissingPie < 0) totalMissingPie = 0

	const result = await Update.aggregate([
		{
			$match: {
				// shortBu: shortBu,
				vin: { $in: theVins },
				createdAt: { $gte: newStart, $lt: newEnd },
				eff: { $exists: true, $gt: -1 },
				shiftStart: { $ne: null },
				shiftEnd: { $ne: null },
			},
		},

		{
			$project: {
				_id: 0,
				vin: 1,
				type: 1,
				shortBu: 1,
				machineName: 1,
				eff: 1,
				teff: 1,
				shiftStart: 1,
				shiftEnd: 1,
				availableMins: 1,
				runningMins: 1,
				week: {
					$isoWeek: {
						date: '$shiftStart',
						timezone: 'Europe/London',
					},
				},
				startDay: { $dayOfMonth: '$shiftStart' },
				startMonth: { $month: '$shiftStart' },
				shift_start_day: {
					$substr: ['$shiftStart', 0, 10],
				},
				shift_start_time: {
					$dateToString: {
						format: '%H:%M:%S',
						date: '$shiftStart',
						timezone: 'Europe/London',
					},
				},
				shift_end_date: {
					$substr: ['$shiftEnd', 0, 10],
				},
				shift_end_time: {
					$dateToString: {
						format: '%H:%M:%S',
						date: '$shiftEnd',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$addFields: {
				totalTime: {
					$subtract: ['$shiftEnd', '$shiftStart'],
				},
			},
		},
		{
			$addFields: {
				available_mins: {
					$floor: {
						$divide: ['$totalTime', 60000],
					},
				},
			},
		},
		{
			$addFields: {
				planned_stoppage_mins: 0,
				unplanned_stoppage_mins: 0,
				breakdown_mins: 0,
				missing_mins: 0,
			},
		},
		// {
		// 	$addFields : {
		// 		running_mins : {
		// 			$cond : [
		// 				{ $gt: [ '$eff', -1 ] },
		// 				{
		// 					$multiply : [
		// 						{
		// 							$divide : [ '$available_mins', 100 ],
		// 						},
		// 						'$eff',
		// 					],
		// 				},

		// 				0,
		// 			],
		// 		},
		// 		touch_mins   : {
		// 			$cond : [
		// 				{ $gt: [ '$teff', -1 ] },
		// 				{
		// 					$multiply : [
		// 						{
		// 							$divide : [ '$available_mins', 100 ],
		// 						},
		// 						'$teff',
		// 					],
		// 				},

		// 				0,
		// 			],
		// 		},
		// 	},
		// },
		// {
		// 	$addFields : {
		// 		running_mins : {
		// 			$floor : {
		// 				$divide : [ '$available_mins', '$eff' ],
		// 			},
		// 		},
		// 	},
		// },

		{
			$project: {
				vin: 1,
				type: 1,
				shortBu: 1,
				machineName: 1,
				runningMins: 1,
				eff: 1,
				teff: 1,
				week: 1,
				startDay: 1,
				startMonth: 1,
				shift_start_date: 1,
				shift_start_time: 1,
				shift_end_date: 1,
				shift_end_time: 1,
				shiftStart: 1,
				shiftEnd: 1,
				available_mins: {
					$cond: [{ $not: ['$availableMins'] }, '$available_mins', '$availableMins'],
				},
				// running_mins            : {
				// 	$cond : [ { $not: [ '$runningMins' ] }, '$running_mins', '$runningMins' ],
				// },
				planned_stoppage_mins: 1,
				unplanned_stoppage_mins: 1,
				breakdown_mins: 1,
				missing_mins: 1,
				// touch_mins              : 1,
				// availableMins           : { $ifNull: [ '$available_mins', '$availableMins' ] },
				// availableMins           : {
				// 	$cond: [ { $not: [ '$availableMins' ] }, '$available_mins', '$availableMins' ],
				// },
				// availableMins           : 1,
			},
		},
		{
			$addFields: {
				running_mins: {
					$cond: [
						{ $gt: ['$eff', -1] },
						{
							$multiply: [
								{
									$divide: ['$available_mins', 100],
								},
								'$eff',
							],
						},

						0,
					],
				},
				touch_mins: {
					$cond: [
						{ $gt: ['$teff', -1] },
						{
							$multiply: [
								{
									$divide: ['$available_mins', 100],
								},
								'$teff',
							],
						},

						0,
					],
				},
			},
		},
		{
			$addFields: {
				running_mins: {
					$cond: [{ $not: ['$runningMins'] }, '$running_mins', '$runningMins'],
				},
			},
		},
		{
			$project: {
				runningMins: 0,
			},
		},
		{ $sort: { shiftStart: 1 } },
	])

	const allTheVins = theVins

	const allPlanned = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: allTheVins },

				concern: { $nin: [null, ''] },
				open: false,
				type: 'Planned Stoppage',
			},
		},
		{
			$project: {
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				all_during_shift: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},
				started_before_ended_during: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$shiftStart'] },
						0,
					],
				},
				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},
		{
			$project: {
				vin: 1,
				shiftStart: 1,
				shiftEnd: 1,
				all_during_shift: 1,
				started_before_ended_during: 1,
				started_during_ended_after: 1,
				all_shift: 1,
			},
		},
		{
			$group: {
				_id: {
					vin: '$vin',
					shiftStart: '$shiftStart',
					shiftEnd: '$shiftEnd',
				},

				total_planned: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		// { $sort: { _id: 1 } },
	])
	const allUnplanned = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: allTheVins },

				concern: { $nin: [null, ''] },
				open: false,
				type: 'Unplanned Stoppage',
			},
		},
		{
			$project: {
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				all_during_shift: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},
				started_before_ended_during: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$shiftStart'] },
						0,
					],
				},
				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},
		{
			$project: {
				vin: 1,
				shiftStart: 1,
				shiftEnd: 1,
				all_during_shift: 1,
				started_before_ended_during: 1,
				started_during_ended_after: 1,
				all_shift: 1,
			},
		},
		{
			$group: {
				_id: {
					vin: '$vin',
					shiftStart: '$shiftStart',
					shiftEnd: '$shiftEnd',
				},

				total_unplanned: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		// { $sort: { _id: 1 } },
	])
	const allBreakdowns = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: allTheVins },

				concern: { $nin: [null, ''] },
				open: false,
				type: 'Breakdown',
			},
		},
		{
			$project: {
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				all_during_shift: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},
				started_before_ended_during: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$shiftStart'] },
						0,
					],
				},
				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},
		{
			$project: {
				vin: 1,
				shiftStart: 1,
				shiftEnd: 1,
				all_during_shift: 1,
				started_before_ended_during: 1,
				started_during_ended_after: 1,
				all_shift: 1,
			},
		},
		{
			$group: {
				_id: {
					vin: '$vin',
					shiftStart: '$shiftStart',
					shiftEnd: '$shiftEnd',
				},

				total_breakdown: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		// { $sort: { _id: 1 } },
	])

	for (let r of result) {
		if (r.touch_mins >= r.running_mins) r.running_mins = r.touch_mins
		for (let p of allPlanned) {
			if (
				p._id.vin == r.vin &&
				JSON.stringify(p._id.shiftStart) === JSON.stringify(r.shiftStart) &&
				JSON.stringify(p._id.shiftEnd) === JSON.stringify(r.shiftEnd)
			) {
				r.planned_stoppage_mins = p.total_planned
				// console.log('Here')
			}
		}
		for (let p of allUnplanned) {
			if (
				p._id.vin == r.vin &&
				JSON.stringify(p._id.shiftStart) == JSON.stringify(r.shiftStart) &&
				JSON.stringify(p._id.shiftEnd) == JSON.stringify(r.shiftEnd)
			) {
				r.unplanned_stoppage_mins = p.total_unplanned
				// console.log('Here')
			}
		}
		for (let p of allBreakdowns) {
			if (
				p._id.vin == r.vin &&
				JSON.stringify(p._id.shiftStart) == JSON.stringify(r.shiftStart) &&
				JSON.stringify(p._id.shiftEnd) == JSON.stringify(r.shiftEnd)
			) {
				r.breakdown_mins = p.total_breakdown
				// console.log('Here')
			}
		}

		r.missing_mins = r.available_mins - r.running_mins - r.planned_stoppage_mins - r.unplanned_stoppage_mins - r.breakdown_mins

		if (r.missing_mins < 0) r.missing_mins = 0
	}

	for (let j of result) {
		totalAvailableMins += j.available_mins
		totalRunningPie += j.running_mins
	}

	// convert times into HH:MM:SS
	let sumOfRunningTime = msToTime(totalRunningPie * 60000)
	let sumOfBdTime = msToTime(totalPlannedPie * 60000)
	let sumOfUnknownBdTime = msToTime(totalUnplannedPie * 60000)
	let sumOfWireTime = msToTime(totalBreakdownPie * 60000)

	const lineLabels1 = result.map((label) => label.startDay + '/' + label.startMonth)

	let lineLabels = [...new Set(lineLabels1)]

	const lineRunning = result.map((point) => point.running_mins)

	const linePlanned = result.map((point) => point.planned_stoppage_mins)
	const lineUnplanned = result.map((point) => point.unplanned_stoppage_mins)
	const lineBreakdown = result.map((point) => point.breakdown_mins)

	let update = await Machine.findOne(
		{
			inShift: true,
		},
		{ _id: -1, lastUpdate: 1 }
	)

	if (update === null) {
		update = new Date()
	}

	let highest = Math.max.apply(Math, graph2Data)

	// console.log('RUNNING => ', totalRunningPie)
	// console.log('PLANNED => ', totalPlannedPie)
	// console.log('UNPLANNED => ', totalUnplannedPie)
	// console.log('BREAKDOWN => ', totalBreakdownPie)
	// console.log('MISSING => ', totalMissingPie)
	// console.log('AVAILABLE => ', totalAvailableMins)

	const totalRunningPiePercent = Math.round((totalRunningPie / totalAvailableMins) * 100)
	const totalPlannedPiePercent = Math.round((totalPlannedPie / totalAvailableMins) * 100)
	const totalUnplannedPiePercent = Math.round((totalUnplannedPie / totalAvailableMins) * 100)
	const totalBreakdownPiePercent = Math.round((totalBreakdownPie / totalAvailableMins) * 100)
	let totalMissingPiePercent = 100 - totalRunningPiePercent - totalPlannedPiePercent - totalUnplannedPiePercent - totalBreakdownPiePercent

	if (totalMissingPiePercent < 0) totalMissingPiePercent = 0

	// console.log(totalRunningPiePercent)
	// console.log(totalPlannedPiePercent)
	// console.log(totalUnplannedPiePercent)
	// console.log(totalBreakdownPiePercent)
	// console.log(totalMissingPiePercent)
	// <%= totalUnplannedPie  %>,
	// <%= totalBreakdownPie %>,
	// <%= totalRunningPie %>,
	// <%= totalMissingPie %>,

	// let key = 'DYNAMIC_NAME',
	// 	obj = {
	// 		[key]: 'VALUE',
	// 	}

	// console.log('START =>', newStart)
	// console.log('END =>', newEnd)

	res.render('machine/machineAnalysis', {
		assets,
		robots,
		lasers,
		plasmas,
		allAssets,
		graph1axis,
		graph1Data,
		graph2axis,
		graph2Data,
		donorMachine,
		type,
		stoppage,
		newStart,
		newEnd,
		totalNumberOfPlanned,
		totalNumberOfUnplanned,
		totalNumberOfBreakdowns,

		totalRunningPie,
		totalPlannedPie,
		totalUnplannedPie,
		totalBreakdownPie,
		totalMissingPie,
		lineLabels,
		lineRunning,
		linePlanned,
		lineUnplanned,
		lineBreakdown,
		sumOfRunningTime,
		sumOfBdTime,
		sumOfUnknownBdTime,
		sumOfWireTime,
		theVins,
		theIds,
		reason,
		highest,
		donorMachine,

		totalRunningPiePercent,
		totalPlannedPiePercent,
		totalUnplannedPiePercent,
		totalBreakdownPiePercent,
		totalMissingPiePercent,

		update,
	})
}

module.exports.shftVsLoad = async (req, res) => {
	const { shortBu } = req.params

	const machines = await Machine.find({ shortBu }, { machineName: 1 }).sort({
		machineName: 1,
	})
	let machine = {}
	let labels = []
	let availableMins = []
	let runningMins = []
	let maxGraph = 0
	let data = 'No'

	if (req.body.id) {
		if (!req.body.startDate || !req.body.endDate) {
			req.flash('error', 'Please fill in start date and end date.')

			res.redirect(`/equipment-monitoring/shift-vs-load/${shortBu}`)
			return
		}

		const start = new Date(req.body.startDate)
		const end = new Date(req.body.endDate)

		end.setHours(24)

		const midnight = new Date()
		midnight.setHours(0)

		// console.log(end)
		// console.log(midnight)

		if (start > midnight || end > midnight) {
			req.flash('error', 'Dates must before today.')

			res.redirect(`/equipment-monitoring/shift-vs-load/${shortBu}`)
			return
		}

		if (start >= end) {
			req.flash('error', 'Start date must be before end date.')

			res.redirect(`/equipment-monitoring/shift-vs-load/${shortBu}`)
			return
		}

		const timeDif = end - start

		if (timeDif > 1299200000) {
			req.flash('error', 'Sorry, maximum range is 14 days.')

			res.redirect(`/equipment-monitoring/shift-vs-load/${shortBu}`)
			return
		}

		machine = await Machine.findById(req.body.id)

		const vin = machine.vin

		const shifts = await Update.aggregate([
			{
				$match: {
					vin,
					shiftStart: { $gte: start, $lte: end },
					eff: { $exists: true, $gt: -1 },
				},
			},
			//get available ms
			{
				$addFields: {
					totalTime: {
						$subtract: ['$shiftEnd', '$shiftStart'],
					},
				},
			},
			//get available mins
			{
				$addFields: {
					avMinutes: {
						//$floor : {
						$divide: ['$totalTime', 60000],
						//},
					},
				},
			},
			//get running mins
			{
				$addFields: {
					running_Mins: {
						$multiply: [
							{
								$divide: ['$avMinutes', 100],
							},
							'$eff',
						],
					},
				},
			},
			{
				$project: {
					startDay: {
						$dayOfMonth: { date: '$shiftStart', timezone: 'Europe/London' },
					},
					endDay: {
						$dayOfMonth: { date: '$shiftEnd', timezone: 'Europe/London' },
					},
					startMonth: {
						$month: { date: '$shiftStart', timezone: 'Europe/London' },
					},
					endMonth: {
						$month: { date: '$shiftEnd', timezone: 'Europe/London' },
					},
					startYear: {
						$year: { date: '$shiftStart', timezone: 'Europe/London' },
					},
					endYear: {
						$year: { date: '$shiftEnd', timezone: 'Europe/London' },
					},
					month: {
						$month: { date: '$shiftStart', timezone: 'Europe/London' },
					},
					year: {
						$year: { date: '$shiftStart', timezone: 'Europe/London' },
					},
					startHour: {
						$hour: { date: '$shiftStart', timezone: 'Europe/London' },
					},
					starMin: {
						$minute: { date: '$shiftStart', timezone: 'Europe/London' },
					},
					endHour: {
						$hour: { date: '$shiftEnd', timezone: 'Europe/London' },
					},
					endMin: {
						$minute: { date: '$shiftEnd', timezone: 'Europe/London' },
					},
					shiftStart: 1,
					shiftEnd: 1,
					eff: 1,
					// avMinutes     : {
					// 	$cond : [ { $not: [ '$availableMins' ] }, '$avMinutes', '$availableMins' ],
					// },
					avMinutes: 1,

					running__Mins: {
						$cond: [{ $not: ['$runningMins'] }, '$running_Mins', '$runningMins'],
					},
				},
			},

			{
				$addFields: {
					shift: {
						$switch: {
							branches: [
								{
									case: {
										$or: [{ $gt: ['$endDay', '$startDay'] }, { $gt: ['$endMonth', '$startMonth'] }, { $gt: ['$endYear', '$startYear'] }],
									},
									then: 'Nights',
								},
								{ case: { $gt: ['$startHour', 12] }, then: 'Noons' },
							],
							default: 'Days',
						},

						// $cond : [ { $gt: [ '$endDay', '$startDay' ] },
						// $cond : [
						// 	{
						// 		$or : [
						// 			{ $gt: [ '$endDay', '$startDay' ] },
						// 			{ $gt: [ '$endMonth', '$startMonth' ] },
						// 			{ $gt: [ '$endYear', '$startYear' ] },
						// 		],
						// 	},

						// 	'Nights',
						// 	'Days',
						// ],
					},
					dayOfWeek: '',
				},
			},

			{
				$group: {
					_id: {
						shiftStart: '$shiftStart',
						year: '$year',
						month: '$month',
						startDay: '$startDay',
						shift: '$shift',
						startHour: '$startHour',
						startMin: '$starMin',
						endHour: '$endHour',
						endMin: '$endMin',
						dayOfWeek: '$dayOfWeek',
					},

					sum_of_avv_mins: {
						$sum: '$avMinutes',
					},
					sum_of_running_mins: {
						$sum: '$running__Mins',
					},
				},
			},
		]).sort({
			_id: 1,
			// shift      : 1,
			// startHour  : 1,
		})

		for (let s of shifts) {
			s._id.startDay = ('0' + s._id.startDay).slice(-2)
			s._id.month = ('0' + s._id.month).slice(-2)
			s._id.startHour = ('0' + s._id.startHour).slice(-2)
			s._id.startMin = ('0' + s._id.startMin).slice(-2)
			s._id.endHour = ('0' + s._id.endHour).slice(-2)
			s._id.endMin = ('0' + s._id.endMin).slice(-2)
		}

		// console.log(shifts)

		labels = shifts.map((l) => {
			let dateHelp = moment(l._id.shiftStart).format('ddd')
			return [
				`${l._id.startDay}/${l._id.month} (${l._id.startHour}:${l._id.startMin} - ${l._id.endHour}:${l._id.endMin})`,
				`${dateHelp} ${l._id.shift}`,
			]
		})

		// const availableMins = shifts.map((s) => Math.round(s.sum_of_avv_mins / 60))
		// +((s.sum_of_avv_mins / 60).toFixed(2))
		availableMins = shifts.map((s) => Math.round(s.sum_of_avv_mins))
		runningMins = shifts.map((s) => Math.round(s.sum_of_running_mins))

		maxGraph = Math.max(...availableMins) + 60

		data = 'Yes'

		// console.log(shifts)
		// console.log(labels)
		// console.log(availableMins)
		// console.log(runningMins)
	}

	res.render('machine/shiftVsLoad', {
		machine,
		machines,
		shortBu,
		labels,
		availableMins,
		runningMins,
		maxGraph,
		data,
	})
}

// download all cabs 4C data

module.exports.downloadStoppages = async (req, res) => {
	let { ids, type, stoppage, newStart, newEnd } = req.params

	// console.log('ID => ', id)
	// console.log('TYPE => ', type)
	// console.log('STOPPAGE => ', stoppage)
	// console.log('START => ', newStart)
	// console.log('END => ', newEnd)

	let theIds = ids.split(',')

	const start = new Date(newStart)
	const end = new Date(newEnd)

	// console.log(theIds)

	const donorMachines = await Machine.find({
		_id: { $in: theIds },
	})

	const theVins = donorMachines.map((machine) => machine.vin)

	if (stoppage === '1') {
		allTypes = ['Planned Stoppage', 'Unplanned Stoppage', 'Breakdown']
	} else {
		allTypes = [stoppage]
	}

	const result = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: theVins },
				$or: [
					//started & ended during shift
					{
						createdAt: {
							$gte: start,
							$lte: end,
						},
						updatedAt: { $lt: end },
						open: false,
					},
					//started during shift & ended after
					{
						createdAt: {
							$gte: start,
							$lte: end,
						},
						updatedAt: { $gt: end },
						open: false,
					},
					//started before shift ended during
					{
						createdAt: { $lt: start },
						updatedAt: { $gt: start, $lt: end },
						open: false,
					},
					//started before shift ended after
					{
						createdAt: { $lt: start },
						updatedAt: { $gt: end },
						open: false,
					},
				],
				concern: { $nin: [null, ''] },
				// open: false,
				type: { $in: allTypes },
			},
		},
		{
			$project: {
				_id: 0,
				vin: 1,
				type: 1,
				concern: 1,
				detail: 1,
				updatedAt: 1,
				createdAt: 1,
				abbreviatedName: 1,

				start_Date: {
					$substr: ['$createdAt', 0, 10],
				},
				start_Time: {
					$dateToString: {
						format: '%H:%M:%S',
						date: '$createdAt',
						timezone: 'Europe/London',
					},
				},
				end_Date: {
					$substr: ['$updatedAt', 0, 10],
				},
				end_Time: {
					$dateToString: {
						format: '%H:%M:%S',
						date: '$updatedAt',
						timezone: 'Europe/London',
					},
				},

				total_Time: { $subtract: ['$updatedAt', '$createdAt'] },
			},
		},
		{
			$addFields: {
				dateDifference: {
					$subtract: ['$updatedAt', '$createdAt'],
				},
			},
		},
		{
			$addFields: {
				diffInSec: {
					$divide: ['$dateDifference', 1000],
				},
			},
		},
		{
			$addFields: {
				hours: {
					$floor: {
						$divide: ['$diffInSec', 3600],
					},
				},
			},
		},
		{
			$addFields: {
				remainingSeconds: {
					$subtract: [
						'$diffInSec',
						{
							$multiply: ['$hours', 3600],
						},
					],
				},
			},
		},
		{
			$addFields: {
				minutes: {
					$floor: {
						$divide: ['$remainingSeconds', 60],
					},
				},
			},
		},
		{
			$addFields: {
				remainingSeconds: {
					$subtract: [
						'$remainingSeconds',
						{
							$multiply: ['$minutes', 60],
						},
					],
				},
			},
		},
		{
			$addFields: {
				seconds: { $round: ['$remainingSeconds', 0] },
			},
		},
		{
			$project: {
				_id: 0,
				vin: 1,
				type: 1,
				concern: 1,
				detail: 1,
				start_Date: 1,
				start_Time: 1,
				end_Date: 1,
				end_Time: 1,
				hours: 1,
				minutes: 1,
				seconds: 1,
			},
		},
	])

	for (let r of result) {
		let foundMachine = await Machine.findOne({ vin: r.vin })
		if (foundMachine) {
			r.vin = foundMachine.machineName
		}
	}

	const result2 = result.map(({ index, ...item }) => ({
		...item,
		// key          : item._id,
		weekday: calculateDate(item.start_Date),
	}))

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result2)

		fs.writeFile('stoppages.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./stoppages.csv', () => {
				// fs.unlinkSync('./customer.csv');
			})
		})
	}
}

module.exports.help = (req, res) => {
	const path = './PDF/help.pdf'
	if (fs.existsSync(path)) {
		res.contentType('application/pdf')
		fs.createReadStream(path).pipe(res)
	} else {
		console.log('error with help pdf')
	}
}

module.exports.updatesCSVDownload = async (req, res) => {
	const thisWeek = moment().isoWeek()

	const sixWeeksAgo = moment().subtract(13, 'weeks').format('YYYY, MM, DD')

	const sixWeeksAgoDate = new Date(sixWeeksAgo)

	let cutIn = new Date('2021, 06, 01')

	const types = ['Laser Cutter', 'Welding Robot', 'Plasma Cutter']
	const vins = ['JCBUKBHLTRUMPF002', 'JCBUKBHLTRUMPF003', 'JCBUKBHLTRUMPF006']

	const result = await Update.aggregate([
		{
			$match: {
				shiftStart: { $ne: null },
				shiftEnd: { $ne: null },
				createdAt: { $gte: cutIn },
				type: { $in: types },
				eff: { $exists: true, $gt: -1 },
			},
		},

		{
			$project: {
				_id: 0,
				vin: 1,
				type: 1,
				shortBu: 1,
				machineName: 1,
				eff: 1,
				teff: 1,
				createdAt: 1,
				shiftStart: 1,
				shiftEnd: 1,
				availableMins: 1,
				runningMins: 1,
				date: {
					$substr: ['$createdAt', 0, 10],
				},
				week: {
					$isoWeek: {
						date: '$createdAt',
						timezone: 'Europe/London',
					},
				},
				month: {
					$month: {
						date: '$createdAt',
						timezone: 'Europe/London',
					},
				},
				year: {
					$year: {
						date: '$createdAt',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$addFields: {
				totalTime: {
					$subtract: ['$shiftEnd', '$shiftStart'],
				},
			},
		},
		{
			$addFields: {
				available_mins: {
					$floor: {
						$divide: ['$totalTime', 60000],
					},
				},
			},
		},

		{
			$project: {
				vin: 1,
				type: 1,
				shortBu: 1,
				machineName: 1,
				eff: 1,
				teff: 1,
				date: 1,
				week: 1,
				month: 1,
				year: 1,
				runningMins: 1,
				available_mins: {
					$cond: [{ $not: ['$availableMins'] }, '$available_mins', '$availableMins'],
				},
			},
		},
		{
			$addFields: {
				running_mins: {
					$cond: [
						{ $gt: ['$eff', -1] },
						{
							$multiply: [
								{
									$divide: ['$available_mins', 100],
								},
								'$eff',
							],
						},

						0,
					],
				},
				touch_mins: {
					$cond: [
						{ $gt: ['$teff', -1] },
						{
							$multiply: [
								{
									$divide: ['$available_mins', 100],
								},
								'$teff',
							],
						},

						0,
					],
				},
			},
		},
		{
			$addFields: {
				running_mins: {
					$cond: [{ $not: ['$runningMins'] }, '$running_mins', '$runningMins'],
				},
			},
		},
	])

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('update-history.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./update-history.csv', () => {
				// fs.unlinkSync('./customer.csv');
			})
		})
	}
}

module.exports.updatesCSVDownloadAll = async (req, res) => {
	const { shortBu } = req.params

	const types = ['Laser Cutter', 'Welding Robot', 'Plasma Cutter']
	const vins = ['JCBUKBHLTRUMPF002', 'JCBUKBHLTRUMPF003', 'JCBUKBHLTRUMPF006']
	let cutIn = new Date('2021, 12, 01')

	const start = new Date('2022, 01, 01')
	const endMoment = moment().subtract(1, 'days')

	const end = new Date(endMoment)
	// const end = new Date()

	const result = await Update.aggregate([
		{
			$match: {
				// shortBu: shortBu,
				type: { $in: types },
				// createdAt: { $gt: start, $lt: end },
				createdAt: { $gt: start },
				eff: { $exists: true, $gt: -1 },
				shiftStart: { $ne: null },
				shiftEnd: { $ne: null },
			},
		},

		{
			$project: {
				_id: 0,
				vin: 1,
				type: 1,
				shortBu: 1,
				machineName: 1,
				eff: 1,
				teff: 1,
				shiftStart: 1,
				shiftEnd: 1,
				availableMins: 1,
				runningMins: 1,
				week: {
					$isoWeek: {
						date: '$shiftStart',
						timezone: 'Europe/London',
					},
				},
				shift_start_date: {
					$substr: ['$shiftStart', 0, 10],
				},
				shift_start_time: {
					$dateToString: {
						format: '%H:%M:%S',
						date: '$shiftStart',
						timezone: 'Europe/London',
					},
				},
				shift_end_date: {
					$substr: ['$shiftEnd', 0, 10],
				},
				shift_end_time: {
					$dateToString: {
						format: '%H:%M:%S',
						date: '$shiftEnd',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$addFields: {
				totalTime: {
					$subtract: ['$shiftEnd', '$shiftStart'],
				},
			},
		},
		{
			$addFields: {
				available_mins: {
					$floor: {
						$divide: ['$totalTime', 60000],
					},
				},
			},
		},
		{
			$addFields: {
				planned_stoppage_mins: 0,
				unplanned_stoppage_mins: 0,
				breakdown_mins: 0,
				missing_mins: 0,
			},
		},
		// {
		// 	$addFields : {
		// 		running_mins : {
		// 			$cond : [
		// 				{ $gt: [ '$eff', -1 ] },
		// 				{
		// 					$multiply : [
		// 						{
		// 							$divide : [ '$available_mins', 100 ],
		// 						},
		// 						'$eff',
		// 					],
		// 				},

		// 				0,
		// 			],
		// 		},
		// 		touch_mins   : {
		// 			$cond : [
		// 				{ $gt: [ '$teff', -1 ] },
		// 				{
		// 					$multiply : [
		// 						{
		// 							$divide : [ '$available_mins', 100 ],
		// 						},
		// 						'$teff',
		// 					],
		// 				},

		// 				0,
		// 			],
		// 		},
		// 	},
		// },
		// {
		// 	$addFields : {
		// 		running_mins : {
		// 			$floor : {
		// 				$divide : [ '$available_mins', '$eff' ],
		// 			},
		// 		},
		// 	},
		// },

		{
			$project: {
				vin: 1,
				type: 1,
				shortBu: 1,
				machineName: 1,
				runningMins: 1,
				eff: 1,
				teff: 1,
				week: 1,
				shift_start_date: 1,
				shift_start_time: 1,
				shift_end_date: 1,
				shift_end_time: 1,
				shiftStart: 1,
				shiftEnd: 1,
				available_mins: {
					$cond: [{ $not: ['$availableMins'] }, '$available_mins', '$availableMins'],
				},
				// running_mins            : {
				// 	$cond : [ { $not: [ '$runningMins' ] }, '$running_mins', '$runningMins' ],
				// },
				planned_stoppage_mins: 1,
				unplanned_stoppage_mins: 1,
				breakdown_mins: 1,
				missing_mins: 1,
				// touch_mins              : 1,
				// availableMins           : { $ifNull: [ '$available_mins', '$availableMins' ] },
				// availableMins           : {
				// 	$cond: [ { $not: [ '$availableMins' ] }, '$available_mins', '$availableMins' ],
				// },
				// availableMins           : 1,
				startDay: {
					$dayOfMonth: { date: '$shiftStart', timezone: 'Europe/London' },
				},
				endDay: {
					$dayOfMonth: { date: '$shiftEnd', timezone: 'Europe/London' },
				},
				startMonth: {
					$month: { date: '$shiftStart', timezone: 'Europe/London' },
				},
				endMonth: {
					$month: { date: '$shiftEnd', timezone: 'Europe/London' },
				},
				startYear: {
					$year: { date: '$shiftStart', timezone: 'Europe/London' },
				},
				endYear: {
					$year: { date: '$shiftEnd', timezone: 'Europe/London' },
				},
				month: {
					$month: { date: '$shiftStart', timezone: 'Europe/London' },
				},
				year: {
					$year: { date: '$shiftStart', timezone: 'Europe/London' },
				},
				startHour: {
					$hour: { date: '$shiftStart', timezone: 'Europe/London' },
				},
				starMin: {
					$minute: { date: '$shiftStart', timezone: 'Europe/London' },
				},
				endHour: {
					$hour: { date: '$shiftEnd', timezone: 'Europe/London' },
				},
				endMin: {
					$minute: { date: '$shiftEnd', timezone: 'Europe/London' },
				},
			},
		},
		{
			$addFields: {
				running_mins: {
					$cond: [
						{ $gt: ['$eff', -1] },
						{
							$multiply: [
								{
									$divide: ['$available_mins', 100],
								},
								'$eff',
							],
						},

						0,
					],
				},
				touch_mins: {
					$cond: [
						{ $gt: ['$teff', -1] },
						{
							$multiply: [
								{
									$divide: ['$available_mins', 100],
								},
								'$teff',
							],
						},

						0,
					],
				},
			},
		},
		{
			$addFields: {
				running_mins: {
					$cond: [{ $not: ['$runningMins'] }, '$running_mins', '$runningMins'],
				},
				day_of_week: '',
			},
		},

		{
			$addFields: {
				shift: {
					$switch: {
						branches: [
							{
								case: {
									$or: [{ $gt: ['$endDay', '$startDay'] }, { $gt: ['$endMonth', '$startMonth'] }, { $gt: ['$endYear', '$startYear'] }],
								},
								then: 'Nights',
							},
							{ case: { $gt: ['$startHour', 12] }, then: 'Noons' },
						],
						default: 'Days',
					},
				},
			},
		},
		{
			$project: {
				runningMins: 0,
				startDay: 0,
				endDay: 0,
				startMonth: 0,
				endMonth: 0,
				startYear: 0,
				endYear: 0,
				month: 0,
				year: 0,
				startHour: 0,
				starMin: 0,
				endHour: 0,
				endMin: 0,
			},
		},
	])

	const allTheVins = result.map((r) => r.vin)

	const allPlanned = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: allTheVins },
				createdAt: { $gt: start, $lt: end },

				concern: { $nin: [null, ''] },
				open: false,
				type: 'Planned Stoppage',
			},
		},
		{
			$project: {
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				all_during_shift: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},
				started_before_ended_during: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$shiftStart'] },
						0,
					],
				},
				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},
		{
			$project: {
				vin: 1,
				shiftStart: 1,
				shiftEnd: 1,
				all_during_shift: 1,
				started_before_ended_during: 1,
				started_during_ended_after: 1,
				all_shift: 1,
			},
		},
		{
			$group: {
				_id: {
					vin: '$vin',
					shiftStart: '$shiftStart',
					shiftEnd: '$shiftEnd',
				},

				total_planned: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		// { $sort: { _id: 1 } },
	])
	const allUnplanned = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: allTheVins },
				createdAt: { $gt: start, $lt: end },

				concern: { $nin: [null, ''] },
				open: false,
				type: 'Unplanned Stoppage',
			},
		},
		{
			$project: {
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				all_during_shift: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},
				started_before_ended_during: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$shiftStart'] },
						0,
					],
				},
				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},
		{
			$project: {
				vin: 1,
				shiftStart: 1,
				shiftEnd: 1,
				all_during_shift: 1,
				started_before_ended_during: 1,
				started_during_ended_after: 1,
				all_shift: 1,
			},
		},
		{
			$group: {
				_id: {
					vin: '$vin',
					shiftStart: '$shiftStart',
					shiftEnd: '$shiftEnd',
				},

				total_unplanned: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		// { $sort: { _id: 1 } },
	])
	const allBreakdowns = await Stoppage.aggregate([
		{
			$match: {
				vin: { $in: allTheVins },
				createdAt: { $gt: start, $lt: end },

				concern: { $nin: [null, ''] },
				open: false,
				type: 'Breakdown',
			},
		},
		{
			$project: {
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				updatedAt: 1,
				vin: 1,
				all_during_shift: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$createdAt'] },
						0,
					],
				},
				started_before_ended_during: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $lte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$updatedAt', '$shiftStart'] },
						0,
					],
				},
				started_during_ended_after: {
					$cond: [
						{
							$and: [{ $gte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$createdAt'] },
						0,
					],
				},
				all_shift: {
					$cond: [
						{
							$and: [{ $lte: ['$createdAt', '$shiftStart'] }, { $gte: ['$updatedAt', '$shiftEnd'] }],
						},
						{ $subtract: ['$shiftEnd', '$shiftStart'] },
						0,
					],
				},
			},
		},
		{
			$project: {
				vin: 1,
				shiftStart: 1,
				shiftEnd: 1,
				all_during_shift: 1,
				started_before_ended_during: 1,
				started_during_ended_after: 1,
				all_shift: 1,
			},
		},
		{
			$group: {
				_id: {
					vin: '$vin',
					shiftStart: '$shiftStart',
					shiftEnd: '$shiftEnd',
				},

				total_breakdown: {
					$sum: {
						$round: [
							{
								$divide: [
									{
										$add: [
											{
												$sum: '$all_during_shift',
											},
											{
												$sum: '$started_during_ended_after',
											},
											{
												$sum: '$started_before_ended_during',
											},
											{
												$sum: '$all_shift',
											},
										],
									},
									60000,
								],
							},
							0,
						],
					},
				},
			},
		},
		// { $sort: { _id: 1 } },
	])

	for (let r of result) {
		r.day_of_week = calculateDate(r.shift_start_date)
		if (r.touch_mins >= r.running_mins) r.running_mins = r.touch_mins
		for (let p of allPlanned) {
			if (
				p._id.vin == r.vin &&
				JSON.stringify(p._id.shiftStart) === JSON.stringify(r.shiftStart) &&
				JSON.stringify(p._id.shiftEnd) === JSON.stringify(r.shiftEnd)
			) {
				r.planned_stoppage_mins = p.total_planned
				// console.log('Here')
			}
		}
		for (let p of allUnplanned) {
			if (
				p._id.vin == r.vin &&
				JSON.stringify(p._id.shiftStart) == JSON.stringify(r.shiftStart) &&
				JSON.stringify(p._id.shiftEnd) == JSON.stringify(r.shiftEnd)
			) {
				r.unplanned_stoppage_mins = p.total_unplanned
				// console.log('Here')
			}
		}
		for (let p of allBreakdowns) {
			if (
				p._id.vin == r.vin &&
				JSON.stringify(p._id.shiftStart) == JSON.stringify(r.shiftStart) &&
				JSON.stringify(p._id.shiftEnd) == JSON.stringify(r.shiftEnd)
			) {
				r.breakdown_mins = p.total_breakdown
				// console.log('Here')
			}
		}

		r.missing_mins = r.available_mins - r.running_mins - r.planned_stoppage_mins - r.unplanned_stoppage_mins - r.breakdown_mins

		if (r.missing_mins < 0) r.missing_mins = 0
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('shift-historyAll.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./shift-historyAll.csv', () => {
				// fs.unlinkSync('./customer.csv');
			})
		})
	}
}

module.exports.weeklyReport = (req, res) => {
	const path = './PDF/WeeklyReport.pdf'
	if (fs.existsSync(path)) {
		res.contentType('application/pdf')
		fs.createReadStream(path).pipe(res)
	} else {
		console.log('error with report pdf')
	}
}

module.exports.addMachineNotes = async (req, res) => {
	const { id } = req.params

	const machine = await Machine.findById(id)

	const machineNote = new MachineNote()
	machineNote.body = req.body.body
	machineNote.vin = machine.vin
	machineNote.assetName = machine.machineName
	machineNote.shortBu = machine.shortBu

	await machineNote.save()

	// console.log(machineNote)
	res.redirect(`/equipment-monitoring/machine/${id}`)
}
module.exports.acknowledgeNotes = async (req, res) => {
	const { id } = req.params

	const machine = await Machine.findById(id)

	await MachineNote.updateMany(
		{
			vin: machine.vin,
			read: false,
		},
		{
			$set: {
				read: true,
				readAt: Date.now(),
			},
		},
		{ multi: true }
	)

	res.redirect(`/equipment-monitoring/machine/${id}`)
}

module.exports.notificationAdmin = async (req, res) => {
	const { shortBu } = req.params
	let start = new Date()
	start.setHours(01, 0, 0, 0)
	const machines = await Machine.find({ shortBu: shortBu })

	let businessUnit = machines[0].businessUnit

	const notifications = await Notification.aggregate([
		{
			$match: {
				shortBu: shortBu,
				active: true,
			},
		},
		{
			$addFields: {
				assetNames: '',
			},
		},
	])

	/////
	const robots = await Machine.find({
		shortBu: shortBu,
		type: 'Welding Robot',
	})
	const lasers = await Machine.find({
		shortBu: shortBu,
		type: 'Laser Cutter',
	})
	const plasmas = await Machine.find({
		shortBu: shortBu,
		type: 'Plasma Cutter',
	})

	for (let n of notifications) {
		let assetsArray = await Machine.find(
			{
				_id: { $in: n.ids },
			},
			{ abbreviatedName: 1, _id: 0 }
		)
		const assetsArrayHelp = assetsArray.map((asset) => asset.abbreviatedName)
		// console.log(assetsArrayHelp)
		// n.assetNames = assetsArrayHelp
		n.assetNames = assetsArrayHelp.join(', ')
	}

	const contacts = await MachineUser.find(
		{
			$or: [{ division: shortBu }, { division: 'Group Operations' }],
			active: true,
		},
		'email'
	)

	const foundUser = await MachineUser.findById(req.user._id)

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	const userAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})
	const shiftAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})

	res.render('machine/notifications', {
		machines,
		shortBu,
		businessUnit,
		notifications,
		contacts,
		userAccess,
		shiftAccess,

		//
		robots,
		lasers,
		plasmas,
	})
}

module.exports.newNotification = async (req, res) => {
	const { shortBu } = req.params

	// console.log('Request => ', req.body)
	// hours = req.body.time.split(':')[0]
	// mins = +req.body.mins

	const time = +req.body.mins * 60000

	const notification = new Notification(req.body)

	notification.shortBu = shortBu
	notification.time = time

	await notification.save()

	res.redirect(`/equipment-monitoring/notifications/${shortBu}`)
}

module.exports.createMachineContact = async (req, res) => {
	const { shortBu } = req.params

	const lastPart = req.body.email.slice(-8).toLowerCase()

	// console.log(lastPart)

	if (lastPart === '@jcb.com') {
		const contact = new MachineContact(req.body)

		contact.shortBu = shortBu
		await contact.save()

		res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
	} else {
		req.flash('error', 'Must be a JCB email')
		res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
	}

	// const contact = new MachineContact(req.body)
	// await contact.save()
}
module.exports.editMachineContact = async (req, res) => {
	const { id, shortBu } = req.params

	const lastPart = req.body.email.slice(-8).toLowerCase()
	const numberLength = req.body.mobile.length

	if (lastPart === '@jcb.com' && numberLength === 11) {
		const updatedContact = await MachineContact.findByIdAndUpdate(
			id,
			{
				name: req.body.name,
				email: req.body.email,
				mobile: req.body.mobile,
			},
			{ new: true }
		)

		// contact.shortBu = shortBu
		// await contact.save()

		res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
	} else {
		req.flash('error', 'Must be a JCB email')
		res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
	}

	// const contact = new MachineContact(req.body)
	// await contact.save()
}

module.exports.deleteMachineContact = async (req, res) => {
	const { id, shortBu } = req.params

	const updatedContact = await MachineContact.findByIdAndUpdate(
		id,
		{
			active: false,
		},
		{ new: true }
	)

	// console.log(updatedContact)

	res.redirect(`/equipment-monitoring/contacts/${shortBu}`)
}

module.exports.editNotification = async (req, res) => {
	const { id, shortBu } = req.params

	// console.log('Request => ', req.body)

	const time = +req.body.mins * 60000

	// const updatedNotification = await Notification.findByIdAndUpdate(
	// 	id,
	// 	{
	// 		name   : req.body.name,
	// 		email  : req.body.email,
	// 		mobile : req.body.mobile,
	// 		time   : time,
	// 	},
	// 	{ new: true },
	// )

	// console.log('Updated => ', updatedNotification)

	res.redirect(`/equipment-monitoring/notifications/${shortBu}`)
}
module.exports.deleteNotification = async (req, res) => {
	const { id, shortBu } = req.params

	const updatedNotification = await Notification.findByIdAndUpdate(
		id,
		{
			active: false,
		},
		{ new: true }
	)

	// console.log('Updated => ', updatedNotification)

	res.redirect(`/equipment-monitoring/notifications/${shortBu}`)
}

module.exports.downloadStopStart = async (req, res) => {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	const { id } = req.params
	// console.log(req.body)

	try {
		if (!req.body.startDate || !req.body.startTime || !req.body.endDate || !req.body.endTime) {
			req.flash('error', 'Something went wrong')
			res.redirect(`/equipment-monitoring/machine/${id}`)
			return
		}

		const newStart = new Date(`${req.body.startDate},${req.body.startTime}`)
		const newEnd = new Date(`${req.body.endDate},${req.body.endTime}`)

		var time = moment.duration('01:00:00')
		var date = moment(newStart)
		date.subtract(time)
		var date1 = moment(newEnd)
		date1.subtract(time)

		const adjustedStartDate = moment(date).format('YYYY-MM-DD')
		const adjustedStartTime = moment(date).format('HH:mm')
		const adjustedEndDate = moment(date1).format('YYYY-MM-DD')
		const adjustedEndTime = moment(date1).format('HH:mm')
		// newStart.setHours(newStart.getHours() - 1)
		// newEnd.setHours(newEnd.getHours() - 1)
		// console.log(newStart)

		// console.log('START => ', newStart)
		// console.log('END => ', newEnd)

		const timeDiff = newEnd - newStart

		// if (timeDiff > 172800000) {
		if (timeDiff > 604800000) {
			req.flash('error', 'Time range is more than 48 hours!')
			res.redirect(`/equipment-monitoring/machine/${id}`)
			return
		}
		if (newStart > newEnd) {
			req.flash('error', 'Start time is after end time!')
			res.redirect(`/equipment-monitoring/machine/${id}`)
			return
		}

		const machine = await Machine.findById(id).lean()

		if (!machine) {
			req.flash('error', 'Something went wrong')
			res.redirect(`/equipment-monitoring/machine/${id}`)
			return
		}
		function secondsToHms(d) {
			d = Number(d)
			let h = Math.floor(d / 3600)
			let m = Math.floor((d % 3600) / 60)
			let s = Math.floor((d % 3600) % 60)

			let hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
			let mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
			let sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
			return hDisplay + mDisplay + sDisplay
		}

		const headers = { 'x-api-key': process.env.MACHINE_API }
		const vin = machine.vin
		let runTime = [{ state: 'Running Time' }]
		let arkTime = [{ state: 'Touch Time' }]

		const response = await axios(
			`https://e0ssp9czi7.execute-api.eu-west-1.amazonaws.com/prod/v1/data/${vin}?from=${adjustedStartDate}T${adjustedStartTime}:00Z&to=${adjustedEndDate}T${adjustedEndTime}:00Z`,
			{ headers }
		)
		if (response && response.data && response.data[0].inputChannel0Value) {
			if (response.data[0].inputChannel0Value.length > 0) {
				runTime.push(response.data[0].inputChannel0Value.flat())
			}
			runTime.push({
				state: `Total Running Time -  ${secondsToHms(response.data[0].inputChannel0Value_duration)}`,
			})
		}
		if (response && response.data && response.data[0].inputChannel1Value) {
			if (response.data[0].inputChannel1Value.length > 0) {
				arkTime.push(response.data[0].inputChannel1Value.flat())
			}
		}

		const allTimes = [...runTime.flat(), ...arkTime.flat()]

		for (let x of allTimes) {
			if (x.state === '1') {
				x.state = 'On'
			}
			if (x.state === '0') {
				x.state = 'Off'
			}
			if (x.time) {
				x.time = new Date(x.time)
				x.time.setHours(x.time.getHours() + 1)
				// x.time.setHours(x.time.getHours() + 1)
				x.time = new Date(x.time).toLocaleString('en-GB', {
					timeZone: 'Europe/London',
				})
				// x.time.setHours(x.time.getHours() + 1)
				// x.time =
				// 	x.time.substring(8, 10) +
				// 	'-' +
				// 	x.time.substring(5, 7) +
				// 	'-' +
				// 	x.time.substring(0, 4) +
				// 	' - ' +
				// 	x.time.substring(11, 19) //.replace(/T/, ' - ')
			}
		}

		// start here

		// end here

		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(allTimes)

		fs.writeFile(`${machine.machineName}_start_stop.csv`, csv, async function (err) {
			if (err) console.log(err.message)
			console.log('file saved')
			await res.download(`./${machine.machineName}_start_stop.csv`, () => {
				fs.unlinkSync(`./${machine.machineName}_start_stop.csv`)
				// console.log('Here')
			})
		})
	} catch (error) {
		console.log(error)
		req.flash('error', 'Something went wrong')
		res.redirect(`/equipment-monitoring/machine/${id}`)
		return
	}

	// res.redirect(`/equipment-monitoring/machine/${id}`)
}

// module.exports.weeklyReport = async (req, res) => {
// 	//return the first monday of any week by the week number this year
// 	const getFirstMondayOfWeek = (weekNo) => {
// 		const thisWeek = moment().isoWeek()

// 		if (weekNo > thisWeek) {
// 			firstMonday = new Date(new Date().getFullYear() - 1, 0, 4, 0, 0, 0, 0)
// 		} else {
// 			firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)
// 		}

// 		// let firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)

// 		while (firstMonday.getDay() != 1) {
// 			firstMonday.setDate(firstMonday.getDate() - 1)
// 		}
// 		if (1 <= weekNo && weekNo <= 52) return firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))

// 		firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))
// 		if ((weekNo = 53 && firstMonday.getDate() >= 22 && firstMonday.getDate() <= 28)) return firstMonday
// 		return null
// 	}

// 	const startOfDec21 = new Date('2021, 12, 01')

// 	const thisWeekIso = moment().subtract(0, 'weeks').isoWeek()
// 	const mondayThisWeek = new Date(getFirstMondayOfWeek(thisWeekIso))
// 	const thisWeekMonthYear = moment(mondayThisWeek).format('DD-MMM')
// 	const monday8WeeksAgoMoment = moment(mondayThisWeek).subtract(8, 'weeks')
// 	const monday8WeeksAgo = new Date(monday8WeeksAgoMoment)

// 	const lastWeekEndFull = moment(mondayThisWeek).subtract(1, 'days').format('DD/MM/YYYY')
// 	const lastWeekstartFull = moment(mondayThisWeek).subtract(7, 'days').format('DD/MM/YYYY')

// 	const dateRange = `${lastWeekstartFull} -  ${lastWeekEndFull}`

// 	const thisWeekFormatted = moment(mondayThisWeek).format('DD-MMM')
// 	const lastWeekFormatted = moment(mondayThisWeek).subtract(1, 'weeks').format('DD-MMM')
// 	const twoWeeksAgoFormatted = moment(mondayThisWeek).subtract(2, 'weeks').format('DD-MMM')
// 	const threeWeeksAgoFormatted = moment(mondayThisWeek).subtract(3, 'weeks').format('DD-MMM')
// 	const fourWeeksAgoFormatted = moment(mondayThisWeek).subtract(4, 'weeks').format('DD-MMM')
// 	const fiveWeeksAgoFormatted = moment(mondayThisWeek).subtract(5, 'weeks').format('DD-MMM')
// 	const sixWeeksAgoFormatted = moment(mondayThisWeek).subtract(6, 'weeks').format('DD-MMM')
// 	const sevenWeeksAgoFormatted = moment(mondayThisWeek).subtract(7, 'weeks').format('DD-MMM')
// 	const eightWeeksAgoFormatted = moment(mondayThisWeek).subtract(8, 'weeks').format('DD-MMM')
// 	const nineWeeksAgoFormatted = moment(mondayThisWeek).subtract(9, 'weeks').format('DD-MMM')

// 	const lastWeekIso = moment().subtract(1, 'weeks').isoWeek()
// 	const lastWeekYear = moment(mondayThisWeek).subtract(1, 'weeks').format('YYYY')
// 	const lastWeekMonthYear = moment(mondayThisWeek).subtract(1, 'weeks').format('DD-MMM')

// 	const twoWeeksAgoIso = moment().subtract(2, 'weeks').isoWeek()
// 	const twoWeeksAgoYear = moment(mondayThisWeek).subtract(2, 'weeks').format('YYYY')
// 	const twoWeeksAgoMonthYear = moment(mondayThisWeek).subtract(2, 'weeks').format('DD-MMM')

// 	const threeWeeksAgoIso = moment().subtract(3, 'weeks').isoWeek()
// 	const threeWeeksAgoYear = moment(mondayThisWeek).subtract(3, 'weeks').format('YYYY')
// 	const threeWeeksAgoMonthYear = moment(mondayThisWeek).subtract(3, 'weeks').format('DD-MMM')

// 	const fourWeeksAgoIso = moment().subtract(4, 'weeks').isoWeek()
// 	const fourWeeksAgoYear = moment(mondayThisWeek).subtract(4, 'weeks').format('YYYY')
// 	const fourWeeksAgoMonthYear = moment(mondayThisWeek).subtract(4, 'weeks').format('DD-MMM')

// 	const fiveWeeksAgoIso = moment().subtract(5, 'weeks').isoWeek()
// 	const fiveWeeksAgoYear = moment(mondayThisWeek).subtract(5, 'weeks').format('YYYY')
// 	const fiveWeeksAgoMonthYear = moment(mondayThisWeek).subtract(5, 'weeks').format('DD-MMM')

// 	const sixWeeksAgoIso = moment().subtract(6, 'weeks').isoWeek()
// 	const sixWeeksAgoYear = moment(mondayThisWeek).subtract(6, 'weeks').format('YYYY')
// 	const sixWeeksAgoMonthYear = moment(mondayThisWeek).subtract(6, 'weeks').format('DD-MMM')

// 	const sevenWeeksAgoIso = moment().subtract(7, 'weeks').isoWeek()
// 	const sevenWeeksAgoYear = moment(mondayThisWeek).subtract(7, 'weeks').format('YYYY')
// 	const sevenWeeksAgoMonthYear = moment(mondayThisWeek).subtract(7, 'weeks').format('DD-MMM')

// 	const eightWeeksAgoIso = moment().subtract(8, 'weeks').isoWeek()
// 	const eightWeeksAgoYear = moment(mondayThisWeek).subtract(8, 'weeks').format('YYYY')
// 	const eightWeeksAgoMonthYear = moment(mondayThisWeek).subtract(9, 'weeks').format('DD-MMM')

// 	const nineWeeksAgoIso = moment().subtract(9, 'weeks').isoWeek()
// 	const tenWeeksAgoIso = moment().subtract(10, 'weeks').isoWeek()
// 	const elevenWeeksAgoIso = moment().subtract(11, 'weeks').isoWeek()
// 	const twelveWeeksAgoIso = moment().subtract(12, 'weeks').isoWeek()
// 	const elevenWeeksAgoDB = new Date(moment(mondayThisWeek).subtract(11, 'weeks'))

// 	// const divisions = [ 'LDL', 'BHL', 'EM', 'CP', 'HP', 'CABS' ]
// 	const divisions = ['LDL', 'BHL', 'EM', 'CP', 'HP', 'CABS']
// 	const plasmaDivisions = ['LDL', 'BHL', 'HP']

// 	let overallRunningArr = []
// 	let prevWeekOverallTotalsArr = []
// 	let robotRunningArr = []
// 	let justPrevWeekRobotTotalsArr = []
// 	let laserRunningArr = []
// 	let justPrevWeekLaserTotalsArr = []
// 	let plasmaRunningArr = []
// 	let justPrevWeekPlasmaTotalsArr = []
// 	let effArr = []
// 	let cutIn = new Date('2022, 12, 01')
// 	const types = ['Laser Cutter', 'Welding Robot', 'Plasma Cutter']

// 	let lastWeekOpsAvv = 0
// 	let lastWeekOpsRun = 0
// 	let lastWeekOpsEff = 0

// 	let lastWeekRobotsAvv = 0
// 	let lastWeekRobotsRun = 0
// 	let lastWeekRobotsEff = 0

// 	let lastWeekLasersAvv = 0
// 	let lastWeekLasersRun = 0
// 	let lastWeekLasersEff = 0

// 	let lastWeekPlasmasAvv = 0
// 	let lastWeekPlasmasRun = 0
// 	let lastWeekPlasmasEff = 0

// 	//overall
// 	for (let d of divisions) {
// 		let avDec = 0
// 		let runDec = 0
// 		let percentDec = 0
// 		let avWeek1 = 0
// 		let runWeek1 = 0
// 		let percentWeek1 = 0
// 		let avWeek2 = 0
// 		let runWeek2 = 0
// 		let percentWeek2 = 0
// 		let avWeek3 = 0
// 		let runWeek3 = 0
// 		let percentWeek3 = 0
// 		let avWeek4 = 0
// 		let runWeek4 = 0
// 		let percentWeek4 = 0
// 		let avWeek5 = 0
// 		let runWeek5 = 0
// 		let percentWeek5 = 0
// 		let avWeek6 = 0
// 		let runWeek6 = 0
// 		let percentWeek6 = 0
// 		let avWeek7 = 0
// 		let runWeek7 = 0
// 		let percentWeek7 = 0
// 		let avWeek8 = 0
// 		let runWeek8 = 0
// 		let percentWeek8 = 0
// 		let avWeek9 = 0
// 		let runWeek9 = 0
// 		let percentWeek9 = 0

// 		let justPrevWeekAvv = 0
// 		let prevWeekRun = 0
// 		let prevWeekPercent = 0

// 		const name = d

// 		const shifts = await Update.aggregate([
// 			{
// 				$match: {
// 					shiftStart: { $gte: startOfDec21 },
// 					eff: { $exists: true, $gt: -1 },
// 					// type       : 'Welding Robot',
// 					shortBu: d,
// 					type: { $in: types },
// 					// createdAt : { $gt: start },
// 				},
// 			},
// 			{
// 				$project: {
// 					_id: 0,
// 					eff: 1,
// 					shiftStart: 1,
// 					type: 1,
// 					shiftEnd: 1,
// 					availableMins: 1,
// 					runningMins: 1,
// 					week: {
// 						$isoWeek: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					month: {
// 						$month: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					year: {
// 						$year: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 				},
// 			},
// 			//get available ms
// 			{
// 				$addFields: {
// 					totalTime: {
// 						$subtract: ['$shiftEnd', '$shiftStart'],
// 					},
// 				},
// 			},
// 			//get available mins
// 			{
// 				$addFields: {
// 					avMinutes: {
// 						//$floor : {
// 						$divide: ['$totalTime', 60000],
// 						//},
// 					},
// 				},
// 			},
// 			//get running mins
// 			{
// 				$addFields: {
// 					running_Mins: {
// 						$multiply: [
// 							{
// 								$divide: ['$avMinutes', 100],
// 							},
// 							'$eff',
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$project: {
// 					eff: 1,
// 					type: 1,
// 					week: 1,
// 					month: 1,
// 					year: 1,
// 					avMinutes: {
// 						$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
// 					},
// 					running__Mins: {
// 						$cond: [{ $not: ['$runningMins'] }, '$running_Mins', '$runningMins'],
// 					},
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: {
// 						year: '$year',
// 						week: '$week',
// 						type: '$type',
// 					},
// 					sum_of_avv_mins: {
// 						$sum: '$avMinutes',
// 					},
// 					sum_of_running_mins: {
// 						$sum: '$running__Mins',
// 					},

// 					// count           : { $sum: 1 },
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageMEff: {
// 						$cond: [
// 							{ $gt: ['$sum_of_running_mins', 0] },

// 							{
// 								$multiply: [
// 									{
// 										$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
// 									},
// 									100,
// 								],
// 							},
// 							0,
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageEff: {
// 						$round: ['$averageMEff', 0],
// 					},
// 				},
// 			},
// 		]).sort({
// 			_id: 1,
// 		})

// 		// console.log(shifts)

// 		for (let s of shifts) {
// 			if (s._id.year === 2021) {
// 				avDec += s.sum_of_avv_mins
// 				runDec += s.sum_of_running_mins
// 			}
// 			if (s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso || s._id.week === twelveWeeksAgoIso) {
// 				avWeek1 += s.sum_of_avv_mins
// 				runWeek1 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso) {
// 				avWeek2 += s.sum_of_avv_mins
// 				runWeek2 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso) {
// 				avWeek3 += s.sum_of_avv_mins
// 				runWeek3 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso) {
// 				avWeek4 += s.sum_of_avv_mins
// 				runWeek4 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso) {
// 				avWeek5 += s.sum_of_avv_mins
// 				runWeek5 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso) {
// 				avWeek6 += s.sum_of_avv_mins
// 				runWeek6 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso) {
// 				avWeek7 += s.sum_of_avv_mins
// 				runWeek7 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso) {
// 				avWeek8 += s.sum_of_avv_mins
// 				runWeek8 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === lastWeekIso || s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso) {
// 				avWeek9 += s.sum_of_avv_mins
// 				runWeek9 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === lastWeekIso) {
// 				lastWeekOpsAvv += s.sum_of_avv_mins
// 				lastWeekOpsRun += s.sum_of_running_mins
// 			}
// 		}
// 		percentDec = ((runDec / avDec) * 100).toFixed(1)
// 		percentWeek1 = ((runWeek1 / avWeek1) * 100).toFixed(1)
// 		percentWeek2 = ((runWeek2 / avWeek2) * 100).toFixed(1)
// 		percentWeek3 = ((runWeek3 / avWeek3) * 100).toFixed(1)
// 		percentWeek4 = ((runWeek4 / avWeek4) * 100).toFixed(1)
// 		percentWeek5 = ((runWeek5 / avWeek5) * 100).toFixed(1)
// 		percentWeek6 = ((runWeek6 / avWeek6) * 100).toFixed(1)
// 		percentWeek7 = ((runWeek7 / avWeek7) * 100).toFixed(1)
// 		percentWeek8 = ((runWeek8 / avWeek8) * 100).toFixed(1)
// 		percentWeek9 = ((runWeek9 / avWeek9) * 100).toFixed(1)
// 		lastWeekOpsEff = ((lastWeekOpsRun / lastWeekOpsAvv) * 100).toFixed(1)

// 		overallRunningArr.push({
// 			name,
// 			percentDec,
// 			percentWeek1,
// 			percentWeek2,
// 			percentWeek3,
// 			percentWeek4,
// 			percentWeek5,
// 			percentWeek6,
// 			percentWeek7,
// 			percentWeek8,
// 			percentWeek9,
// 		})
// 	}

// 	// robots
// 	for (let d of divisions) {
// 		let avDec = 0
// 		let runDec = 0
// 		let percentDec = 0
// 		let avWeek1 = 0
// 		let runWeek1 = 0
// 		let percentWeek1 = 0
// 		let avWeek2 = 0
// 		let runWeek2 = 0
// 		let percentWeek2 = 0
// 		let avWeek3 = 0
// 		let runWeek3 = 0
// 		let percentWeek3 = 0
// 		let avWeek4 = 0
// 		let runWeek4 = 0
// 		let percentWeek4 = 0
// 		let avWeek5 = 0
// 		let runWeek5 = 0
// 		let percentWeek5 = 0
// 		let avWeek6 = 0
// 		let runWeek6 = 0
// 		let percentWeek6 = 0
// 		let avWeek7 = 0
// 		let runWeek7 = 0
// 		let percentWeek7 = 0
// 		let avWeek8 = 0
// 		let runWeek8 = 0
// 		let percentWeek8 = 0
// 		let avWeek9 = 0
// 		let runWeek9 = 0
// 		let percentWeek9 = 0

// 		let justPrevWeekAvv = 0
// 		let justPrevWeekRun = 0
// 		let justPrevWeekPercent = 0

// 		const name = d

// 		const robotShifts = await Update.aggregate([
// 			{
// 				$match: {
// 					shiftStart: { $gte: startOfDec21 },
// 					eff: { $exists: true, $gt: -1 },
// 					type: 'Welding Robot',
// 					shortBu: d,
// 					// type       : { $in: types },
// 					// createdAt : { $gt: start },
// 				},
// 			},
// 			{
// 				$project: {
// 					_id: 0,
// 					eff: 1,
// 					shiftStart: 1,
// 					type: 1,
// 					shiftEnd: 1,
// 					availableMins: 1,
// 					runningMins: 1,
// 					week: {
// 						$isoWeek: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					month: {
// 						$month: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					year: {
// 						$year: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 				},
// 			},
// 			//get available ms
// 			{
// 				$addFields: {
// 					totalTime: {
// 						$subtract: ['$shiftEnd', '$shiftStart'],
// 					},
// 				},
// 			},
// 			//get available mins
// 			{
// 				$addFields: {
// 					avMinutes: {
// 						//$floor : {
// 						$divide: ['$totalTime', 60000],
// 						//},
// 					},
// 				},
// 			},
// 			//get running mins
// 			{
// 				$addFields: {
// 					running_Mins: {
// 						$multiply: [
// 							{
// 								$divide: ['$avMinutes', 100],
// 							},
// 							'$eff',
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$project: {
// 					eff: 1,
// 					type: 1,
// 					week: 1,
// 					month: 1,
// 					year: 1,
// 					avMinutes: {
// 						$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
// 					},
// 					running__Mins: {
// 						$cond: [{ $not: ['$runningMins'] }, '$running_Mins', '$runningMins'],
// 					},
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: {
// 						year: '$year',
// 						week: '$week',
// 						type: '$type',
// 					},
// 					sum_of_avv_mins: {
// 						$sum: '$avMinutes',
// 					},
// 					sum_of_running_mins: {
// 						$sum: '$running__Mins',
// 					},

// 					// count           : { $sum: 1 },
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageMEff: {
// 						$cond: [
// 							{ $gt: ['$sum_of_running_mins', 0] },

// 							{
// 								$multiply: [
// 									{
// 										$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
// 									},
// 									100,
// 								],
// 							},
// 							0,
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageEff: {
// 						$round: ['$averageMEff', 0],
// 					},
// 				},
// 			},
// 		]).sort({
// 			_id: 1,
// 		})

// 		// console.log(shifts)

// 		for (let s of robotShifts) {
// 			if (s._id.year === 2021) {
// 				avDec += s.sum_of_avv_mins
// 				runDec += s.sum_of_running_mins
// 			}
// 			if (s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso || s._id.week === twelveWeeksAgoIso) {
// 				avWeek1 += s.sum_of_avv_mins
// 				runWeek1 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso) {
// 				avWeek2 += s.sum_of_avv_mins
// 				runWeek2 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso) {
// 				avWeek3 += s.sum_of_avv_mins
// 				runWeek3 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso) {
// 				avWeek4 += s.sum_of_avv_mins
// 				runWeek4 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso) {
// 				avWeek5 += s.sum_of_avv_mins
// 				runWeek5 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso) {
// 				avWeek6 += s.sum_of_avv_mins
// 				runWeek6 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso) {
// 				avWeek7 += s.sum_of_avv_mins
// 				runWeek7 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso) {
// 				avWeek8 += s.sum_of_avv_mins
// 				runWeek8 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === lastWeekIso || s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso) {
// 				avWeek9 += s.sum_of_avv_mins
// 				runWeek9 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === lastWeekIso) {
// 				justPrevWeekAvv += s.sum_of_avv_mins
// 				justPrevWeekRun += s.sum_of_running_mins
// 				lastWeekRobotsAvv += s.sum_of_avv_mins
// 				lastWeekRobotsRun += s.sum_of_running_mins
// 			}
// 		}
// 		percentDec = ((runDec / avDec) * 100).toFixed(1)
// 		percentWeek1 = ((runWeek1 / avWeek1) * 100).toFixed(1)
// 		percentWeek2 = ((runWeek2 / avWeek2) * 100).toFixed(1)
// 		percentWeek3 = ((runWeek3 / avWeek3) * 100).toFixed(1)
// 		percentWeek4 = ((runWeek4 / avWeek4) * 100).toFixed(1)
// 		percentWeek5 = ((runWeek5 / avWeek5) * 100).toFixed(1)
// 		percentWeek6 = ((runWeek6 / avWeek6) * 100).toFixed(1)
// 		percentWeek7 = ((runWeek7 / avWeek7) * 100).toFixed(1)
// 		percentWeek8 = ((runWeek8 / avWeek8) * 100).toFixed(1)
// 		percentWeek9 = ((runWeek9 / avWeek9) * 100).toFixed(1)

// 		justPrevWeekRobotsPercent = ((justPrevWeekRun / justPrevWeekAvv) * 100).toFixed(1)

// 		justPrevWeekRobotTotalsArr.push(justPrevWeekRobotsPercent)

// 		robotRunningArr.push({
// 			name,
// 			percentDec,
// 			percentWeek1,
// 			percentWeek2,
// 			percentWeek3,
// 			percentWeek4,
// 			percentWeek5,
// 			percentWeek6,
// 			percentWeek7,
// 			percentWeek8,
// 			percentWeek9,
// 		})
// 	}

// 	//lasers
// 	for (let d of divisions) {
// 		let avDec = 0
// 		let runDec = 0
// 		let percentDec = 0
// 		let avWeek1 = 0
// 		let runWeek1 = 0
// 		let percentWeek1 = 0
// 		let avWeek2 = 0
// 		let runWeek2 = 0
// 		let percentWeek2 = 0
// 		let avWeek3 = 0
// 		let runWeek3 = 0
// 		let percentWeek3 = 0
// 		let avWeek4 = 0
// 		let runWeek4 = 0
// 		let percentWeek4 = 0
// 		let avWeek5 = 0
// 		let runWeek5 = 0
// 		let percentWeek5 = 0
// 		let avWeek6 = 0
// 		let runWeek6 = 0
// 		let percentWeek6 = 0
// 		let avWeek7 = 0
// 		let runWeek7 = 0
// 		let percentWeek7 = 0
// 		let avWeek8 = 0
// 		let runWeek8 = 0
// 		let percentWeek8 = 0
// 		let avWeek9 = 0
// 		let runWeek9 = 0
// 		let percentWeek9 = 0

// 		let justPrevWeekAvv = 0
// 		let justPrevWeekRun = 0
// 		let justPrevWeekPercent = 0

// 		const name = d

// 		const laserShifts = await Update.aggregate([
// 			{
// 				$match: {
// 					shiftStart: { $gte: startOfDec21 },
// 					eff: { $exists: true, $gt: -1 },
// 					type: 'Laser Cutter',
// 					shortBu: d,
// 					// type       : { $in: types },
// 					// createdAt : { $gt: start },
// 				},
// 			},
// 			{
// 				$project: {
// 					_id: 0,
// 					eff: 1,
// 					shiftStart: 1,
// 					type: 1,
// 					shiftEnd: 1,
// 					availableMins: 1,
// 					runningMins: 1,
// 					week: {
// 						$isoWeek: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					month: {
// 						$month: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					year: {
// 						$year: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 				},
// 			},
// 			//get available ms
// 			{
// 				$addFields: {
// 					totalTime: {
// 						$subtract: ['$shiftEnd', '$shiftStart'],
// 					},
// 				},
// 			},
// 			//get available mins
// 			{
// 				$addFields: {
// 					avMinutes: {
// 						//$floor : {
// 						$divide: ['$totalTime', 60000],
// 						//},
// 					},
// 				},
// 			},
// 			//get running mins
// 			{
// 				$addFields: {
// 					running_Mins: {
// 						$multiply: [
// 							{
// 								$divide: ['$avMinutes', 100],
// 							},
// 							'$eff',
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$project: {
// 					eff: 1,
// 					type: 1,
// 					week: 1,
// 					month: 1,
// 					year: 1,
// 					avMinutes: {
// 						$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
// 					},
// 					running__Mins: {
// 						$cond: [{ $not: ['$runningMins'] }, '$running_Mins', '$runningMins'],
// 					},
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: {
// 						year: '$year',
// 						week: '$week',
// 						type: '$type',
// 					},
// 					sum_of_avv_mins: {
// 						$sum: '$avMinutes',
// 					},
// 					sum_of_running_mins: {
// 						$sum: '$running__Mins',
// 					},

// 					// count           : { $sum: 1 },
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageMEff: {
// 						$cond: [
// 							{ $gt: ['$sum_of_running_mins', 0] },

// 							{
// 								$multiply: [
// 									{
// 										$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
// 									},
// 									100,
// 								],
// 							},
// 							0,
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageEff: {
// 						$round: ['$averageMEff', 0],
// 					},
// 				},
// 			},
// 		]).sort({
// 			_id: 1,
// 		})

// 		// console.log(shifts)

// 		for (let s of laserShifts) {
// 			if (s._id.year === 2021) {
// 				avDec += s.sum_of_avv_mins
// 				runDec += s.sum_of_running_mins
// 			}
// 			if (s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso || s._id.week === twelveWeeksAgoIso) {
// 				avWeek1 += s.sum_of_avv_mins
// 				runWeek1 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso) {
// 				avWeek2 += s.sum_of_avv_mins
// 				runWeek2 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso) {
// 				avWeek3 += s.sum_of_avv_mins
// 				runWeek3 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso) {
// 				avWeek4 += s.sum_of_avv_mins
// 				runWeek4 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso) {
// 				avWeek5 += s.sum_of_avv_mins
// 				runWeek5 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso) {
// 				avWeek6 += s.sum_of_avv_mins
// 				runWeek6 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso) {
// 				avWeek7 += s.sum_of_avv_mins
// 				runWeek7 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso) {
// 				avWeek8 += s.sum_of_avv_mins
// 				runWeek8 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === lastWeekIso || s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso) {
// 				avWeek9 += s.sum_of_avv_mins
// 				runWeek9 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === lastWeekIso) {
// 				justPrevWeekAvv += s.sum_of_avv_mins
// 				justPrevWeekRun += s.sum_of_running_mins
// 				lastWeekLasersAvv += s.sum_of_avv_mins
// 				lastWeekLasersRun += s.sum_of_running_mins
// 			}
// 		}
// 		percentDec = ((runDec / avDec) * 100).toFixed(1)
// 		percentWeek1 = ((runWeek1 / avWeek1) * 100).toFixed(1)
// 		percentWeek2 = ((runWeek2 / avWeek2) * 100).toFixed(1)
// 		percentWeek3 = ((runWeek3 / avWeek3) * 100).toFixed(1)
// 		percentWeek4 = ((runWeek4 / avWeek4) * 100).toFixed(1)
// 		percentWeek5 = ((runWeek5 / avWeek5) * 100).toFixed(1)
// 		percentWeek6 = ((runWeek6 / avWeek6) * 100).toFixed(1)
// 		percentWeek7 = ((runWeek7 / avWeek7) * 100).toFixed(1)
// 		percentWeek8 = ((runWeek8 / avWeek8) * 100).toFixed(1)
// 		percentWeek9 = ((runWeek9 / avWeek9) * 100).toFixed(1)

// 		justPrevWeekLasersPercent = ((justPrevWeekRun / justPrevWeekAvv) * 100).toFixed(1)

// 		justPrevWeekLaserTotalsArr.push(justPrevWeekLasersPercent)

// 		laserRunningArr.push({
// 			name,
// 			percentDec,
// 			percentWeek1,
// 			percentWeek2,
// 			percentWeek3,
// 			percentWeek4,
// 			percentWeek5,
// 			percentWeek6,
// 			percentWeek7,
// 			percentWeek8,
// 			percentWeek9,
// 		})
// 	}

// 	//plasmas
// 	for (let d of plasmaDivisions) {
// 		let avDec = 0
// 		let runDec = 0
// 		let percentDec = 0
// 		let avWeek1 = 0
// 		let runWeek1 = 0
// 		let percentWeek1 = 0
// 		let avWeek2 = 0
// 		let runWeek2 = 0
// 		let percentWeek2 = 0
// 		let avWeek3 = 0
// 		let runWeek3 = 0
// 		let percentWeek3 = 0
// 		let avWeek4 = 0
// 		let runWeek4 = 0
// 		let percentWeek4 = 0
// 		let avWeek5 = 0
// 		let runWeek5 = 0
// 		let percentWeek5 = 0
// 		let avWeek6 = 0
// 		let runWeek6 = 0
// 		let percentWeek6 = 0
// 		let avWeek7 = 0
// 		let runWeek7 = 0
// 		let percentWeek7 = 0
// 		let avWeek8 = 0
// 		let runWeek8 = 0
// 		let percentWeek8 = 0
// 		let avWeek9 = 0
// 		let runWeek9 = 0
// 		let percentWeek9 = 0

// 		let justPrevWeekAvv = 0
// 		let justPrevWeekRun = 0
// 		let justPrevWeekPercent = 0

// 		const name = d

// 		const plasmaShifts = await Update.aggregate([
// 			{
// 				$match: {
// 					shiftStart: { $gte: startOfDec21 },
// 					eff: { $exists: true, $gt: -1 },
// 					type: 'Plasma Cutter',
// 					shortBu: d,
// 					// type       : { $in: types },
// 					// createdAt : { $gt: start },
// 				},
// 			},
// 			{
// 				$project: {
// 					_id: 0,
// 					eff: 1,
// 					shiftStart: 1,
// 					type: 1,
// 					shiftEnd: 1,
// 					availableMins: 1,
// 					runningMins: 1,
// 					week: {
// 						$isoWeek: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					month: {
// 						$month: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					year: {
// 						$year: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 				},
// 			},
// 			//get available ms
// 			{
// 				$addFields: {
// 					totalTime: {
// 						$subtract: ['$shiftEnd', '$shiftStart'],
// 					},
// 				},
// 			},
// 			//get available mins
// 			{
// 				$addFields: {
// 					avMinutes: {
// 						//$floor : {
// 						$divide: ['$totalTime', 60000],
// 						//},
// 					},
// 				},
// 			},
// 			//get running mins
// 			{
// 				$addFields: {
// 					running_Mins: {
// 						$multiply: [
// 							{
// 								$divide: ['$avMinutes', 100],
// 							},
// 							'$eff',
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$project: {
// 					eff: 1,
// 					type: 1,
// 					week: 1,
// 					month: 1,
// 					year: 1,
// 					avMinutes: {
// 						$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
// 					},
// 					running__Mins: {
// 						$cond: [{ $not: ['$runningMins'] }, '$running_Mins', '$runningMins'],
// 					},
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: {
// 						year: '$year',
// 						week: '$week',
// 						type: '$type',
// 					},
// 					sum_of_avv_mins: {
// 						$sum: '$avMinutes',
// 					},
// 					sum_of_running_mins: {
// 						$sum: '$running__Mins',
// 					},

// 					// count           : { $sum: 1 },
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageMEff: {
// 						$cond: [
// 							{ $gt: ['$sum_of_running_mins', 0] },

// 							{
// 								$multiply: [
// 									{
// 										$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
// 									},
// 									100,
// 								],
// 							},
// 							0,
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageEff: {
// 						$round: ['$averageMEff', 0],
// 					},
// 				},
// 			},
// 		]).sort({
// 			_id: 1,
// 		})

// 		// console.log(shifts)

// 		for (let s of plasmaShifts) {
// 			if (s._id.year === 2021) {
// 				avDec += s.sum_of_avv_mins
// 				runDec += s.sum_of_running_mins
// 			}
// 			if (s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso || s._id.week === twelveWeeksAgoIso) {
// 				avWeek1 += s.sum_of_avv_mins
// 				runWeek1 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso) {
// 				avWeek2 += s.sum_of_avv_mins
// 				runWeek2 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso) {
// 				avWeek3 += s.sum_of_avv_mins
// 				runWeek3 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso) {
// 				avWeek4 += s.sum_of_avv_mins
// 				runWeek4 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso) {
// 				avWeek5 += s.sum_of_avv_mins
// 				runWeek5 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso) {
// 				avWeek6 += s.sum_of_avv_mins
// 				runWeek6 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso) {
// 				avWeek7 += s.sum_of_avv_mins
// 				runWeek7 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso) {
// 				avWeek8 += s.sum_of_avv_mins
// 				runWeek8 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === lastWeekIso || s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso) {
// 				avWeek9 += s.sum_of_avv_mins
// 				runWeek9 += s.sum_of_running_mins
// 			}
// 			if (s._id.week === lastWeekIso) {
// 				justPrevWeekAvv += s.sum_of_avv_mins
// 				justPrevWeekRun += s.sum_of_running_mins
// 				lastWeekPlasmasAvv += s.sum_of_avv_mins
// 				lastWeekPlasmasRun += s.sum_of_running_mins
// 			}
// 		}
// 		percentDec = ((runDec / avDec) * 100).toFixed(1)
// 		percentWeek1 = ((runWeek1 / avWeek1) * 100).toFixed(1)
// 		percentWeek2 = ((runWeek2 / avWeek2) * 100).toFixed(1)
// 		percentWeek3 = ((runWeek3 / avWeek3) * 100).toFixed(1)
// 		percentWeek4 = ((runWeek4 / avWeek4) * 100).toFixed(1)
// 		percentWeek5 = ((runWeek5 / avWeek5) * 100).toFixed(1)
// 		percentWeek6 = ((runWeek6 / avWeek6) * 100).toFixed(1)
// 		percentWeek7 = ((runWeek7 / avWeek7) * 100).toFixed(1)
// 		percentWeek8 = ((runWeek8 / avWeek8) * 100).toFixed(1)
// 		percentWeek9 = ((runWeek9 / avWeek9) * 100).toFixed(1)
// 		justPrevWeekPlasmasPercent = ((lastWeekPlasmasRun / lastWeekPlasmasAvv) * 100).toFixed(1)

// 		justPrevWeekPlasmaTotalsArr.push(justPrevWeekPlasmasPercent)

// 		plasmaRunningArr.push({
// 			name,
// 			percentDec,
// 			percentWeek1,
// 			percentWeek2,
// 			percentWeek3,
// 			percentWeek4,
// 			percentWeek5,
// 			percentWeek6,
// 			percentWeek7,
// 			percentWeek8,
// 			percentWeek9,
// 		})
// 	}

// 	//prog eff
// 	for (let d of divisions) {
// 		let avDec = 0
// 		let runDec = 0
// 		let percentDec = 0
// 		let avWeek1 = 0
// 		let runWeek1 = 0
// 		let percentWeek1 = 0
// 		let avWeek2 = 0
// 		let runWeek2 = 0
// 		let percentWeek2 = 0
// 		let avWeek3 = 0
// 		let runWeek3 = 0
// 		let percentWeek3 = 0
// 		let avWeek4 = 0
// 		let runWeek4 = 0
// 		let percentWeek4 = 0
// 		let avWeek5 = 0
// 		let runWeek5 = 0
// 		let percentWeek5 = 0
// 		let avWeek6 = 0
// 		let runWeek6 = 0
// 		let percentWeek6 = 0
// 		let avWeek7 = 0
// 		let runWeek7 = 0
// 		let percentWeek7 = 0
// 		let avWeek8 = 0
// 		let runWeek8 = 0
// 		let percentWeek8 = 0
// 		let avWeek9 = 0
// 		let runWeek9 = 0
// 		let percentWeek9 = 0

// 		let justPrevWeekAvv = 0
// 		let justPrevWeekRun = 0
// 		let justPrevWeekPercent = 0

// 		const name = d

// 		const effshifts = await Update.aggregate([
// 			{
// 				$match: {
// 					shiftStart: { $gte: startOfDec21 },
// 					eff: { $exists: true, $gt: -1 },
// 					type: 'Welding Robot',
// 					shortBu: d,
// 					// type       : { $in: types },
// 					// createdAt : { $gt: start },
// 				},
// 			},
// 			{
// 				$project: {
// 					_id: 0,
// 					eff: 1,
// 					teff: 1,
// 					shiftStart: 1,
// 					type: 1,
// 					shiftEnd: 1,
// 					availableMins: 1,
// 					runningMins: 1,
// 					week: {
// 						$isoWeek: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					month: {
// 						$month: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 					year: {
// 						$year: {
// 							date: '$shiftStart',
// 							timezone: 'Europe/London',
// 						},
// 					},
// 				},
// 			},
// 			//get available ms
// 			{
// 				$addFields: {
// 					totalTime: {
// 						$subtract: ['$shiftEnd', '$shiftStart'],
// 					},
// 				},
// 			},
// 			//get available mins
// 			{
// 				$addFields: {
// 					avMinutes: {
// 						//$floor : {
// 						$divide: ['$totalTime', 60000],
// 						//},
// 					},
// 				},
// 			},
// 			//get running mins
// 			{
// 				$addFields: {
// 					running_Mins: {
// 						$multiply: [
// 							{
// 								$divide: ['$avMinutes', 100],
// 							},
// 							'$eff',
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$project: {
// 					eff: 1,
// 					teff: 1,
// 					type: 1,
// 					week: 1,
// 					month: 1,
// 					year: 1,
// 					avMinutes: {
// 						$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
// 					},
// 					running__Mins: {
// 						$cond: [{ $not: ['$runningMins'] }, '$running_Mins', '$runningMins'],
// 					},
// 				},
// 			},
// 			//get running mins
// 			{
// 				$addFields: {
// 					touch_Mins: {
// 						$multiply: [
// 							{
// 								$divide: ['$avMinutes', 100],
// 							},
// 							'$teff',
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: {
// 						year: '$year',
// 						week: '$week',
// 						type: '$type',
// 					},
// 					sum_of_running_mins: {
// 						$sum: '$running__Mins',
// 					},
// 					sum_of_touch_mins: {
// 						$sum: '$touch_Mins',
// 					},

// 					// count           : { $sum: 1 },
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageMEff: {
// 						$cond: [
// 							{ $gt: ['$sum_of_touch_mins', 0] },

// 							{
// 								$multiply: [
// 									{
// 										$divide: ['$sum_of_touch_mins', '$running__Mins'],
// 									},
// 									100,
// 								],
// 							},
// 							0,
// 						],
// 					},
// 				},
// 			},
// 			{
// 				$addFields: {
// 					averageEff: {
// 						$round: ['$averageMEff', 0],
// 					},
// 				},
// 			},
// 		]).sort({
// 			_id: 1,
// 		})

// 		// console.log(shifts)

// 		for (let s of effshifts) {
// 			if (s._id.year === 2021) {
// 				avDec += s.sum_of_running_mins
// 				runDec += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso || s._id.week === twelveWeeksAgoIso) {
// 				avWeek1 += s.sum_of_running_mins
// 				runWeek1 += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso || s._id.week === elevenWeeksAgoIso) {
// 				avWeek2 += s.sum_of_running_mins
// 				runWeek2 += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso || s._id.week === tenWeeksAgoIso) {
// 				avWeek3 += s.sum_of_running_mins
// 				runWeek3 += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso || s._id.week === nineWeeksAgoIso) {
// 				avWeek4 += s.sum_of_running_mins
// 				runWeek4 += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso || s._id.week === eightWeeksAgoIso) {
// 				avWeek5 += s.sum_of_running_mins
// 				runWeek5 += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso || s._id.week === sevenWeeksAgoIso) {
// 				avWeek6 += s.sum_of_running_mins
// 				runWeek6 += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso || s._id.week === sixWeeksAgoIso) {
// 				avWeek7 += s.sum_of_running_mins
// 				runWeek7 += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso || s._id.week === fiveWeeksAgoIso) {
// 				avWeek8 += s.sum_of_running_mins
// 				runWeek8 += s.sum_of_touch_mins
// 			}
// 			if (s._id.week === lastWeekIso || s._id.week === twoWeeksAgoIso || s._id.week === threeWeeksAgoIso || s._id.week === fourWeeksAgoIso) {
// 				avWeek9 += s.sum_of_running_mins
// 				runWeek9 += s.sum_of_touch_mins
// 			}
// 		}
// 		percentDec = ((runDec / avDec) * 100).toFixed(1)
// 		percentWeek1 = ((runWeek1 / avWeek1) * 100).toFixed(1)
// 		percentWeek2 = ((runWeek2 / avWeek2) * 100).toFixed(1)
// 		percentWeek3 = ((runWeek3 / avWeek3) * 100).toFixed(1)
// 		percentWeek4 = ((runWeek4 / avWeek4) * 100).toFixed(1)
// 		percentWeek5 = ((runWeek5 / avWeek5) * 100).toFixed(1)
// 		percentWeek6 = ((runWeek6 / avWeek6) * 100).toFixed(1)
// 		percentWeek7 = ((runWeek7 / avWeek7) * 100).toFixed(1)
// 		percentWeek8 = ((runWeek8 / avWeek8) * 100).toFixed(1)
// 		percentWeek9 = ((runWeek9 / avWeek9) * 100).toFixed(1)

// 		effArr.push({
// 			name,
// 			percentDec,
// 			percentWeek1,
// 			percentWeek2,
// 			percentWeek3,
// 			percentWeek4,
// 			percentWeek5,
// 			percentWeek6,
// 			percentWeek7,
// 			percentWeek8,
// 			percentWeek9,
// 		})
// 	}

// 	const graphWeeks = [
// 		'Dec-21',
// 		nineWeeksAgoFormatted,
// 		eightWeeksAgoFormatted,
// 		sevenWeeksAgoFormatted,
// 		sixWeeksAgoFormatted,
// 		fiveWeeksAgoFormatted,
// 		fourWeeksAgoFormatted,
// 		threeWeeksAgoFormatted,
// 		twoWeeksAgoFormatted,
// 		lastWeekFormatted,
// 	]
// 	const colors = [
// 		'grey',
// 		'rgb(255, 123, 0)',
// 		'rgb(255, 123, 0)',
// 		'rgb(255, 123, 0)',
// 		'rgb(255, 123, 0)',
// 		'rgb(255, 123, 0)',
// 		'rgb(255, 123, 0)',
// 		'rgb(255, 123, 0)',
// 		'rgb(255, 123, 0)',
// 		'rgb(255, 123, 0)',
// 	]

// 	const graphDataArr = [...overallRunningArr, ...robotRunningArr, ...laserRunningArr, ...plasmaRunningArr, ...effArr]

// 	// const robotPrevWeekRunLdl = Object.values(robotRunningArr[0]).pop()
// 	// const robotPrevWeekRunBhl = Object.values(robotRunningArr[1]).pop()
// 	// const robotPrevWeekRunEm = Object.values(robotRunningArr[2]).pop()
// 	// const robotPrevWeekRunCp = Object.values(robotRunningArr[3]).pop()
// 	// const robotPrevWeekRunHp = Object.values(robotRunningArr[4]).pop()
// 	// const robotPrevWeekRunCabs = Object.values(robotRunningArr[5]).pop()

// 	const robotPrevWeekRunLdl = justPrevWeekRobotTotalsArr[0]
// 	const robotPrevWeekRunBhl = justPrevWeekRobotTotalsArr[1]
// 	const robotPrevWeekRunEm = justPrevWeekRobotTotalsArr[2]
// 	const robotPrevWeekRunCp = justPrevWeekRobotTotalsArr[3]
// 	const robotPrevWeekRunHp = justPrevWeekRobotTotalsArr[4]
// 	const robotPrevWeekRunCabs = justPrevWeekRobotTotalsArr[5]

// 	const laserPrevWeekRunLdl = justPrevWeekLaserTotalsArr[0]
// 	const laserPrevWeekRunBhl = justPrevWeekLaserTotalsArr[1]
// 	const laserPrevWeekRunEm = justPrevWeekLaserTotalsArr[2]
// 	const laserPrevWeekRunCp = justPrevWeekLaserTotalsArr[3]
// 	const laserPrevWeekRunHp = justPrevWeekLaserTotalsArr[4]
// 	const laserPrevWeekRunCabs = justPrevWeekLaserTotalsArr[5]

// 	const plasmaPrevWeekRunLdl = justPrevWeekPlasmaTotalsArr[0]
// 	const plasmaPrevWeekRunBhl = justPrevWeekPlasmaTotalsArr[1]
// 	const plasmaPrevWeekRunHp = justPrevWeekPlasmaTotalsArr[2]

// 	lastWeekRobotsEff = ((lastWeekRobotsRun / lastWeekRobotsAvv) * 100).toFixed(1)
// 	lastWeekLasersEff = ((lastWeekLasersRun / lastWeekLasersAvv) * 100).toFixed(1)
// 	lastWeekPlasmasEff = ((lastWeekPlasmasRun / lastWeekPlasmasAvv) * 100).toFixed(1)

// 	const overallPrevWeekLdl = Object.values(overallRunningArr[0]).pop()
// 	const overallPrevWeekBhl = Object.values(overallRunningArr[1]).pop()
// 	const overallPrevWeekEm = Object.values(overallRunningArr[2]).pop()
// 	const overallPrevWeekCp = Object.values(overallRunningArr[3]).pop()
// 	const overallPrevWeekHp = Object.values(overallRunningArr[4]).pop()
// 	const overallPrevWeekCabs = Object.values(overallRunningArr[5]).pop()

// 	res.render('machine/live-report', {
// 		dateRange,
// 		graphWeeks,
// 		colors,
// 		graphDataArr,

// 		overallPrevWeekLdl,
// 		overallPrevWeekBhl,
// 		overallPrevWeekEm,
// 		overallPrevWeekCp,
// 		overallPrevWeekHp,
// 		overallPrevWeekCabs,

// 		robotPrevWeekRunLdl,
// 		robotPrevWeekRunBhl,
// 		robotPrevWeekRunEm,
// 		robotPrevWeekRunCp,
// 		robotPrevWeekRunHp,
// 		robotPrevWeekRunCabs,

// 		laserPrevWeekRunLdl,
// 		laserPrevWeekRunBhl,
// 		laserPrevWeekRunEm,
// 		laserPrevWeekRunCp,
// 		laserPrevWeekRunHp,
// 		laserPrevWeekRunCabs,

// 		plasmaPrevWeekRunLdl,
// 		plasmaPrevWeekRunBhl,
// 		plasmaPrevWeekRunHp,

// 		lastWeekOpsEff,
// 		lastWeekRobotsEff,
// 		lastWeekLasersEff,
// 		lastWeekPlasmasEff,
// 	})
// }

module.exports.deleteShift = async (req, res) => {
	const { id } = req.params
	const shiftToDelete = await Update.findByIdAndDelete(id)

	const shortBu = shiftToDelete.shortBu
	req.flash('success', 'Successfully deleted area')
	res.redirect(`/equipment-monitoring/history/${shortBu}`)
}

let resetMachine2 = new CronJob('5 */2 * * * *', async function (req, res) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	let timeNowStampStart = moment().format('DD/MM/YYYY - HH:mm:ss')

	console.log('machine update started - ' + timeNowStampStart)

	let dateToday = new Date()

	let dayNow = moment().format('dddd').toLowerCase()
	let dayYesterday = moment().subtract(1, 'days').format('dddd').toLowerCase()
	let theHourNumber = dateToday.getHours()

	// check if british sumemr time (if true then uk is 1 hour ahead of utc)
	function isBST(d) {
		let jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset()
		let jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset()
		return Math.max(jan, jul) !== d.getTimezoneOffset()
	}

	// if it is british summer time then we need to add 1 hour to times
	let theHour = isBST(dateToday) ? 1 : 0
	// let theHour = 1

	console.log(theHour)

	//Function to_hms_string stands for "hour-minute-second" string. First name that came up.
	function to_hms_string(timearr) {
		let minutes = 60 + timearr[1]
		let hours = ''
		if (Math.abs(timearr[0]) < 10) {
			hours = '0'
		}
		hours = timearr[0] < 0 ? '-' + hours + Math.abs(timearr[0]) : hours + timearr[0]
		return new Date().setHours(hours, minutes, 0, 0)
	}

	try {
		// get all machines not in programming
		const machines = await Machine.find(
			{ programming: false },
			{
				touchTime: 1,
				runningTime: 1,
				_id: 1,
			}
		)
			.populate({
				path: 'shifts',
				match: {
					active: true,
				},
				select: '_id startTimeString endTimeString monday tuesday wednesday thursday friday saturday sunday',
			})
			.lean()

		console.log('START => ', new Date())

		////////////////////////// start here //////////////////////////

		async function promises() {
			try {
				const unresolved = machines.map(async (machine) => {
					// console.log(machine)

					///////////////////////////////////////////
					//reset machine
					await Machine.findByIdAndUpdate(machine._id, {
						inShift: false,
						shiftStart: null,
						shiftEnd: null,
						// runningTime: 0,
						// touchTime: 0,
						// eff: 0,
						// teff: 0,
					})

					////////////////////////////////////////////

					machine.shifts.forEach(async function (shift) {
						let shiftType = 'days'
						let inShift = false
						// check if shift is days or nights
						if (shift.endTimeString < shift.startTimeString) shiftType = 'nights'

						let start_time = [+shift.startTimeString.substring(0, 2), +shift.startTimeString.substring(3)]
						let end_time = [+shift.endTimeString.substring(0, 2), +shift.endTimeString.substring(3)]
						// the two start times as an array of hours/minutes values.
						let dateObj = new Date()
						let now = [dateObj.getHours(), dateObj.getMinutes()] //Gets the current Hours/Minutes
						if (start_time[0] === end_time[0] && start_time[1] === end_time[1]) {
							start_time[0] -= 24
							end_time[0] += 24
						} else if (end_time[0] < start_time[0] && now[0] < start_time[0]) {
							start_time[0] -= 24
						} else if (start_time[0] > end_time[0]) {
							end_time[0] += 24
						}

						let start_string = new Date(to_hms_string(start_time)) //the start string converted to a date format. Made comparisons easier.
						let end_string = new Date(to_hms_string(end_time)) //See Above
						let now_string = new Date(to_hms_string(now)) //Above

						// if the machine is in a night shift starting last night
						if (theHourNumber < 12 && shiftType === 'nights' && shift.hasOwnProperty(dayYesterday)) {
							if (now_string > start_string && now_string < end_string) {
								inShift = true
								//allow for bst hour change
								start_string.setHours(start_string.getHours() - 1)
								end_string.setHours(end_string.getHours() - 1)

								await Machine.findByIdAndUpdate(machine._id, {
									inShift: true,
									shiftStart: start_string,
									shiftEnd: end_string,
									dayNow: dayNow,
								})
							}
						}

						// if the machine is in a night shift starting tonight
						if (theHourNumber >= 12 && shiftType === 'nights' && shift.hasOwnProperty(dayNow)) {
							if (now_string > start_string && now_string < end_string) {
								inShift = true
								//allow for bst hour change
								start_string.setHours(start_string.getHours() - 1)
								end_string.setHours(end_string.getHours() - 1)
								await Machine.findByIdAndUpdate(machine._id, {
									inShift: true,
									shiftStart: start_string,
									shiftEnd: end_string,
									dayNow: dayNow,
								})
							}
						}

						// if the machine is in a day shift
						if (shiftType === 'days' && shift.hasOwnProperty(dayNow)) {
							if (now_string > start_string && now_string < end_string) {
								inShift = true
								//allow for bst hour change
								start_string.setHours(start_string.getHours() - 1)
								end_string.setHours(end_string.getHours() - 1)
								await Machine.findByIdAndUpdate(machine._id, {
									inShift: true,
									shiftStart: start_string,
									shiftEnd: end_string,
									dayNow: dayNow,
								})
								// console.log(shift)
								// console.log('START =>', start_string)
								// console.log('END =>', end_string)
								// console.log('NOW =>', now_string)
							}
						}

						// do I need this?
						await Shift.findByIdAndUpdate(shift._id, {
							inShift: inShift,
						})

						// console.log('START =>', start_string)
						// console.log('END =>', end_string)
						// console.log('NOW =>', now_string)

						// console.log('START => ', shift.startTimeString)
						// console.log('END =>  ', shift.endTimeString)
						// console.log('TYPE =>  ', shiftType)
					})

					return { ...machine }
				})

				const resolved = await Promise.all(unresolved)
			} catch (error) {
				console.log(error)
			}

			// console.log(resolved)
		}

		promises()

		async function promises2() {
			try {
				const unresolved = machines.map(async (m) => {
					//reset machine
					await Machine.findByIdAndUpdate(m._id, {
						// inShift: false,
						// shiftStart: null,
						// shiftEnd: null,
						runningTime: 0,
						touchTime: 0,
						eff: 0,
						teff: 0,
					})
					let machineToUpdate = await Machine.findOne(
						{ inShift: true, _id: m._id },
						{ _id: 1, vin: 1, shiftStart: 1, method: 1, lastUpdateTime: 1, runningMins: 1, touchMins: 1, state: 1, linkedTo: 1 }
					)
					if (machineToUpdate) {
						let vin = machineToUpdate.vin

						// adjust the shift start time if bst
						let startOfCurrentShift = moment(machineToUpdate.shiftStart).subtract(theHour, 'hours').format('YYYY-MM-DDTHH:mm:ss')
						let timeNow = moment().format('YYYY-MM-DDTHH:mm:ss')

						let dateTimeNow = new Date()

						// get total availabe seconds since the current shift started
						const availabeSeconds = (dateTimeNow - machineToUpdate.shiftStart) / 1000

						let headers = { 'x-api-key': process.env.MACHINE_API }

						let livelinkResponse = await axios(
							`https://e0ssp9czi7.execute-api.eu-west-1.amazonaws.com/prod/v1/data/${vin}?from=${startOfCurrentShift}Z&to=${timeNow}Z`,
							{ headers }
						)

						// console.log('MACHINE => ', machineToUpdate)
						// console.log('SHIFT START API => ', startOfCurrentShift)
						// console.log('TOTAL AVAILABLE SECONDS => ', availabeSeconds)

						///////////////////////// logic to work out running time //////////////////////////////

						let number = 0
						let startOfAddedTimeAtEnd = 0
						let timeToAddAtEnd = 0
						let timeOfFirstOffSignal = 0
						let timeToAddAtStart = 0
						let totalRunningSeconds = 0
						let efficiencyPercent = 0
						let lastSignalsArr = []

						let lastRunTime

						// if there is a api livelnk response and not empty array
						if (livelinkResponse.data && livelinkResponse.data[0] && livelinkResponse.data[0].inputChannel0Value) {
							// get the last item in the running time array
							number = livelinkResponse.data[0].inputChannel0Value.length - 1
							// get the last touch signal for reference
							lastRunTime = new Date(livelinkResponse.data[0].inputChannel0Value[number].time)
							// allow for adjusted bst
							lastRunTime.setHours(lastRunTime.getHours() + theHour)
							lastSignalsArr.push(lastRunTime)
							// if last item in array is state 1 then machine is currently running so we need to account for this time
							if (livelinkResponse.data[0].inputChannel0Value[number].state === '1') {
								// get time of last on signal
								startOfAddedTimeAtEnd = new Date(livelinkResponse.data[0].inputChannel0Value[number].time)
								// console.log('START OF ADDED TIME AT END => ', startOfAddedTimeAtEnd)
								// allow for adjusted bst
								startOfAddedTimeAtEnd.setHours(startOfAddedTimeAtEnd.getHours() + theHour)
								lastRunTime = startOfAddedTimeAtEnd
								// work out how many seconds since the last on signal to now (we need to add this to the running time)
								timeToAddAtEnd = (Date.now() - startOfAddedTimeAtEnd) / 1000
								// console.log('SECONDS TO ADD AT END => ', timeToAddAtEnd)
							}

							// work out time to add at beginning if first signal is off
							// if frst item in array is state 0 then machine was already running at the start of the shift so we need to account for this time
							if (livelinkResponse.data[0].inputChannel0Value[0].state === '0') {
								// get time of first off sugnal
								timeOfFirstOffSignal = new Date(livelinkResponse.data[0].inputChannel0Value[0].time)

								// allow for adjusted bst
								timeOfFirstOffSignal.setHours(timeOfFirstOffSignal.getHours() + theHour)
								// work out how many seconds machine was running at start of the shift befre first off signal (we need to add this to the running time)
								timeToAddAtStart = (timeOfFirstOffSignal - machineToUpdate.shiftStart) / 1000
							}

							// work out the total running mins since the current shift started
							if (livelinkResponse.data[0].inputChannel0Value_duration) {
								totalRunningSeconds = livelinkResponse.data[0].inputChannel0Value_duration + timeToAddAtEnd + timeToAddAtStart
							} else {
								totalRunningSeconds = timeToAddAtEnd + timeToAddAtStart
							}

							efficiencyPercent = Math.round((totalRunningSeconds / availabeSeconds) * 100)
						}

						////////////////// end of logic to work out running time //////////////////////////////

						///////////////////////// logic to work out touch time ////////////////////////////////
						let numberTouch = 0
						let startOfAddedTimeAtEndTouch = 0
						let timeToAddAtEndTouch = 0
						let timeOfFirstOffSignalTouch = 0
						let timeToAddAtStartTouch = 0
						let totalRunningSecondsTouch = 0
						let efficiencyPercentTouch = 0
						let totalRunningMins = 0
						let totalRunningMinsTouch = 0
						let lastTouchTime

						// if there is a api livelnk response and not empty array
						if (livelinkResponse.data && livelinkResponse.data[0] && livelinkResponse.data[0].inputChannel1Value) {
							// get the last item in the running time array
							numberTouch = livelinkResponse.data[0].inputChannel1Value.length - 1
							// get the last touch signal for reference
							lastTouchTime = new Date(livelinkResponse.data[0].inputChannel1Value[numberTouch].time)
							// allow for adjusted bst
							lastTouchTime.setHours(lastTouchTime.getHours() + theHour)
							lastSignalsArr.push(lastTouchTime)
							// if last item in array is state 1 then machine is currently running so we need to account for this time
							if (livelinkResponse.data[0].inputChannel1Value[numberTouch].state === '1') {
								// get time of last on signal
								startOfAddedTimeAtEndTouch = new Date(livelinkResponse.data[0].inputChannel1Value[numberTouch].time)
								// allow for adjusted bst
								startOfAddedTimeAtEndTouch.setHours(startOfAddedTimeAtEndTouch.getHours() + theHour)

								// work out how many seconds since the last on signal to now (we need to add this to the running time)
								timeToAddAtEndTouch = (Date.now() - startOfAddedTimeAtEndTouch) / 1000
							}

							// work out time to add at beginning if first signal is off
							// if frst item in array is state 0 then machine was already running at the start of the shift so we need to account for this time
							if (livelinkResponse.data[0].inputChannel1Value[0].state === '0') {
								// get time of first off sugnal
								timeOfFirstOffSignalTouch = new Date(livelinkResponse.data[0].inputChannel1Value[0].time)
								// allow for adjusted bst
								timeOfFirstOffSignalTouch.setHours(timeOfFirstOffSignalTouch.getHours() + theHour)
								// work out how many seconds machine was running at start of the shift befre first off signal (we need to add this to the running time)
								timeToAddAtStartTouch = (timeOfFirstOffSignalTouch - machineToUpdate.shiftStart) / 1000
							}

							// work out the total running mins since the current shift started
							if (livelinkResponse.data[0].inputChannel1Value_duration) {
								totalRunningSecondsTouch = livelinkResponse.data[0].inputChannel1Value_duration + timeToAddAtEndTouch + timeToAddAtStartTouch
							} else {
								totalRunningSecondsTouch = timeToAddAtEndTouch + timeToAddAtStartTouch
							}
							efficiencyPercentTouch = Math.round((totalRunningSecondsTouch / availabeSeconds) * 100)

							// handle is result is Nan for any reason
							if (isNaN(efficiencyPercent)) {
								efficiencyPercent = 0
							}
							// handle is result is Nan for any reason
							if (isNaN(efficiencyPercentTouch)) {
								efficiencyPercentTouch = 0
							}

							// console.log(livelinkResponse.data[0].inputChannel0Value)
							// console.log('TOTAL RUNNING SECONDS => ', totalRunningSeconds)
							// console.log('TOTAL TOUCH SECONDS => ', totalRunningSecondsTouch)

							// console.log('TOTAL RUNNING % => ', efficiencyPercent)
							// console.log('TOTAL TOUCH % => ', efficiencyPercentTouch)

							////////////////// end of logic to work out touch time ////////////////////////////////
						}

						totalRunningMins = Math.round(totalRunningSeconds / 60)
						totalRunningMinsTouch = Math.round(totalRunningSecondsTouch / 60)

						// handle if machine has just run or just touch

						if (machineToUpdate.method === 'running') {
							efficiencyPercentTouch = efficiencyPercent
						}

						if (machineToUpdate.method === 'touch') {
							efficiencyPercent = efficiencyPercentTouch
						}

						// sort the array of last signals sp we can get the latest one at index 0
						lastSignalsArr.sort((a, b) => b - a)

						// update machine with latest eff and touch eff and also add last signal
						let donorMachine

						if (lastSignalsArr[0] !== null) {
							donorMachine = await Machine.findByIdAndUpdate(m._id, {
								eff: efficiencyPercent,
								teff: efficiencyPercentTouch,
								runningMins: totalRunningMins,
								touchMins: totalRunningMinsTouch,
								runningTime: totalRunningSeconds,
								touchTime: totalRunningSecondsTouch,
								thelastSignal: lastSignalsArr[0],
							})
						} else {
							donorMachine = await Machine.findByIdAndUpdate(m._id, {
								eff: efficiencyPercent,
								teff: efficiencyPercentTouch,
								runningMins: totalRunningMins,
								touchMins: totalRunningMinsTouch,
								runningTime: totalRunningSeconds,
								touchTime: totalRunningSecondsTouch,
							})
						}

						// get the latest update of machine to checks if its the same shift as before or a new shift
						const latestUpdate = await Update.find({ vin }).sort({ _id: -1 }).limit(1)

						if (latestUpdate && latestUpdate.length > 0) {
							firstUpdateInArr = latestUpdate[0]
						} else {
							firstUpdateInArr = null
						}

						// convert the 2 dates to seconds to compare
						let date1 = new Date(firstUpdateInArr.shiftStart)
						let date2 = new Date(machineToUpdate.shiftStart)
						let seconds1 = date1.getTime() / 1000
						let seconds2 = date2.getTime() / 1000

						// compare latest shift start time with new shift start time
						if (seconds1 === seconds2) {
							// update current shift
							await Update.findByIdAndUpdate(firstUpdateInArr._id, {
								eff: efficiencyPercent,
								teff: efficiencyPercentTouch,
								runningMins: totalRunningMins,
								touchMins: totalRunningMinsTouch,
								thelastSignal: lastSignalsArr[0],
							})
							// create new shift
						} else {
							const update = new Update({
								vin: vin,
								date: new Date(),
								eff: efficiencyPercent,
								teff: efficiencyPercentTouch,
								shiftStart: donorMachine.shiftStart,
								shiftEnd: donorMachine.shiftEnd,
								shortBu: donorMachine.shortBu,
								machineName: donorMachine.machineName,
								type: donorMachine.type,
								runningMins: totalRunningMins,
								touchMins: totalRunningMinsTouch,
							})

							// push the new shift to the machine
							donorMachine.updates.push(update)
							await update.save()
							//save all updates
							await donorMachine.save()
						}

						// // start of auto close stoppages /////////////////

						// check if machine is not running
						if (machineToUpdate.state !== 'Running') {
							// check if there is a stoppage  open and it was created after the last update.
							const theStoppage = await Stoppage.findOne({
								vin: vin,
								open: true,
								createdAt: { $gte: machineToUpdate.lastUpdateTime },
							})

							//if there is no stoppage created after the last update
							if (!theStoppage) {
								// find the open stoppage
								let theLastStoppage = await Stoppage.findOne({
									vin: vin,
									open: true,
									createdAt: { $lt: machineToUpdate.lastUpdateTime },
								})

								// check that we found a stoppage and that it is not unknown breakdown
								// if (theLastStoppage && theLastStoppage.type !== 'Breakdown' && theLastStoppage.concern !== 'Unknown') {
								if (theLastStoppage) {
									// if there has ben an increase in running or touch mins
									if (totalRunningMinsTouch > machineToUpdate.touchMins || totalRunningMins > machineToUpdate.runningMins) {
										// console.log(machineToUpdate)
										// console.log('LAST TOUCH MINS ->', machineToUpdate.touchMins)
										// console.log('NEW TOUCH MINS ->', totalRunningMinsTouch)
										// console.log('LAST RUNNING MINS ->', machineToUpdate.runningMins)
										// console.log('NEW RUNNING MINS ->', totalRunningMins)
										const linkedMachineId = machineToUpdate.linkedTo
										// check if there is a linked machine
										const linkedMachine = await Machine.findOne(linkedMachineId)
										// if there is a linked machine the we need to also update this back to running
										if (linkedMachine) {
											await Machine.findByIdAndUpdate(linkedMachineId, {
												// change the machine state back to running
												state: 'Running',
											})
										}

										// close stoppage and reset machine back to running
										let theDate = new Date()
										theDate.setMilliseconds(0)
										let stoppage = await Stoppage.findOneAndUpdate(
											{
												vin: vin,
												open: true,
											},
											{
												endTime: theDate,
												open: false,
												closeNotes: 'Stoppage ended by system as machine is now running',
											}
										)
										let machine = await Machine.findOneAndUpdate(
											{
												vin: vin,
											},
											{
												state: 'Running',
											}
										)
										let totalTime = theDate - stoppage.startTime
										stoppage.totalTime = totalTime
										await stoppage.save()
										await machine.save()
										/////////// send email conformation that the stoppage has been auto closed /////////////////

										//Function to_hms_string stands for "hour-minute-second" string.
										function to_hms_string(timearr) {
											let minutes = 60 + timearr[1]
											let hours = ''
											if (Math.abs(timearr[0]) < 10) {
												hours = '0'
											}
											hours = timearr[0] < 0 ? '-' + hours + Math.abs(timearr[0]) : hours + timearr[0]
											return new Date().setHours(hours, minutes, 0, 0)
										}

										const notifications = await Notification.find({
											ids: machine._id,
											types: stoppage.type,
											active: true,
										})

										for (let n of notifications) {
											let start_time = [+n.start.substring(0, 2), +n.start.substring(3)]
											let end_time = [+n.end.substring(0, 2), +n.end.substring(3)]
											// the two start times as an array of hours/minutes values.
											let dateObj = new Date()
											let now = [dateObj.getHours(), dateObj.getMinutes()] //Gets the current Hours/Minutes
											if (start_time[0] === end_time[0] && start_time[1] === end_time[1]) {
												start_time[0] -= 24
												end_time[0] += 24
											} else if (end_time[0] < start_time[0] && now[0] < start_time[0]) {
												start_time[0] -= 24
											} else if (start_time[0] > end_time[0]) {
												end_time[0] += 24
											}

											let start_string = new Date(to_hms_string(start_time)) //the start string converted to a date format. Made comparisons easier.
											let end_string = new Date(to_hms_string(end_time)) //See Above
											let now_string = new Date(to_hms_string(now)) //Above

											if (now_string > start_string && now_string < end_string) {
												let stopDate = moment(stoppage.createdAt).format('DD/MM/YYYY')
												let stopTime = moment(stoppage.createdAt).format('HH:mm')
												let theEmails = n.emails
												// let theEmails = ['ali.ebrahimi@jcb.com']

												const transporter = nodemailer.createTransport({
													host: process.env.HOST, //Host
													port: process.env.PORT, // Port
													tls: {
														rejectUnauthorized: false,
													},
												})

												let mailOptions = {
													from: 'JCB-Equipment.LiveLink@jcb.com',
													to: theEmails,
													subject: `*${machine.machineName} - now running again*`,
													text:
														`*${machine.machineName} is now running again* \n\n` +
														`The stoppage was ended by the system\n\n` +
														`as the machine started running again \n\n` +
														'Thanks.\n' +
														'JCB Equipment LiveLink\n',
												}
												// send the email
												// transporter.sendMail(mailOptions, () => {})
											}
										}

										/////////// end send email conformation that the stoppage has been auto closed /////////////////
									}
								}
							}
						}

						// // end of auto close stoppages ///////////////////

						// update machine with timestamp, running mins & touch mins as these can be used next update to check
						// if any stppages between now and then and if has been running
						await Machine.findByIdAndUpdate(machineToUpdate._id, {
							lastUpdateTime: Date.now(),
							lastUpdate: Date.now(),
							runningMins: totalRunningMins,
							touchMins: totalRunningMinsTouch,
						})
					} ///end of updating loop
				})
			} catch (error) {
				console.log(error)
			}
		}

		promises2()
		console.log('END => ', new Date())
	} catch (error) {
		console.log(error)
	}

	let timeNowStampEnd = moment().format('DD/MM/YYYY - HH:mm:ss')

	console.log('machine update ended - ' + timeNowStampEnd)
})

resetMachine2.start()

let weeklyEff = new CronJob('0 0 3 * * *', async function () {
	try {
		const machines = await Machine.find({}, { vin: 1, _id: 1 })

		for (let machine of machines) {
			const vin = machine.vin
			//return the first monday of any week by the week number this year
			const getFirstMondayOfWeek = (weekNo) => {
				const thisWeek = moment().isoWeek()

				if (weekNo > thisWeek) {
					firstMonday = new Date(new Date().getFullYear() - 1, 0, 4, 0, 0, 0, 0)
				} else {
					firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)
				}

				// let firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)

				while (firstMonday.getDay() != 1) {
					firstMonday.setDate(firstMonday.getDate() - 1)
				}
				if (1 <= weekNo && weekNo <= 52) return firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))

				firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))
				if ((weekNo = 53 && firstMonday.getDate() >= 22 && firstMonday.getDate() <= 28)) return firstMonday
				return null
			}
			const thisWeekIso = moment().isoWeek()
			const mondayThisWeek = new Date(getFirstMondayOfWeek(thisWeekIso))

			const theDateToday = new Date()
			const eightHoursAgo = theDateToday.setHours(theDateToday.getHours() - 4)

			const dayNumber = theDateToday.getDay()

			// console.log(new Date(eightHoursAgo))
			// console.log(dayNumber)

			if (dayNumber === 1) {
				theHoursAgo = new Date()
			} else {
				theHoursAgo = new Date(eightHoursAgo)
			}

			// console.log(mondayThisWeek)

			const result = await Update.aggregate([
				{
					$match: {
						createdAt: { $gt: mondayThisWeek, $lt: theHoursAgo },
						eff: { $exists: true, $gt: -1 },
						vin: vin,
					},
				},

				{
					$project: {
						_id: 0,
						eff: 1,
						teff: 1,
						createdAt: 1,
						shiftStart: 1,
						shiftEnd: 1,
						createdAt: 1,
						availableMins: 1,
						runningMins: 1,
						machineName: 1,
					},
				},
				//get total available time
				{
					$addFields: {
						totalTime: {
							$subtract: ['$shiftEnd', '$shiftStart'],
						},
					},
				},
				//get available mins
				{
					$addFields: {
						avMinutes: {
							$floor: {
								$divide: ['$totalTime', 60000],
							},
						},
					},
				},
				//get running mins
				{
					$addFields: {
						rnningMins: {
							$multiply: [
								{
									$divide: ['$avMinutes', 100],
								},
								'$eff',
							],
						},
					},
				},
				//get touch mins

				{
					$project: {
						vin: 1,
						eff: 1,
						teff: 1,
						updated: 1,
						machineName: 1,
						avMinutes: {
							$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
						},
						rnningMins: {
							$cond: [{ $not: ['$runningMins'] }, '$rnningMins', '$runningMins'],
						},
					},
				},
				// {
				// 	$addFields : {
				// 		touchMins : {
				// 			$multiply : [
				// 				{
				// 					$divide : [ '$avMinutes', 100 ],
				// 				},
				// 				'$teff',
				// 			],
				// 		},
				// 	},
				// },
				{
					$addFields: {
						touchMins: {
							$cond: [
								{ $gt: ['$avMinutes', 0] },

								{
									$multiply: [
										{
											$divide: ['$avMinutes', 100],
										},
										'$teff',
									],
								},
								0,
							],
						},
					},
				},

				{
					$group: {
						_id: '$machineName',

						sum_of_avv_mins: {
							$sum: '$avMinutes',
						},
						sum_of_running_mins: {
							$sum: '$rnningMins',
						},
						sum_of_touch_mins: {
							$sum: '$touchMins',
						},

						// count           : { $sum: 1 },
					},
				},
				{
					$addFields: {
						averageMEff: {
							$cond: [
								{ $gt: ['$sum_of_avv_mins', 0] },
								{
									$multiply: [
										{
											$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
										},
										100,
									],
								},
								0,
							],
						},
					},
				},
				{
					$addFields: {
						averageMTEff: {
							$cond: [
								{ $gt: ['$sum_of_avv_mins', 0] },
								{
									$multiply: [
										{
											$divide: ['$sum_of_touch_mins', '$sum_of_avv_mins'],
										},
										100,
									],
								},
								0,
							],
						},
					},
				},
				{
					$addFields: {
						averageEff: {
							$round: ['$averageMEff', 0],
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
			])
			// console.log('MACHINE => ', machine.machinename)
			// console.log('RESULT => ', result)
			const weeklyId = machine._id

			if (result && result[0] && result[0].averageEff) {
				await Machine.findByIdAndUpdate(weeklyId, {
					weeklyEff: result[0].averageEff,
				})
			}
			if (result && result[0] && result[0].averageTEff) {
				await Machine.findByIdAndUpdate(weeklyId, {
					weeklyTeff: result[0].averageTEff,
				})
			}
		}

		let timeNowStampEnd = moment().format('DD/MM/YYYY - HH:mm:ss')

		console.log('machne weekly eff updated - ' + timeNowStampEnd)
	} catch (error) {
		console.log(error)
	}
})

// weeklyEff.start()

let removeDupShifts = new CronJob('0 22 12 * * *', async function () {
	const vins = await Machine.distinct('vin', {})

	let duplicatesArray = []

	const duplicates = await Update.aggregate([
		{
			$match: {
				createdAt: { $gt: new Date('2022, 08, 25') }, // discard selection criteria
			},
		},
		{
			$group: {
				// _id   : '$Serial Number', // can be grouped on multiple properties
				_id: {
					shiftStart: '$shiftStart',
					vin: '$vin',
				}, // can be grouped on multiple properties
				dup: { $addToSet: '$_id' },
				count: { $sum: 1 },
			},
		},

		{
			$match: {
				count: { $gt: 1 }, // Duplicates considered as count greater than one
			},
		},
	]).sort({ id: -1 })
	duplicates.forEach(function (doc) {
		doc.dup.shift() // First element skipped for deleting
		doc.dup.forEach(function (dupId) {
			duplicatesArray.push(dupId) // Getting all duplicate ids
		})
	})

	// console.log(duplicates)
	// Check all "_id" which you are deleting
	// console.log(duplicatesArray)

	// Remove all duplicates in one go
	await Update.deleteMany({ _id: { $in: duplicatesArray } })

	console.log('Sorted')
})

// removeDupShifts.start()

let updateShifts = new CronJob('0 30 5 * * 0-6', async function () {
	let dateToday = new Date()

	// check if british sumemr time (if true then uk is 1 hour ahead of utc)
	function isBST(d) {
		let jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset()
		let jul = new Date(d.getFullYear(), 6, 1).getTimezoneOffset()
		return Math.max(jan, jul) !== d.getTimezoneOffset()
	}

	// if it is british summer time then we need to add 1 hour to times
	let theHour = isBST(dateToday) ? 1 : 0

	// let startDate = new Date('2022, 08, 25')
	let startDate = moment().subtract(7, 'days').format('YYYY, MM, DD')
	let endDate = moment().subtract(0, 'days').format('YYYY, MM, DD')

	// console.log(new Date(startDate))
	// console.log(new Date(endDate))

	const updates = await Update.find({
		createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
	})

	for (let u of updates) {
		const updatedStart = new Date(u.shiftStart)
		updatedStart.setHours(updatedStart.getHours())
		const updatedEnd = new Date(u.shiftEnd)
		updatedEnd.setHours(updatedEnd.getHours())
		try {
			let start = moment(updatedStart).format('YYYY-MM-DDTHH:mm:ss')
			let end = moment(updatedEnd).format('YYYY-MM-DDTHH:mm:ss')
			let vin = u.vin

			const headers = { 'x-api-key': process.env.MACHINE_API }

			const livelinkResponse = await axios(`https://e0ssp9czi7.execute-api.eu-west-1.amazonaws.com/prod/v1/data/${vin}?from=${start}Z&to=${end}Z`, {
				headers,
			})
			///////////////////////// logic to work out running time //////////////////////////////

			let number = 0
			let startOfAddedTimeAtEnd = 0
			let timeToAddAtEnd = 0
			let timeOfFirstOffSignal = 0
			let timeToAddAtStart = 0
			let totalRunningSeconds = 0
			let efficiencyPercent = 0
			let lastSignalsArr = []

			let lastRunTime

			// get total availabe seconds since the current shift started
			const availabeSeconds = (u.shiftEnd - u.shiftStart) / 1000

			// if there is a api livelnk response and not empty array
			if (livelinkResponse.data && livelinkResponse.data[0] && livelinkResponse.data[0].inputChannel0Value) {
				// get the last item in the running time array
				number = livelinkResponse.data[0].inputChannel0Value.length - 1
				// get the last touch signal for reference
				lastRunTime = new Date(livelinkResponse.data[0].inputChannel0Value[number].time)
				// allow for adjusted bst
				lastRunTime.setHours(lastRunTime.getHours() + theHour)
				lastSignalsArr.push(lastRunTime)
				// if last item in array is state 1 then machine is currently running so we need to account for this time
				if (livelinkResponse.data[0].inputChannel0Value[number].state === '1') {
					// get time of last on signal
					startOfAddedTimeAtEnd = new Date(livelinkResponse.data[0].inputChannel0Value[number].time)
					// console.log('START OF ADDED TIME AT END => ', startOfAddedTimeAtEnd)
					// allow for adjusted bst
					startOfAddedTimeAtEnd.setHours(startOfAddedTimeAtEnd.getHours() + theHour)
					lastRunTime = startOfAddedTimeAtEnd
					// work out how many seconds since the last on signal to end of shift (we need to add this to the running time)
					timeToAddAtEnd = (u.shiftEnd - startOfAddedTimeAtEnd) / 1000
					// console.log('SECONDS TO ADD AT END => ', timeToAddAtEnd)
				}

				// work out time to add at beginning if first signal is off
				// if frst item in array is state 0 then machine was already running at the start of the shift so we need to account for this time
				if (livelinkResponse.data[0].inputChannel0Value[0].state === '0') {
					// get time of first off sugnal
					timeOfFirstOffSignal = new Date(livelinkResponse.data[0].inputChannel0Value[0].time)

					// allow for adjusted bst
					timeOfFirstOffSignal.setHours(timeOfFirstOffSignal.getHours() + theHour)
					// work out how many seconds machine was running at start of the shift befre first off signal (we need to add this to the running time)
					timeToAddAtStart = (timeOfFirstOffSignal - u.shiftStart) / 1000
				}

				// work out the total running mins since the current shift started
				if (livelinkResponse.data[0].inputChannel0Value_duration) {
					totalRunningSeconds = livelinkResponse.data[0].inputChannel0Value_duration + timeToAddAtEnd + timeToAddAtStart
				} else {
					totalRunningSeconds = timeToAddAtEnd + timeToAddAtStart
				}

				efficiencyPercent = Math.round((totalRunningSeconds / availabeSeconds) * 100)
			}

			////////////////// end of logic to work out running time //////////////////////////////

			///////////////////////// logic to work out touch time ////////////////////////////////
			let numberTouch = 0
			let startOfAddedTimeAtEndTouch = 0
			let timeToAddAtEndTouch = 0
			let timeOfFirstOffSignalTouch = 0
			let timeToAddAtStartTouch = 0
			let totalRunningSecondsTouch = 0
			let efficiencyPercentTouch = 0
			let totalRunningMins = 0
			let totalRunningMinsTouch = 0
			let lastTouchTime

			// if there is a api livelnk response and not empty array
			if (livelinkResponse.data && livelinkResponse.data[0] && livelinkResponse.data[0].inputChannel1Value) {
				// get the last item in the running time array
				numberTouch = livelinkResponse.data[0].inputChannel1Value.length - 1
				// get the last touch signal for reference
				lastTouchTime = new Date(livelinkResponse.data[0].inputChannel1Value[numberTouch].time)
				// allow for adjusted bst
				lastTouchTime.setHours(lastTouchTime.getHours() + theHour)
				lastSignalsArr.push(lastTouchTime)
				// if last item in array is state 1 then machine is currently running so we need to account for this time
				if (livelinkResponse.data[0].inputChannel1Value[numberTouch].state === '1') {
					// get time of last on signal
					startOfAddedTimeAtEndTouch = new Date(livelinkResponse.data[0].inputChannel1Value[numberTouch].time)
					// allow for adjusted bst
					startOfAddedTimeAtEndTouch.setHours(startOfAddedTimeAtEndTouch.getHours() + theHour)

					// work out how many seconds since the last on signal to end of shift (we need to add this to the running time)
					timeToAddAtEndTouch = (u.shiftEnd - startOfAddedTimeAtEndTouch) / 1000
				}

				// work out time to add at beginning if first signal is off
				// if frst item in array is state 0 then machine was already running at the start of the shift so we need to account for this time
				if (livelinkResponse.data[0].inputChannel1Value[0].state === '0') {
					// get time of first off sugnal
					timeOfFirstOffSignalTouch = new Date(livelinkResponse.data[0].inputChannel1Value[0].time)
					// allow for adjusted bst
					timeOfFirstOffSignalTouch.setHours(timeOfFirstOffSignalTouch.getHours() + theHour)
					// work out how many seconds machine was running at start of the shift befre first off signal (we need to add this to the running time)
					timeToAddAtStartTouch = (timeOfFirstOffSignalTouch - u.shiftStart) / 1000
				}

				// work out the total running mins since the current shift started
				if (livelinkResponse.data[0].inputChannel1Value_duration) {
					totalRunningSecondsTouch = livelinkResponse.data[0].inputChannel1Value_duration + timeToAddAtEndTouch + timeToAddAtStartTouch
				} else {
					totalRunningSecondsTouch = timeToAddAtEndTouch + timeToAddAtStartTouch
				}
				efficiencyPercentTouch = Math.round((totalRunningSecondsTouch / availabeSeconds) * 100)

				// handle is result is Nan for any reason
				if (isNaN(efficiencyPercent)) {
					efficiencyPercent = 0
				}
				// handle is result is Nan for any reason
				if (isNaN(efficiencyPercentTouch)) {
					efficiencyPercentTouch = 0
				}

				totalRunningMins = Math.round(totalRunningSeconds / 60)
				totalRunningMinsTouch = Math.round(totalRunningSecondsTouch / 60)

				// console.log(livelinkResponse.data[0].inputChannel0Value)

				// console.log('AVAILABLE SECONDS => ', availabeSeconds)
				// console.log('TOTAL RUNNING SECONDS => ', totalRunningSeconds)
				// console.log('TOTAL TOUCH SECONDS => ', totalRunningSecondsTouch)

				// console.log('TOTAL RUNNING % => ', efficiencyPercent)
				// console.log('TOTAL TOUCH % => ', efficiencyPercentTouch)

				////////////////// end of logic to work out touch time ////////////////////////////////
			}

			const machine = await Machine.findOne({ vin: u.vin })

			// handle if machine has just run or just touch

			if (machine.method === 'running') {
				efficiencyPercentTouch = efficiencyPercent
			}

			if (machine.method === 'touch') {
				efficiencyPercent = efficiencyPercentTouch
			}

			// console.log('VIN => ', vin)
			// console.log('START => ', start)
			// console.log('END => ', end)
			// console.log('EFF => ', efficiencyPercent)
			// console.log('TOUCH => ', efficiencyPercentTouch)

			if (efficiencyPercent < 0) efficiencyPercent = 0
			if (efficiencyPercentTouch < 0) efficiencyPercentTouch = 0

			await Update.findByIdAndUpdate(u._id, {
				eff: efficiencyPercent,
				teff: efficiencyPercentTouch,
				runningMins: totalRunningMins,
				touchMins: totalRunningMinsTouch,
			})
		} catch (error) {
			console.log(error)
		}
	}
	console.log('Sorted')
})

// updateShifts.start()

module.exports.upcoming = async (req, res) => {
	let andons = await Andon.aggregate([
		{
			$match: {},
		},
		{
			$project: {
				month: { $month: '$createdAt' },
				shiftStart: 1,
				shiftEnd: 1,
				startTime: 1,
				endTime: 1,
				shortBu: 1,
			},
		},
	])

	const newDivisions = ['BHL', 'CABS', 'CP', 'EM', 'HP', 'LDL']

	const dataArr = []

	const addTimeToAndon = (andons) => {
		let mins = 0

		// ended during shift
		for (let andon of andons) {
			if (andon.endTime < andon.shiftEnd) {
				ms = (andon.endTime - andon.startTime) / 60000
				mins += Math.round(ms)
				if (mins < 0) mins = 1
			}
			// ended after shift
			if (andon.endTime > andon.shiftEnd) {
				ms = (andon.shiftEnd - andon.startTime) / 60000
				mins += Math.round(ms)
				if (mins < 0) mins = 1
			}
		}

		if (mins < 0) mins = 1
		return mins
	}

	let janT = 'n/a'
	let febT = 'n/a'
	let marT = 'n/a'
	let aprT = 'n/a'
	let mayT = 'n/a'
	let junT = 'n/a'
	let julT = 'n/a'
	let augT = 0
	let sepT = 0
	let octT = 0
	let novT = 0
	let decT = 0

	let janTTime = 'n/a'
	let febTTime = 'n/a'
	let marTTime = 'n/a'
	let aprTTime = 'n/a'
	let mayTTime = 'n/a'
	let junTTime = 'n/a'
	let julTTime = 'n/a'

	let augTTime = addTimeToAndon(andons.filter((item) => item.month === 8))
	let sepTTime = addTimeToAndon(andons.filter((item) => item.month === 9))
	let octTTime = addTimeToAndon(andons.filter((item) => item.month === 10))
	let novTTime = addTimeToAndon(andons.filter((item) => item.month === 11))
	let decTTime = addTimeToAndon(andons.filter((item) => item.month === 12))

	for (let div of newDivisions) {
		let jan = 0
		let feb = 0
		let mar = 0
		let apr = 0
		let may = 0
		let jun = 0
		let jul = 0

		let aug = andons.filter((item) => item.shortBu === div && item.month === 8).length
		let sep = andons.filter((item) => item.shortBu === div && item.month === 9).length
		let oct = andons.filter((item) => item.shortBu === div && item.month === 10).length
		let nov = andons.filter((item) => item.shortBu === div && item.month === 11).length
		let dec = andons.filter((item) => item.shortBu === div && item.month === 12).length

		augT += aug
		sepT += sep
		octT += oct
		novT += nov
		decT += dec

		dataArr.push({
			name: div,
			jan,
			feb,
			mar,
			apr,
			may,
			jun,
			jul,
			aug,
			sep,
			oct,
			nov,
			dec,
		})
	}

	let totalNumbersArr = [janT, febT, marT, aprT, mayT, junT, julT, augT, sepT, octT, novT, decT]
	let totalTimeArr = [janTTime, febTTime, marTTime, aprTTime, mayTTime, junTTime, julTTime, augTTime, sepTTime, octTTime, novTTime, decTTime]

	res.render('machine/upcoming', {
		dataArr,
		totalNumbersArr,
		totalTimeArr,
	})
}
