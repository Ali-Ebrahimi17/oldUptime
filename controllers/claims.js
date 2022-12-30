require('dotenv').config()

const Claim = require('../models/claim')
const Inspector = require('../models/inspector')
const Area = require('../models/area')
const Retail = require('../models/retail')
const DOA25pt = require('../models/doa25pt')
const FailureMode = require('../models/failuremode')
const FailureType = require('../models/failuretype')
const Cabs = require('../models/cabs')
const Stoppage = require('../models/stoppage')
const CabsClaim = require('../models/cabsclaim')
const Order = require('../models/order')
const QSmart = require('../models/qSmart')
const MriClaim = require('../models/mriClaim')

const Detection = require('../models/detection')
const Model = require('../models/models')
const moment = require('moment')

const cors = require('cors')
const nodemailer = require('nodemailer')

const excelToJson = require('convert-excel-to-json')
const fs = require('fs')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// const { makePrediction } = require('../utils/warranty/functions')
const startOfYerar = moment().format('YYYY, 01, 01')
const startOfYearDB = new Date(startOfYerar)

// route to show the 4C tracker
module.exports.index = async (req, res) => {
	const { division } = req.params

	let searchOptions = {}
	let countOptions = []

	// end here

	if (division === 'LDL') {
		countOptions = [
			{
				$match: {
					division: division,
					fourC: 'Yes',
					status: 'Open',
					leak: { $ne: 'Yes' },
				},
			},
			{
				$addFields: {
					formattedBuild: {
						$dateFromString: {
							dateString: '$buildDate',
							format: '%d/%m/%Y',
							timezone: 'Europe/London',
						},
					},
				},
			},
			{
				$match: {
					$or: [{ formattedBuild: { $gte: startOfYearDB } }, { claimNumber: 'Internal Techweb' }],
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
		]
		searchOptions = [
			{
				$match: {
					fourC: 'Yes',
					division: division,
					leak: { $ne: 'Yes' },
					// $or: [{ buildDate: { $regex: '/2022' } }, { claimNumber: 'Internal Techweb' }],
				},
			},
			{
				$addFields: {
					formattedBuild: {
						$dateFromString: {
							dateString: '$buildDate',
							format: '%d/%m/%Y',
							timezone: 'Europe/London',
						},
					},
				},
			},
			{
				$match: {
					$or: [{ formattedBuild: { $gte: startOfYearDB } }, { claimNumber: 'Internal Techweb' }],
				},
			},
			{
				$addFields: {
					numberOfClaims: {
						$cond: {
							if: { $isArray: '$linkedClaims' },
							then: { $size: '$linkedClaims' },
							else: 0,
						},
					},
				},
			},

			{ $sort: { status: -1, vettedAt: -1 } },
		]
	} else if (division === 'EM' || division === 'LP' || division === 'BHL' || division === 'SD' || division === 'HP' || division === 'CP') {
		searchOptions = [
			{
				$match: {
					fourC: 'Yes',
					division: division,
					leak: { $ne: 'Yes' },
					// $or: [{ buildDate: { $regex: '/2022' } }, { claimNumber: 'Internal Techweb' }],
				},
			},
			{
				$addFields: {
					formattedBuild: {
						$dateFromString: {
							dateString: '$buildDate',
							format: '%d/%m/%Y',
							timezone: 'Europe/London',
						},
					},
				},
			},
			{
				$match: {
					$or: [{ formattedBuild: { $gte: startOfYearDB } }, { claimNumber: 'Internal Techweb' }],
				},
			},
			{
				$addFields: {
					numberOfClaims: {
						$cond: {
							if: { $isArray: '$linkedClaims' },
							then: { $size: '$linkedClaims' },
							else: 0,
						},
					},
				},
			},
			{ $sort: { status: -1, vettedAt: -1 } },
		]
		countOptions = [
			{
				$match: {
					division: division,
					fourC: 'Yes',
					status: 'Open',
					leak: { $ne: 'Yes' },
					// $or: [{ buildDate: { $regex: '/2022' } }, { claimNumber: 'Internal Techweb' }],

					// level    : {
					// 	$nin : [
					// 		'Major',
					// 		'Minor',
					// 	],
					// },
				},
			},
			{
				$addFields: {
					formattedBuild: {
						$dateFromString: {
							dateString: '$buildDate',
							format: '%d/%m/%Y',
							timezone: 'Europe/London',
						},
					},
				},
			},
			{
				$match: {
					$or: [{ formattedBuild: { $gte: startOfYearDB } }, { claimNumber: 'Internal Techweb' }],
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
		]
	} else {
		searchOptions = [
			{
				$match: {
					fourC: 'Yes',
					division: division,
					leak: { $ne: 'Yes' },
				},
			},
			{
				$addFields: {
					numberOfClaims: {
						$cond: {
							if: { $isArray: '$linkedClaims' },
							then: { $size: '$linkedClaims' },
							else: 0,
						},
					},
				},
			},
			// {
			// 	$addFields: {
			// 		formattedBuild: {
			// 			$dateFromString: {
			// 				dateString: '$buildDate',
			// 				format: '%d/%m/%Y',
			// 				timezone: 'Europe/London',
			// 			},
			// 		},
			// 	},
			// },
			// {
			// 	$match: {
			// 		formattedBuild: { $gte: startOfYearDB },
			// 	},
			// },
			{ $sort: { status: -1, numberOfClaims: -1, vettedAt: -1 } },
		]
		countOptions = [
			{
				$match: {
					division: division,
					fourC: 'Yes',
					status: 'Open',
					leak: { $ne: 'Yes' },
				},
			},
			// {
			// 	$addFields: {
			// 		formattedBuild: {
			// 			$dateFromString: {
			// 				dateString: '$buildDate',
			// 				format: '%d/%m/%Y',
			// 				timezone: 'Europe/London',
			// 			},
			// 		},
			// 	},
			// },
			// {
			// 	$match: {
			// 		formattedBuild: { $gte: startOfYearDB },
			// 	},
			// },
			{
				$group: {
					_id: '$area',
					count: {
						$sum: 1,
					},
				},
			},
			{ $sort: { count: -1, _id: 1 } },
		]
	}

	const count = await Claim.aggregate(countOptions)
	const fiveYearsAgo = new Date(moment().subtract(3, 'years').format('YYYY, 01, 01'))

	// if (req.query.claimNumber != null && req.query.claimNumber != '') {
	// 	searchOptions.claimNumber = new RegExp(
	// 		escapeRegex(req.query.claimNumber),
	// 		'gi',
	// 	)
	// }
	if (req.query.claimNumber != null && req.query.claimNumber != '') {
		searchOptions.unshift({
			$match: {
				claimNumber: new RegExp(escapeRegex(req.query.claimNumber), 'gi'),
			},
		})

		for (let s of searchOptions) {
			if (s.$match && s.$match.formattedBuild) {
				s.$match.formattedBuild.$gte = fiveYearsAgo
			}
		}
	}
	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.unshift({
			$match: {
				failedPart: new RegExp(escapeRegex(req.query.failedPart), 'gi'),
			},
		})
		for (let s of searchOptions) {
			if (s.$match && s.$match.formattedBuild) {
				s.$match.formattedBuild.$gte = fiveYearsAgo
			}
		}
	}
	if (req.query.area != null && req.query.area != '') {
		searchOptions.unshift({
			$match: {
				area: new RegExp(escapeRegex(req.query.area), 'gi'),
			},
		})
		for (let s of searchOptions) {
			if (s.$match && s.$match.formattedBuild) {
				s.$match.formattedBuild.$gte = fiveYearsAgo
			}
		}
	}

	const auditedThisWeek = await Claim.countDocuments({
		division: division,
		fourC: 'Yes',
		leak: { $ne: 'Yes' },
		status: 'Closed',
		auditedAt: {
			$gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
		},
	})

	let auditedThisWeekPercent = 0

	if (auditedThisWeek > 0) {
		auditedThisWeekPercent = Math.round((auditedThisWeek / 20) * 100)
	}

	// const lengths = await Claim.aggregate([
	// 	{
	// 		$project : {
	// 			claimNumber    : 1,
	// 			division       : 1,
	// 			numberOfClaims : {
	// 				$cond : {
	// 					if   : { $isArray: '$linkedClaims' },
	// 					then : { $size: '$linkedClaims' },
	// 					else : 0,
	// 				},
	// 			},
	// 		},
	// 	},
	// 	{ $sort: { numberOfClaims: -1 } },
	// ])

	// console.log(lengths)

	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division })
	const models = await Model.find({ division: division })
	const claims = await Claim.aggregate(searchOptions)
		// .sort({ status: 'desc', vettedAt: -1 })
		.limit(1000)

	for (let claim of claims) {
		const doa = await DOA25pt.findOne({
			twNumber: claim.claimNumber,
		})

		if (doa) {
			await Claim.findByIdAndUpdate(claim._id, {
				nameCount: doa.count,
			})
			claim.numberOfClaims = doa.count
		}
	}

	res.render('claims/index', {
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

// internal tracker for component div

// route to show the 4C tracker
module.exports.componentIndex = async (req, res) => {
	let { division } = req.params
	let theArea = division

	if (division === 'Cabs') {
		theArea = 'Cabs Systems'
	}
	if (division === 'HBU') {
		theArea = 'HBU'
	}

	const count = await Claim.aggregate([
		{ $match: { area: theArea, fourC: 'Yes', status: 'Open' } },
		{
			$addFields: {
				formattedBuild: {
					$dateFromString: {
						dateString: '$buildDate',
						format: '%d/%m/%Y',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$match: {
				formattedBuild: { $gte: startOfYearDB },
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
	searchOptions = [
		{
			$match: {
				fourC: 'Yes',
				area: theArea,
			},
		},
		{
			$addFields: {
				numberOfClaims: {
					$cond: {
						if: { $isArray: '$linkedClaims' },
						then: { $size: '$linkedClaims' },
						else: 0,
					},
				},
			},
		},
		{
			$addFields: {
				formattedBuild: {
					$dateFromString: {
						dateString: '$buildDate',
						format: '%d/%m/%Y',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$match: {
				formattedBuild: { $gte: startOfYearDB },
			},
		},
		{ $sort: { status: -1, numberOfClaims: -1, vettedAt: -1 } },
	]

	if (req.query.claimNumber != null && req.query.claimNumber != '') {
		searchOptions.unshift({
			$match: {
				claimNumber: new RegExp(escapeRegex(req.query.claimNumber), 'gi'),
			},
		})
	}
	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.unshift({
			$match: {
				failedPart: new RegExp(escapeRegex(req.query.failedPart), 'gi'),
			},
		})
	}
	if (req.query.area != null && req.query.area != '') {
		searchOptions.unshift({
			$match: {
				area: new RegExp(escapeRegex(req.query.area), 'gi'),
			},
		})
	}
	if (req.query.division != null && req.query.division != '') {
		searchOptions.unshift({
			$match: {
				division: new RegExp(escapeRegex(req.query.division), 'gi'),
			},
		})
	}
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division })
	const models = await Model.find({ division: division })
	const claims = await Claim.aggregate(searchOptions)
		// .sort({ status: 'desc', vettedAt: -1 })
		.limit(1000)

	res.render('claims/componentIndex', {
		claims,
		areas,
		detections,
		models,
		division,
		count,
	})
}

module.exports.leakIndex = async (req, res) => {
	const { division } = req.params
	const count = await Claim.aggregate([
		{
			$match: {
				division: division,
				fourC: 'Yes',
				status: 'Open',
				leak: 'Yes',
			},
		},
		{
			$addFields: {
				formattedBuild: {
					$dateFromString: {
						dateString: '$buildDate',
						format: '%d/%m/%Y',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$match: {
				formattedBuild: { $gte: startOfYearDB },
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
	let searchOptions = { fourC: 'Yes', division: division, leak: 'Yes' }

	if (req.query.claimNumber != null && req.query.claimNumber != '') {
		searchOptions.claimNumber = new RegExp(escapeRegex(req.query.claimNumber), 'gi')
	}
	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
	}
	if (req.query.area != null && req.query.area != '') {
		searchOptions.area = new RegExp(escapeRegex(req.query.area), 'gi')
	}

	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division })
	const models = await Model.find({ division: division })
	const claims = await Claim.find(searchOptions).sort({ status: 'desc', vettedAt: -1 }).limit(1000)
	res.render('claims/leakindex', {
		claims,
		areas,
		detections,
		models,
		division,
		count,
	})
}

//render form to create new leak 4c
module.exports.renderNewLeakForm = async (req, res) => {
	const { division } = req.params
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	res.render('claims/newleak', { division, areas, detections, models })
}

//render form to create new 4c
module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	res.render('claims/new', { division, areas, detections, models })
}

//route to create 4c
module.exports.createClaim = async (req, res, next) => {
	const claim = new Claim(req.body.claim)
	const division = req.body.claim.division
	const area = req.body.claim.area
	// claim.author = req.user._id;
	claim.vettedBy = req.user.firstName + ' ' + req.user.lastName
	claim.vettedAt = Date.now()
	claim.status = 'Open'
	claim.fourC = 'Yes'
	claim.claimNumber = 'Internal Techweb'

	// if (req.files[0] != null) {
	// 	claim.image1 = req.files[0] && req.files[0].filename;
	// }

	claim.image1 = req.files[0] && req.files[0].filename
	claim.image2 = req.files[1] && req.files[1].filename
	claim.image3 = req.files[2] && req.files[2].filename
	claim.image4 = req.files[3] && req.files[3].filename
	claim.image5 = req.files[4] && req.files[4].filename
	vettedAt = Date.now()

	const email = await Area.find({ division: division, name: area })

	let id = email[0]._id

	const address = await Area.findById(id).populate({ path: 'emails' })

	let theEmails = []

	address.emails.forEach(function (email) {
		theEmails.push(email.address)
	})

	// console.log(theEmails);
	await claim.save()

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
		subject: `*URGENT* A 4C has been raised and added to the ${area} tracker that requires containment within 24 hours.`,
		html:
			`<h2>*URGENT* A 4C has been raised and added to ${area} tracker that requires containment within 24 hours.</h2>` +
			`<h2>You can view it using this link:</h2>` +
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

	if (theEmails.length > 0) {
		req.flash('success', '4C issued and email has been sent.')
	}
	if (theEmails.length < 1) {
		req.flash('success', '4C issued but no email sent.')
	}

	res.redirect(`/claims/4c/${division}`)
}
//route to create 4c
module.exports.createLeakClaim = async (req, res, next) => {
	const claim = new Claim(req.body.claim)
	const division = req.body.claim.division
	const area = req.body.claim.area
	// claim.author = req.user._id;
	claim.vettedBy = req.user.firstName + ' ' + req.user.lastName
	claim.vettedAt = Date.now()
	claim.status = 'Open'
	claim.fourC = 'Yes'
	claim.leak = 'Yes'
	claim.claimNumber = 'Leak Techweb'
	// if (req.files[0] != null) {
	// 	claim.image1 = req.files[0] && req.files[0].filename;
	// }

	claim.image1 = req.files[0] && req.files[0].filename
	claim.image2 = req.files[1] && req.files[1].filename
	claim.image3 = req.files[2] && req.files[2].filename
	claim.image4 = req.files[3] && req.files[3].filename
	claim.image5 = req.files[4] && req.files[4].filename
	vettedAt = Date.now()

	const email = await Area.find({ division: division, name: area })

	let id = email[0]._id

	const address = await Area.findById(id).populate({ path: 'emails' })

	let theEmails = []

	address.emails.forEach(function (email) {
		theEmails.push(email.address)
	})

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
		subject: `*URGENT* A leak 4C has been raised and added to the ${area} tracker that requires containment within 24 hours.`,
		html:
			`<img src="cid:jcb-logo"/>` +
			`<h2>*URGENT* A 4C has been raised and added to ${area} tracker that requires containment within 24 hours.</h2>` +
			`<h2>You can view it using this link:</h2>` +
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

	if (theEmails.length > 0) {
		req.flash('success', '4C issued and email has been sent.')
	}
	if (theEmails.length < 1) {
		req.flash('success', '4C issued but no email sent.')
	}
	await claim.save()

	res.redirect(`/claims/4c/${division}`)
}

// route to show all info on 4c
module.exports.showClaim = async (req, res) => {
	const claim = await Claim.findById(req.params.id)
		.populate({
			path: 'reviews',
			options: { sort: { createdAt: -1 } },
			populate: {
				path: 'author',
			},
		})
		.populate('author')
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}
	const division = claim.division
	const otherClaimNumbersArr = await Claim.find(
		{
			_id: { $in: claim.linkedClaims },
		},
		{ claimNumber: 1, _id: 0 }
	)

	const otherClaimNumbersHelp = otherClaimNumbersArr.map((claim) => claim.claimNumber)

	const otherClaimNumbers = otherClaimNumbersHelp.join()

	res.render('claims/fourc', {
		claim,
		division,
		otherClaimNumbers,
		otherClaimNumbersHelp,
	})
}
module.exports.showLeakClaim = async (req, res) => {
	const claim = await Claim.findById(req.params.id)
		.populate({
			path: 'reviews',
			options: { sort: { createdAt: -1 } },
			populate: {
				path: 'author',
			},
		})
		.populate('author')
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}
	const division = claim.division
	const otherClaimNumbersArr = await Claim.find(
		{
			_id: { $in: claim.linkedClaims },
		},
		{ claimNumber: 1, _id: 0 }
	)

	const otherClaimNumbersHelp = otherClaimNumbersArr.map((claim) => claim.claimNumber)

	const otherClaimNumbers = otherClaimNumbersHelp.join()
	res.render('claims/fourcleak', {
		claim,
		division,
		otherClaimNumbers,
		otherClaimNumbers,
		otherClaimNumbersHelp,
	})
}

//render form to vet warranty claim
module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findById(id)
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}
	const division = claim.division
	const fourCs = await Claim.find({
		division: claim.division,
		fourC: 'Yes',
		failedPart: claim.failedPart,
		claimNumber: { $ne: claim.claimNumber },
	})
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const failuremodes = await FailureMode.find({}).sort({ name: '' })
	const failuretypes = await FailureType.find({}).sort({ name: '' })

	res.render('claims/edit', {
		claim,
		division,
		inspectors,
		areas,
		detections,
		models,
		failuremodes,
		failuretypes,
		fourCs,
	})
}

//route to vet warranty claim
module.exports.updateClaim = async (req, res) => {
	const { id } = req.params

	const claim = await Claim.findByIdAndUpdate(
		id,
		{
			...req.body.claim,
			// image1   : req.files[0] && req.files[0].filename,
			// image2   : req.files[1] && req.files[1].filename,
			// image3   : req.files[2] && req.files[2].filename,
			// image4   : req.files[3] && req.files[3].filename,
			// image5   : req.files[4] && req.files[4].filename,
			vettedAt: Date.now(),
			vettedBy: req.user.firstName + ' ' + req.user.lastName,
			vetted: 'Yes',
		},
		{ new: true }
	)
	for (let r of req.files) {
		if (r.fieldname === 'image1') {
			claim.image1 = r.filename
		}
		if (r.fieldname === 'image2') {
			claim.image2 = r.filename
		}
		if (r.fieldname === 'image3') {
			claim.image3 = r.filename
		}
		if (r.fieldname === 'image4') {
			claim.image4 = r.filename
		}
		if (r.fieldname === 'image5') {
			claim.image5 = r.filename
		}
	}

	await claim.save()

	const claim2 = await Claim.findById(id)

	const division = claim.division
	const area = req.body.claim.area
	const issue = req.body.claim.fourC
	const claimNumber = claim.claimNumber
	// console.log(division)
	// console.log(area)
	// console.log(req.body.claim)
	// console.log(claimNumber)

	if (issue === 'Yes') {
		const email = await Area.find({ division: division, name: area })

		let id = email[0]._id

		const address = await Area.findById(id).populate({ path: 'emails' })

		let theEmails = []

		address.emails.forEach(function (email) {
			theEmails.push(email.address)
		})

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
			subject: `*URGENT* Ref claim number ${claimNumber}. A 4C has been raised and added to the ${area} tracker that requires containment within 24 hours.`,
			html:
				`<img src="cid:jcb-logo"/>` +
				`<h2>*URGENT* A 4C has been raised and added to ${area} tracker that requires containment within 24 hours.</h2>` +
				`<h2>You can view it using this link:</h2>` +
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

		if (theEmails.length > 0) {
			req.flash('success', '4C issued and email has been sent.')
		}
		if (theEmails.length < 1) {
			req.flash('success', '4C issued but no email sent.')
		}
	}

	if (claim2.actioned != null) {
		claim2.serviceResBy = req.user.firstName + ' ' + req.user.lastName
		claim2.serviceResAt = Date.now()
		claim2.serviceRes = 'Box ticked during vetting to confirm that required action has already been done'
	}

	await claim2.save()

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/claims/vetting/${division}`)
}

//form to update already vetted claim
module.exports.renderEditFormAgain = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findById(id)
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/claims')
	}

	const fourCs = await Claim.find({
		division: claim.division,
		fourC: 'Yes',
		failedPart: claim.failedPart,
		claimNumber: { $ne: claim.claimNumber },
	})
	const division = claim.division
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const failuremodes = await FailureMode.find({}).sort({ name: '' })
	const failuretypes = await FailureType.find({}).sort({ name: '' })

	res.render('claims/editagain', {
		claim,
		division,
		inspectors,
		areas,
		detections,
		models,
		failuremodes,
		failuretypes,
		fourCs,
	})
}

// route to update already vetted warranty claim
module.exports.updateClaimAgain = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(
		id,
		{
			...req.body.claim,
			vetted: 'Yes',
			vettedAt: Date.now(),
			vettedBy: req.user.firstName + ' ' + req.user.lastName,
		},
		{ new: true }
	)

	for (let r of req.files) {
		if (r.fieldname === 'image1') {
			claim.image1 = r.filename
		}
		if (r.fieldname === 'image2') {
			claim.image2 = r.filename
		}
		if (r.fieldname === 'image3') {
			claim.image3 = r.filename
		}
		if (r.fieldname === 'image4') {
			claim.image4 = r.filename
		}
		if (r.fieldname === 'image5') {
			claim.image5 = r.filename
		}
	}

	await claim.save()
	const claim2 = await Claim.findById(id)

	const division = claim.division
	const area = req.body.claim.area
	const issue = req.body.claim.fourC

	// console.log(division)
	// console.log(area)
	// console.log(issue)

	if (issue === 'Yes') {
		const email = await Area.find({ division: division, name: area })

		let id = email[0]._id

		const address = await Area.findById(id).populate({ path: 'emails' })

		let theEmails = []

		address.emails.forEach(function (email) {
			theEmails.push(email.address)
		})

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
			subject: `*URGENT* A 4C has been raised and added to the ${area} tracker that requires containment within 24 hours.`,
			html:
				`<img src="cid:jcb-logo"/>` +
				`<h2>*URGENT* A 4C has been raised and added to ${area} tracker that requires containment within 24 hours.</h2>` +
				`<h2>You can view it using this link:</h2>` +
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

		if (theEmails.length > 0) {
			req.flash('success', '4C issued and email has been sent.')
		}
		if (theEmails.length < 1) {
			req.flash('success', '4C issued but no email sent.')
		}
	}
	if (claim2.actioned != null) {
		claim2.serviceResBy = req.user.firstName + ' ' + req.user.lastName
		claim2.serviceResAt = Date.now()
		claim2.serviceRes = 'Box ticked during vetting to confirm that required action has already been done'
	}

	await claim2.save()

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/claims/vetting/${division}`)
}

//show claims to vet
module.exports.vettingClaims = async (req, res) => {
	const { division } = req.params
	let searchOptions = { vetted: 'No', division: division, active: true }

	if (req.query.name != null && req.query.name != '') {
		searchOptions.name = new RegExp(escapeRegex(req.query.name), 'gi')
	}
	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
	}
	if (req.query.claimNumber != null && req.query.claimNumber != '') {
		searchOptions.claimNumber = new RegExp(escapeRegex(req.query.claimNumber), 'gi')
	}
	const serialCount = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: { $ne: 'Major' },
				active: true,
				// outcome  : {
				// 	$nin : [
				// 		'Reject',
				// 		'Z Code',
				// 	],
				// },
			},
		},
		{
			$group: {
				_id: '$name',
				count: {
					$sum: 1,
				},
			},
		},
	])

	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const claims = await Claim.find(searchOptions).sort({ tPeriod: '' }).limit(1000)

	let num = 0
	for (let claim of claims) {
		num++
	}

	for (let claim of claims) {
		for (let serial of serialCount) {
			if (serial._id === claim.name) {
				claim.nameCount = serial.count
			}
		}
	}

	res.render('claims/vetting', {
		division,
		inspectors,
		areas,
		detections,
		models,
		claims,
		num,
	})
}

//show claims to vet
module.exports.vettingClaimsSearch = async (req, res) => {
	const { division } = req.params
	let searchOptions = { division: division, tPeriod: { $ne: 'Major' } }

	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const claims = await Claim.find(searchOptions).sort({ tPeriod: '' }).limit(100)

	let num = 0
	for (let claim of claims) {
		num++
	}

	res.render('claims/vettingsearch', {
		division,
		inspectors,
		areas,
		detections,
		models,
		claims,
		num,
	})
}

//show vetted claims
module.exports.vettedClaims = async (req, res) => {
	const { division } = req.params
	let searchOptions = {
		vetted: 'Yes',
		division: division,
		tPeriod: { $ne: 'Major' },
	}

	if (req.query.name != null && req.query.name != '') {
		searchOptions.name = new RegExp(escapeRegex(req.query.name), 'gi')
	}
	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
	}
	if (req.query.claimNumber != null && req.query.claimNumber != '') {
		searchOptions.claimNumber = new RegExp(escapeRegex(req.query.claimNumber), 'gi')
	}

	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const claims = await Claim.find(searchOptions).sort({ vettedAt: 'desc' }).limit(1000)

	let numb = 0
	for (let claim of claims) {
		if (moment(claim.vettedAt).isSame(moment(), 'day')) {
			numb++
		}
	}

	res.render('claims/vetted', {
		division,
		inspectors,
		areas,
		detections,
		models,
		claims,
		numb,
	})
}
//show DOA 2021 Build claims
module.exports.doa2021 = async (req, res) => {
	const { division } = req.params
	let searchOptions = {
		division: division,
		tPeriod: 'DOA',
		buildDate: { $regex: '2021' },
		outcome: {
			$nin: ['Reject', 'Z Code'],
		},
	}
	// let searchOptionsAccepted = {
	// 	division  : division,
	// 	tPeriod   : 'DOA',
	// 	buildDate : { $regex: '2021' },
	// 	outcome   : {
	// 		$in : [
	// 			'Accept',
	// 			'More Info',
	// 			'Pictures Required',
	// 			'Parts Back',
	// 			'Raise on Supplier',
	// 			'',
	// 		],
	// 	},
	// };

	if (req.query.scc != null && req.query.scc != '') {
		searchOptions.scc = new RegExp(escapeRegex(req.query.scc), 'gi')
		searchOptions.vetted = 'Yes'
	}
	if (req.query.status != null && req.query.status != '') {
		searchOptions.status = new RegExp(escapeRegex(req.query.status), 'gi')
		// searchOptions.vetted = 'Yes';
	}
	if (req.query.buildmonth != null && req.query.buildmonth != '') {
		searchOptions.buildmonth = new RegExp(escapeRegex(req.query.buildmonth.substring(0, 3)), 'gi')
		// searchOptions.vetted = 'Yes';
	}

	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const claims = await Claim.find(searchOptions).sort({ vettedAt: 'desc' })
	// const claimsAccepted = await Claim.find(searchOptionsAccepted).sort({ vettedAt: 'desc' });

	let acceptedNum = 0
	let unVettedNum = 0
	let shouldNum = 0
	let couldNum = 0
	let cannotNum = 0

	for (let claim of claims) {
		if (
			claim.outcome === 'Accept' ||
			claim.outcome === 'Parts Back' ||
			claim.outcome === 'More Info' ||
			claim.outcome === 'Pictures Required' ||
			claim.outcome === 'Raise on Supplier'
		) {
			acceptedNum++
		}
		if (claim.vetted === 'No') {
			unVettedNum++
		}
		if (claim.vetted === 'Yes' && claim.scc === 'Should') {
			shouldNum++
		}
		if (claim.vetted === 'Yes' && claim.scc === 'Could') {
			couldNum++
		}
		if (claim.vetted === 'Yes' && claim.scc === 'Cannot') {
			cannotNum++
		}
	}
	// for (let claim of claimsAccepted) {
	// 	if (claim.scc === 'Should') {
	// 		shouldNum++;
	// 	}
	// 	if (claim.scc === 'Could') {
	// 		couldNum++;
	// 	}
	// 	if (claim.scc === 'Cannot') {
	// 		cannotNum++;
	// 	}
	// }

	res.render('claims/doa2021', {
		division,
		inspectors,
		areas,
		detections,
		models,
		claims,
		acceptedNum,
		unVettedNum,
		shouldNum,
		couldNum,
		cannotNum,
	})
}

module.exports.doa2021table = async (req, res) => {
	const { division } = req.params
	//show DOA 2021 Build claims table
	let thisMonth = moment().subtract(0, 'months').format('/MM/YYYY')
	let oneMonthAgo = moment().subtract(1, 'months').format('/MM/YYYY')
	let twoMonthsAgo = moment().subtract(2, 'months').format('/MM/YYYY')
	let threeMonthsAgo = moment().subtract(3, 'months').format('/MM/YYYY')

	let thisMonthTable = moment().subtract(0, 'months').format('MMM')
	let oneMonthAgoTable = moment().subtract(1, 'months').format('MMM')
	let twoMonthsAgoTable = moment().subtract(2, 'months').format('MMM')
	let threeMonthsAgoTable = moment().subtract(3, 'months').format('MMM')

	let searchOptionsJan = {
		division: division,
		tPeriod: 'DOA',
		buildDate: { $regex: threeMonthsAgo },
		outcome: {
			$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
		},
	}
	let searchOptionsFeb = {
		division: division,
		tPeriod: 'DOA',
		buildDate: { $regex: twoMonthsAgo },
		outcome: {
			$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
		},
	}
	let searchOptionsMar = {
		division: division,
		tPeriod: 'DOA',
		buildDate: { $regex: oneMonthAgo },
		outcome: {
			$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
		},
	}
	let searchOptionsApr = {
		division: division,
		tPeriod: 'DOA',
		buildDate: { $regex: thisMonth },
		outcome: {
			$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
		},
	}

	const janClaims = await Claim.find(searchOptionsJan)
	const febClaims = await Claim.find(searchOptionsFeb)
	const marClaims = await Claim.find(searchOptionsMar)
	const aprClaims = await Claim.find(searchOptionsApr)

	let janShould = 0
	let janCould = 0
	let janCannot = 0

	for (let claim of janClaims) {
		if (claim.scc === 'Should') {
			janShould++
		}
		if (claim.scc === 'Could') {
			janCould++
		}
		if (claim.scc === 'Cannot') {
			janCannot++
		}
	}
	let febShould = 0
	let febCould = 0
	let febCannot = 0

	for (let claim of febClaims) {
		if (claim.scc === 'Should') {
			febShould++
		}
		if (claim.scc === 'Could') {
			febCould++
		}
		if (claim.scc === 'Cannot') {
			febCannot++
		}
	}
	let marShould = 0
	let marCould = 0
	let marCannot = 0

	for (let claim of marClaims) {
		if (claim.scc === 'Should') {
			marShould++
		}
		if (claim.scc === 'Could') {
			marCould++
		}
		if (claim.scc === 'Cannot') {
			marCannot++
		}
	}
	let aprShould = 0
	let aprCould = 0
	let aprCannot = 0

	for (let claim of aprClaims) {
		if (claim.scc === 'Should') {
			aprShould++
		}
		if (claim.scc === 'Could') {
			aprCould++
		}
		if (claim.scc === 'Cannot') {
			aprCannot++
		}
	}

	// jan should could cannot

	const avgJanShould = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: threeMonthsAgo },
				scc: 'Should',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	const avgJanCould = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: threeMonthsAgo },
				scc: 'Could',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])
	const avgJanCannot = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: threeMonthsAgo },
				scc: 'Cannot',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	// feb should could cannot

	const avgFebShould = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: twoMonthsAgo },
				scc: 'Should',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	const avgFebCould = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: twoMonthsAgo },
				scc: 'Could',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])
	const avgFebCannot = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: twoMonthsAgo },
				scc: 'Cannot',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	// mar should could cannot

	const avgMarShould = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: oneMonthAgo },
				scc: 'Should',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	const avgMarCould = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: oneMonthAgo },
				scc: 'Could',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])
	const avgMarCannot = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: oneMonthAgo },
				scc: 'Cannot',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	// apr should could cannot

	const avgAprShould = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: thisMonth },
				scc: 'Should',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	const avgAprCould = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: thisMonth },
				scc: 'Could',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])
	const avgAprCannot = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: thisMonth },
				scc: 'Cannot',
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	// total average Jan

	const avgJan = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: threeMonthsAgo },
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	// total average feb

	const avgFeb = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: twoMonthsAgo },
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	// total avg march
	const avgMar = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: oneMonthAgo },
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	// total avg apr
	const avgApr = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: 'DOA',
				closedAt: {
					$nin: ['', null],
				},
				buildDate: { $regex: thisMonth },
				status: 'Closed',
				outcome: {
					$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
				},
			},
		},

		{
			$group: {
				_id: null,
				avg_time: {
					$avg: {
						$subtract: [
							{
								$ifNull: ['$closedAt', 0],
							},
							{
								$ifNull: ['$importedDate', 0],
							},
						],
					},
				},
			},
		},
	])

	// workings for jan should could cannot

	if (avgJanShould.length > 0) {
		janShouldDays = (avgJanShould[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		janShouldDays = 0
	}

	if (avgJanCould.length > 0) {
		janCouldDays = (avgJanCould[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		janCouldDays = 0
	}
	if (avgJanCannot.length > 0) {
		janCannotDays = (avgJanCannot[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		janCannotDays = 0
	}
	// workings for feb should could cannot

	if (avgFebShould.length > 0) {
		febShouldDays = (avgFebShould[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		febShouldDays = 0
	}

	if (avgFebCould.length > 0) {
		febCouldDays = (avgFebCould[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		febCouldDays = 0
	}
	if (avgFebCannot.length > 0) {
		febCannotDays = (avgFebCannot[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		febCannotDays = 0
	}
	// workings for mar should could cannot

	if (avgMarShould.length > 0) {
		marShouldDays = (avgMarShould[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		marShouldDays = 0
	}

	if (avgMarCould.length > 0) {
		marCouldDays = (avgMarCould[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		marCouldDays = 0
	}
	if (avgMarCannot.length > 0) {
		marCannotDays = (avgMarCannot[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		marCannotDays = 0
	}
	// workings for apr should could cannot

	if (avgAprShould.length > 0) {
		aprShouldDays = (avgAprShould[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		aprShouldDays = 0
	}

	if (avgAprCould.length > 0) {
		aprCouldDays = (avgAprCould[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		aprCouldDays = 0
	}
	if (avgAprCannot.length > 0) {
		aprCannotDays = (avgAprCannot[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		aprCannotDays = 0
	}

	// workings for total avg times

	if (avgJan.length > 0) {
		avgJanDays = (avgJan[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		avgJanDays = 0
	}
	if (avgFeb.length > 0) {
		avgFebDays = (avgFeb[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		avgFebDays = 0
	}
	if (avgMar.length > 0) {
		avgMarDays = (avgMar[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		avgMarDays = 0
	}
	if (avgApr.length > 0) {
		avgAprDays = (avgApr[0].avg_time / (24 * 60 * 60 * 1000)).toFixed(1)
	} else {
		avgAprDays = 0
	}

	// console.log(avgJanCannot);

	res.render('claims/doa2021Table', {
		division,
		avgJanDays,
		janClaims,
		janShould,
		janCould,
		janCannot,
		avgFebDays,
		febClaims,
		febShould,
		febCould,
		febCannot,
		avgMarDays,
		marClaims,
		marShould,
		marCould,
		marCannot,
		janShouldDays,
		janCouldDays,
		janCannotDays,
		febShouldDays,
		febCouldDays,
		febCannotDays,
		marShouldDays,
		marCouldDays,
		marCannotDays,
		avgAprDays,
		aprClaims,
		aprShould,
		aprCould,
		aprCannot,
		aprShouldDays,
		aprCouldDays,
		aprCannotDays,
		thisMonthTable,
		oneMonthAgoTable,
		twoMonthsAgoTable,
		threeMonthsAgoTable,
	})
}

//render form to update dao 2021
module.exports.renderDoa2021Form = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findById(id)
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}
	const division = claim.division

	res.render('claims/closureDate', {
		claim,
		division,
	})
}
// route to update 2021 doa
module.exports.doa2021edit = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(id, {
		...req.body.claim,
	})

	const division = claim.division

	req.flash('success', 'Successfully updated claim')
	res.redirect(`/claims/doa2021/${division}`)
}

// show awaiting service
module.exports.awaitingService = async (req, res) => {
	const { division } = req.params
	if (division === 'HP') {
		searchOptions = {
			division: division,
			tPeriod: { $ne: 'Major' },
			country: {
				$nin: ['NORTH AMERICA', 'Canada', 'USA'],
			},
			outcome: {
				$in: ['Reject', 'Z Code', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
			},
			baseModel: {
				$nin: ['HYDRADIG, HYDRADIG SV'],
			},
			actioned: null,
		}
	}
	if (division != 'HP') {
		searchOptions = {
			division: division,
			tPeriod: { $ne: 'Major' },
			country: {
				$nin: ['NORTH AMERICA', 'Canada', 'USA'],
			},
			outcome: {
				$in: ['Reject', 'Z Code', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
			},
			actioned: null,
		}
	}
	if (req.query.outcome != null && req.query.outcome != '') {
		searchOptions.outcome = new RegExp(escapeRegex(req.query.outcome), 'gi')
	} // sort by "field" ascending and "test" descending

	const claims = await Claim.find(searchOptions).limit(1500).sort({ vettedAt: -1 })
	let number = claims.length

	const search = req.query.outcome

	res.render('claims/service', { division, claims, number, search })
}

// awaiting service heavy hydradig

module.exports.awaitingServiceHd = async (req, res) => {
	const { division } = req.params

	let searchOptions = {
		division: division,
		tPeriod: { $ne: 'Major' },
		country: {
			$nin: ['NORTH AMERICA', 'Canada', 'USA'],
		},
		outcome: {
			$in: ['Reject', 'Z Code', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
		},
		baseModel: {
			$in: ['HYDRADIG', 'HYDRADIG SV'],
		},
		actioned: null,
	}

	if (req.query.outcome != null && req.query.outcome != '') {
		searchOptions.outcome = new RegExp(escapeRegex(req.query.outcome), 'gi')
	} // sort by "field" ascending and "test" descending

	const claims = await Claim.find(searchOptions).limit(1500)
	let number = claims.length

	const search = req.query.outcome

	res.render('claims/service', { division, claims, number, search })
}
// show awaiting service USA
module.exports.awaitingServiceUSA = async (req, res) => {
	const { division } = req.params
	let searchOptions = {
		division: division,
		tPeriod: { $ne: 'Major' },
		country: {
			$in: ['NORTH AMERICA', 'Canada', 'USA'],
		},
		outcome: {
			$in: ['Reject', 'Z Code', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
		},
		actioned: null,
	}
	if (req.query.buildmonth != null && req.query.buldmonth != '') {
		searchOptions.buildmonth = new RegExp(escapeRegex(req.query.buildmonth), 'gi')
	}
	const claims = await Claim.find(searchOptions).sort({ vettedAt: 'desc' }).limit(1000)
	let number = claims.length

	res.render('claims/serviceUSA', { division, claims, number })
}

// route to show form for service to accept or reject requests
module.exports.renderFormService = async (req, res) => {
	const claim = await Claim.findById(req.params.id)
		.populate({
			path: 'reviews',
			populate: {
				path: 'author',
			},
		})
		.populate('author')
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}
	const division = claim.division
	res.render('claims/serviceresponse', { claim, division })
}

//route for service to update claim with their comments
module.exports.serviceAnswer = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(id, {
		...req.body.claim,

		serviceResBy: req.user.firstName + ' ' + req.user.lastName,
		serviceResAt: Date.now(),
	})

	const division = claim.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/claims/service/${division}`)
}

// route to show what response has come back from service
module.exports.serviceResponded = async (req, res) => {
	const claim = await Claim.findById(req.params.id)
		.populate({
			path: 'reviews',
			populate: {
				path: 'author',
			},
		})
		.populate('author')
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}
	const division = claim.division
	res.render('claims/serviceresponded', { claim, division })
}

// show accepted by service
module.exports.serviceAccepted = async (req, res) => {
	const { division } = req.params
	let searchOptions = {
		division: division,
		tPeriod: { $ne: 'Major' },
		outcome: {
			$in: ['Reject', 'Z Code', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
		},
		actioned: 'Yes',
		serviceResBy: {
			$nin: ['', null],
		},
	}
	if (req.query.buildmonth != null && req.query.buldmonth != '') {
		searchOptions.buildmonth = new RegExp(escapeRegex(req.query.buildmonth), 'gi')
	}

	const claims = await Claim.find(searchOptions).sort({ serviceResAt: 'desc' }).limit(500).exec()

	let number = claims.length

	res.render('claims/serviceaccepted', { division, claims, number })
}

// show rejected by service
module.exports.serviceRejected = async (req, res) => {
	const { division } = req.params
	let searchOptions = {
		division: division,
		tPeriod: { $ne: 'Major' },
		outcome: {
			$in: ['Reject', 'Z Code', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
		},
		actioned: 'No',
		serviceResBy: {
			$nin: ['', null],
		},
	}
	if (req.query.buildmonth != null && req.query.buildmonth != '') {
		searchOptions.buildmonth = new RegExp(escapeRegex(req.query.buildmonth), 'gi')
	}

	const claims = await Claim.find(searchOptions).sort({ serviceResAt: 'desc' }).limit(500)

	let number = claims.length

	res.render('claims/servicerejected', { division, claims, number })
}

// contain 4C

module.exports.updateClaimContain = async (req, res) => {
	const { id } = req.params

	const claim = await Claim.findByIdAndUpdate(
		id,
		{
			...req.body.claim,
			// image6       : req.files[0] && req.files[0].filename,
			// image7       : req.files[1] && req.files[1].filename,
			// image8       : req.files[2] && req.files[2].filename,
			// image9       : req.files[3] && req.files[3].filename,
			// image10      : req.files[4] && req.files[4].filename,
			status: 'Contained',
			containedAt: Date.now(),
			containCutIn: req.body.claim.containCutIn.toUpperCase(),
			containedBy: req.user.firstName + ' ' + req.user.lastName,
		},
		{ new: true }
	)

	for (let r of req.files) {
		if (r.fieldname === 'image6') {
			claim.image6 = r.filename
		}
		if (r.fieldname === 'image7') {
			claim.image7 = r.filename
		}
		if (r.fieldname === 'image8') {
			claim.image8 = r.filename
		}
		if (r.fieldname === 'image9') {
			claim.image9 = r.filename
		}
		if (r.fieldname === 'image10') {
			claim.image10 = r.filename
		}
	}

	await claim.save()
	// console.log(req.files)

	for (let l of claim.linkedClaims) {
		let theId = l._id
		await Claim.findByIdAndUpdate(theId, {
			status: 'Contained',
			containedAt: Date.now(),
			containNotes: `See 4C number ${claim.claimNumber} `,
		})
	}

	const division = claim.division

	req.flash('success', 'Successfully updated 4C')
	res.redirect(`/claims/4cshow/${claim._id}`)
}

// close 4C
module.exports.updateClaimClose = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(
		id,
		{
			...req.body.claim,
			status: 'Closed',
			closedAt: Date.now(),
			closeCutIn: req.body.claim.closeCutIn.toUpperCase(),
			closedBy: req.user.firstName + ' ' + req.user.lastName,
		},
		{ new: true }
	)

	for (let l of claim.linkedClaims) {
		let theId = l._id
		await Claim.findByIdAndUpdate(theId, {
			status: 'Closed',
			closedAt: Date.now(),
			containNotes: `See 4C number ${claim.claimNumber} `,
		})
	}

	const division = claim.division

	const transporter = nodemailer.createTransport({
		host: process.env.HOST, //Host
		port: process.env.PORT, // Port
		tls: {
			rejectUnauthorized: false,
		},
	})
	let theEmails = ['Russell.Salt@jcb.com']
	// let theEmails = [ 'Ali.ebrahimi@jcb.com' ]
	if (claim.division === 'HBU') {
		let mailOptions = {
			from: 'JCB-Quality.Uptime@jcb.com',
			to: theEmails,
			subject: `*URGENT* A HBU Internal 4C has been closed by ${claim.closedBy}.`,
			html:
				`<img src="cid:jcb-logo"/>` +
				`<h2>A 4C has been closed by ${claim.closedBy}.</h2>` +
				`<h5>The root cause given is:</h5>` +
				`<h5>${claim.rootCause}</h5>` +
				`<h5>You can view it using this link:</h5>` +
				`<h5>http://quality-uptime.jcb.local/claims/4cshow/${claim._id}</h5>` +
				'<h5>Thanks</h5>' +
				'<h5>JCB Quality Uptime</h5>',

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
	}

	req.flash('success', 'Successfully updated 4C')
	res.redirect(`/claims/4cshow/${claim._id}`)
}

// audit 4C
module.exports.updateClaimAudit = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(
		id,
		{
			...req.body.claim,
			audited: 'Yes',
			auditedAt: Date.now(),
			auditedBy: req.user.firstName + ' ' + req.user.lastName,
		},
		{ new: true }
	)

	const division = claim.division

	if (req.body.claim.auditPassed === 'No') {
		const updatedClaim = await Claim.findByIdAndUpdate(
			id,
			{
				status: 'Open',
				reOpenedAt: Date.now(),
				reOpenedBy: req.user.firstName + ' ' + req.user.lastName,
				audited: 'Yes',
				auditedAt: Date.now(),
				auditedBy: req.user.firstName + ' ' + req.user.lastName,
			},
			{ new: true }
		)

		req.flash('success', 'Audit failed and claim re opened')
	} else {
		req.flash('success', 'Audit passed')
	}

	res.redirect(`/claims/4cshow/${claim._id}`)
}

// show re allocation form

module.exports.renderReallocateForm = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findById(id)
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}
	const division = claim.division
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	res.render('claims/reallocate', { areas, detections, claim })
}

// reallocate 4C
module.exports.updateClaimReallocate = async (req, res) => {
	const { id } = req.params

	const divCheck = await Claim.findOne({
		_id: id,
	})
	const testDiv = divCheck.division

	// console.log('In here')

	if ((testDiv === 'EM' || testDiv === 'LP' || testDiv === 'BHL' || testDiv === 'SD') && !req.user.isVetter) {
		req.flash('error', 'You do not have permission to do that')
		res.redirect(`/claims/4cshow/${id}`)
		return
	}
	const claim = await Claim.findByIdAndUpdate(id, {
		...req.body.claim,
		area: req.body.claim.area,
		detection: req.body.claim.detection,
		reallocatedAt: Date.now(),
		reallocatedBy: req.user.firstName + ' ' + req.user.lastName,
	})

	const reason = req.body.claim.reason
	const division = claim.division
	const area = req.body.claim.area
	const issue = 'Yes'
	const person = req.user.firstName + ' ' + req.user.lastName

	const doa25pt = await DOA25pt.findOneAndUpdate(
		{
			twNumber: claim.claimNumber,
		},
		{
			assignedToArea: Date.now(),
			area: req.body.claim.area,
		}
	)

	const email = await Area.find({ division: division, name: area })

	if (email.length > 0) {
		if (issue === 'Yes') {
			let id = email[0]._id

			const address = await Area.findById(id).populate({ path: 'emails' })

			let theEmails = []

			address.emails.forEach(function (email) {
				theEmails.push(email.address)
			})

			const transporter = nodemailer.createTransport({
				host: process.env.HOST, //Host
				port: process.env.PORT, // Port
				tls: {
					rejectUnauthorized: false,
				},
			})

			if (claim.claimNumber === 'Leak Techweb') {
				let mailOptions = {
					from: 'JCB-Quality.Uptime@jcb.com',
					to: theEmails,
					subject: `*URGENT* A 4C has been reallocated to the ${area} tracker that requires containment within 24 hours.`,
					html:
						`<img src="cid:jcb-logo"/>` +
						`<h2>*URGENT* A 4C has been reallocated to ${area} tracker by ${person}. It requires containment within 24 hours.</h2>` +
						`<h4>The reason given by ${person} is:</h4>` +
						`<h4>${reason}.</h4>` +
						`<h4>You can view it using this link:</h4>` +
						`<h4>http://quality-uptime.jcb.local/claims/leak4cshow/${claim._id}</h4>` +
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
			} else {
				let mailOptions = {
					from: 'JCB-Quality.Uptime@jcb.com',
					to: theEmails,
					subject: `*URGENT* A 4C has been reallocated to the ${area} tracker that requires containment within 24 hours.`,
					html:
						`<img src="cid:jcb-logo"/>` +
						`<h2>*URGENT* A 4C has been reallocated to ${area} tracker by ${person}. It requires containment within 24 hours.</h2>` +
						`<h4>The reason given by ${person} is:</h4>` +
						`<h4>${reason}.</h4>` +
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
			}

			if (theEmails.length > 0) {
				req.flash('success', '4C issued and email has been sent.')
			}
			if (theEmails.length < 1) {
				req.flash('success', '4C issued and email but no email sent.')
			}
		}
	}

	// console.log(division)
	// console.log(area)
	// console.log(issue)

	// req.flash('success', 'Successfully Reallocated 4C');
	res.redirect(`/claims/4c/${division}`)
}

//Delete 4C
module.exports.updateClaimRemove4C = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(id, {
		...req.body.claim,
		fourC: 'No',
	})

	const division = claim.division

	req.flash('success', 'Successfully Removed 4C')
	res.redirect(`/claims/4c/${division}`)
}

// Re open 4C
module.exports.updateClaimReOpen = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(id, {
		...req.body.claim,
		status: 'Open',
		reOpenedAt: Date.now(),
		reOpenedBy: req.user.firstName + ' ' + req.user.lastName,
	})

	const division = claim.division

	req.flash('success', 'Successfully Re Opened 4C')
	res.redirect(`/claims/4c/${division}`)
}
// Re open 4C
module.exports.updateClaimReOpenToContained = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(id, {
		...req.body.claim,
		status: 'Contained',
		reOpenedAt: Date.now(),
		reOpenedBy: req.user.firstName + ' ' + req.user.lastName,
	})

	const division = claim.division

	req.flash('success', 'Successfully Re Opened 4C')
	res.redirect(`/claims/4c/${division}`)
}
module.exports.updateClaimReOpenClear = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(id, {
		...req.body.claim,
		status: 'Open',
		reOpenedAt: Date.now(),
		reOpenedBy: req.user.firstName + ' ' + req.user.lastName,
		closeCutIn: '',
		counterWhatNotes: '',
		counterWhyNotes: '',
		rootCause: '',
		containCutIn: '',
		containNotes: '',
		closureDate: '',
	})

	const division = claim.division

	req.flash('success', 'Successfully Re Opened 4C')
	res.redirect(`/claims/4c/${division}`)
}

module.exports.serialSearch = async (req, res) => {
	const { division, name } = req.params
	let searchOptions = {
		division: division,
		name: name,
		tPeriod: { $ne: 'Major' },
	}

	if (req.query.name != null && req.query.name != '') {
		searchOptions.name = new RegExp(escapeRegex(req.query.name), 'gi')
	}
	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
	}
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const claims = await Claim.find(searchOptions).sort({ tPeriod: '' }).limit(1000)

	let num = 0
	for (let claim of claims) {
		num++
	}
	let numb = 0
	for (let claim of claims) {
		if (moment(claim.vettedAt).isSame(moment(), 'day')) {
			numb++
		}
	}

	res.render('claims/vetted', {
		division,
		inspectors,
		areas,
		detections,
		models,
		claims,
		num,
		numb,
	})
}
module.exports.partsSearch = async (req, res) => {
	const { division, failedPart } = req.params

	let searchOptions = { division: division, tPeriod: { $ne: 'Major' } }

	if (req.query.name != null && req.query.name != '') {
		searchOptions.name = new RegExp(escapeRegex(req.query.name), 'gi')
	}
	if (req.query.failedPart != null && req.query.failedPart != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(req.query.failedPart), 'gi')
	}
	if (division != '') {
		searchOptions.failedPart = new RegExp(escapeRegex(failedPart), 'gi')
	}
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const claims = await Claim.find(searchOptions).sort({ tPeriod: '' }).limit(1000)

	let num = 0
	for (let claim of claims) {
		num++
	}
	let numb = 0
	for (let claim of claims) {
		if (moment(claim.vettedAt).isSame(moment(), 'day')) {
			numb++
		}
	}

	res.render('claims/vetted', {
		division,
		inspectors,
		areas,
		detections,
		models,
		claims,
		num,
		numb,
	})
}

// api for Josh
module.exports.apiJosh = async (req, res) => {
	const { buildNumber } = req.params

	try {
		const order = await Order.aggregate([
			{
				$match: {
					buildNumber: buildNumber,
				},
			},
			{
				$project: {
					buildNumber: 1,
					model: 1,
					_id: 0,
					serial: 1,
					engineNumber: 1,
					orderDate: 1,
					plannedDate: 1,
					completedDate: 1,
					projectedDate: 1,
					despatchedDate: 1,
				},
			},
			{
				$addFields: {
					// orderDate: {
					// 	$dateFromString: {
					// 		dateString: '$orderDate',
					// 		format: '%d/%m/%Y',
					// 	},
					// },
					// plannedDate: {
					// 	$dateFromString: {
					// 		dateString: '$plannedDate',
					// 		format: '%d/%m/%Y',
					// 	},
					// },
					// completedDate: {
					// 	$dateFromString: {
					// 		dateString: '$completedDate',
					// 		format: '%d/%m/%Y',
					// 	},
					// },
					// projectedDate: {
					// 	$dateFromString: {
					// 		dateString: '$projectedDate',
					// 		format: '%d/%m/%Y',
					// 	},
					// },
					// despatchedDate: {
					// 	$dateFromString: {
					// 		dateString: '$despatchedDate',
					// 		format: '%d/%m/%Y',
					// 	},
					// },
					modelCategory: '',
				},
			},
		])

		if (order.length > 0) {
			// order.model = order.model.substr(1, 20)
			const qsmart = await QSmart.findOne({ Model: order[0].model.substr(1, 20) })

			const data = order[0]

			data.modelCategory = qsmart['Model Category']

			res.status(200).json(data)
		} else {
			res.status(404).send({
				error: 'No data found',
			})
		}
	} catch (error) {
		res.status(500).send({
			error: 'Something went wrong',
		})
	}
}

const MongoClient = require('mongodb').MongoClient
const url = process.env.DB_URL
const Json2csvParser = require('json2csv').Parser

// download claims
module.exports.download = async (req, res) => {
	const { division } = req.params

	const claimsResult = await Claim.aggregate([
		{
			$match: {
				division: division,
				$or: [
					{ buildDate: { $regex: '2020' } },
					{ buildDate: { $regex: '2021' } },
					{ buildDate: { $regex: '2022' } },
					{ buildDate: { $regex: '2023' } },
					{ buildDate: { $regex: '2024' } },
					{ buildDate: { $regex: '2025' } },
				],
			},
		},
		// {
		// 	$project : {
		// 		_id          : 1,
		// 		abcd         : 1,
		// 		actioned     : 1,
		// 		amount       : 1,
		// 		area         : 1,
		// 		asd          : 1,
		// 		baseModel    : 1,
		// 		buildDate    : 1,
		// 		claimNumber  : 1,
		// 		cost         : 1,
		// 		country      : 1,
		// 		customer     : 1,
		// 		dealer       : 1,
		// 		description  : 1,
		// 		detection    : 1,
		// 		division     : 1,
		// 		failDate     : 1,
		// 		failedAt     : 1,
		// 		failedPart   : 1,
		// 		fourC        : 1,
		// 		hours        : 1,
		// 		image        : 1,
		// 		image1       : 1,
		// 		image2       : 1,
		// 		image3       : 1,
		// 		image4       : 1,
		// 		image5       : 1,
		// 		importedDate : 1,
		// 		inspector    : 1,
		// 		internal     : 1,
		// 		isAg         : 1,
		// 		model        : 1,
		// 		name         : 1,
		// 		notes        : 1,
		// 		outcome      : 1,
		// 		partSupplier : 1,
		// 		postCutIn    : 1,
		// 		serviceRes   : 1,
		// 		serviceResAt : 1,
		// 		serviceResBy : 1,
		// 		status       : 1,
		// 		tPeriod      : 1,
		// 		vetted       : 1,
		// 		vettedAt     : 1,
		// 	},
		// },
	])

	if (claimsResult.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(claimsResult)

		fs.writeFile('claims.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./claims.csv', () => {
				// fs.unlinkSync('./customer.csv');
			})
		})
	}
}

module.exports.downloadHeatmap = async (req, res) => {
	const { division, area, type } = req.params

	const periods = ['DOA', 'T000', 'T001', 'T002', 'T003']

	let types = []
	let modes = []

	if (type === 'Leaks') {
		types = ['O Ring', 'Loose Hose/Adaptor', 'Leaking', 'Ram seal leak']
		modes = ['Hydraulic']
	}
	if (type === 'Electrics') {
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

	const result = await Claim.aggregate([
		{
			$match: {
				area: area,
				$or: [
					{ buildDate: { $regex: '/09/2021' } },
					{ buildDate: { $regex: '/10/2021' } },
					{ buildDate: { $regex: '/11/2021' } },
					{ buildDate: { $regex: '/12/2021' } },
					{ buildDate: { $regex: '2022' } },
				],
				division: division,
				tPeriod: { $in: periods },
				failuretype: { $in: types },
				failuremode: { $in: modes },
				outcome: {
					$nin: ['Reject', 'Z Code'],
				},
			},
		},
		{
			$project: {
				_id: 0,
				abcd: 1,
				area: 1,
				asd: 1,
				buildDate: 1,
				claimDate: 1,
				claimNumber: 1,
				serial: '$name',
				cost: 1,
				country: 1,
				customer: 1,
				dealer: 1,
				description: 1,
				detection: 1,
				division: 1,
				failDate: 1,
				failedAt: 1,
				failedPart: 1,
				failuremode: 1,
				failuretype: 1,
				fourC: 1,
				hours: 1,
				model: 1,
				notes: 1,
				outcome: 1,
				partSupplier: 1,
				status: 'Open',
				tPeriod: 1,
				closureDate: 1,
				linked: 1,
				linkedTo: 1,
				linkedContaindDate: 1,
				linkedClosedDate: 1,
				closeNotes: 1,
				contained_date: {
					$substr: ['$containedAt', 0, 10],
				},
				closed_date: {
					$substr: ['$closedAt', 0, 10],
				},

				vetted_date: {
					$substr: ['$vettedAt', 0, 10],
				},

				vettedBy: 1,
			},
		},
		{ $sort: { tPeriod: 1 } },
	])

	for (let r of result) {
		if (r.linked) {
			let foundClaim = await Claim.findById(r.linkedTo)
			if (foundClaim && foundClaim.claimNumber) r.linkedTo = foundClaim.claimNumber
			if (foundClaim && foundClaim.closedAt) r.linkedClosedDate = new Date(foundClaim.closedAt).toLocaleDateString('en-GB')
			if (foundClaim && foundClaim.containedAt) r.linkedContaindDate = new Date(foundClaim.containedAt).toLocaleDateString('en-GB')
			if (!r.closed_date && r.linkedClosedDate !== '') {
				r.closed_date = r.linkedClosedDate
			}
			if (!r.contained_date && r.linkedContainedDate !== '') {
				r.contained_date = r.linkedContainedDate
			}
		}
		if (!r.closed_date && r.closureDate !== '') {
			r.closed_date = r.closureDate
		}
	}
	for (let r of result) {
		if (r.closed_date) {
			r.status = 'Closed'
		}
		if (r.contained_date && !r.closed_date) {
			r.status = 'Contained'
		}
	}

	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/dash/heatmap/LDL/${type}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('claims.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./claims.csv', () => {
				fs.unlinkSync('./claims.csv')
			})
		})
	}
}

module.exports.downloadMartin = async (req, res) => {
	const { division } = req.params
	MongoClient.connect(
		url,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		function (err, db) {
			if (err) throw err

			let dbo = db.db('uptime2')

			dbo
				.collection('claims')
				.find({
					division: division,
				})
				.toArray(function (err, result) {
					if (err) throw err.message
					// const csvFields = [
					// 	'_id',
					// 	'name',
					// 	'claimNumber',
					// 	'dealer',
					// ];
					const json2csvParser = new Json2csvParser({})
					const csv = json2csvParser.parse(result)

					fs.writeFile('claims.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./claims.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}

module.exports.downloadAll = async (req, res) => {
	MongoClient.connect(
		url,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		function (err, db) {
			if (err) throw err

			let dbo = db.db('uptime2')

			dbo
				.collection('claims')
				.find({
					importedDate: { $gte: new Date('2021-11-01T00:00:00Z') },
					// tPeriod      : 'DOA',
					// tPeriod      : { $ne: 'DOA' },
					// scc          : {
					// 	$in : [ 'Should', 'Could', 'Cannot' ],
					// },
					postCutIn: 'Yes',
					outcome: {
						$in: ['Accept', 'More Info', 'Parts Back', 'Pictures Required', 'Raise on Supplier'],
					},
					// $or          : [
					// 	{ buildDate: { $regex: '2020' } },
					// 	{ buildDate: { $regex: '2021' } },
					// 	{ buildDate: { $regex: '2022' } },
					// 	{ buildDate: { $regex: '2023' } },
					// 	{ buildDate: { $regex: '2024' } },
					// 	{ buildDate: { $regex: '2025' } },
					// ],
				})
				.toArray(function (err, result) {
					if (err) throw err.message
					const csvFields = ['_id', 'name', 'claimNumber', 'dealer']
					const json2csvParser = new Json2csvParser({ csvFields })
					const csv = json2csvParser.parse(result)

					fs.writeFile('ukDivisions.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./ukDivisions.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}
module.exports.downloadRetails = async (req, res) => {
	let { division } = req.params
	if (division === 'GROUP' || division.includes('HBU') || division.includes('Cabs')) {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}
	MongoClient.connect(
		url,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		async function (err, db) {
			if (err) throw err

			let dbo = db.db('uptime2')

			dbo
				.collection('retails')
				.find({
					// importedDate : { $gte: new Date('2021-01-01T20:15:31Z') },
					division: {
						$in: division,
					},
				})
				.toArray(function (err, result) {
					if (err) throw err.message
					const csvFields = ['_id', 'name', 'claimNumber', 'dealer']
					const json2csvParser = new Json2csvParser({})
					const csv = json2csvParser.parse(result)

					fs.writeFile('retails.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./retails.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}

// download all cabs 4C data

module.exports.downloadCabsClaims = async (req, res) => {
	const result = await Claim.aggregate([
		{
			$match: {
				fourC: 'Yes',
				area: 'Cabs Systems',
			},
		},
		{
			$project: {
				_id: -1,
				claimNumber: 1,
				division: 1,
				status: 1,
				tPeriod: 1,
				vettedBy: 1,
				area: 1,
				buildDate: 1,
				failDate: 1,
				model: 1,
				name: 1,
				hours: 1,
				notes: 1,
				failedPart: 1,
				description: 1,
				containCutIn: 1,
				containedBy: 1,
				closeCutIn: 1,
				closedBy: 1,
				buildNumber: 1,
				vettedAt: {
					$substr: ['$vettedAt', 0, 10],
				},
			},
		},
	])

	const json2csvParser = new Json2csvParser({})
	const csv = json2csvParser.parse(result)

	fs.writeFile('cabs.csv', csv, function (err) {
		if (err) throw err.message
		// console.log('file saved');
		res.download('./cabs.csv', () => {
			// fs.unlinkSync('./customer.csv');
		})
	})
}

module.exports.downloadASDDoa = async (req, res) => {
	let { division } = req.params
	let thisMonth = moment().subtract(0, 'months').format('MM/YYYY')
	let oneMonthAgo = moment().subtract(1, 'months').format('MM/YYYY')
	let twoMonthsAgo = moment().subtract(2, 'months').format('MM/YYYY')
	let threeMonthsAgo = moment().subtract(3, 'months').format('MM/YYYY')
	let fourMonthsAgo = moment().subtract(4, 'months').format('MM/YYYY')

	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}
	MongoClient.connect(
		url,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		async function (err, db) {
			if (err) throw err

			let dbo = db.db('uptime2')

			dbo
				.collection('claims')
				.find({
					division: {
						$in: division,
					},
					tPeriod: {
						$in: ['DOA'],
					},
					outcome: {
						$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
					},
					$or: [
						{ buildDate: { $regex: fourMonthsAgo } },
						{ buildDate: { $regex: threeMonthsAgo } },
						{ buildDate: { $regex: twoMonthsAgo } },
						{ buildDate: { $regex: oneMonthAgo } },
						{ buildDate: { $regex: thisMonth } },
					],
				})
				.toArray(function (err, result) {
					if (err) throw err.message
					// const csvFields = [
					// 	'_id',
					// 	'name',
					// 	'claimNumber',
					// 	'dealer',
					// ]
					const json2csvParser = new Json2csvParser({})
					const csv = json2csvParser.parse(result)

					fs.writeFile('asd.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./asd.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}

module.exports.downloadASDDoaC = async (req, res) => {
	let { division } = req.params
	let thisMonth = moment().subtract(0, 'months').format('MM/YYYY')
	let oneMonthAgo = moment().subtract(1, 'months').format('MM/YYYY')
	let twoMonthsAgo = moment().subtract(2, 'months').format('MM/YYYY')
	let threeMonthsAgo = moment().subtract(3, 'months').format('MM/YYYY')
	let fourMonthsAgo = moment().subtract(4, 'months').format('MM/YYYY')

	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else if (division.includes('Cabs')) {
		division = ['Cabs Systems']
	} else {
		division = [division]
	}
	MongoClient.connect(
		url,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		async function (err, db) {
			if (err) throw err

			let dbo = db.db('uptime2')

			dbo
				.collection('claims')
				.find({
					area: {
						$in: division,
					},
					tPeriod: {
						$in: ['DOA'],
					},
					outcome: {
						$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
					},
					$or: [
						{ buildDate: { $regex: fourMonthsAgo } },
						{ buildDate: { $regex: threeMonthsAgo } },
						{ buildDate: { $regex: twoMonthsAgo } },
						{ buildDate: { $regex: oneMonthAgo } },
						{ buildDate: { $regex: thisMonth } },
					],
				})
				.toArray(function (err, result) {
					if (err) throw err.message
					// const csvFields = [
					// 	'_id',
					// 	'name',
					// 	'claimNumber',
					// 	'dealer',
					// ]
					const json2csvParser = new Json2csvParser({})
					const csv = json2csvParser.parse(result)

					fs.writeFile('asd.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./asd.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}
module.exports.downloadASDt3 = async (req, res) => {
	let { division } = req.params
	let thisMonth = moment().subtract(0, 'months').format('MM/YYYY')
	let oneMonthAgo = moment().subtract(1, 'months').format('MM/YYYY')
	let twoMonthsAgo = moment().subtract(2, 'months').format('MM/YYYY')
	let threeMonthsAgo = moment().subtract(3, 'months').format('MM/YYYY')
	let fourMonthsAgo = moment().subtract(4, 'months').format('MM/YYYY')

	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else {
		division = [division]
	}
	MongoClient.connect(
		url,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		async function (err, db) {
			if (err) throw err

			let dbo = db.db('uptime2')

			dbo
				.collection('claims')
				.find({
					division: {
						$in: division,
					},
					tPeriod: {
						$in: ['T000', 'T001', 'T002', 'T003', 'T0', 'T1', 'T2', 'T3'],
					},
					outcome: {
						$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
					},
					$or: [
						{ buildDate: { $regex: fourMonthsAgo } },
						{ buildDate: { $regex: threeMonthsAgo } },
						{ buildDate: { $regex: twoMonthsAgo } },
						{ buildDate: { $regex: oneMonthAgo } },
						{ buildDate: { $regex: thisMonth } },
					],
				})
				.toArray(function (err, result) {
					if (err) throw err.message
					// const csvFields = [
					// 	'_id',
					// 	'name',
					// 	'claimNumber',
					// 	'dealer',
					// ]
					const json2csvParser = new Json2csvParser({})
					const csv = json2csvParser.parse(result)

					fs.writeFile('asd.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./asd.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}

module.exports.downloadASDt3C = async (req, res) => {
	let { division } = req.params
	let thisMonth = moment().subtract(0, 'months').format('MM/YYYY')
	let oneMonthAgo = moment().subtract(1, 'months').format('MM/YYYY')
	let twoMonthsAgo = moment().subtract(2, 'months').format('MM/YYYY')
	let threeMonthsAgo = moment().subtract(3, 'months').format('MM/YYYY')
	let fourMonthsAgo = moment().subtract(4, 'months').format('MM/YYYY')

	if (division === 'GROUP') {
		division = ['BHL', 'SD', 'CP', 'EM', 'LP', 'HP', 'LDL']
	} else if (division.includes('Cabs')) {
		division = ['Cabs Systems']
	} else {
		division = [division]
	}
	MongoClient.connect(
		url,
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		},
		async function (err, db) {
			if (err) throw err

			let dbo = db.db('uptime2')

			dbo
				.collection('claims')
				.find({
					area: {
						$in: division,
					},
					tPeriod: {
						$in: ['T000', 'T001', 'T002', 'T003', 'T0', 'T1', 'T2', 'T3'],
					},
					outcome: {
						$in: ['Accept', 'More Info', 'Pictures Required', 'Parts Back', 'Raise on Supplier'],
					},
					$or: [
						{ buildDate: { $regex: fourMonthsAgo } },
						{ buildDate: { $regex: threeMonthsAgo } },
						{ buildDate: { $regex: twoMonthsAgo } },
						{ buildDate: { $regex: oneMonthAgo } },
						{ buildDate: { $regex: thisMonth } },
					],
				})
				.toArray(function (err, result) {
					if (err) throw err.message
					// const csvFields = [
					// 	'_id',
					// 	'name',
					// 	'claimNumber',
					// 	'dealer',
					// ]
					const json2csvParser = new Json2csvParser({})
					const csv = json2csvParser.parse(result)

					fs.writeFile('asd.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./asd.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}

module.exports.deleteClaim = async (req, res) => {
	const { id } = req.params
	// await Claim.findByIdAndDelete(id)
	const claim = await Claim.findByIdAndUpdate(id, {
		active: false,
	})

	req.flash('success', 'Successfully deleted claim')
	res.redirect('/')
}

// delete duplicate claims

const CronJob = require('cron').CronJob

let removeSpeechMarks = new CronJob('0 30 09 * * 1-5', async function () {
	function removeLastComma(str) {
		if (str) {
			updatedStr = str.replace(/"/g, '')
		} else {
			updatedStr = str
		}
		return updatedStr
	}

	const claims = await Claim.find({
		tPeriod: {
			$in: ['DOA', 'T000', 'T001', 'T002', 'T003'],
		},
		$or: [{ description: { $regex: '"' } }, { failedPart: { $regex: '"' } }, { dealer: { $regex: '"' } }],
	})

	// console.log(claims.length)

	for (let claim of claims) {
		const updatedPart = removeLastComma(claim.failedPart)
		const updatedNarrative = removeLastComma(claim.description)
		const updatedDealer = removeLastComma(claim.dealer)

		await Claim.findByIdAndUpdate(claim._id, {
			failedPart: updatedPart,
			description: updatedNarrative,
			dealer: updatedDealer,
		})
	}

	console.log('speech marks removed')
})

// removeSpeechMarks.start()

let addStoppageEndedAt = new CronJob('0 24 16 * * 1-5', async function () {
	// return new Date(date)

	const stoppages = await Stoppage.find({
		open: false,
	})

	// console.log(claims.length)

	for (let stoppage of stoppages) {
		let endedAt = formatDate(stoppage.endTime)

		// console.log(endedAt)

		await Stoppage.findByIdAndUpdate(stoppage._id, {
			closedAt: endedAt,
		})
	}

	console.log('All Stoppages Updated')
})

// addStoppageEndedAt.start()

// let updateParts = new  CronJob('0 12 16 * * 1-5', async function() {
// 	const partsImport = excelToJson({
// 		sourceFile  : './public/claims/parts.xlsx',
// 		columnToKey : {
// 			A : 'claimNumber',
// 			B : 'supplier',
// 		},
// 	})

// 	const formattedClaimsImport = Object.values(partsImport).flat()

// 	for (let f of formattedClaimsImport) {
// 		foundClaim = await Claim.findOne({
// 			claimNumber : f.claimNumber,
// 		})

// 		if (foundClaim) {
// 			await Claim.findByIdAndUpdate(foundClaim._id, {
// 				supplier : f.supplier,
// 			})
// 			console.log(foundClaim.claimNumber)
// 		}
// 	}
// 	console.log('parts just updated')
// })

// updateParts.start()

module.exports.renderReallocateFormCabs = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findById(id)
	if (!claim) {
		req.flash('error', 'Cannot find that claim')
		return res.redirect('/')
	}

	const areas = await Cabs.find({}).sort({ name: '' })

	res.render('claims/reallocateCabs', { areas, claim })
}

// reallocate 4C
module.exports.updateClaimReallocateCabs = async (req, res) => {
	const { id } = req.params
	const claim = await Claim.findByIdAndUpdate(id, {
		cabs: req.body.claim.cabs,
	})

	// req.flash('success', 'Successfully Reallocated 4C');
	res.redirect(`/claims/4cshow/${id}`)
}

module.exports.addLinkedClaim = async (req, res) => {
	// const CSVToJSON = require('csvtojson')
	// const fs = require('fs')

	// console.log('Here')

	// // convert users.csv file to JSON array
	// CSVToJSON()
	// 	.fromFile('./PDF/test.csv')
	// 	.then((test) => {
	// 		// users is a JSON array
	// 		// log the JSON array
	// 		// console.log(test)

	// 		// Write JSON array to a file
	// 		fs.writeFile('test.json', JSON.stringify(test, null, 4), (err) => {
	// 			if (err) {
	// 				throw err
	// 			}
	// 			console.log('JSON array is saved.')
	// 		})
	// 	})
	// 	.catch((err) => {
	// 		// log error if any
	// 		console.log(err)
	// 	})
	const { id, id2 } = req.params

	const claim = await Claim.find({
		_id: id2,
	})

	if (claim || !claim.linked) {
		const masterClaim = await Claim.findByIdAndUpdate(
			id,
			{
				$addToSet: { linkedClaims: id2 },
			},
			{ new: true }
		)
		const slaveClaim = await Claim.findByIdAndUpdate(
			id2,
			{
				linkedTo: id,
				linked: true,
				status: masterClaim.status,
				closeNotes: `See 4C number ${masterClaim.claimNumber} `,
			},
			{ new: true }
		)

		// let theDate = new Date('2020,01,01')

		// const leaksToClose = await Claim.find({
		// 	fourC    : 'Yes',
		// 	closedAt : { $gte: theDate },
		// 	status   : { $ne: 'Closed' },
		// 	division : 'LDL',
		// 	closedBy : { $ne: 'System' },
		// })

		// for (let l of leaksToClose) {
		// 	let id = l._id
		// 	await Claim.findByIdAndUpdate(id, {
		// 		status : 'Closed',
		// 		rag    : 'Closed',
		// 	})
		// }

		// const fourCParts = await Claim.find({
		// 	$or     : [ { fourC: 'Yes' }, { linked: true } ],
		// 	// fourC: 'Yes',
		// 	status  : { $ne: 'Closed' },
		// 	// importedDate : { $gte: eightMonthsAgoFirstDB },
		// 	tPeriod : {
		// 		$in : [ 'DOA', 'T000', 'T001', 'T002', 'T003' ],
		// 	},

		// 	outcome : {
		// 		$nin : [ 'Reject', 'Z Code' ],
		// 	},
		// })

		// const fourCPartNumbers = fourCParts.map((claim) => claim.failedPart)

		// const caimsToClose = await Claim.aggregate([
		// 	{
		// 		$match : {
		// 			// $or     : [ { fourC: 'Yes' }, { linked: true } ],
		// 			// $or        : [
		// 			// 	{ fourC: 'Yes' },
		// 			// 	{ linked: { $exists: { linked: true } } },
		// 			// ],
		// 			// fourC       : 'Yes',
		// 			// claimNumber : 'Internal Techweb',
		// 			$or    : [
		// 				{ claimNumber: 'Internal Techweb' },
		// 				{ claimNumber: 'Leak Techweb' },
		// 			],
		// 			// linked : true,
		// 			// tPeriod     : 'DOA',

		// 			status : { $ne: 'Closed' },
		// 			// failedPart : { $in: fourCPartNumbers },
		// 			// $or         : [
		// 			// 	{ buildDate: { $regex: '/03/2020' } },
		// 			// 	{ buildDate: { $regex: '/04/2020' } },
		// 			// 	{ buildDate: { $regex: '/05/2020' } },
		// 			// 	{ buildDate: { $regex: '/06/2020' } },
		// 			// 	{ buildDate: { $regex: '/07/2020' } },
		// 			// 	{ buildDate: { $regex: '/08/2020' } },
		// 			// 	{ buildDate: { $regex: '/09/2020' } },
		// 			// 	{ buildDate: { $regex: '/10/2020' } },
		// 			// 	{ buildDate: { $regex: '/11/2020' } },
		// 			// 	{ buildDate: { $regex: '/12/2020' } },
		// 			// 	{ buildDate: { $regex: '/01/2021' } },
		// 			// 	{ buildDate: { $regex: '/02/2021' } },
		// 			// 	{ buildDate: { $regex: '/03/2021' } },
		// 			// 	{ buildDate: { $regex: '/04/2021' } },
		// 			// 	{ buildDate: { $regex: '/05/2021' } },
		// 			// 	{ buildDate: { $regex: '/06/2021' } },
		// 			// 	{ buildDate: { $regex: '/07/2021' } },
		// 			// 	{ buildDate: { $regex: '/08/2021' } },
		// 			// ],
		// 		},
		// 	},
		// ])

		// const arrayOpenClaims = caimsToClose
		// 	.filter((claim) => claim.status === 'Open')
		// 	.map((claim) => claim._id)

		// const arrayContainedClaims = caimsToClose
		// 	.filter((claim) => claim.status === 'Contained')
		// 	.map((claim) => claim._id)

		// // console.log('OPEN => ', arrayOpenClaims)
		// // console.log('CONTAINED => ', arrayContainedClaims)

		// await Claim.updateMany(
		// 	{ _id: { $in: arrayOpenClaims } },
		// 	{
		// 		$set : {
		// 			status       : 'Closed',
		// 			rag          : 'Closed',
		// 			closedBy     : 'System',
		// 			containedAt  : Date.now(),
		// 			closedAt     : Date.now(),
		// 			containNotes :
		// 				'Closed as part of system cleansing Jan 2022. Ref Mark Norton (Group Quality Manager)',
		// 			closeNotes   :
		// 				'Closed as part of system cleansing Jan 2022. Ref Mark Norton (Group Quality Manager)',
		// 		},
		// 	},
		// 	{ multi: true },
		// )
		// await Claim.updateMany(
		// 	{ _id: { $in: arrayContainedClaims } },
		// 	{
		// 		$set : {
		// 			status     : 'Closed',
		// 			rag        : 'Closed',
		// 			closedBy   : 'System',
		// 			closedAt   : Date.now(),
		// 			closeNotes :
		// 				'Closed as part of system cleansing Jan 2022. Ref Mark Norton (Group Quality Manager)',
		// 		},
		// 	},
		// 	{ multi: true },
		// )

		// const allClaimsWithLinkedArray = await Claim.find({
		// 	linkedClaims : { $exists: true },
		// })

		// for (let c of allClaimsWithLinkedArray) {
		// 	if (c.status === 'Contained') {
		// 		for (let l of c.linkedClaims) {
		// 			await Claim.findByIdAndUpdate(id, {
		// 				status       : 'Contained',
		// 				containedAt  : Date.now(),
		// 				containNotes : `See 4C number ${c.claimNumber} `,
		// 				linkedTo     : c._id,
		// 			})
		// 		}
		// 	}
		// 	if (c.status === 'Closed') {
		// 		for (let l of c.linkedClaims) {
		// 			await Claim.findByIdAndUpdate(id, {
		// 				status     : 'Closed',
		// 				closedAt   : Date.now(),
		// 				closeNotes : `See 4C number ${c.claimNumber} `,
		// 				linkedTo   : c._id,
		// 			})
		// 		}
		// 	}
		// 	if (c.status === 'Open') {
		// 		for (let l of c.linkedClaims) {
		// 			await Claim.findByIdAndUpdate(id, {
		// 				linkedTo : c._id,
		// 			})
		// 		}
		// 	}
		// }

		req.flash('success', 'Claim Linked')
		res.redirect(`/claims/${id2}/edit`)
	} else {
		req.flash('error', 'Claim Already Linked')
		res.redirect(`/claims/${id2}/edit`)
	}
}

module.exports.removeLinkedClaim = async (req, res) => {
	const { id, id2 } = req.params

	const masterClaim = await Claim.findByIdAndUpdate(
		id,
		{
			$pull: { linkedClaims: id2 },
		},
		{ new: true }
	)
	const slaveClaim = await Claim.findByIdAndUpdate(
		id2,
		{
			linkedTo: null,
			linked: false,
			status: 'Open',
			closeNotes: null,
		},
		{ new: true }
	)

	// console.log(masterClaim)

	req.flash('error', 'Claim Un Linked')
	res.redirect(`/claims/${id2}/edit`)
}

module.exports.downloadfourCDates = async (req, res) => {
	const fourcResult = await Claim.aggregate([
		{
			$match: {
				fourC: 'Yes',
				division: { $in: ['EM', 'LP'] },
			},
		},
		{
			$project: {
				_id: 0,
				division: 1,
				area: 1,
				model: 1,
				claimNumber: 1,
				tPeriod: 1,
				status: 1,
				name: 1,
				raised_Date: {
					$substr: ['$vettedAt', 0, 10],
				},
				contntained_Date: {
					$substr: ['$containedAt', 0, 10],
				},
				closed_Date: {
					$substr: ['$closedAt', 0, 10],
				},
				re_opened_Date: {
					$substr: ['$reOpenedAt', 0, 10],
				},
				audited_Date: {
					$substr: ['$auditedAt', 0, 10],
				},
			},
		},
	]).sort({ division: 1 })

	if (fourcResult.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(fourcResult)

		fs.writeFile('fourCDates.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./fourCDates.csv', () => {
				// fs.unlinkSync('./customer.csv');
			})
		})
	}
}

module.exports.manLinkedClaim = async (req, res) => {
	const { id } = req.params

	const claimTo = await Claim.findOne({
		claimNumber: req.body.claimLinkTo,
	})
	const claimFrom = await Claim.findOne({
		_id: id,
	})

	if (!claimTo) {
		req.flash('error', 'Cant Find That Claim')
		res.redirect(`/claims/${id}/edit`)
		return
	}

	if (claimTo || !claimFrom.linked) {
		const masterClaim = await Claim.findByIdAndUpdate(
			claimTo._id,
			{
				$addToSet: { linkedClaims: claimFrom._id },
			},
			{ new: true }
		)
		const slaveClaim = await Claim.findByIdAndUpdate(
			claimFrom._id,
			{
				linkedTo: claimTo._id,
				linked: true,
				status: masterClaim.status,
				closeNotes: `See 4C number ${masterClaim.claimNumber} `,
			},
			{ new: true }
		)

		// console.log('CLAIM FROM => ', claimFrom)
		// console.log('CLAIM TO => ', claimTo)

		req.flash('success', 'Claim Linked')
		res.redirect(`/claims/${id}/edit`)
	} else {
		req.flash('error', 'Claim Already Linked')
		res.redirect(`/claims/${id}/edit`)
	}
}

module.exports.manRemoveLinkedClaim = async (req, res) => {
	const { id } = req.params

	const claimFrom = await Claim.findOne({
		_id: id,
	})

	const claimTo = await Claim.findOne({
		_id: claimFrom.linkedTo,
	})

	if (!claimTo || !claimFrom) {
		req.flash('error', 'Cant Find That Claim')
		res.redirect(`/claims/${id}/edit`)
		return
	}

	if (claimTo || !claimFrom.linked) {
		const masterClaim = await Claim.findByIdAndUpdate(
			claimTo._id,
			{
				$pull: { linkedClaims: claimFrom._id },
			},
			{ new: true }
		)
		const slaveClaim = await Claim.findByIdAndUpdate(
			claimFrom._id,
			{
				linkedTo: null,
				linked: false,
				status: 'Open',
				closeNotes: null,
			},
			{ new: true }
		)

		// console.log('CLAIM FROM => ', claimFrom)
		// console.log('CLAIM TO => ', claimTo)

		req.flash('success', 'Claim Linked Removed')
		res.redirect(`/claims/${id}/edit`)
	} else {
		req.flash('error', 'Claim Already Linked')
		res.redirect(`/claims/${id}/edit`)
	}
}

module.exports.markNortonClose = async (req, res) => {
	let notes = 'Closed by Mark Norton as part of 4C cleansing process'
	const { id, personId } = req.params

	if (personId === '5f7ed8347f39c7b0887a39b3') {
		const claim = await Claim.findByIdAndUpdate(
			id,
			{
				status: 'Closed',
				containedAt: Date.now(),
				closedAt: Date.now(),
				containedBy: req.user.firstName + ' ' + req.user.lastName,
				closedBy: req.user.firstName + ' ' + req.user.lastName,
				containNotes: notes,
				counterWhatNotes: notes,
				counterWhyNotes: notes,
				rootCause: notes,
			},
			{ new: true }
		)

		req.flash('success', 'Successfully closed 4C')
		res.redirect(`/claims/4cshow/${id}`)
	} else {
		req.flash('error', 'Sorry You do not have permission to do that')
		res.redirect(`/claims/4cshow/${id}`)
	}
}

module.exports.downloadDealerClaims = async (req, res) => {
	const { division, dealer } = req.params
	const sixMonthsAgoDB = moment().subtract(6, 'months').format('MM/YYYY')
	const fiveMonthsAgoDB = moment().subtract(5, 'months').format('MM/YYYY')
	const fourMonthsAgoDB = moment().subtract(4, 'months').format('MM/YYYY')
	const threeMonthsAgoDB = moment().subtract(3, 'months').format('MM/YYYY')
	const twoMonthsAgoDB = moment().subtract(2, 'months').format('MM/YYYY')
	const oneMonthAgoDB = moment().subtract(1, 'months').format('MM/YYYY')

	const dealerResult = await Claim.aggregate([
		{
			$match: {
				division: division,
				dealer: dealer,
				tPeriod: 'DOA',
				outcome: { $nin: ['Reject', 'Z Code'] },
				$or: [
					{ buildDate: { $regex: sixMonthsAgoDB } },
					{ buildDate: { $regex: fiveMonthsAgoDB } },
					{ buildDate: { $regex: fourMonthsAgoDB } },
					{ buildDate: { $regex: threeMonthsAgoDB } },
					{ buildDate: { $regex: twoMonthsAgoDB } },
					{ buildDate: { $regex: oneMonthAgoDB } },
				],
			},
		},
		{
			$addFields: {
				serial: '$name',
			},
		},
		{ $sort: { importedDate: -1 } },
		{
			$project: {
				_id: 0,
				asd: 1,
				buildDate: 1,
				claimNumber: 1,
				customer: 1,
				dealer: 1,
				description: 1,
				failDate: 1,
				failedPart: 1,
				fourC: 1,
				hours: 1,
				importDate: 1,
				model: 1,
				serial: 1,
				notes: 1,
				outcome: 1,
				partSupplier: 1,
				status: 1,
				tPeriod: 1,
				vetted: 1,
				vettedAt: 1,
				vettedBy: 1,
			},
		},
	])

	if (dealerResult.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(dealerResult)

		fs.writeFile(`${dealer}_claims.csv`, csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download(`./${dealer}_claims.csv`, () => {
				// fs.unlinkSync('./customer.csv');
			})
		})
	}
}

module.exports.serviceActionedYes = async (req, res, next) => {
	const { division, id } = req.params
	const search = req.query.outcome

	// console.log(search)

	const claim = await Claim.findByIdAndUpdate(
		id,
		{
			serviceResBy: req.user.firstName + ' ' + req.user.lastName,
			serviceResAt: Date.now(),
			serviceRes: 'Done',
			actioned: 'Yes',
		},
		{ new: true }
	)

	// console.log(req.body)

	res.redirect(`/claims/service/${division}?outcome=${search}`)
	// res.redirect(`/dash/qmrd/LDL`)
}
module.exports.serviceActionedNo = async (req, res, next) => {
	const { division, id } = req.params
	const search = req.query.outcome

	// console.log(search)

	const claim = await Claim.findByIdAndUpdate(
		id,
		{
			serviceResBy: req.user.firstName + ' ' + req.user.lastName,
			serviceResAt: Date.now(),
			serviceRes: 'Not Done',
			actioned: 'No',
		},
		{ new: true }
	)

	// console.log(req.body)

	res.redirect(`/claims/service/${division}?outcome=${search}`)
	// res.redirect(`/dash/qmrd/LDL`)
}

//render form to vet warranty claim
module.exports.renderClaimImportForm = async (req, res) => {
	res.render('import/claims', {})
}

//render form to vet warranty claim
module.exports.renderClaimImportFormCabs = async (req, res) => {
	res.render('import/claims-cabs', {})
}

//route to import warranty claims
module.exports.importClaims = async (req, res) => {
	// console.log(req.files)
	// console.log(req.body)
	//start here

	const claimsImport = excelToJson({
		sourceFile: './public/claims/claims.xlsx',
		columnToKey: {
			A: 'division',
			B: 'tPeriod',
			C: 'sapPlant',
			D: 'family',
			E: 'baseModel',
			F: 'model',
			G: 'name',
			H: 'hours',
			I: 'package',
			J: 'dealer',
			K: 'retailDealer',
			L: 'country',
			M: 'customer',
			N: 'sapStatus',
			O: 'intSupplier',
			P: 'failedPart',
			Q: 'supplier',
			R: 'dCode',
			S: 'failedAt',
			T: 'sCategory',
			U: 'sCategoryDetail',
			V: 'buildmonth',
			W: 'buildDate',
			X: 'soldDate',
			Y: 'failDate',
			Z: 'claimDate',
			AA: 'dealerCreditDate',
			AB: 'supplierClaimDate',
			AC: 'claimNumber',
			AD: 'wClaimNumber',
			AE: 'engineManufacturer',
			AF: 'engineSerialNumber',
			AG: 'description',
			AH: 'failedPartQuantity',
			AI: 'labHrsClaimed',
			AJ: 'labHrsPaid',
			AK: 'partsCosts',
			AL: 'labour',
			AM: 'travel',
			AN: 'otherCosts',
			AO: 'uplift',
			AP: 'creditVAT',
			AQ: 'cost',
		},
	})

	const formattedClaimsImport = Object.values(claimsImport).flat()

	for (let c of Object.values(formattedClaimsImport).flat()) {
		if (c.division === 'BACKHOE') {
			c.division = 'BHL'
		}
		if (c.division === 'COMPACT PRODUCTS' || c.division === 'COMPACT') {
			c.division = 'CP'
		}
		if (c.division === 'EARTHMOVERS') {
			c.division = 'EM'
		}
		if (c.division === 'EXCAVATOR') {
			c.division = 'HP'
		}
		if (c.division === 'LANDPOWER') {
			c.division = 'LP'
		}
		if (c.division === 'LOADALL') {
			c.division = 'LDL'
		}
		if (c.division === 'SITE DUMPER') {
			c.division = 'SD'
		}
		if (c.division === 'USA') {
			c.division = 'USA'
		}
		c.importedDate = new Date()
		c.importDate = moment().format('DD/MM/YYYY')
		c.importWeek = moment().format('WW')
		c.postCutIn = 'Yes'
		c.nameCount = 0
		c.fourC = 'No'
		c.status = 'Open'
		c.vetted = 'No'
		c.buildDate = moment(new Date(c.buildDate)).format('DD/MM/YYYY')
		c.claimDate = moment(new Date(c.claimDate)).format('DD/MM/YYYY')
		c.soldDate = moment(new Date(c.soldDate)).format('DD/MM/YYYY')
		c.failDate = moment(new Date(c.failDate)).format('DD/MM/YYYY')
	}

	const claimsSameNavRemoved = formattedClaimsImport.filter(
		(claim, i) => claim.description !== claim.claimNumber && i !== 0 && claim.failedAt !== 'Z -MISSING AT DELIVERY + FREE SERVICE'
	)

	const oldClaims = await Claim.find({
		importedDate: {
			$gt: new Date(new Date().getTime() - 60 * 24 * 60 * 60 * 1000),
		},
		tPeriod: { $in: ['DOA', 'T000', 'T001', 'T002', 'T003'] },
	})

	//remove claims from new file that are already in db by claim number
	//comparing 2 arrays
	const claimsToImport = claimsSameNavRemoved.filter((x) => !oldClaims.filter((y) => y.claimNumber === x.claimNumber).length)

	if (claimsToImport.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(claimsToImport)

		fs.writeFile('import.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			// res.download('./claims.csv', () => {
			// 	// fs.unlinkSync('./customer.csv');
			// })
		})
		await Claim.create(claimsToImport)
		let theEmails = [
			'Ali.Ebrahimi@jcb.com',
			'Ali.Ebrahimi@jcb.com',
			'Georgia.Turner@jcb.com',
			'Joe.Gallimore@jcb.com',
			'Martin.Harper@jcb.com',
			'Leila.Dunbar@jcb.com',
			'Mark.Edwards@jcb.com',
			'Mark.Norton@jcb.com',
			'Mark.Willmore@jcb.com',
			'Russell.Salt@jcb.com',
			'Scott.Frame@jcb.com',
			'Stephen.Causer@jcb.com',
			'Steve.Clay@jcb.com',
			'Yunus.Bozkurt@jcb.com',
			'Carl.Gill@jcb.com',
			'Soron.Glynn@jcb.com',
			'Adam.Wainwright@jcb.com',
			'Patrick.Obright@jcb.com',
			'Tavares.Malone@jcb.com',
			'Amarilys.Marti@jcb.com',
		]

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
			subject: `Claims Import.`,
			html: `<img src="cid:jcb-logo"/>` + '<h2>Please see attached file for latest claims import</h2>' + `<h4>Thanks JCB Quality Uptime</h4>`,

			attachments: [
				{
					filename: 'QUT.png',
					path: './PDF/images/QUT.png',
					cid: 'jcb-logo',
				},
				{
					filename: 'import.csv',
					path: './import.csv',
					content: csv,
				},
			],
		}
		// send the email
		// transporter.sendMail(mailOptions, () => {})
		// fs.unlinkSync('./import.csv')
	}

	const fourteenMonthsAgoDB = moment().subtract(14, 'months').format('MM/YYYY')
	const thirteenMonthsAgoDB = moment().subtract(13, 'months').format('MM/YYYY')
	const twelveMonthsAgoDB = moment().subtract(12, 'months').format('MM/YYYY')
	const elevenMonthsAgoDB = moment().subtract(11, 'months').format('MM/YYYY')
	const tenMonthsAgoDB = moment().subtract(10, 'months').format('MM/YYYY')
	const nineMonthsAgoDB = moment().subtract(9, 'months').format('MM/YYYY')
	const eightMonthsAgoDB = moment().subtract(8, 'months').format('MM/YYYY')
	const sevenMonthsAgoDB = moment().subtract(7, 'months').format('MM/YYYY')
	const sixMonthsAgoDB = moment().subtract(6, 'months').format('MM/YYYY')
	const fiveMonthsAgoDB = moment().subtract(5, 'months').format('MM/YYYY')
	const fourMonthsAgoDB = moment().subtract(4, 'months').format('MM/YYYY')
	const threeMonthsAgoDB = moment().subtract(3, 'months').format('MM/YYYY')
	const twoMonthsAgoDB = moment().subtract(2, 'months').format('MM/YYYY')
	const oneMonthAgoDB = moment().subtract(1, 'months').format('MM/YYYY')
	const zeroMonthsAgoDB = moment().format('MM/YYYY')

	const curr = new Date()

	const startOfMonth = new Date(curr.getFullYear(), curr.getMonth(), 1) // start of this month

	const theCustomDate = new Date('2021, 10, 01')

	const startOfWeek = new Date(curr.setDate(curr.getDate() - curr.getDay())) //start of this week
	// console.log(startOfMonth)

	const claimsForUpdate = await Claim.aggregate([
		{
			$match: {
				// division : division,
				outcome: { $nin: ['Reject', 'Z Code'] },
				tPeriod: { $in: ['DOA', 'T000'] },
				importedDate: { $gte: startOfMonth },
			},
		},
		{
			$match: {
				$or: [
					{ buildDate: { $regex: elevenMonthsAgoDB } },
					{ buildDate: { $regex: tenMonthsAgoDB } },
					{ buildDate: { $regex: nineMonthsAgoDB } },
					{ buildDate: { $regex: eightMonthsAgoDB } },
					{ buildDate: { $regex: sevenMonthsAgoDB } },
					{ buildDate: { $regex: sixMonthsAgoDB } },
					{ buildDate: { $regex: fiveMonthsAgoDB } },
					{ buildDate: { $regex: fourMonthsAgoDB } },
					{ buildDate: { $regex: threeMonthsAgoDB } },
					{ buildDate: { $regex: twoMonthsAgoDB } },
					{ buildDate: { $regex: oneMonthAgoDB } },
				],
			},
		},
	])

	for (let claim of claimsForUpdate) {
		const retail = await Retail.findOne({
			serialNumber: claim.name,
		})
		if (retail) {
			const newClaim = await Claim.findByIdAndUpdate(
				claim._id,
				{
					dealer: retail.dealer,
					customer: retail.customer,
				},
				{ new: true }
			)
		}

		// console.log(newClaim)
	}

	req.flash('success', `${claimsToImport.length} Claims Succesfully Imported`)

	res.redirect('/claims/import-claims')
}

module.exports.renderClaimImportFormMri = async (req, res) => {
	res.render('import/claims-mri', {})
}

//route to import claims for prediction
module.exports.importMriClaimsCabs = async (req, res) => {
	// console.log(req.files)
	// console.log(req.body)
	//start here

	const claimsImport = excelToJson({
		sourceFile: './public/claims/claims.xlsx',
		columnToKey: {
			A: 'division',
			B: 'tPeriod',
			C: 'sapPlant',
			D: 'family',
			E: 'baseModel',
			F: 'model',
			G: 'name',
			H: 'hours',
			I: 'package',
			J: 'dealer',
			K: 'retailDealer',
			L: 'country',
			M: 'customer',
			N: 'sapStatus',
			O: 'intSupplier',
			P: 'failedPart',
			Q: 'supplier',
			R: 'dCode',
			S: 'failedAt',
			T: 'sCategory',
			U: 'sCategoryDetail',
			V: 'buildmonth',
			W: 'buildDate',
			X: 'soldDate',
			Y: 'failDate',
			Z: 'claimDate',
			AA: 'dealerCreditDate',
			AB: 'supplierClaimDate',
			AC: 'claimNumber',
			AD: 'wClaimNumber',
			AE: 'engineManufacturer',
			AF: 'engineSerialNumber',
			AG: 'description',
			AH: 'failedPartQuantity',
			AI: 'labHrsClaimed',
			AJ: 'labHrsPaid',
			AK: 'partsCosts',
			AL: 'labour',
			AM: 'travel',
			AN: 'otherCosts',
			AO: 'uplift',
			AP: 'creditVAT',
			AQ: 'cost',
		},
	})

	const formattedClaimsImport = Object.values(claimsImport).flat()

	for (let c of Object.values(formattedClaimsImport).flat()) {
		if (c.division === 'BACKHOE') {
			c.division = 'BHL'
		}
		if (c.division === 'COMPACT PRODUCTS' || c.division === 'COMPACT') {
			c.division = 'CP'
		}
		if (c.division === 'EARTHMOVERS') {
			c.division = 'EM'
		}
		if (c.division === 'EXCAVATOR') {
			c.division = 'HP'
		}
		if (c.division === 'LANDPOWER') {
			c.division = 'LP'
		}
		if (c.division === 'LOADALL') {
			c.division = 'LDL'
		}
		if (c.division === 'SITE DUMPER') {
			c.division = 'SD'
		}
		if (c.division === 'USA') {
			c.division = 'USA'
		}
		c.importedDate = new Date()
		c.importDate = moment().format('DD/MM/YYYY')
		c.importWeek = moment().format('WW')
		c.postCutIn = 'Yes'
		c.nameCount = 0
		c.fourC = 'No'
		c.status = 'Open'
		c.vetted = 'No'
		c.buildDate = moment(new Date(c.buildDate)).format('DD/MM/YYYY')
		c.claimDate = moment(new Date(c.claimDate)).format('DD/MM/YYYY')
		c.soldDate = moment(new Date(c.soldDate)).format('DD/MM/YYYY')
		c.failDate = moment(new Date(c.failDate)).format('DD/MM/YYYY')
	}

	const claimsSameNavRemoved = formattedClaimsImport.filter(
		(claim, i) =>
			//claim.description !== claim.claimNumber &&
			i !== 0 && claim.failedAt !== 'Z -MISSING AT DELIVERY + FREE SERVICE'
	)

	await MriClaim.deleteMany({})

	//remove claims from new file that are already in db by claim number
	//comparing 2 arrays
	// const claimsToImport = claimsSameNavRemoved.filter(
	// 	(x) => !oldClaims.filter((y) => y.claimNumber === x.claimNumber).length
	// )

	if (claimsSameNavRemoved.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(claimsSameNavRemoved)

		fs.writeFile('import.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			// res.download('./claims.csv', () => {
			// 	// fs.unlinkSync('./customer.csv');
			// })
		})
		await MriClaim.create(claimsSameNavRemoved)
	}

	req.flash('success', `${claimsSameNavRemoved.length} Claims Succesfully Imported`)

	res.redirect('/claims/import-claims-mri')
}

let updateTop50Dates = new CronJob('0 1 03 * * 1-5', async function () {
	let threeDaysAgoMoment = moment().subtract(3, 'days').format('YYYY, MM, DD')

	const threeDaysAgo = new Date(threeDaysAgoMoment)

	console.log(threeDaysAgo)
	console.log('Started')

	const claims = await Claim.find({
		importedDate: { $gte: threeDaysAgo },
		// division: 'HP'
	}).sort({ _id: -1 })

	for (let claim of claims) {
		try {
			let firstClaim = await Claim.findOne({
				division: claim.division,
				failedPart: RegExp(escapeRegex(claim.failedPart), 'gi'),
				// failedPart: claim.failedPart,
			})

			if (firstClaim) {
				let newRag

				if (firstClaim.top50OpenedDate && firstClaim.top50OpenedDate !== '') {
					newRag = 'Open'
				}
				if (
					firstClaim.top50OpenedDate &&
					firstClaim.top50OpenedDate !== '' &&
					firstClaim.top50ContainedDate &&
					firstClaim.top50ContainedDate !== ''
				) {
					newRag = 'Contained'
				}
				if (
					firstClaim.top50OpenedDate &&
					firstClaim.top50OpenedDate !== '' &&
					firstClaim.top50ContainedDate &&
					firstClaim.top50ContainedDate !== '' &&
					firstClaim.top50ClosedDate &&
					firstClaim.top50ClosedDate !== ''
				) {
					newRag = 'Closed'
				}

				await Claim.updateMany(
					{
						division: claim.division,
						failedPart: claim.failedPart,
					},
					{
						top50OpenedDate: firstClaim.top50OpenedDate,
						top50ContainedDate: firstClaim.top50ContainedDate,
						top50ClosedDate: firstClaim.top50ClosedDate,
						top50Linked: firstClaim.top50Linked,
						top50LinkedTo: firstClaim.top50LinkedTo,
						champion: firstClaim.champion,
						rag: newRag,
						concern: firstClaim.concern,
						action: firstClaim.action,
					}
				)
			}
		} catch (error) {
			console.log(error)
		}
	}

	console.log('finished')
})

updateTop50Dates.start()

module.exports.masterSearch = async (req, res) => {
	const { division } = req.params

	let searchOptions = { division: division, fourC: 'Yes', claimNumber: '' }
	let searchOptionsParts = { division: division, fourC: 'Yes', failedPart: '' }
	let formattedSearch
	let search
	let formattedSearchParts
	let searchParts

	if (req.query.claimNumber && req.query.claimNumber.trim() !== null && req.query.claimNumber.trim() !== '') {
		search = true
		formattedSearch = req.query.claimNumber.trim()
		searchOptions.claimNumber = formattedSearch
	}

	if (req.query.failedPart && req.query.failedPart.trim() !== null && req.query.failedPart.trim() !== '') {
		searchParts = true
		formattedSearchParts = req.query.failedPart.trim()
		searchOptionsParts.failedPart = formattedSearchParts
	}

	const claim = await Claim.findOne(searchOptions)
	const claims = await Claim.find(searchOptionsParts)

	res.render('claims/master-search', { division, claim, search, claims, searchParts })
}
