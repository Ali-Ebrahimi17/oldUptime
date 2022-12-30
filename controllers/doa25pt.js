const Claim = require('../models/claim')
const Inspector = require('../models/inspector')
const Area = require('../models/area')
const Doa25pt = require('../models/doa25pt')
const FailureMode = require('../models/failuremode')
const FailureType = require('../models/failuretype')

const Detection = require('../models/detection')
const Model = require('../models/models')
const moment = require('moment')

let momentDays = require('moment-business-days')
moment.updateLocale('gb', {
	workingWeekdays: [1, 2, 3, 4, 5],
})

function formatDate(input) {
	let datePart = input.match(/\d+/g),
		year = datePart[0],
		month = datePart[1],
		day = +datePart[2]

	return day + '/' + month + '/' + year
}

const startOfYerar = moment().format('YYYY, 01, 01')
const startOfYearDB = new Date(startOfYerar)

const cors = require('cors')
const nodemailer = require('nodemailer')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.renderNewFailureTypeForm = async (req, res) => {
	const { id } = req.params

	res.render('failureType/new', { id })
}
module.exports.renderNewFailureTypeForm1 = async (req, res) => {
	const { id } = req.params

	res.render('failureType/newAgain', { id })
}

module.exports.createNewFailureType = async (req, res) => {
	const { id } = req.params
	const failiureType = new FailureType(req.body.failureType)

	await failiureType.save()

	res.redirect(`/doa25pt/grade/${id}`)
}
module.exports.createNewFailureType1 = async (req, res) => {
	const { id } = req.params
	const failiureType = new FailureType(req.body.failureType)

	await failiureType.save()

	res.redirect(`/doa25pt/gradeAgain/${id}`)
}
module.exports.renderNewFailureModeForm = async (req, res) => {
	const { id } = req.params

	res.render('failureMode/new', { id })
}
module.exports.renderNewFailureModeForm1 = async (req, res) => {
	const { id } = req.params

	res.render('failureMode/newAgain', { id })
}

module.exports.createNewFailureMode = async (req, res) => {
	const { id } = req.params
	const failiureMode = new FailureMode(req.body.failureMode)

	await failiureMode.save()

	res.redirect(`/doa25pt/grade/${id}`)
}
module.exports.createNewFailureMode1 = async (req, res) => {
	const { id } = req.params
	const failiureMode = new FailureMode(req.body.failureMode)

	await failiureMode.save()

	res.redirect(`/doa25pt/gradeAgain/${id}`)
}

module.exports.repeatData = async (req, res) => {
	let { division, failuremode, failuretype, id } = req.params

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const startDate = new Date('2021, 07, 01')
	startDate.setHours(0, 0, 0, 0)

	const newDoa25pt = await Doa25pt.findById(id)
	if (failuretype) {
		failuretype = failuretype.replace(/[\-\\]/g, '/')
	}

	const latestBuildDate = newDoa25pt.buildDate

	const doa25pts = await Claim.find({
		failuremode: failuremode,
		failuretype: failuretype,
		division: division,
		level: 'Major',
		fourC: 'Yes',
		// containedAt: { $lt: latestBuildDate },
		vettedAt: { $lt: today },
		$or: [{ containedAt: { $lt: latestBuildDate } }, { status: 'Open' }],
	}).sort({ status: 'desc' })

	res.render('doa25pt/repeatData', { division, doa25pts })
}
module.exports.toGrade = async (req, res) => {
	const start = new Date('2021, 07, 05')
	start.setHours(0, 0, 0, 0)

	const doa25pts = await Doa25pt.find({
		graded: { $ne: 'Yes' },
		createdAt: { $gte: start },
	}).sort({ createdAt: 'desc' })

	res.render('doa25pt/toGrade', { doa25pts })
}
module.exports.minors = async (req, res) => {
	const start = new Date('2021, 07, 05')
	start.setHours(0, 0, 0, 0)

	const doa25pts = await Doa25pt.find({
		grade: 'Minor',
		createdAt: { $gte: start },
	}).sort({ gradedAt: 'desc' })

	res.render('doa25pt/minors', { doa25pts })
}

module.exports.majors = async (req, res) => {
	const start = new Date('2021, 07, 05')
	start.setHours(0, 0, 0, 0)

	const doa25pts = await Doa25pt.find({
		grade: 'Major',
		createdAt: { $gte: start },
	}).sort({ gradedAt: 'desc' })

	res.render('doa25pt/majors', { doa25pts })
}

// route to show the 4C tracker
module.exports.tracker = async (req, res) => {
	const { division } = req.params

	if (division === 'Cabs') {
		const count = await Claim.aggregate([
			{
				$match: {
					area: 'Cabs Systems',
					fourC: 'Yes',
					status: 'Open',
					level: 'Major',
				},
			},
			{
				$group: {
					_id: '$division',
					count: {
						$sum: 1,
					},
				},
			},
			{ $sort: { count: -1, _id: 1 } },
		])

		let searchOptions = {
			fourC: 'Yes',
			area: 'Cabs Systems',
			level: 'Major',
		}

		if (req.query.claimNumber != null && req.query.claimNumber != '') {
			searchOptions.claimNumber = new RegExp(escapeRegex(req.query.claimNumber), 'gi')
		}
		if (req.query.failedPart != null && req.query.failedPart != '') {
			searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
		}
		if (req.query.area != null && req.query.area != '') {
			searchOptions.area = new RegExp(escapeRegex(req.query.area), 'gi')
		}

		if (req.query.division != null && req.query.division != '') {
			searchOptions.division = new RegExp(escapeRegex(req.query.division), 'gi')
		}

		const auditedThisWeek = await Claim.countDocuments({
			area: 'Cabs Systems',
			fourC: 'Yes',
			status: 'Closed',
			level: 'Major',
			auditedAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
		})

		let auditedThisWeekPercent = 0

		if (auditedThisWeek > 0) {
			auditedThisWeekPercent = Math.round((auditedThisWeek / 20) * 100)
		}

		const areas = [
			{
				name: 'BHL',
			},
			{
				name: 'CP',
			},
			{
				name: 'EM',
			},
			{
				name: 'HP',
			},
			{
				name: 'LDL',
			},
			{
				name: 'LP',
			},
			{
				name: 'SD',
			},
		]
		const detections = await Detection.find({ division: division })
		const models = await Model.find({ division: division })
		const claims = await Claim.find(searchOptions).sort({ status: 'desc', vettedAt: -1 }).limit(500)

		res.render('doa25pt/tracker', {
			claims,
			areas,
			detections,
			models,
			division,
			count,
			auditedThisWeek,
			auditedThisWeekPercent,
		})
	} else if (division === 'HBU') {
		const count = await Claim.aggregate([
			{
				$match: {
					area: 'HBU',
					fourC: 'Yes',
					status: 'Open',
					level: 'Major',
				},
			},
			{
				$group: {
					_id: '$division',
					count: {
						$sum: 1,
					},
				},
			},
			{ $sort: { count: -1, _id: 1 } },
		])

		let searchOptions = {
			fourC: 'Yes',
			area: 'HBU',
			level: 'Major',
		}

		if (req.query.claimNumber != null && req.query.claimNumber != '') {
			searchOptions.claimNumber = new RegExp(escapeRegex(req.query.claimNumber), 'gi')
		}
		if (req.query.failedPart != null && req.query.failedPart != '') {
			searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
		}
		if (req.query.area != null && req.query.area != '') {
			searchOptions.area = new RegExp(escapeRegex(req.query.area), 'gi')
		}

		if (req.query.division != null && req.query.division != '') {
			searchOptions.division = new RegExp(escapeRegex(req.query.division), 'gi')
		}

		const auditedThisWeek = await Claim.countDocuments({
			area: 'HBU',
			fourC: 'Yes',
			status: 'Closed',
			level: 'Major',
			auditedAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
		})

		let auditedThisWeekPercent = 0

		if (auditedThisWeek > 0) {
			auditedThisWeekPercent = Math.round((auditedThisWeek / 20) * 100)
		}

		const areas = [
			{
				name: 'BHL',
			},
			{
				name: 'CP',
			},
			{
				name: 'EM',
			},
			{
				name: 'HP',
			},
			{
				name: 'LDL',
			},
			{
				name: 'LP',
			},
			{
				name: 'SD',
			},
		]
		const detections = await Detection.find({ division: division })
		const models = await Model.find({ division: division })
		const claims = await Claim.find(searchOptions).sort({ status: 'desc', vettedAt: -1 }).limit(500)

		res.render('doa25pt/tracker', {
			claims,
			areas,
			detections,
			models,
			division,
			count,
			auditedThisWeek,
			auditedThisWeekPercent,
		})
	} else {
		const count = await Claim.aggregate([
			{
				$match: {
					division: division,
					fourC: 'Yes',
					status: 'Open',
					level: 'Major',
				},
			},
			{
				$group: {
					_id: '$area',
					count: {
						$sum: 1,
					},
				},
			},
			{ $sort: { count: -1, _id: 1 } },
		])

		let searchOptions = {
			fourC: 'Yes',
			division: division,
			level: 'Major',
		}

		if (req.query.claimNumber != null && req.query.claimNumber != '') {
			searchOptions.claimNumber = new RegExp(escapeRegex(req.query.claimNumber), 'gi')
		}
		if (req.query.failedPart != null && req.query.failedPart != '') {
			searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
		}
		if (req.query.area != null && req.query.area != '') {
			searchOptions.area = new RegExp(escapeRegex(req.query.area), 'gi')
		}

		const auditedThisWeek = await Claim.countDocuments({
			division: division,
			fourC: 'Yes',
			status: 'Closed',
			level: 'Major',
			auditedAt: {
				$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
		})

		let auditedThisWeekPercent = 0

		if (auditedThisWeek > 0) {
			auditedThisWeekPercent = Math.round((auditedThisWeek / 20) * 100)
		}

		const areas = await Area.find({ division: division }).sort({ name: '' })
		const detections = await Detection.find({ division: division })
		const models = await Model.find({ division: division })
		const claims = await Claim.find(searchOptions).sort({ status: 'desc', vettedAt: -1 }).limit(500)

		res.render('doa25pt/tracker', {
			claims,
			areas,
			detections,
			models,
			division,
			count,
			auditedThisWeek,
			auditedThisWeekPercent,
		})
	}
}
module.exports.index = async (req, res) => {
	const { division } = req.params
	const start = new Date(2021, 07, 08)
	start.setHours(1, 0, 0, 0)
	let searchOptions = { division: division, grade: 'Major' }

	if (req.query.twNumber != null && req.query.twNumber != '') {
		searchOptions.twNumber = new RegExp(escapeRegex(req.query.twNumber), 'gi')
	}
	if (req.query.name != null && req.query.mane != '') {
		searchOptions.name = new RegExp(escapeRegex(req.query.name), 'gi')
	}
	const doa25pts = await Doa25pt.find(searchOptions).sort({
		createdAt: 'desc',
	})

	res.render('doa25pt/all', { division, doa25pts })
}
// module.exports.toGrade = async (req, res) => {
// 	const start = new Date()
// 	start.setHours(0, 0, 0, 0)

// 	const doa25pts = await Doa25pt.find({
// 		graded    : null,
// 		createdAt : { $gte: start },
// 	}).sort({ createdAt: 'desc' })

// 	res.render('doa25pt/toGrade', { doa25pts })
// }
module.exports.minors = async (req, res) => {
	const start = new Date('2021, 07, 05')
	start.setHours(0, 0, 0, 0)

	const doa25pts = await Doa25pt.find({
		grade: 'Minor',
		createdAt: { $gte: start },
	}).sort({ gradedAt: 'desc' })

	res.render('doa25pt/minors', { doa25pts })
}

module.exports.dash = async (req, res) => {
	const startDate = new Date('2021, 07, 10')
	startDate.setHours(0, 0, 0, 0)
	const start = new Date()
	start.setHours(0, 0, 0, 0)

	const today = moment().format('DD/MM/YYYY')

	//new stuff
	const majors = await Doa25pt.find({
		gradedAt: { $gt: start },
		grade: 'Major',
	}).sort({})

	const majorsLDL = await Doa25pt.countDocuments({
		gradedAt: { $gte: start },
		grade: 'Major',
		division: 'LDL',
	})
	const majorsBHL = await Doa25pt.countDocuments({
		gradedAt: { $gte: start },
		grade: 'Major',
		division: 'BHL',
	})
	const majorsSD = await Doa25pt.countDocuments({
		gradedAt: { $gte: start },
		grade: 'Major',
		division: 'SD',
	})
	const majorsCP = await Doa25pt.countDocuments({
		gradedAt: { $gte: start },
		grade: 'Major',
		division: 'CP',
	})
	const majorsEM = await Doa25pt.countDocuments({
		gradedAt: { $gte: start },
		grade: 'Major',
		division: 'EM',
	})
	const majorsHP = await Doa25pt.countDocuments({
		gradedAt: { $gte: start },
		grade: 'Major',
		division: 'HP',
	})
	const majorsLP = await Doa25pt.countDocuments({
		gradedAt: { $gte: start },
		grade: 'Major',
		division: 'LP',
	})
	const majorsGroup = await Doa25pt.countDocuments({
		gradedAt: { $gte: start },
		grade: 'Major',
	})

	// late section

	const thisMonth = new Date('2021, 07, 08')
	thisMonth.setHours(0, 0, 0, 0)
	var currentDate = new Date()
	var firstDay = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()))

	const thisWeek = moment().startOf('week').add(1, 'days').format('DD/MM/YYYY')

	const oneDayAgoHelp = moment().businessSubtract(3).format('YYYY, MM, DD')
	const sevenDaysAgoHelp = moment().businessSubtract(6).format('YYYY, MM, DD')

	const oneDayAgo = new Date(oneDayAgoHelp)
	const sevenDaysAgo = new Date(sevenDaysAgoHelp)

	const majorsOpenGroup = await Claim.countDocuments({
		status: 'Open',
		fourC: 'Yes',
		level: 'Major',
		vettedAt: { $lte: oneDayAgo },
	})
	const majorsOpenGroupData = await Claim.find({
		status: 'Open',
		fourC: 'Yes',
		level: 'Major',
		vettedAt: { $lte: oneDayAgo },
	})

	const majorsTotalGroup = majorsOpenGroup

	const majorsOpenLDL = await Claim.countDocuments({
		status: 'Open',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
		vettedAt: { $lte: oneDayAgo },
	})

	const majorsOpenBHL = await Claim.countDocuments({
		status: 'Open',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
		vettedAt: { $lte: oneDayAgo },
	})

	const majorsOpenSD = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})
	const majorsOpenCP = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})

	const majorsOpenHP = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})

	const majorsOpenEM = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})

	const majorsOpenLP = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})

	//month

	const majorsContainedGroupM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		level: 'Major',
	})
	const majorsContainedGroupMData = await Claim.find({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		level: 'Major',
	})

	const majorsTotalGroupM = majorsContainedGroupM

	const majorsContainedLDLM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
	})
	const majorsContainedBHLM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
	})

	const majorsContainedSDM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})

	const majorsContainedCPM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})

	const majorsContainedHPM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})

	const majorsContainedEMM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})

	const majorsContainedLPM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})

	const allLateData = [...majorsOpenGroupData, ...majorsContainedGroupMData]

	res.render('doa25pt/dash', {
		allLateData,
		today,
		majors,
		majorsLDL,
		majorsBHL,
		majorsSD,
		majorsCP,
		majorsEM,
		majorsLP,
		majorsHP,
		majorsGroup,

		// late section
		majorsOpenGroup,
		majorsTotalGroup,
		majorsOpenLDL,
		majorsOpenBHL,
		majorsOpenSD,
		majorsOpenCP,
		majorsOpenHP,
		majorsOpenEM,
		majorsOpenLP,
		//month

		majorsContainedGroupM,
		majorsTotalGroupM,
		majorsContainedLDLM,
		majorsContainedBHLM,
		majorsContainedSDM,
		majorsContainedCPM,
		majorsContainedHPM,
		majorsContainedEMM,
		majorsContainedLPM,
		//data
		majorsOpenGroupData,
		majorsContainedGroupMData,
	})
}

module.exports.weekMonth = async (req, res) => {
	const thisMonth = new Date('2020, 01, 01')
	thisMonth.setHours(0, 0, 0, 0)
	let currentDate = new Date()
	let firstDay = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()))

	const today = moment().format('DD/MM/YYYY')
	const thisWeekHelp = moment().startOf('week').add(1, 'days').format('YYYY, MM, DD')
	// const thisMonthHelp = moment().startOf('month').format('YYYY, MM, DD')

	const thisWeek = new Date(thisWeekHelp)
	// const thisMonth = new Date(thisMonthHelp)

	const majorsOpenGroup = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Open',
		fourC: 'Yes',
		level: 'Major',
	})
	const majorsContainedGroup = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Contained',
		fourC: 'Yes',
		level: 'Major',
	})
	const majorsClosedGroup = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Closed',
		fourC: 'Yes',
		level: 'Major',
	})

	const majorsTotalGroup = majorsOpenGroup + majorsContainedGroup + majorsClosedGroup

	const majorsOpenLDL = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Open',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
	})
	const majorsContainedLDL = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Contained',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
	})
	const majorsClosedLDL = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Closed',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
	})
	const majorsOpenBHL = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Open',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
	})
	const majorsContainedBHL = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Contained',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
	})
	const majorsClosedBHL = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Closed',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
	})
	const majorsOpenSD = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Open',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})
	const majorsContainedSD = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Contained',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})
	const majorsClosedSD = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Closed',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})
	const majorsOpenCP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Open',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})
	const majorsContainedCP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Contained',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})
	const majorsClosedCP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Closed',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})
	const majorsOpenHP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Open',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})
	const majorsContainedHP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Contained',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})
	const majorsClosedHP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Closed',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})
	const majorsOpenEM = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Open',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})
	const majorsContainedEM = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Contained',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})
	const majorsClosedEM = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Closed',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})
	const majorsOpenLP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Open',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})
	const majorsContainedLP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Contained',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})
	const majorsClosedLP = await Claim.countDocuments({
		vettedAt: { $gte: thisWeek },
		status: 'Closed',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})

	//month

	const majorsOpenGroupM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Open',
		fourC: 'Yes',
		level: 'Major',
	})
	const majorsContainedGroupM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Contained',
		fourC: 'Yes',
		level: 'Major',
	})
	const majorsClosedGroupM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Closed',
		fourC: 'Yes',
		level: 'Major',
	})

	const majorsTotalGroupM = majorsOpenGroupM + majorsContainedGroupM + majorsClosedGroupM

	const majorsOpenLDLM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Open',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
	})
	const majorsContainedLDLM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Contained',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
	})
	const majorsClosedLDLM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Closed',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
	})
	const majorsOpenBHLM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Open',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
	})
	const majorsContainedBHLM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Contained',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
	})
	const majorsClosedBHLM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Closed',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
	})
	const majorsOpenSDM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Open',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})
	const majorsContainedSDM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Contained',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})
	const majorsClosedSDM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Closed',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})
	const majorsOpenCPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Open',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})
	const majorsContainedCPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Contained',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})
	const majorsClosedCPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Closed',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})
	const majorsOpenHPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Open',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})
	const majorsContainedHPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Contained',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})
	const majorsClosedHPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Closed',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})
	const majorsOpenEMM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Open',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})
	const majorsContainedEMM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Contained',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})
	const majorsClosedEMM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Closed',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})
	const majorsOpenLPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Open',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})
	const majorsContainedLPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Contained',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})
	const majorsClosedLPM = await Claim.countDocuments({
		vettedAt: { $gte: thisMonth },
		status: 'Closed',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})

	res.render('doa25pt/weekMonth', {
		today,
		thisWeek,
		majorsOpenGroup,
		majorsContainedGroup,
		majorsClosedGroup,
		majorsTotalGroup,
		majorsOpenLDL,
		majorsContainedLDL,
		majorsClosedLDL,
		majorsOpenBHL,
		majorsContainedBHL,
		majorsClosedBHL,
		majorsOpenSD,
		majorsContainedSD,
		majorsClosedSD,
		majorsOpenCP,
		majorsContainedCP,
		majorsClosedCP,
		majorsOpenHP,
		majorsContainedHP,
		majorsClosedHP,
		majorsOpenEM,
		majorsContainedEM,
		majorsClosedEM,
		majorsOpenLP,
		majorsContainedLP,
		majorsClosedLP,
		//month
		majorsOpenGroupM,
		majorsContainedGroupM,
		majorsClosedGroupM,
		majorsTotalGroupM,
		majorsOpenLDLM,
		majorsContainedLDLM,
		majorsClosedLDLM,
		majorsOpenBHLM,
		majorsContainedBHLM,
		majorsClosedBHLM,
		majorsOpenSDM,
		majorsContainedSDM,
		majorsClosedSDM,
		majorsOpenCPM,
		majorsContainedCPM,
		majorsClosedCPM,
		majorsOpenHPM,
		majorsContainedHPM,
		majorsClosedHPM,
		majorsOpenEMM,
		majorsContainedEMM,
		majorsClosedEMM,
		majorsOpenLPM,
		majorsContainedLPM,
		majorsClosedLPM,
	})
}

//late
module.exports.late = async (req, res) => {
	const thisMonth = new Date('2021, 07, 08')
	thisMonth.setHours(0, 0, 0, 0)
	var currentDate = new Date()
	var firstDay = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()))

	const today = moment().format('DD/MM/YYYY')
	const thisWeek = moment().startOf('week').add(1, 'days').format('DD/MM/YYYY')
	// const thisMonth = moment().startOf('month').format('DD/MM/YYYY')
	// const oneDayAgoHelp = moment().businessSubtract(1).format('YYYY, MM, DD')
	// const sevenDaysAgoHelp = moment().businessSubtract(4).format('YYYY, MM, DD')
	const oneDayAgoHelp = moment().businessSubtract(3).format('YYYY, MM, DD')
	const sevenDaysAgoHelp = moment().businessSubtract(6).format('YYYY, MM, DD')

	const oneDayAgo = new Date(oneDayAgoHelp)
	const sevenDaysAgo = new Date(sevenDaysAgoHelp)

	const majorsOpenGroup = await Claim.countDocuments({
		status: 'Open',
		fourC: 'Yes',
		level: 'Major',
		vettedAt: { $lte: oneDayAgo },
	})
	const majorsOpenGroupData = await Claim.find({
		status: 'Open',
		fourC: 'Yes',
		level: 'Major',
		vettedAt: { $lte: oneDayAgo },
	})

	const majorsTotalGroup = majorsOpenGroup

	const majorsOpenLDL = await Claim.countDocuments({
		status: 'Open',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
		vettedAt: { $lte: oneDayAgo },
	})

	const majorsOpenBHL = await Claim.countDocuments({
		status: 'Open',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
		vettedAt: { $lte: oneDayAgo },
	})

	const majorsOpenSD = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})
	const majorsOpenCP = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})

	const majorsOpenHP = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})

	const majorsOpenEM = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})

	const majorsOpenLP = await Claim.countDocuments({
		vettedAt: { $lte: oneDayAgo },
		status: 'Open',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})

	//month

	const majorsContainedGroupM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		level: 'Major',
	})
	const majorsContainedGroupMData = await Claim.find({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		level: 'Major',
	})

	const majorsTotalGroupM = majorsContainedGroupM

	const majorsContainedLDLM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'LDL',
		level: 'Major',
	})
	const majorsContainedBHLM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'BHL',
		level: 'Major',
	})

	const majorsContainedSDM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'SD',
		level: 'Major',
	})

	const majorsContainedCPM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'CP',
		level: 'Major',
	})

	const majorsContainedHPM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'HP',
		level: 'Major',
	})

	const majorsContainedEMM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'EM',
		level: 'Major',
	})

	const majorsContainedLPM = await Claim.countDocuments({
		vettedAt: { $gte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		division: 'LP',
		level: 'Major',
	})

	res.render('doa25pt/late', {
		today,
		thisWeek,
		majorsOpenGroup,
		majorsTotalGroup,
		majorsOpenLDL,
		majorsOpenBHL,
		majorsOpenSD,
		majorsOpenCP,
		majorsOpenHP,
		majorsOpenEM,
		majorsOpenLP,
		//month

		majorsContainedGroupM,
		majorsTotalGroupM,
		majorsContainedLDLM,
		majorsContainedBHLM,
		majorsContainedSDM,
		majorsContainedCPM,
		majorsContainedHPM,
		majorsContainedEMM,
		majorsContainedLPM,
		//data
		majorsOpenGroupData,
		majorsContainedGroupMData,
	})
}

module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params
	const models = await Model.find({ division: division }).sort({ name: '' })
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const failuremodes = await FailureMode.find({}).sort({ name: '' })
	const failuretypes = await FailureType.find({}).sort({ name: '' })

	res.render('doa25pt/new', {
		division,
		models,
		inspectors,
		failuremodes,
		failuretypes,
	})
}

module.exports.createNew = async (req, res, next) => {
	const doa25pt = new Doa25pt(req.body.doa25pt)
	const division = req.body.doa25pt.division
	doa25pt.vettedBy = req.user.firstName + ' ' + req.user.lastName
	doa25pt.createdAt = Date.now()

	await doa25pt.save()

	res.redirect(`/doa25pt/all/${division}`)
	// res.redirect('/');
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params

	const doa25pt = await Doa25pt.findById(id)
	if (!doa25pt) {
		req.flash('error', 'Cannot find that DOA 25pt+')
		res.redirect('/')
	}
	const division = doa25pt.division
	const models = await Model.find({ division: division }).sort({ name: '' })
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const failuremodes = await FailureMode.find({}).sort({ name: '' })
	const failuretypes = await FailureType.find({}).sort({ name: '' })

	res.render('doa25pt/edit', {
		division,
		doa25pt,
		models,
		inspectors,
		failuremodes,
		failuretypes,
	})
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const doa25pt = await Doa25pt.findByIdAndUpdate(id, {
		...req.body.doa25pt,
	})

	const division = doa25pt.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/doa25pt/all/${division}`)
}
module.exports.renderGradeForm = async (req, res) => {
	const { id } = req.params

	const doa25pt = await Doa25pt.findById(id)
	if (!doa25pt) {
		req.flash('error', 'Cannot find that DOA 25pt+')
		res.redirect('/')
	}
	const division = doa25pt.division
	const models = await Model.find({ division: division }).sort({ name: '' })
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const failuremodes = await FailureMode.find({}).sort({ name: '' })
	const failuretypes = await FailureType.find({}).sort({ name: '' })

	res.render('doa25pt/grade', {
		division,
		doa25pt,
		models,
		inspectors,
		failuremodes,
		failuretypes,
	})
}

module.exports.grade = async (req, res) => {
	const { id } = req.params

	const startDate = new Date('2021, 07, 10')
	startDate.setHours(0, 0, 0, 0)
	const start = new Date()
	start.setHours(0, 0, 0, 0)

	let fourC = 'No'

	if (req.body.doa25pt.grade === 'Major') {
		fourC = 'Yes'
	}

	const doa25pt = await Doa25pt.findByIdAndUpdate(id, {
		...req.body.doa25pt,
		gradedAt: Date.now(),
		graded: 'Yes',
		gradedBy: req.user.firstName + ' ' + req.user.lastName,
		hasFourC: fourC,
		count: 0,
	})

	const theDoa = await Doa25pt.aggregate([
		{
			$match: {
				twNumber: doa25pt.twNumber,
			},
		},
		{
			$project: {
				_id: -1,

				buildDate: {
					$substr: ['$buildDate', 0, 10],
				},
			},
		},
	])

	let newBuild = formatDate(theDoa[0].buildDate)

	openclaims = await Claim.find({
		failuremode: req.body.doa25pt.failuremode,
		failuretype: req.body.doa25pt.failuretype,
		division: doa25pt.division,
		level: 'Major',
		fourC: 'Yes',
		$and: [{ vettedAt: { $lt: start } }, { vettedAt: { $gt: startDate } }],
		status: 'Open',
	})
	notOpenclaims = await Claim.find({
		failuremode: req.body.doa25pt.failuremode,
		failuretype: req.body.doa25pt.failuretype,
		division: doa25pt.division,
		level: 'Major',
		fourC: 'Yes',
		$and: [{ vettedAt: { $lt: start } }, { vettedAt: { $gt: startDate } }],

		status: { $ne: 'Open' },
		containedAt: { $lt: doa25pt.buildDate },
	})

	await Doa25pt.findByIdAndUpdate(id, {
		count: openclaims.length + notOpenclaims.length,
	})

	// console.log('Not Open => ', openclaims)
	// console.log('Not Open => ', notOpenclaims)

	if (req.body.doa25pt.grade === 'Major') {
		const data = {
			vettedBy: req.user.firstName + ' ' + req.user.lastName,
			vettedAt: Date.now(),
			status: 'Open',
			fourC: 'Yes',
			level: req.body.doa25pt.grade,
			claimNumber: doa25pt.twNumber,
			area: doa25pt.division,
			name: doa25pt.name,
			buildDate: newBuild,
			model: doa25pt.model,
			description: doa25pt.description,
			failuremode: req.body.doa25pt.failuremode,
			failuretype: req.body.doa25pt.failuretype,
			division: doa25pt.division,
			abcd: 'C',
			hours: doa25pt.hours,
			dealer: doa25pt.dealer,
			tPeriod: 'Major',
			points: req.body.doa25pt.points,
		}
		const claim = new Claim(data)
		const division = doa25pt.division

		await claim.save()

		// console.log(claim)

		// let theEmails = [ 'ali.ebrahimi@jcb.com' ]

		if (division === 'LDL') {
			theEmails = ['soron.glynn@Jcb.com', 'mark.norton@jcb.com', 'ali.ebrahimi@jcb.com']
		}
		if (division === 'BHL') {
			theEmails = [
				'stacy.burnett@Jcb.com',
				'steve.clay@jcb.com',
				'scott.frame@jcb.com',
				'mark.willmore@jcb.com',
				'mark.norton@jcb.com',
				'steve-c.lewis@jcb.com',
				'zak.dyche@jcb.com',
				'timothy.wareham@jcb.com',
				'ali.ebrahimi@jcb.com',
			]
		}
		if (division === 'SD') {
			theEmails = [
				'stacy.burnett@Jcb.com',
				'steve.clay@jcb.com',
				'scott.frame@jcb.com',
				'mark.willmore@jcb.com',
				'mark.norton@jcb.com',
				'steve-c.lewis@jcb.com',
				'zak.dyche@jcb.com',
				'timothy.wareham@jcb.com',
				'ali.ebrahimi@jcb.com',
			]
		}
		if (division === 'EM') {
			theEmails = [
				'mark.edwards@Jcb.com',
				'Nick.Briggs@jcb.com',
				'martin.harper@jcb.com',
				'mark.norton@jcb.com',
				'ali.ebrahimi@jcb.com',
				'gavin.archer@jcb.com',
				'joe.hopwood@jcb.com',
				'tom.hodson@jcb.com',
				'Adam.wainwright@jcb.com',
				'jordan.lomas@jcb.com',
				'adam.pedley@jcb.com',
			]
		}
		if (division === 'LP') {
			theEmails = [
				'mark.edwards@Jcb.com',
				'Nick.Briggs@jcb.com',
				'martin.harper@jcb.com',
				'mark.norton@jcb.com',
				'ali.ebrahimi@jcb.com',
				'gavin.archer@jcb.com',
				'joe.hopwood@jcb.com',
				'tom.hodson@jcb.com',
				'Adam.wainwright@jcb.com',
				'jordan.lomas@jcb.com',
				'adam.pedley@jcb.com',
			]
		}
		if (division === 'CP') {
			theEmails = ['stuart.blake@Jcb.com', 'stephen.causer@jcb.com', 'mark.norton@jcb.com', 'ali.ebrahimi@jcb.com']
		}
		if (division === 'HP') {
			theEmails = ['steve.parker@Jcb.com', 'leila.worsley@jcb.com', 'mark.norton@jcb.com', 'ali.ebrahimi@jcb.com']
		}

		const transporter = nodemailer.createTransport({
			host: process.env.HOST, //Host
			port: process.env.PORT, // Port
			tls: {
				rejectUnauthorized: false,
			},
		})

		let mailOptions = {
			from: 'JCB-Quality.Uptime@jcb.com',
			to: theEmails,
			subject: `*URGENT* A 4C has been raised and added to the ${division} Major Escape tracker that requires containment within 24 hours.`,
			html:
				`<img src="cid:jcb-logo"/>` +
				`<h2>*URGENT* A 4C has been raised and added to the ${division} Major Escape Tracker that requires containment within 24 hours.</h2>` +
				`<h4>It has been scored ${req.body.doa25pt.points} points</h4>` +
				`<h4>It was raised for ${req.body.doa25pt.failuremode} - ${req.body.doa25pt.failuretype}</h4>` +
				`<h4>You can view it using this link:</h4>` +
				`<h4>http://quality-uptime.jcb.local/claims/4cshow/${claim._id}</h4>` +
				`<h4>Thanks</h4>` +
				`<h4>JCB Quality Uptime</h4>`,

			attachments: [
				{
					filename: 'QUT.png',
					path: './PDF/images/QUT.png',
					cid: 'jcb-logo',
				},
			],
		}
		// send the email
		transporter.sendMail(mailOptions, () => {})

		req.flash('success', '4C issued and email has been sent.')
	}

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/doa25pt/toGrade`)
}
module.exports.renderGradeAgainForm = async (req, res) => {
	const { id } = req.params

	const doa25pt = await Doa25pt.findById(id)
	if (!doa25pt) {
		req.flash('error', 'Cannot find that DOA 25pt+')
		res.redirect('/doa25pt/dash')
	}
	const division = doa25pt.division
	const models = await Model.find({ division: division }).sort({ name: '' })
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const failuremodes = await FailureMode.find({}).sort({ name: '' })
	const failuretypes = await FailureType.find({}).sort({ name: '' })

	res.render('doa25pt/gradeAgain', {
		division,
		doa25pt,
		models,
		inspectors,
		failuremodes,
		failuretypes,
	})
}

module.exports.gradeAgain = async (req, res) => {
	const { id } = req.params

	const startDate = new Date('2021, 07, 10')
	startDate.setHours(0, 0, 0, 0)
	const start = new Date()
	start.setHours(0, 0, 0, 0)

	const doa25pt = await Doa25pt.findByIdAndUpdate(id, {
		...req.body.doa25pt,
		gradedBy: req.user.firstName + ' ' + req.user.lastName,
		count: 0,
	})

	openclaims = await Claim.find({
		failuremode: req.body.doa25pt.failuremode,
		failuretype: req.body.doa25pt.failuretype,
		division: doa25pt.division,
		level: 'Major',
		fourC: 'Yes',
		$and: [{ vettedAt: { $lt: start } }, { vettedAt: { $gt: startDate } }],
		status: 'Open',
	})
	notOpenclaims = await Claim.find({
		failuremode: req.body.doa25pt.failuremode,
		failuretype: req.body.doa25pt.failuretype,
		division: doa25pt.division,
		level: 'Major',
		fourC: 'Yes',
		$and: [{ vettedAt: { $lt: start } }, { vettedAt: { $gt: startDate } }],

		status: { $ne: 'Open' },
		containedAt: { $lt: doa25pt.buildDate },
	})

	const doa25pt2 = await Doa25pt.findByIdAndUpdate(id, {
		count: openclaims.length + notOpenclaims.length,
	})

	if (req.body.doa25pt.grade === 'Major' && doa25pt.hasFourC === 'No') {
		const doa25pt1 = await Doa25pt.findByIdAndUpdate(id, {
			hasFourC: 'Yes',
		})

		const theDoa = await Doa25pt.aggregate([
			{
				$match: {
					twNumber: doa25pt.twNumber,
				},
			},
			{
				$project: {
					_id: -1,

					buildDate: {
						$substr: ['$buildDate', 0, 10],
					},
				},
			},
		])

		let newBuild = formatDate(theDoa[0].buildDate)

		const data = {
			vettedBy: req.user.firstName + ' ' + req.user.lastName,
			vettedAt: Date.now(),
			status: 'Open',
			fourC: 'Yes',
			level: req.body.doa25pt.grade,
			claimNumber: doa25pt.twNumber,
			area: doa25pt.division,
			name: doa25pt.name,
			buildDate: newBuild,
			model: doa25pt.model,
			description: doa25pt.description,
			failuremode: req.body.doa25pt.failuremode,
			failuretype: req.body.doa25pt.failuretype,
			points: req.body.doa25pt.points,
			division: doa25pt.division,
			abcd: 'C',
			hours: doa25pt.hours,
			dealer: doa25pt.dealer,
			tPeriod: 'Major',
		}
		const claim = new Claim(data)
		const division = doa25pt.division

		await claim.save()

		// let theEmails = [ 'ali.ebrahimi' ]

		if (division === 'LDL') {
			theEmails = ['soron.glynn@Jcb.com', 'mark.norton@jcb.com', 'ali.ebrahimi@jcb.com']
		}
		if (division === 'BHL') {
			theEmails = [
				'stacy.burnett@Jcb.com',
				'steve.clay@jcb.com',
				'scott.frame@jcb.com',
				'mark.willmore@jcb.com',
				'mark.norton@jcb.com',
				'steve-c.lewis@jcb.com',
				'zak.dyche@jcb.com',
				'timothy.wareham@jcb.com',
				'ali.ebrahimi@jcb.com',
			]
		}
		if (division === 'SD') {
			theEmails = [
				'stacy.burnett@Jcb.com',
				'steve.clay@jcb.com',
				'scott.frame@jcb.com',
				'mark.willmore@jcb.com',
				'mark.norton@jcb.com',
				'steve-c.lewis@jcb.com',
				'zak.dyche@jcb.com',
				'timothy.wareham@jcb.com',
				'ali.ebrahimi@jcb.com',
			]
		}
		if (division === 'EM') {
			theEmails = [
				'mark.edwards@Jcb.com',
				'Nick.Briggs@jcb.com',
				'martin.harper@jcb.com',
				'mark.norton@jcb.com',
				'ali.ebrahimi@jcb.com',
				'gavin.archer@jcb.com',
				'joe.hopwood@jcb.com',
				'tom.hodson@jcb.com',
				'Adam.wainwright@jcb.com',
				'jordan.lomas@jcb.com',
				'adam.pedley@jcb.com',
			]
		}
		if (division === 'LP') {
			theEmails = [
				'mark.edwards@Jcb.com',
				'Nick.Briggs@jcb.com',
				'martin.harper@jcb.com',
				'mark.norton@jcb.com',
				'ali.ebrahimi@jcb.com',
				'gavin.archer@jcb.com',
				'joe.hopwood@jcb.com',
				'tom.hodson@jcb.com',
				'Adam.wainwright@jcb.com',
				'jordan.lomas@jcb.com',
				'adam.pedley@jcb.com',
			]
		}
		if (division === 'CP') {
			theEmails = ['stuart.blake@Jcb.com', 'stephen.causer@jcb.com', 'Adam.wainwright@jcb.com', 'mark.norton@jcb.com', 'ali.ebrahimi@jcb.com']
		}
		if (division === 'HP') {
			theEmails = ['steve.parker@Jcb.com', 'leila.worsley@jcb.com', 'mark.norton@jcb.com', 'ali.ebrahimi@jcb.com']
		}

		const transporter = nodemailer.createTransport({
			host: process.env.HOST, //Host
			port: process.env.PORT, // Port
			tls: {
				rejectUnauthorized: false,
			},
		})

		let mailOptions = {
			from: 'JCB-Quality.Uptime@jcb.com',
			to: theEmails,
			subject: `*URGENT* A 4C has been raised and added to the ${division} Major Escape tracker that requires containment within 24 hours.`,
			html:
				`<img src="cid:jcb-logo"/>` +
				`<h2>*URGENT* A 4C has been raised and added to the ${division} Major Escape Tracker that requires containment within 24 hours.</h2>` +
				`<h4>It has been scored ${req.body.doa25pt.points} points</h4>` +
				`<h4>It was raised for ${req.body.doa25pt.failuremode} - ${req.body.doa25pt.failuretype}</h4>` +
				`<h4>You can view it using this link:</h4>` +
				`<h4>http://quality-uptime.jcb.local/claims/4cshow/${claim._id}</h4>` +
				`<h4>Thanks</h4>` +
				`<h4>JCB Quality Uptime</h4>`,

			attachments: [
				{
					filename: 'QUT.png',
					path: './PDF/images/QUT.png',
					cid: 'jcb-logo',
				},
			],
		}

		// send the email
		transporter.sendMail(mailOptions, () => {})

		req.flash('success', '4C issued and email has been sent.')
	}

	const division = doa25pt.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/doa25pt/toGrade`)
}

module.exports.delete = async (req, res) => {
	const { id } = req.params
	await Doa25pt.findByIdAndDelete(id)
	req.flash('success', 'Successfully deleted DOA 25pt+')
	res.redirect('/')
}

module.exports.renderImageForm = async (req, res) => {
	const { id } = req.params

	const claim = await Claim.findById(id)
	if (!claim) {
		req.flash('error', 'Cannot find 4C')
		res.redirect('/')
	}

	res.render('doa25pt/imageForm', { claim })
}

module.exports.addImages = async (req, res) => {
	const { id } = req.params

	const claim = await Claim.findById(id, {})
	claim.image1 = req.files[0] && req.files[0].filename
	claim.image2 = req.files[1] && req.files[1].filename
	claim.image3 = req.files[2] && req.files[2].filename
	claim.image4 = req.files[3] && req.files[3].filename
	claim.image5 = req.files[4] && req.files[4].filename

	await claim.save()

	const division = claim.division
	const fourC = claim._id

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/claims/4cshow/${fourC}`)
}

module.exports.monthlyIntake = async (req, res) => {
	const start = new Date('2021, 07, 06')
	start.setHours(0, 0, 0, 0)

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

	let thisMonthText = moment().subtract(0, 'months').format('MMM')
	let oneMonthAgoText = moment().subtract(1, 'months').format('MMM')
	let twoMonthsAgoText = moment().subtract(2, 'months').format('MMM')
	let threeMonthsAgoText = moment().subtract(3, 'months').format('MMM')
	let fourMonthsAgoText = moment().subtract(4, 'months').format('MMM')
	let fiveMonthsAgoText = moment().subtract(5, 'months').format('MMM')
	let sixMonthsAgoText = moment().subtract(6, 'months').format('MMM')
	let sevenMonthsAgoText = moment().subtract(7, 'months').format('MMM')

	let dataArrBuild = []

	let divisions = [
		{
			names: ['BHL', 'SD'],
		},
		{
			names: ['LDL'],
		},
		{
			names: ['CP'],
		},
		{
			names: ['EM'],
		},
		{
			names: ['LP'],
		},
		{
			names: ['HP'],
		},
		{
			names: ['BHL', 'SD', 'LDL', 'CP', 'EM', 'LP', 'HP'],
		},
	]
	const pointsArr = ['250', '25', '5', '0']
	const monthArr = [
		{
			month: +sevenMonthsAgoNumber,
			year: +sevenMonthsAgoNumberY,
		},
		{
			month: +sixMonthsAgoNumber,
			year: +sixMonthsAgoNumberY,
		},
		{
			month: +fiveMonthsAgoNumber,
			year: +fiveMonthsAgoNumberY,
		},
		{
			month: +fourMonthsAgoNumber,
			year: +fourMonthsAgoNumberY,
		},
		{
			month: +threeMonthsAgoNumber,
			year: +threeMonthsAgoNumberY,
		},
		{
			month: +twoMonthsAgoNumber,
			year: +twoMonthsAgoNumberY,
		},
		{
			month: +oneMonthAgoNumber,
			year: +oneMonthAgoNumberY,
		},
		{
			month: +thisMonthNumber,
			year: +thisMonthNumberY,
		},
	]

	const labels = [
		sevenMonthsAgoText,
		sixMonthsAgoText,
		fiveMonthsAgoText,
		fourMonthsAgoText,
		threeMonthsAgoText,
		twoMonthsAgoText,
		oneMonthAgoText,
		thisMonthText,
	]

	// const zero = await Doa25pt.find({ points: '0' })

	// console.log(zero)

	for (let division of divisions) {
		let divisionArr = []
		for (let point of pointsArr) {
			let theActualMonthArr = []
			let countArr = []
			for (let month of monthArr) {
				let theMonth = month.month
				let buildMonth = await Doa25pt.aggregate([
					{
						$match: {
							division: {
								$in: division.names,
							},
							grade: 'Major',
							points: point,
						},
					},
					{
						$project: {
							_id: 0,
							month: { $month: '$buildDate' },
							year: { $year: '$buildDate' },
						},
					},
					{
						$match: {
							month: month.month,
							year: month.year,
						},
					},
					{
						$addFields: {
							totalsArr: [],
						},
					},
				])
				let count = buildMonth.length

				countArr.push(count)
			}

			divisionArr.push({ countArr })
		}

		dataArrBuild.push({
			bu: division.names,
			divisionArr,
			totalsArr: [],
		})
	}

	//report month

	for (let division of divisions) {
		let divisionArr = []
		for (let point of pointsArr) {
			let theActualMonthArr = []
			let countArr = []
			for (let month of monthArr) {
				let theMonth = month.month
				let buildMonth = await Doa25pt.aggregate([
					{
						$match: {
							division: {
								$in: division.names,
							},
							grade: 'Major',
							points: point,
						},
					},
					{
						$project: {
							_id: 0,
							month: { $month: '$createdAt' },
							year: { $year: '$createdAt' },
						},
					},
					{
						$match: {
							month: month.month,
							year: month.year,
						},
					},

					{
						$addFields: {
							totalsArr: [],
						},
					},
				])
				let count = buildMonth.length

				countArr.push(count)
			}

			divisionArr.push({ countArr })
		}

		dataArrBuild.push({
			bu: division.names,
			divisionArr,
			totalsArr: [],
		})
	}

	for (let x of dataArrBuild) {
		// console.log(x)

		let month1 = 0
		let month2 = 0
		let month3 = 0
		let month4 = 0
		let month5 = 0
		let month6 = 0
		let month7 = 0
		let month8 = 0

		// console.log(division.countArr[0])

		// for (let count of division.countArr) {
		month1 += x.divisionArr[0].countArr[0] + x.divisionArr[1].countArr[0] + x.divisionArr[2].countArr[0] + x.divisionArr[3].countArr[0]
		month2 += x.divisionArr[0].countArr[1] + x.divisionArr[1].countArr[1] + x.divisionArr[2].countArr[1] + x.divisionArr[3].countArr[1]
		month3 += x.divisionArr[0].countArr[2] + x.divisionArr[1].countArr[2] + x.divisionArr[2].countArr[2] + x.divisionArr[3].countArr[2]
		month4 += x.divisionArr[0].countArr[3] + x.divisionArr[1].countArr[3] + x.divisionArr[2].countArr[3] + x.divisionArr[3].countArr[3]
		month5 += x.divisionArr[0].countArr[4] + x.divisionArr[1].countArr[4] + x.divisionArr[2].countArr[4] + x.divisionArr[3].countArr[4]
		month6 += x.divisionArr[0].countArr[5] + x.divisionArr[1].countArr[5] + x.divisionArr[2].countArr[5] + x.divisionArr[3].countArr[5]
		month7 += x.divisionArr[0].countArr[6] + x.divisionArr[1].countArr[6] + x.divisionArr[2].countArr[6] + x.divisionArr[3].countArr[6]
		month8 += x.divisionArr[0].countArr[7] + x.divisionArr[1].countArr[7] + x.divisionArr[2].countArr[7] + x.divisionArr[3].countArr[7]

		x.totalsArr = [month1, month2, month3, month4, month5, month6, month7, month8]
	}

	// console.log(dataArrBuild)

	res.render('doa25pt/monthlyIntake', {
		dataArrBuild,
		labels,

		thisMonthText,
		oneMonthAgoText,
		twoMonthsAgoText,
		threeMonthsAgoText,
		fourMonthsAgoText,
		fiveMonthsAgoText,
		sixMonthsAgoText,
		sevenMonthsAgoText,
	})
}

// late containment/closure

module.exports.lateContClosure = async (req, res) => {
	const start = new Date('2021, 07, 06')
	start.setHours(0, 0, 0, 0)

	let thisMonth = moment().subtract(0, 'months').format('MM/YYYY')
	let oneMonthAgo = moment().subtract(1, 'months').format('MM/YYYY')
	let twoMonthsAgo = moment().subtract(2, 'months').format('MM/YYYY')
	let threeMonthsAgo = moment().subtract(3, 'months').format('MM/YYYY')
	let fourMonthsAgo = moment().subtract(4, 'months').format('MM/YYYY')
	let fiveMonthsAgo = moment().subtract(5, 'months').format('MM/YYYY')
	let sixMonthsAgo = moment().subtract(6, 'months').format('MM/YYYY')
	let sevenMonthsAgo = moment().subtract(7, 'months').format('MM/YYYY')

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

	//bhl & sd build

	const now = new Date()

	const bhlSDNotOpenOne = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDOpenOne = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Open',
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDBuildOne = bhlSDOpenOne.length + bhlSDNotOpenOne.length

	const bhlSDNotOpenTwo = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDOpenTwo = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDBuildTwo = bhlSDOpenTwo.length + bhlSDNotOpenTwo.length

	const bhlSDNotOpenThree = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDOpenThree = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDBuildThree = bhlSDOpenThree.length + bhlSDNotOpenThree.length

	const bhlSDNotOpenFour = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDOpenFour = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDBuildFour = bhlSDOpenFour.length + bhlSDNotOpenFour.length

	const bhlSDNotOpenFive = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDOpenFive = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDBuildFive = bhlSDOpenFive.length + bhlSDNotOpenFive.length

	const bhlSDNotOpenSix = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDOpenSix = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDBuildSix = bhlSDOpenSix.length + bhlSDNotOpenSix.length

	const bhlSDNotOpenSeven = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDOpenSeven = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const bhlSDBuildSeven = bhlSDOpenSeven.length + bhlSDNotOpenSeven.length

	const bhlSDNotOpenEight = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const bhlSDOpenEight = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const bhlSDBuildEight = bhlSDOpenEight.length + bhlSDNotOpenEight.length

	//ldl build

	const ldlNotOpenOne = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlOpenOne = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Open',
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlBuildOne = ldlOpenOne.length + ldlNotOpenOne.length

	const ldlNotOpenTwo = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlOpenTwo = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlBuildTwo = ldlOpenTwo.length + ldlNotOpenTwo.length

	const ldlNotOpenThree = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlOpenThree = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlBuildThree = ldlOpenThree.length + ldlNotOpenThree.length

	const ldlNotOpenFour = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlOpenFour = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlBuildFour = ldlOpenFour.length + ldlNotOpenFour.length

	const ldlNotOpenFive = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlOpenFive = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlBuildFive = ldlOpenFive.length + ldlNotOpenFive.length

	const ldlNotOpenSix = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlOpenSix = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const ldlBuildSix = ldlOpenSix.length + ldlNotOpenSix.length

	const ldlNotOpenSeven = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const ldlOpenSeven = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const ldlBuildSeven = ldlOpenSeven.length + ldlNotOpenSeven.length

	const ldlNotOpenEight = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const ldlOpenEight = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const ldlBuildEight = ldlOpenEight.length + ldlNotOpenEight.length

	//cp build

	const cpNotOpenOne = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpOpenOne = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Open',
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpBuildOne = cpOpenOne.length + cpNotOpenOne.length

	const cpNotOpenTwo = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpOpenTwo = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpBuildTwo = cpOpenTwo.length + cpNotOpenTwo.length

	const cpNotOpenThree = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpOpenThree = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpBuildThree = cpOpenThree.length + cpNotOpenThree.length

	const cpNotOpenFour = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpOpenFour = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpBuildFour = cpOpenFour.length + cpNotOpenFour.length

	const cpNotOpenFive = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpOpenFive = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpBuildFive = cpOpenFive.length + cpNotOpenFive.length

	const cpNotOpenSix = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpOpenSix = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const cpBuildSix = cpOpenSix.length + cpNotOpenSix.length

	const cpNotOpenSeven = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const cpOpenSeven = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const cpBuildSeven = cpOpenSeven.length + cpNotOpenSeven.length

	const cpNotOpenEight = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const cpOpenEight = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const cpBuildEight = cpOpenEight.length + cpNotOpenEight.length

	//em build

	const emNotOpenOne = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emOpenOne = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Open',
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emBuildOne = emOpenOne.length + emNotOpenOne.length

	const emNotOpenTwo = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emOpenTwo = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emBuildTwo = emOpenTwo.length + emNotOpenTwo.length

	const emNotOpenThree = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emOpenThree = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emBuildThree = emOpenThree.length + emNotOpenThree.length

	const emNotOpenFour = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emOpenFour = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emBuildFour = emOpenFour.length + emNotOpenFour.length

	const emNotOpenFive = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emOpenFive = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emBuildFive = emOpenFive.length + emNotOpenFive.length

	const emNotOpenSix = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emOpenSix = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const emBuildSix = emOpenSix.length + emNotOpenSix.length

	const emNotOpenSeven = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const emOpenSeven = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const emBuildSeven = emOpenSeven.length + emNotOpenSeven.length

	const emNotOpenEight = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const emOpenEight = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const emBuildEight = emOpenEight.length + emNotOpenEight.length

	//lp build

	const lpNotOpenOne = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpOpenOne = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Open',
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpBuildOne = lpOpenOne.length + lpNotOpenOne.length

	const lpNotOpenTwo = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpOpenTwo = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpBuildTwo = lpOpenTwo.length + lpNotOpenTwo.length

	const lpNotOpenThree = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpOpenThree = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpBuildThree = lpOpenThree.length + lpNotOpenThree.length

	const lpNotOpenFour = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpOpenFour = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpBuildFour = lpOpenFour.length + lpNotOpenFour.length

	const lpNotOpenFive = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpOpenFive = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpBuildFive = lpOpenFive.length + lpNotOpenFive.length

	const lpNotOpenSix = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpOpenSix = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const lpBuildSix = lpOpenSix.length + lpNotOpenSix.length

	const lpNotOpenSeven = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const lpOpenSeven = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const lpBuildSeven = lpOpenSeven.length + lpNotOpenSeven.length

	const lpNotOpenEight = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const lpOpenEight = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const lpBuildEight = lpOpenEight.length + lpNotOpenEight.length

	//hp build

	const hpNotOpenOne = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpOpenOne = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Open',
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpBuildOne = hpOpenOne.length + hpNotOpenOne.length

	const hpNotOpenTwo = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpOpenTwo = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpBuildTwo = hpOpenTwo.length + hpNotOpenTwo.length

	const hpNotOpenThree = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpOpenThree = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpBuildThree = hpOpenThree.length + hpNotOpenThree.length

	const hpNotOpenFour = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpOpenFour = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpBuildFour = hpOpenFour.length + hpNotOpenFour.length

	const hpNotOpenFive = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpOpenFive = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpBuildFive = hpOpenFive.length + hpNotOpenFive.length

	const hpNotOpenSix = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
				claimNumber: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpOpenSix = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const hpBuildSix = hpOpenSix.length + hpNotOpenSix.length

	const hpNotOpenSeven = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const hpOpenSeven = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const hpBuildSeven = hpOpenSeven.length + hpNotOpenSeven.length

	const hpNotOpenEight = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const hpOpenEight = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const hpBuildEight = hpOpenEight.length + hpNotOpenEight.length

	//group late contained

	const groupNotOpenOne = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupOpenOne = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Open',
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sevenMonthsAgoNumber,
						year: +sevenMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupBuildOne = groupOpenOne.length + groupNotOpenOne.length

	const groupNotOpenTwo = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupOpenTwo = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +sixMonthsAgoNumber,
						year: +sixMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupBuildTwo = groupOpenTwo.length + groupNotOpenTwo.length

	const groupNotOpenThree = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupOpenThree = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fiveMonthsAgoNumber,
						year: +fiveMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupBuildThree = groupOpenThree.length + groupNotOpenThree.length

	const groupNotOpenFour = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupOpenFour = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +fourMonthsAgoNumber,
						year: +fourMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupBuildFour = groupOpenFour.length + groupNotOpenFour.length

	const groupNotOpenFive = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupOpenFive = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +threeMonthsAgoNumber,
						year: +threeMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupBuildFive = groupOpenFive.length + groupNotOpenFive.length

	const groupNotOpenSix = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupOpenSix = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +twoMonthsAgoNumber,
						year: +twoMonthsAgoNumberY,
					},
				],
			},
		},
	])

	const groupBuildSix = groupOpenSix.length + groupNotOpenSix.length

	const groupNotOpenSeven = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const groupOpenSeven = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +oneMonthAgoNumber,
						year: +oneMonthAgoNumberY,
					},
				],
			},
		},
	])

	const groupBuildSeven = groupOpenSeven.length + groupNotOpenSeven.length

	const groupNotOpenEight = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const groupOpenEight = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Open',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +thisMonthNumber,
						year: +thisMonthNumberY,
					},
				],
			},
		},
	])

	const groupBuildEight = groupOpenEight.length + groupNotOpenEight.length

	//late closure

	// bhl & sd report

	const bhlSDNotOpenOneC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const bhlSDOpenOneC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: { $ne: 'Closed' },
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const bhlSDBuildOneC = bhlSDOpenOneC.length + bhlSDNotOpenOneC.length

	const bhlSDNotOpenTwoC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const bhlSDOpenTwoC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const bhlSDBuildTwoC = bhlSDOpenTwoC.length + bhlSDNotOpenTwoC.length

	const bhlSDNotOpenThreeC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const bhlSDOpenThreeC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const bhlSDBuildThreeC = bhlSDOpenThreeC.length + bhlSDNotOpenThreeC.length

	const bhlSDNotOpenFourC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const bhlSDOpenFourC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const bhlSDBuildFourC = bhlSDOpenFourC.length + bhlSDNotOpenFourC.length

	const bhlSDNotOpenFiveC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$losedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const bhlSDOpenFiveC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const bhlSDBuildFiveC = bhlSDOpenFiveC.length + bhlSDNotOpenFiveC.length

	const bhlSDNotOpenSixC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const bhlSDOpenSixC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const bhlSDBuildSixC = bhlSDOpenSixC.length + bhlSDNotOpenSixC.length

	const bhlSDNotOpenSevenC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const bhlSDOpenSevenC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const bhlSDBuildSevenC = bhlSDOpenSevenC.length + bhlSDNotOpenSevenC.length

	const bhlSDNotOpenEightC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const bhlSDOpenEightC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: ['BHL', 'SD'],
				},
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const bhlSDBuildEightC = bhlSDOpenEightC.length + bhlSDNotOpenEightC.length

	//loadall late closure

	const ldlNotOpenOneC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const ldlOpenOneC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: { $ne: 'Closed' },
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const ldlBuildOneC = ldlOpenOneC.length + ldlNotOpenOneC.length

	const ldlNotOpenTwoC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const ldlOpenTwoC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const ldlBuildTwoC = ldlOpenTwoC.length + ldlNotOpenTwoC.length

	const ldlNotOpenThreeC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const ldlOpenThreeC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const ldlBuildThreeC = ldlOpenThreeC.length + ldlNotOpenThreeC.length

	const ldlNotOpenFourC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const ldlOpenFourC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const ldlBuildFourC = ldlOpenFourC.length + ldlNotOpenFourC.length

	const ldlNotOpenFiveC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$losedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const ldlOpenFiveC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const ldlBuildFiveC = ldlOpenFiveC.length + ldlNotOpenFiveC.length

	const ldlNotOpenSixC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const ldlOpenSixC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const ldlBuildSixC = ldlOpenSixC.length + ldlNotOpenSixC.length

	const ldlNotOpenSevenC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const ldlOpenSevenC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const ldlBuildSevenC = ldlOpenSevenC.length + ldlNotOpenSevenC.length

	const ldlNotOpenEightC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const ldlOpenEightC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LDL',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const ldlBuildEightC = ldlOpenEightC.length + ldlNotOpenEightC.length

	//cp late

	const cpNotOpenOneC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const cpOpenOneC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: { $ne: 'Closed' },
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const cpBuildOneC = cpOpenOneC.length + cpNotOpenOneC.length

	const cpNotOpenTwoC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const cpOpenTwoC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const cpBuildTwoC = cpOpenTwoC.length + cpNotOpenTwoC.length

	const cpNotOpenThreeC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const cpOpenThreeC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const cpBuildThreeC = cpOpenThreeC.length + cpNotOpenThreeC.length

	const cpNotOpenFourC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const cpOpenFourC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const cpBuildFourC = cpOpenFourC.length + cpNotOpenFourC.length

	const cpNotOpenFiveC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$losedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const cpOpenFiveC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const cpBuildFiveC = cpOpenFiveC.length + cpNotOpenFiveC.length

	const cpNotOpenSixC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const cpOpenSixC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const cpBuildSixC = cpOpenSixC.length + cpNotOpenSixC.length

	const cpNotOpenSevenC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const cpOpenSevenC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const cpBuildSevenC = cpOpenSevenC.length + cpNotOpenSevenC.length

	const cpNotOpenEightC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const cpOpenEightC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'CP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const cpBuildEightC = cpOpenEightC.length + cpNotOpenEightC.length

	//em late

	const emNotOpenOneC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const emOpenOneC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: { $ne: 'Closed' },
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const emBuildOneC = emOpenOneC.length + emNotOpenOneC.length

	const emNotOpenTwoC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const emOpenTwoC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const emBuildTwoC = emOpenTwoC.length + emNotOpenTwoC.length

	const emNotOpenThreeC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const emOpenThreeC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const emBuildThreeC = emOpenThreeC.length + emNotOpenThreeC.length

	const emNotOpenFourC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const emOpenFourC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const emBuildFourC = emOpenFourC.length + emNotOpenFourC.length

	const emNotOpenFiveC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$losedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const emOpenFiveC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const emBuildFiveC = emOpenFiveC.length + emNotOpenFiveC.length

	const emNotOpenSixC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const emOpenSixC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const emBuildSixC = emOpenSixC.length + emNotOpenSixC.length

	const emNotOpenSevenC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const emOpenSevenC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const emBuildSevenC = emOpenSevenC.length + emNotOpenSevenC.length

	const emNotOpenEightC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const emOpenEightC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'EM',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const emBuildEightC = emOpenEightC.length + emNotOpenEightC.length

	// lp late closure

	const lpNotOpenOneC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const lpOpenOneC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: { $ne: 'Closed' },
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const lpBuildOneC = lpOpenOneC.length + lpNotOpenOneC.length

	const lpNotOpenTwoC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const lpOpenTwoC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const lpBuildTwoC = lpOpenTwoC.length + lpNotOpenTwoC.length

	const lpNotOpenThreeC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const lpOpenThreeC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const lpBuildThreeC = lpOpenThreeC.length + lpNotOpenThreeC.length

	const lpNotOpenFourC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const lpOpenFourC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const lpBuildFourC = lpOpenFourC.length + lpNotOpenFourC.length

	const lpNotOpenFiveC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$losedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const lpOpenFiveC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const lpBuildFiveC = lpOpenFiveC.length + lpNotOpenFiveC.length

	const lpNotOpenSixC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const lpOpenSixC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const lpBuildSixC = lpOpenSixC.length + lpNotOpenSixC.length

	const lpNotOpenSevenC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const lpOpenSevenC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const lpBuildSevenC = lpOpenSevenC.length + lpNotOpenSevenC.length

	const lpNotOpenEightC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const lpOpenEightC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'LP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const lpBuildEightC = lpOpenEightC.length + lpNotOpenEightC.length

	// hp late closure

	const hpNotOpenOneC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const hpOpenOneC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: { $ne: 'Closed' },
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const hpBuildOneC = hpOpenOneC.length + hpNotOpenOneC.length

	const hpNotOpenTwoC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const hpOpenTwoC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const hpBuildTwoC = hpOpenTwoC.length + hpNotOpenTwoC.length

	const hpNotOpenThreeC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const hpOpenThreeC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const hpBuildThreeC = hpOpenThreeC.length + hpNotOpenThreeC.length

	const hpNotOpenFourC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const hpOpenFourC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const hpBuildFourC = hpOpenFourC.length + hpNotOpenFourC.length

	const hpNotOpenFiveC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$losedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const hpOpenFiveC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const hpBuildFiveC = hpOpenFiveC.length + hpNotOpenFiveC.length

	const hpNotOpenSixC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const hpOpenSixC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const hpBuildSixC = hpOpenSixC.length + hpNotOpenSixC.length

	const hpNotOpenSevenC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const hpOpenSevenC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const hpBuildSevenC = hpOpenSevenC.length + hpNotOpenSevenC.length

	const hpNotOpenEightC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const hpOpenEightC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: 'HP',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const hpBuildEightC = hpOpenEightC.length + hpNotOpenEightC.length

	// group late closure

	const groupNotOpenOneC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const groupOpenOneC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: { $ne: 'Closed' },
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sevenMonthsAgoNumber,
				year: +sevenMonthsAgoNumberY,
			},
		},
	])

	const groupBuildOneC = groupOpenOneC.length + groupNotOpenOneC.length

	const groupNotOpenTwoC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const groupOpenTwoC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +sixMonthsAgoNumber,
				year: +sixMonthsAgoNumberY,
			},
		},
	])

	const groupBuildTwoC = groupOpenTwoC.length + groupNotOpenTwoC.length

	const groupNotOpenThreeC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const groupOpenThreeC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fiveMonthsAgoNumber,
				year: +fiveMonthsAgoNumberY,
			},
		},
	])

	const groupBuildThreeC = groupOpenThreeC.length + groupNotOpenThreeC.length

	const groupNotOpenFourC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const groupOpenFourC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +fourMonthsAgoNumber,
				year: +fourMonthsAgoNumberY,
			},
		},
	])

	const groupBuildFourC = groupOpenFourC.length + groupNotOpenFourC.length

	const groupNotOpenFiveC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$losedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const groupOpenFiveC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +threeMonthsAgoNumber,
				year: +threeMonthsAgoNumberY,
			},
		},
	])

	const groupBuildFiveC = groupOpenFiveC.length + groupNotOpenFiveC.length

	const groupNotOpenSixC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const groupOpenSixC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +twoMonthsAgoNumber,
				year: +twoMonthsAgoNumberY,
			},
		},
	])

	const groupBuildSixC = groupOpenSixC.length + groupNotOpenSixC.length

	const groupNotOpenSevenC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const groupOpenSevenC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +oneMonthAgoNumber,
				year: +oneMonthAgoNumberY,
			},
		},
	])

	const groupBuildSevenC = groupOpenSevenC.length + groupNotOpenSevenC.length

	const groupNotOpenEightC = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const groupOpenEightC = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				status: { $ne: 'Closed' },
			},
		},

		{
			$project: {
				_id: 0,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				closedAt: 1,
				vettedAt: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +thisMonthNumber,
				year: +thisMonthNumberY,
			},
		},
	])

	const groupBuildEightC = groupOpenEightC.length + groupNotOpenEightC.length

	res.render('doa25pt/lateContClosure', {
		thisMonthText,
		oneMonthAgoText,
		twoMonthsAgoText,
		threeMonthsAgoText,
		fourMonthsAgoText,
		fiveMonthsAgoText,
		sixMonthsAgoText,
		sevenMonthsAgoText,

		bhlSDBuildOne,
		bhlSDBuildTwo,
		bhlSDBuildThree,
		bhlSDBuildFour,
		bhlSDBuildFive,
		bhlSDBuildSix,
		bhlSDBuildSeven,
		bhlSDBuildEight,

		ldlBuildOne,
		ldlBuildTwo,
		ldlBuildThree,
		ldlBuildFour,
		ldlBuildFive,
		ldlBuildSix,
		ldlBuildSeven,
		ldlBuildEight,

		cpBuildOne,
		cpBuildTwo,
		cpBuildThree,
		cpBuildFour,
		cpBuildFive,
		cpBuildSix,
		cpBuildSeven,
		cpBuildEight,

		emBuildOne,
		emBuildTwo,
		emBuildThree,
		emBuildFour,
		emBuildFive,
		emBuildSix,
		emBuildSeven,
		emBuildEight,

		lpBuildOne,
		lpBuildTwo,
		lpBuildThree,
		lpBuildFour,
		lpBuildFive,
		lpBuildSix,
		lpBuildSeven,
		lpBuildEight,

		hpBuildOne,
		hpBuildTwo,
		hpBuildThree,
		hpBuildFour,
		hpBuildFive,
		hpBuildSix,
		hpBuildSeven,
		hpBuildEight,

		groupBuildOne,
		groupBuildTwo,
		groupBuildThree,
		groupBuildFour,
		groupBuildFive,
		groupBuildSix,
		groupBuildSeven,
		groupBuildEight,

		bhlSDBuildOneC,
		bhlSDBuildTwoC,
		bhlSDBuildThreeC,
		bhlSDBuildFourC,
		bhlSDBuildFiveC,
		bhlSDBuildSixC,
		bhlSDBuildSevenC,
		bhlSDBuildEightC,

		ldlBuildOneC,
		ldlBuildTwoC,
		ldlBuildThreeC,
		ldlBuildFourC,
		ldlBuildFiveC,
		ldlBuildSixC,
		ldlBuildSevenC,
		ldlBuildEightC,

		cpBuildOneC,
		cpBuildTwoC,
		cpBuildThreeC,
		cpBuildFourC,
		cpBuildFiveC,
		cpBuildSixC,
		cpBuildSevenC,
		cpBuildEightC,

		emBuildOneC,
		emBuildTwoC,
		emBuildThreeC,
		emBuildFourC,
		emBuildFiveC,
		emBuildSixC,
		emBuildSevenC,
		emBuildEightC,

		lpBuildOneC,
		lpBuildTwoC,
		lpBuildThreeC,
		lpBuildFourC,
		lpBuildFiveC,
		lpBuildSixC,
		lpBuildSevenC,
		lpBuildEightC,

		hpBuildOneC,
		hpBuildTwoC,
		hpBuildThreeC,
		hpBuildFourC,
		hpBuildFiveC,
		hpBuildSixC,
		hpBuildSevenC,
		hpBuildEightC,

		groupBuildOneC,
		groupBuildTwoC,
		groupBuildThreeC,
		groupBuildFourC,
		groupBuildFiveC,
		groupBuildSixC,
		groupBuildSevenC,
		groupBuildEightC,
	})
}

module.exports.historicalBuildMonth = async (req, res) => {
	let { division, month } = req.params

	let theMonth = moment().month(month).format('MM')

	let d = new Date()
	let thisMonth = d.getMonth() + 1
	let thisYear = d.getFullYear()
	let lastYear = d.getFullYear() - 1

	let theYear

	if (thisMonth < +theMonth) {
		theYear = lastYear
	} else {
		theYear = thisYear
	}

	let theDivisions = []

	if (division === 'BHL') {
		theDivisions = ['BHL', 'SD']
	}
	if (division === 'LDL') {
		theDivisions = ['LDL']
	}
	if (division === 'CP') {
		theDivisions = ['CP']
	}
	if (division === 'EM') {
		theDivisions = ['EM']
	}
	if (division === 'LP') {
		theDivisions = ['LP']
	}
	if (division === 'HP') {
		theDivisions = ['HP']
	}
	if (division === 'GROUP') {
		theDivisions = ['BHL', 'SD', 'LDL', 'CP', 'EM', 'LP', 'HP']
	}

	const doa25pts = await Doa25pt.aggregate([
		{
			$match: {
				division: {
					$in: theDivisions,
				},
				grade: 'Major',
			},
		},
		{
			$project: {
				_id: 1,
				month: { $month: '$buildDate' },
				year: { $year: '$buildDate' },
				twNumber: 1,
				model: 1,
				name: 1,
				buildDate: 1,
				description: 1,
				createdAt: 1,
				count: 1,
				failuremode: 1,
				failuretype: 1,
				division: 1,
				dealer: 1,
				points: 1,
			},
		},
		{
			$match: {
				month: +theMonth,
				year: +theYear,
			},
		},
	])

	for (let d of doa25pts) {
		d.points = +d.points
	}

	doa25pts.sort(function (a, b) {
		return b.points - a.points
	})

	res.render('doa25pt/hBuildMonth', { doa25pts, division })
}

module.exports.historicalReportMonth = async (req, res) => {
	let { division, month } = req.params

	let theMonth = moment().month(month).format('MM')

	let d = new Date()
	let thisMonth = d.getMonth() + 1
	let thisYear = d.getFullYear()
	let lastYear = d.getFullYear() - 1

	let theYear

	if (thisMonth < +theMonth) {
		theYear = lastYear
	} else {
		theYear = thisYear
	}

	let theDivisions = []

	if (division === 'BHL') {
		theDivisions = ['BHL', 'SD']
	}
	if (division === 'LDL') {
		theDivisions = ['LDL']
	}
	if (division === 'CP') {
		theDivisions = ['CP']
	}
	if (division === 'EM') {
		theDivisions = ['EM']
	}
	if (division === 'LP') {
		theDivisions = ['LP']
	}
	if (division === 'HP') {
		theDivisions = ['HP']
	}
	if (division === 'GROUP') {
		theDivisions = ['BHL', 'SD', 'LDL', 'CP', 'EM', 'LP', 'HP']
	}

	const doa25pts = await Doa25pt.aggregate([
		{
			$match: {
				division: {
					$in: theDivisions,
				},
				grade: 'Major',
			},
		},
		{
			$project: {
				_id: 1,
				month: { $month: '$createdAt' },
				year: { $year: '$createdAt' },
				twNumber: 1,
				model: 1,
				name: 1,
				buildDate: 1,
				description: 1,
				createdAt: 1,
				count: 1,
				failuremode: 1,
				failuretype: 1,
				division: 1,
				points: 1,
			},
		},
		{
			$match: {
				month: +theMonth,
				year: +theYear,
			},
		},
	])

	for (let d of doa25pts) {
		d.points = +d.points
	}

	doa25pts.sort(function (a, b) {
		return b.points - a.points
	})

	res.render('doa25pt/hReportMonth', { doa25pts, division })
}

module.exports.historicalContMonth = async (req, res) => {
	let { division, month } = req.params

	const now = new Date()

	let theMonth = moment().month(month).format('MM')

	let d = new Date()
	let thisMonth = d.getMonth() + 1
	let thisYear = d.getFullYear()
	let lastYear = d.getFullYear() - 1

	let theYear

	if (thisMonth < +theMonth) {
		theYear = lastYear
	} else {
		theYear = thisYear
	}

	let theDivisions = []

	if (division === 'BHL') {
		theDivisions = ['BHL', 'SD']
	}
	if (division === 'LDL') {
		theDivisions = ['LDL']
	}
	if (division === 'CP') {
		theDivisions = ['CP']
	}
	if (division === 'EM') {
		theDivisions = ['EM']
	}
	if (division === 'LP') {
		theDivisions = ['LP']
	}
	if (division === 'HP') {
		theDivisions = ['HP']
	}
	if (division === 'GROUP') {
		theDivisions = ['BHL', 'SD', 'LDL', 'CP', 'EM', 'LP', 'HP']
	}

	const notOpen = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: theDivisions,
				},
				status: {
					$in: ['Closed', 'Contained'],
				},
			},
		},

		{
			$project: {
				_id: 1,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
				twNumber: 1,
				model: 1,
				name: 1,
				buildDate: 1,
				description: 1,
				createdAt: 1,
				closedAt: 1,
				claimNumber: 1,
				status: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$containedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +theMonth,
						year: +theYear,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +theMonth,
						year: +theYear,
					},
				],
			},
		},
	])

	const open = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: theDivisions,
				},
				status: 'Open',
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 1,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
				containedAt: 1,
				vettedAt: 1,
				twNumber: 1,
				model: 1,
				name: 1,
				buildDate: 1,
				description: 1,
				createdAt: 1,
				closedAt: 1,
				claimNumber: 1,
				status: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				$or: [
					{
						daysCount: { $gt: 3 },
						day: 6,
						month: +theMonth,
						year: +theYear,
					},
					{
						daysCount: { $gt: 1 },
						day: { $ne: 6 },
						month: +theMonth,
						year: +theYear,
					},
				],
			},
		},
	])

	const doa25pts = [...open, ...notOpen]

	res.render('doa25pt/hContMonth', { doa25pts, division })
}

module.exports.historicalCloseMonth = async (req, res) => {
	let { division, month } = req.params

	const now = new Date()

	let theMonth = moment().month(month).format('MM')

	let d = new Date()
	let thisMonth = d.getMonth() + 1
	let thisYear = d.getFullYear()
	let lastYear = d.getFullYear() - 1

	let theYear

	if (thisMonth < +theMonth) {
		theYear = lastYear
	} else {
		theYear = thisYear
	}

	let theDivisions = []

	if (division === 'BHL') {
		theDivisions = ['BHL', 'SD']
	}
	if (division === 'LDL') {
		theDivisions = ['LDL']
	}
	if (division === 'CP') {
		theDivisions = ['CP']
	}
	if (division === 'EM') {
		theDivisions = ['EM']
	}
	if (division === 'LP') {
		theDivisions = ['LP']
	}
	if (division === 'HP') {
		theDivisions = ['HP']
	}
	if (division === 'GROUP') {
		theDivisions = ['BHL', 'SD', 'LDL', 'CP', 'EM', 'LP', 'HP']
	}

	const notOpen = await Claim.aggregate([
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: theDivisions,
				},
				status: 'Closed',
			},
		},

		{
			$project: {
				_id: 1,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
				twNumber: 1,
				model: 1,
				name: 1,
				buildDate: 1,
				description: 1,
				createdAt: 1,
				closedAt: 1,
				claimNumber: 1,
				status: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: ['$closedAt', '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},

		{
			$match: {
				daysCount: { $gt: 6 },
				month: +theMonth,
				year: +theYear,
			},
		},
	])

	const open = await Claim.aggregate([
		/** Filter out docs */
		{
			$match: {
				level: 'Major',
				fourC: 'Yes',
				division: {
					$in: theDivisions,
				},
				status: { $ne: 'Closed' },
			},
		},
		/** subtract two dates gets timestamp & divide to convert to days & round value */
		{
			$project: {
				_id: 1,
				day: { $dayOfWeek: '$vettedAt' },
				month: { $month: '$vettedAt' },
				year: { $year: '$vettedAt' },
				containedAt: 1,
				vettedAt: 1,
				containedAt: 1,
				vettedAt: 1,
				twNumber: 1,
				model: 1,
				name: 1,
				buildDate: 1,
				description: 1,
				createdAt: 1,
				closedAt: 1,
				claimNumber: 1,
				status: 1,
			},
		},
		{
			$addFields: {
				daysCount: {
					$round: {
						$divide: [
							{
								$subtract: [now, '$vettedAt'],
							},
							86400000,
						],
					},
				},
			},
		},
		{
			$match: {
				daysCount: { $gt: 6 },
				month: +theMonth,
				year: +theYear,
			},
		},
	])

	const doa25pts = [...open, ...notOpen]

	res.render('doa25pt/hCloseMonth', { doa25pts, division })
}

//loadall dash

module.exports.loadallDash = async (req, res) => {
	const { division } = req.params

	// late section

	const escapes = await Claim.aggregate([
		{
			$match: {
				division: division,
				status: { $ne: 'Closed' },
				level: 'Major',
				fourC: 'Yes',
			},
		},
		{ $sort: { vettedAt: 1 } },
	])

	res.render('doa25pt/loadallDash', {
		division,
		escapes,
	})
}

module.exports.cabsDash = async (req, res) => {
	const startDate = new Date('2021, 07, 10')
	startDate.setHours(0, 0, 0, 0)
	const start = new Date()
	start.setHours(0, 0, 0, 0)

	const today = moment().format('DD/MM/YYYY')

	// old workings

	let repeatsLDL = await Doa25pt.aggregate([
		{
			$match: {
				assignedToArea: { $gt: start },
				area: 'Cabs Systems',
				division: 'LDL',
				count: { $gt: 0 },
				grade: 'Major',
			},
		},
	])

	let repeatsBHL = await Doa25pt.aggregate([
		{
			$match: {
				assignedToArea: { $gt: start },
				area: 'Cabs Systems',
				division: 'BHL',
				count: { $gt: 0 },
				grade: 'Major',
			},
		},
	])
	let repeatsSD = await Doa25pt.aggregate([
		{
			$match: {
				assignedToArea: { $gt: start },
				area: 'Cabs Systems',
				division: 'SD',
				count: { $gt: 0 },
				grade: 'Major',
			},
		},
	])
	let repeatsCP = await Doa25pt.aggregate([
		{
			$match: {
				assignedToArea: { $gt: start },
				area: 'Cabs Systems',
				division: 'CP',
				count: { $gt: 0 },
				grade: 'Major',
			},
		},
	])
	let repeatsEM = await Doa25pt.aggregate([
		{
			$match: {
				assignedToArea: { $gt: start },
				area: 'Cabs Systems',
				division: 'EM',
				count: { $gt: 0 },
				grade: 'Major',
			},
		},
	])
	let repeatsHP = await Doa25pt.aggregate([
		{
			$match: {
				assignedToArea: { $gt: start },
				area: 'Cabs Systems',
				division: 'HP',
				count: { $gt: 0 },
				grade: 'Major',
			},
		},
	])

	let repeatsLP = await Doa25pt.aggregate([
		{
			$match: {
				assignedToArea: { $gt: start },
				area: 'Cabs Systems',
				division: 'LP',
				count: { $gt: 0 },
				grade: 'Major',
			},
		},
	])

	const repeatsGroup =
		repeatsLDL.length + repeatsBHL.length + repeatsSD.length + repeatsCP.length + repeatsEM.length + repeatsHP.length + repeatsLP.length

	//new stuff
	const majors = await Doa25pt.find({
		assignedToArea: { $gt: start },
		area: 'Cabs Systems',
		grade: 'Major',
	}).sort({})

	const majorsGroup = await Doa25pt.countDocuments({
		assignedToArea: { $gt: start },
		area: 'Cabs Systems',
		grade: 'Major',
	})

	// late section

	const thisMonth = new Date('2021, 07, 08')
	thisMonth.setHours(0, 0, 0, 0)
	var currentDate = new Date()
	var firstDay = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()))

	const thisWeek = moment().startOf('week').add(1, 'days').format('DD/MM/YYYY')
	// const thisMonth = moment().startOf('month').format('DD/MM/YYYY')
	// const oneDayAgoHelp = momentDays().businessSubtract(1).format('YYYY, MM, DD')
	// const sevenDaysAgoHelp = momentDays()
	// 	.businessSubtract(4)
	// 	.format('YYYY, MM, DD')
	const oneDayAgoHelp = moment().businessSubtract(3).format('YYYY, MM, DD')
	const sevenDaysAgoHelp = moment().businessSubtract(6).format('YYYY, MM, DD')

	const oneDayAgo = new Date(oneDayAgoHelp)
	const sevenDaysAgo = new Date(sevenDaysAgoHelp)

	const serials = ['3062298', '3062540', '3062440', '3062588', '3062502', '3062287', '3062935', '3063772', '3060183', '3062973', '3060267']

	const majorsOpenGroup = await Claim.countDocuments({
		status: 'Open',
		fourC: 'Yes',
		level: 'Major',
		area: 'Cabs Systems',
		vettedAt: { $lte: oneDayAgo },
	})
	const majorsOpenGroupData = await Claim.find({
		status: 'Open',
		fourC: 'Yes',
		level: 'Major',
		area: 'Cabs Systems',
		vettedAt: { $lte: oneDayAgo },
	})

	const majorsTotalGroup = majorsOpenGroup

	//month

	const majorsContainedGroupM = await Claim.countDocuments({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		level: 'Major',
		area: 'Cabs Systems',
		name: { $nin: serials },
	})
	const majorsContainedGroupMData = await Claim.find({
		vettedAt: { $lte: sevenDaysAgo },
		status: 'Contained',
		fourC: 'Yes',
		level: 'Major',
		area: 'Cabs Systems',
		name: { $nin: serials },
	})

	const majorsTotalGroupM = majorsContainedGroupM

	const allLateData = [...majorsOpenGroupData, ...majorsContainedGroupMData]

	// console.log(majorsOpenGroupData)

	res.render('doa25pt/cabsDash', {
		allLateData,
		today,
		majors,

		majorsGroup,
		repeatsLDL,
		repeatsBHL,
		repeatsSD,
		repeatsCP,
		repeatsEM,
		repeatsHP,
		repeatsLP,
		repeatsGroup,

		// late section
		majorsOpenGroup,
		majorsTotalGroup,

		//month

		majorsContainedGroupM,
		majorsTotalGroupM,

		//data
		majorsOpenGroupData,
		majorsContainedGroupMData,
	})
}
