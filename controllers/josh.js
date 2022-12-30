const Graph = require('../models/graph')
const Update = require('../models/update')
const Machine = require('../models/machine')

const moment = require('moment')

module.exports.doaRft = async (req, res) => {
	let dataArr = []

	let divisions = ['BHL', 'LDL', 'EM', 'CP', 'HP', 'LP', 'SD', 'GROUP']

	for (let division of divisions) {
		nov = await Graph.findOne({ division, metric: 'doaRFTtM7' })
		dec = await Graph.findOne({ division, metric: 'doaRFTtM8' })
		jan = await Graph.findOne({ division, metric: 'doaRFTtM9' })
		feb = await Graph.findOne({ division, metric: 'doaRFTtM10' })
		mar = await Graph.findOne({ division, metric: 'doaRFTtM9' })
		apr = await Graph.findOne({ division, metric: 'doaRFTtM10' })

		dataArr.push({
			division,
			nov: nov.stat,
			dec: dec.stat,
			jan: jan.stat,
			feb: feb.stat,
			mar: mar.stat,
			apr: apr.stat,
		})
	}

	res.render('josh/doaRft', { dataArr })
}

module.exports.t3Dpu = async (req, res) => {
	let dataArr = []

	let divisions = ['BHL', 'LDL', 'EM', 'CP', 'HP', 'LP', 'SD', 'GROUP']

	for (let division of divisions) {
		sep = await Graph.findOne({ division, metric: 't3DPUM3' })
		oct = await Graph.findOne({ division, metric: 't3DPUM4' })
		nov = await Graph.findOne({ division, metric: 't3DPUM5' })
		dec = await Graph.findOne({ division, metric: 't3DPUM6' })
		jan = await Graph.findOne({ division, metric: 't3DPUM7' })
		feb = await Graph.findOne({ division, metric: 't3DPUM8' })

		dataArr.push({
			division,
			sep: sep.stat,
			oct: oct.stat,
			nov: nov.stat,
			dec: dec.stat,
			jan: jan.stat,
			feb: feb.stat,
		})
	}

	res.render('josh/t3dpu', { dataArr })
}

module.exports.robots = async (req, res) => {
	const types = ['Welding Robot']
	const cutIn = new Date('2022, 01, 01')

	const result = await Update.aggregate([
		{
			$match: {
				createdAt: { $gt: cutIn },
				type: { $in: types },
				eff: { $exists: true, $gt: 0 },
			},
		},

		{
			$project: {
				_id: 0,
				shortBu: 1,
				machineName: 1,
				eff: 1,
				teff: 1,
				createdAt: 1,
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
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
			$addFields: {
				touchMins: {
					$multiply: [
						{
							$divide: ['$avMinutes', 100],
						},
						'$teff',
					],
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
				updated: 1,
				week: 1,
				month: 1,
				year: 1,
				avMinutes: 1,
				rnningMins: 1,
				touchMins: 1,
			},
		},
		{
			$group: {
				_id: {
					shortBu: '$shortBu',
					machineName: '$machineName',
					year: '$year',
					month: '$month',
				},
				sum_of_avv_mins: {
					$sum: '$avMinutes',
				},
				sum_of_running_mins: {
					$sum: '$rnningMins',
				},

				// count           : { $sum: 1 },
			},
		},
		{
			$addFields: {
				averageMEff: {
					$multiply: [
						{
							$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
						},
						100,
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
	])

	const machines = await Machine.find({ type: 'Welding Robot' }, { _id: 0, machineName: 1, shortBu: 1 }).sort({
		shortBu: 1,
	})

	let dataArr = []
	let groupJan = 0
	let groupFeb = 0
	let groupMar = 0
	let groupApr = 0
	let groupMay = 0
	let groupJun = 0
	let groupJul = 0
	let groupAug = 0
	let groupSep = 0
	let groupOct = 0
	let groupNov = 0
	let groupDec = 0

	for (let machine of machines) {
		let jan = 0
		let feb = 0
		let mar = 0
		let apr = 0
		let may = 0
		let jun = 0
		let jul = 0
		let aug = 0
		let sep = 0
		let oct = 0
		let nov = 0
		let dec = 0

		// if (machine.machineName === 'Cloos Cell 2 (S)') machine.machineName = 'Cloos Cell 2 (M)'

		for (let r of result) {
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 1) {
				jan = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 2) {
				feb = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 3) {
				mar = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 4) {
				apr = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 5) {
				may = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 6) {
				jun = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 7) {
				jul = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 8) {
				aug = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 9) {
				sep = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 10) {
				oct = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 11) {
				nov = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.year === 2022 && r._id.month === 12) {
				dec = r.averageEff
			}
		}

		dataArr.push({
			name: machine.machineName,
			bu: machine.shortBu,
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
	let jan = 0
	let feb = 0
	let mar = 0
	let apr = 0
	let may = 0
	let jun = 0
	let jul = 0
	let aug = 0
	let sep = 0
	let oct = 0
	let nov = 0
	let dec = 0
	let janAv = 0
	let febAv = 0
	let marAv = 0
	let aprAv = 0
	let mayAv = 0
	let junAv = 0
	let julAv = 0
	let augAv = 0
	let sepAv = 0
	let octAv = 0
	let novAv = 0
	let decAv = 0
	let janRun = 0
	let febRun = 0
	let marRun = 0
	let aprRun = 0
	let mayRun = 0
	let junRun = 0
	let julRun = 0
	let augRun = 0
	let sepRun = 0
	let octRun = 0
	let novRun = 0
	let decRun = 0

	for (let r of result) {
		if (r._id.year === 2022 && r._id.month === 1) {
			janAv += r.sum_of_avv_mins
			janRun += r.sum_of_running_mins
			jan = Math.round((janRun / janAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 2) {
			febAv += r.sum_of_avv_mins
			febRun += r.sum_of_running_mins
			feb = Math.round((febRun / febAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 3) {
			marAv += r.sum_of_avv_mins
			marRun += r.sum_of_running_mins
			mar = Math.round((marRun / marAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 4) {
			aprAv += r.sum_of_avv_mins
			aprRun += r.sum_of_running_mins
			apr = Math.round((aprRun / aprAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 5) {
			mayAv += r.sum_of_avv_mins
			mayRun += r.sum_of_running_mins
			may = Math.round((mayRun / mayAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 6) {
			junAv += r.sum_of_avv_mins
			junRun += r.sum_of_running_mins
			jun = Math.round((junRun / junAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 7) {
			julAv += r.sum_of_avv_mins
			julRun += r.sum_of_running_mins
			jul = Math.round((julRun / julAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 8) {
			augAv += r.sum_of_avv_mins
			augRun += r.sum_of_running_mins
			aug = Math.round((augRun / augAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 9) {
			sepAv += r.sum_of_avv_mins
			sepRun += r.sum_of_running_mins
			sep = Math.round((sepRun / sepAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 10) {
			octAv += r.sum_of_avv_mins
			octRun += r.sum_of_running_mins
			oct = Math.round((octRun / octAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 11) {
			novAv += r.sum_of_avv_mins
			novRun += r.sum_of_running_mins
			nov = Math.round((novRun / novAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 12) {
			decAv += r.sum_of_avv_mins
			decRun += r.sum_of_running_mins
			dec = Math.round((decRun / decAv) * 100)
		}
	}
	dataArr.push({
		name: 'All',
		bu: 'Group',
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

	res.render('josh/robotEff', { dataArr })
}

module.exports.robotsWeek = async (req, res) => {
	const types = ['Welding Robot']
	let twelveWeeksAgoDateHelp = moment().subtract(12, 'weeks')

	const cutIn = new Date(twelveWeeksAgoDateHelp)

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

	const result = await Update.aggregate([
		{
			$match: {
				createdAt: { $gt: cutIn, $lt: theHoursAgo },
				type: { $in: types },
				eff: { $exists: true, $gt: -1 },
			},
		},

		{
			$project: {
				_id: 0,
				shortBu: 1,
				machineName: 1,
				eff: 1,
				teff: 1,
				createdAt: 1,
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				availableMins: 1,
				runningMins: 1,
				week: {
					$isoWeek: {
						date: '$shiftStart',
						timezone: 'Europe/London',
					},
				},
				year: {
					$year: {
						date: '$shiftStart',
						timezone: 'Europe/London',
					},
				},
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
			$addFields: {
				touchMins: {
					$multiply: [
						{
							$divide: ['$avMinutes', 100],
						},
						'$teff',
					],
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
				updated: 1,
				week: 1,
				month: 1,
				year: 1,
				avMinutes: {
					$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
				},
				rnningMins: {
					$cond: [{ $not: ['$runningMins'] }, '$rnningMins', '$runningMins'],
				},
				touchMins: 1,
			},
		},
		{
			$group: {
				_id: {
					shortBu: '$shortBu',
					machineName: '$machineName',
					year: '$year',
					week: '$week',
				},
				sum_of_avv_mins: {
					$sum: '$avMinutes',
				},
				sum_of_running_mins: {
					$sum: '$rnningMins',
				},

				// count           : { $sum: 1 },
			},
		},
		{
			$addFields: {
				averageMEff: {
					$cond: [
						{ $gt: ['$sum_of_running_mins', 0] },

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
				averageEff: {
					$round: ['$averageMEff', 0],
				},
			},
		},
	])

	const machines = await Machine.find({ type: 'Welding Robot' }, { _id: 0, machineName: 1, shortBu: 1 }).sort({
		shortBu: 1,
	})

	let dataArr = []
	let thisWeekDate = moment().subtract(0, 'weeks').isoWeek()
	let lastWeekDate = moment().subtract(1, 'weeks').isoWeek()
	let twoWeeksAgoDate = moment().subtract(2, 'weeks').isoWeek()
	let threeWeeksAgoDate = moment().subtract(3, 'weeks').isoWeek()
	let fourWeeksAgoDate = moment().subtract(4, 'weeks').isoWeek()
	let fiveWeeksAgoDate = moment().subtract(5, 'weeks').isoWeek()
	let sixWeeksAgoDate = moment().subtract(6, 'weeks').isoWeek()
	let sevenWeeksAgoDate = moment().subtract(7, 'weeks').isoWeek()
	let eightWeeksAgoDate = moment().subtract(8, 'weeks').isoWeek()
	let nineWeeksAgoDate = moment().subtract(9, 'weeks').isoWeek()
	let tenWeeksAgoDate = moment().subtract(10, 'weeks').isoWeek()
	let elevenWeeksAgoDate = moment().subtract(11, 'weeks').isoWeek()

	for (let machine of machines) {
		let thisWeek = 0
		let lastWeek = 0
		let twoWeeksAgo = 0
		let threeWeeksAgo = 0
		let fourWeeksAgo = 0
		let fiveWeeksAgo = 0
		let sixWeeksAgo = 0
		let sevenWeeksAgo = 0
		let eightWeeksAgo = 0
		let nineWeeksAgo = 0
		let tenWeeksAgo = 0
		let elevenWeeksAgo = 0
		let average = 0

		// if (machine.machineName === 'Cloos Cell 2 (S)') machine.machineName = 'Cloos Cell 2 (M)'

		for (let r of result) {
			if (r._id.machineName === machine.machineName && r._id.week === elevenWeeksAgoDate) {
				elevenWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === tenWeeksAgoDate) {
				tenWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === nineWeeksAgoDate) {
				nineWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === eightWeeksAgoDate) {
				eightWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === sevenWeeksAgoDate) {
				sevenWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === sixWeeksAgoDate) {
				sixWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === fiveWeeksAgoDate) {
				fiveWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === fourWeeksAgoDate) {
				fourWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === threeWeeksAgoDate) {
				threeWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === twoWeeksAgoDate) {
				twoWeeksAgo = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === lastWeekDate) {
				lastWeek = r.averageEff
			}
			if (r._id.machineName === machine.machineName && r._id.week === thisWeekDate) {
				thisWeek = r.averageEff
			}
		}

		dataArr.push({
			name: machine.machineName,
			bu: machine.shortBu,
			elevenWeeksAgo,
			tenWeeksAgo,
			nineWeeksAgo,
			eightWeeksAgo,
			sevenWeeksAgo,
			sixWeeksAgo,
			fiveWeeksAgo,
			fourWeeksAgo,
			threeWeeksAgo,
			twoWeeksAgo,
			lastWeek,
			thisWeek,
		})
	}

	res.render('josh/robotEffweek', {
		dataArr,
		thisWeekDate,
		lastWeekDate,
		twoWeeksAgoDate,
		threeWeeksAgoDate,
		fourWeeksAgoDate,
		fiveWeeksAgoDate,
		sixWeeksAgoDate,
		sevenWeeksAgoDate,
		eightWeeksAgoDate,
		nineWeeksAgoDate,
		tenWeeksAgoDate,
		elevenWeeksAgoDate,
	})
}

module.exports.businessUnits = async (req, res) => {
	const types = ['Welding Robot']
	const cutIn = new Date('2022, 01, 01')

	const result = await Update.aggregate([
		{
			$match: {
				createdAt: { $gt: cutIn },
				type: { $in: types },
				eff: { $exists: true, $gt: 0 },
			},
		},

		{
			$project: {
				_id: 0,
				shortBu: 1,
				machineName: 1,
				eff: 1,
				teff: 1,
				createdAt: 1,
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
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
			$addFields: {
				touchMins: {
					$multiply: [
						{
							$divide: ['$avMinutes', 100],
						},
						'$teff',
					],
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
				updated: 1,
				week: 1,
				month: 1,
				year: 1,
				avMinutes: 1,
				rnningMins: 1,
				touchMins: 1,
			},
		},
		{
			$group: {
				_id: {
					shortBu: '$shortBu',
					year: '$year',
					month: '$month',
				},
				sum_of_avv_mins: {
					$sum: '$avMinutes',
				},
				sum_of_running_mins: {
					$sum: '$rnningMins',
				},

				// count           : { $sum: 1 },
			},
		},
		{
			$addFields: {
				averageMEff: {
					$multiply: [
						{
							$divide: ['$sum_of_running_mins', '$sum_of_avv_mins'],
						},
						100,
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
	])

	let dataArr = []

	let divisions = ['BHL', 'LDL', 'EM', 'CP', 'HP', 'CABS']

	for (let division of divisions) {
		let jan = 0
		let feb = 0
		let mar = 0
		let apr = 0
		let may = 0
		let jun = 0
		let jul = 0
		let aug = 0
		let sep = 0
		let oct = 0
		let nov = 0
		let dec = 0

		for (let r of result) {
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 1) {
				jan = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 2) {
				feb = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 3) {
				mar = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 4) {
				apr = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 5) {
				may = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 6) {
				jun = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 7) {
				jul = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 8) {
				aug = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 9) {
				sep = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 10) {
				oct = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 11) {
				nov = r.averageEff
			}
			if (r._id.shortBu === division && r._id.year === 2022 && r._id.month === 12) {
				dec = r.averageEff
			}
		}

		dataArr.push({
			bu: division,
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

	let jan = 0
	let feb = 0
	let mar = 0
	let apr = 0
	let may = 0
	let jun = 0
	let jul = 0
	let aug = 0
	let sep = 0
	let oct = 0
	let nov = 0
	let dec = 0
	let janAv = 0
	let febAv = 0
	let marAv = 0
	let aprAv = 0
	let mayAv = 0
	let junAv = 0
	let julAv = 0
	let augAv = 0
	let sepAv = 0
	let octAv = 0
	let novAv = 0
	let decAv = 0
	let janRun = 0
	let febRun = 0
	let marRun = 0
	let aprRun = 0
	let mayRun = 0
	let junRun = 0
	let julRun = 0
	let augRun = 0
	let sepRun = 0
	let octRun = 0
	let novRun = 0
	let decRun = 0

	for (let r of result) {
		if (r._id.year === 2022 && r._id.month === 1) {
			janAv += r.sum_of_avv_mins
			janRun += r.sum_of_running_mins
			jan = Math.round((janRun / janAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 2) {
			febAv += r.sum_of_avv_mins
			febRun += r.sum_of_running_mins
			feb = Math.round((febRun / febAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 3) {
			marAv += r.sum_of_avv_mins
			marRun += r.sum_of_running_mins
			mar = Math.round((marRun / marAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 4) {
			aprAv += r.sum_of_avv_mins
			aprRun += r.sum_of_running_mins
			apr = Math.round((aprRun / aprAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 5) {
			mayAv += r.sum_of_avv_mins
			mayRun += r.sum_of_running_mins
			may = Math.round((mayRun / mayAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 6) {
			junAv += r.sum_of_avv_mins
			junRun += r.sum_of_running_mins
			jun = Math.round((junRun / junAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 7) {
			julAv += r.sum_of_avv_mins
			julRun += r.sum_of_running_mins
			jul = Math.round((julRun / julAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 8) {
			augAv += r.sum_of_avv_mins
			augRun += r.sum_of_running_mins
			aug = Math.round((augRun / augAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 9) {
			sepAv += r.sum_of_avv_mins
			sepRun += r.sum_of_running_mins
			sep = Math.round((sepRun / sepAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 10) {
			octAv += r.sum_of_avv_mins
			octRun += r.sum_of_running_mins
			oct = Math.round((octRun / octAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 11) {
			novAv += r.sum_of_avv_mins
			novRun += r.sum_of_running_mins
			nov = Math.round((novRun / novAv) * 100)
		}
		if (r._id.year === 2022 && r._id.month === 12) {
			decAv += r.sum_of_avv_mins
			decRun += r.sum_of_running_mins
			dec = Math.round((decRun / decAv) * 100)
		}
	}
	dataArr.push({
		name: 'All',
		bu: 'Group',
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

	res.render('josh/buEff', { dataArr })
}

module.exports.robotsWeekBu = async (req, res) => {
	const { shortBu } = req.params

	const types = ['Welding Robot']
	let twelveWeeksAgoDateHelp = moment().subtract(13, 'weeks')

	const cutIn = new Date(twelveWeeksAgoDateHelp)

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

	const result = await Update.aggregate([
		{
			$match: {
				shortBu: shortBu,
				createdAt: { $gt: cutIn, $lt: theHoursAgo },
				type: { $in: types },
				eff: { $exists: true, $gt: -1 },
			},
		},

		{
			$project: {
				_id: 0,
				shortBu: 1,
				machineName: 1,
				eff: 1,
				teff: 1,
				createdAt: 1,
				shiftStart: 1,
				shiftEnd: 1,
				createdAt: 1,
				availableMins: 1,
				runningMins: 1,
				week: {
					$isoWeek: {
						date: '$shiftStart',
						timezone: 'Europe/London',
					},
				},
				year: {
					$year: {
						date: '$shiftStart',
						timezone: 'Europe/London',
					},
				},
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
			$addFields: {
				touchMins: {
					$multiply: [
						{
							$divide: ['$avMinutes', 100],
						},
						'$teff',
					],
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
				updated: 1,
				week: 1,
				month: 1,
				year: 1,
				avMinutes: {
					$cond: [{ $not: ['$availableMins'] }, '$avMinutes', '$availableMins'],
				},
				rnningMins: {
					$cond: [{ $not: ['$runningMins'] }, '$rnningMins', '$runningMins'],
				},
				touchMins: 1,
			},
		},
		{
			$group: {
				_id: {
					shortBu: '$shortBu',
					machineName: '$machineName',
					year: '$year',
					week: '$week',
				},
				sum_of_avv_mins: {
					$sum: '$avMinutes',
				},
				sum_of_running_mins: {
					$sum: '$rnningMins',
				},

				// count           : { $sum: 1 },
			},
		},
		{
			$addFields: {
				averageMEff: {
					$cond: [
						{ $gt: ['$sum_of_running_mins', 0] },
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
				averageEff: {
					$round: ['$averageMEff', 0],
				},
			},
		},
	])

	const machines = await Machine.find({ type: 'Welding Robot', shortBu }, { _id: 0, machineName: 1, shortBu: 1 }).sort({
		shortBu: 1,
	})

	let dataArr = []

	const getFirstMondayOfWeek = (weekNo) => {
		const thisWeek = moment().subtract(1, 'weeks').isoWeek()

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

	let lastWeekDate = moment().subtract(1, 'weeks').isoWeek()
	let twoWeeksAgoDate = moment().subtract(2, 'weeks').isoWeek()
	let threeWeeksAgoDate = moment().subtract(3, 'weeks').isoWeek()
	let fourWeeksAgoDate = moment().subtract(4, 'weeks').isoWeek()
	let fiveWeeksAgoDate = moment().subtract(5, 'weeks').isoWeek()
	let sixWeeksAgoDate = moment().subtract(6, 'weeks').isoWeek()
	let sevenWeeksAgoDate = moment().subtract(7, 'weeks').isoWeek()
	let eightWeeksAgoDate = moment().subtract(8, 'weeks').isoWeek()
	let nineWeeksAgoDate = moment().subtract(9, 'weeks').isoWeek()
	let tenWeeksAgoDate = moment().subtract(10, 'weeks').isoWeek()
	let elevenWeeksAgoDate = moment().subtract(11, 'weeks').isoWeek()
	let twelveWeeksAgoDate = moment().subtract(12, 'weeks').isoWeek()

	const lastWeekMonday = moment(new Date(getFirstMondayOfWeek(lastWeekDate))).format('DD/MM/YY')

	const monday2WeeksAgo = moment(new Date(getFirstMondayOfWeek(twoWeeksAgoDate))).format('DD/MM/YY')

	const monday3WeeksAgo = moment(new Date(getFirstMondayOfWeek(threeWeeksAgoDate))).format('DD/MM/YY')

	const monday4WeeksAgo = moment(new Date(getFirstMondayOfWeek(fourWeeksAgoDate))).format('DD/MM/YY')

	const monday5WeeksAgo = moment(new Date(getFirstMondayOfWeek(fiveWeeksAgoDate))).format('DD/MM/YY')

	const monday6WeeksAgo = moment(new Date(getFirstMondayOfWeek(sixWeeksAgoDate))).format('DD/MM/YY')

	const monday7WeeksAgo = moment(new Date(getFirstMondayOfWeek(sevenWeeksAgoDate))).format('DD/MM/YY')

	const monday8WeeksAgo = moment(new Date(getFirstMondayOfWeek(eightWeeksAgoDate))).format('DD/MM/YY')

	const monday9WeeksAgo = moment(new Date(getFirstMondayOfWeek(nineWeeksAgoDate))).format('DD/MM/YY')

	const monday10WeeksAgo = moment(new Date(getFirstMondayOfWeek(tenWeeksAgoDate))).format('DD/MM/YY')

	const monday11WeeksAgo = moment(new Date(getFirstMondayOfWeek(elevenWeeksAgoDate))).format('DD/MM/YY')

	const monday12WeeksAgo = moment(new Date(getFirstMondayOfWeek(twelveWeeksAgoDate))).format('DD/MM/YY')

	// console.log(lastWeekMonday)

	for (let machine of machines) {
		let lastWeek = 0
		let twoWeeksAgo = 0
		let threeWeeksAgo = 0
		let fourWeeksAgo = 0
		let fiveWeeksAgo = 0
		let sixWeeksAgo = 0
		let sevenWeeksAgo = 0
		let eightWeeksAgo = 0
		let nineWeeksAgo = 0
		let tenWeeksAgo = 0
		let elevenWeeksAgo = 0
		let twelveWeeksAgo = 0
		let totalRun = 0
		let totalAv = 0
		let average = 0

		// if (machine.machineName === 'Cloos Cell 2 (S)') machine.machineName = 'Cloos Cell 2 (M)'

		for (let r of result) {
			if (r._id.machineName === machine.machineName && r._id.week === twelveWeeksAgoDate) {
				twelveWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === elevenWeeksAgoDate) {
				elevenWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === tenWeeksAgoDate) {
				tenWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === nineWeeksAgoDate) {
				nineWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === eightWeeksAgoDate) {
				eightWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === sevenWeeksAgoDate) {
				sevenWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === sixWeeksAgoDate) {
				sixWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === fiveWeeksAgoDate) {
				fiveWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === fourWeeksAgoDate) {
				fourWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === threeWeeksAgoDate) {
				threeWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === twoWeeksAgoDate) {
				twoWeeksAgo = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}
			if (r._id.machineName === machine.machineName && r._id.week === lastWeekDate) {
				lastWeek = r.averageEff
				totalAv += r.sum_of_avv_mins
				totalRun += r.sum_of_running_mins
			}

			if (totalRun > 0) {
				average = Math.round((totalRun / totalAv) * 100)
			}
		}

		dataArr.push({
			name: machine.machineName,
			bu: machine.shortBu,
			twelveWeeksAgo,
			elevenWeeksAgo,
			tenWeeksAgo,
			nineWeeksAgo,
			eightWeeksAgo,
			sevenWeeksAgo,
			sixWeeksAgo,
			fiveWeeksAgo,
			fourWeeksAgo,
			threeWeeksAgo,
			twoWeeksAgo,
			lastWeek,
			average,
		})
	}

	res.render('josh/robotEffweek', {
		dataArr,
		lastWeekMonday,
		monday2WeeksAgo,
		monday3WeeksAgo,
		monday4WeeksAgo,
		monday5WeeksAgo,
		monday6WeeksAgo,
		monday7WeeksAgo,
		monday8WeeksAgo,
		monday9WeeksAgo,
		monday10WeeksAgo,
		monday11WeeksAgo,
		monday12WeeksAgo,
		shortBu,
	})
}
