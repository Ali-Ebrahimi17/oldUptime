const Claim = require('../models/claim')
const Inspector = require('../models/inspector')
const Area = require('../models/area')
const FailureMode = require('../models/failuremode')
const FailureType = require('../models/failuretype')
const BuildMonth = require('../models/buildmonth')
const Detection = require('../models/detection')
const Model = require('../models/models')
const Throughput = require('../models/throughput')
const axios = require('axios')

const nodemailer = require('nodemailer')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// let startDate = moment().subtract(0, 'months').format('YYYY/MM/01/00/00')
// let endDate = moment().format('YYYY/MM/DD/kk/mm')
let startOfToday = moment().format('YYYY/MM/DD/00/00')

let tester = moment().add(1, 'days').format('YYYY/MM/DD/00/00')

// fetch('https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/10/2021/2/2/1/1/2021/2/4/9/2')
// 	.then((res) => res.json())
// 	.then((json) => {
// 		console.log(json);
// 	});

// console.log(tester);

function remove_duplicates(a, b) {
	for (let i = 0, len = a.length; i < len; i++) {
		for (let j = 0, len2 = b.length; j < len2; j++) {
			if (a[i].buildNo === b[j].buildNo) {
				b.splice(j, 1)
				len2 = b.length
			}
		}
	}
}

module.exports.dpu = async (req, res) => {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
	let startDate = moment().format('YYYY/MM/DD/00/00')
	let endDate = moment().format('YYYY/MM/DD/kk/mm')

	let response = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${startDate}/${endDate}/1`)

	let json = response.data

	let totalZone2 = []
	let inZone2 = []
	for (let m of json) {
		if (m['Fault Area'] === 'Zone 2 Ldl') {
			totalZone2.push(m)
		}
	}
	for (let m of json) {
		if (m['Fault Area'] === 'Zone 2 Ldl' && m.Zone === 'SIP 2 NEW') {
			inZone2.push(m)
		}
	}
	if (totalZone2.length > 0) {
		inspEff = Math.round((inZone2.length / totalZone2.length) * 100)
	}
	if (totalZone2.length < 1) {
		inspEff = 100
	}

	// console.log(inspEff)

	res.render('throughput/wip', { json, totalZone2, inZone2, inspEff })
}

module.exports.index = async (req, res) => {
	const { division } = req.params
	let searchOptions = { division: division, building: { $ne: 'Loadall PDI' } }

	if (req.query.buildNumber != null && req.query.buildNumber != '') {
		searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi')
	}
	if (req.query.building != null && req.query.building != '') {
		searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi')
	}
	const inspectors = await Inspector.find({ division: division })
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const models = await Model.find({ division: division }).sort({ name: '' })
	const throughput = await Throughput.find(searchOptions).sort({ createdAt: 'desc' }).limit(500)
	res.render('throughput/all', {
		throughput,
		inspectors,
		models,
		division,
		areas,
	})
}
module.exports.indexJack = async (req, res) => {
	const { division } = req.params
	let searchOptions = { division: division, building: { $ne: 'Loadall PDI' } }

	if (req.query.buildNumber != null && req.query.buildNumber != '') {
		searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi')
	}
	if (req.query.building != null && req.query.building != '') {
		searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi')
	}
	const inspectors = await Inspector.find({ division: division })
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const models = await Model.find({ division: division }).sort({ name: '' })
	const throughput = await Throughput.find(searchOptions).sort({ createdAt: 'desc' }).limit(500)
	res.render('throughput/allJack', {
		throughput,
		inspectors,
		models,
		division,
		areas,
	})
}
module.exports.startFaults = async (req, res) => {
	const { division } = req.params
	let searchOptions = { division: division, signedOut: 'Yes' }

	if (req.query.buildNumber != null && req.query.buildNumber != '') {
		searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi')
	}
	if (req.query.building != null && req.query.building != '') {
		searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi')
	}
	const inspectors = await Inspector.find({ division: division })
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const models = await Model.find({ division: division }).sort({ name: '' })
	const throughput = await Throughput.find(searchOptions).sort({ createdAt: 'desc' }).limit(1000)
	res.render('throughput/startFaults', {
		throughput,
		inspectors,
		models,
		division,
		areas,
	})
}
module.exports.signedOutToday = async (req, res) => {
	const { division } = req.params

	const todayDB = new Date()
	todayDB.setHours(0, 0, 0, 0)
	let searchOptions = { division: division, signedOutAt: { $gte: todayDB } }

	if (req.query.buildNumber != null && req.query.buildNumber != '') {
		searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi')
	}
	if (req.query.building != null && req.query.building != '') {
		searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi')
	}
	const inspectors = await Inspector.find({ division: division })
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const models = await Model.find({ division: division }).sort({ name: '' })
	const throughput = await Throughput.find(searchOptions).sort({
		signedOutAt: 'desc',
	})
	res.render('throughput/soToday', {
		throughput,
		inspectors,
		models,
		division,
		areas,
	})
}
module.exports.indexReds = async (req, res) => {
	const { division } = req.params
	let searchOptions = {
		division: division,
		red: 'Yes',
		building: { $ne: 'Loadall PDI' },
	}

	if (req.query.buildNumber != null && req.query.buildNumber != '') {
		searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi')
	}
	if (req.query.building != null && req.query.building != '') {
		searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi')
	}
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const models = await Model.find({ division: division }).sort({ name: '' })
	const throughput = await Throughput.find(searchOptions).sort({ createdAt: 'desc' }).limit(500)
	const number = throughput.length
	res.render('throughput/reds', {
		throughput,
		inspectors,
		models,
		division,
		areas,
		number,
	})
}

module.exports.indexPDI = async (req, res) => {
	const { division } = req.params
	let searchOptions = {
		division: division,
		building: 'Loadall PDI',
	}

	if (req.query.buildNumber != null && req.query.buildNumber != '') {
		searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi')
	}
	if (req.query.building != null && req.query.building != '') {
		searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi')
	}
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const models = await Model.find({ division: division }).sort({ name: '' })
	const throughput = await Throughput.find(searchOptions).sort({ createdAt: 'desc' }).limit(500)
	const number = throughput.length
	res.render('throughput/pdiTracker', {
		throughput,
		inspectors,
		models,
		division,
		areas,
		number,
	})
}

module.exports.renderNewSOForm = async (req, res) => {
	const { division } = req.params
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	res.render('throughput/newsignout', {
		division,
		areas,
		detections,
		models,
		inspectors,
	})
}

module.exports.createSOThroughput = async (req, res, next) => {
	const throughput = new Throughput(req.body.throughput)
	const division = req.body.throughput.division
	throughput.startFaults = req.body.throughput.faults
	throughput.faults = ''
	throughput.red = 'No'
	throughput.rft = 'Yes'
	throughput.signedOut = 'Yes'
	throughput.signedOutAt = Date.now()

	if (division === 'Cabs') {
		throughput.shortages = req.body.throughput.cosmetic
		throughput.buildFaults = req.body.throughput.functional
	}

	await throughput.save()

	if (division === 'LDL') {
		res.redirect(`/throughput/loadallThroughput/${throughput._id}`)
	} else {
		res.redirect(`/throughput/all/${division}`)
	}
}

module.exports.createRedThroughput = async (req, res, next) => {
	const throughput = new Throughput(req.body.throughput)
	const division = req.body.throughput.division
	throughput.startFaults = req.body.throughput.faults
	throughput.red = 'Yes'
	throughput.rft = 'No'
	throughput.signedOut = 'No'

	if (division === 'Cabs') {
		throughput.shortages = req.body.throughput.cosmetic
		throughput.buildFaults = req.body.throughput.functional
	}

	await throughput.save()

	if (division === 'LDL') {
		res.redirect(`/throughput/loadallThroughput/${throughput._id}`)
	} else {
		res.redirect(`/throughput/all/${division}`)
	}
}
module.exports.createRedThroughputLDL = async (req, res, next) => {
	const throughput = new Throughput(req.body.throughput)
	const division = req.body.throughput.division
	throughput.startFaults = req.body.throughput.faults

	throughput.red = 'Yes'
	throughput.rft = 'No'
	throughput.signedOut = 'No'

	await throughput.save()

	res.redirect(`/throughput/loadallThroughput/${throughput._id}`)
}

module.exports.showThroughputLDL = async (req, res, next) => {
	const { id } = req.params
	const throughput = await Throughput.findById(id)

	const division = throughput.division

	res.render('throughput/addFaults', { throughput, division })
}
module.exports.addFaultsToThroughputLDL = async (req, res, next) => {
	const { id } = req.params

	const updatedThroughput = await Throughput.findByIdAndUpdate(
		id,
		{
			$addToSet: { cfcFaults: req.body },
		},
		{ new: true }
	)

	let theEmails = ['Sam.Gavin@jcb.com', 'Sam.Moss@jcb.com', 'Soron.Glynn@jcb.com', 'Matthew.Scragg@jcb.com']

	if (req.body.major === 'Yes') {
		if (req.body.faultArea === 'Assembly Track 1 - Zone 1- 5')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Liam.Parsons.@jcbcom',
				'Dan.Allen@jcb.com',
				'Tom.White@jcb.com',
				'Steven.Smith@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Assembly Track 1 - Zone 6 - 7')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Thomas.Moult@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Assembly Track 3 - Zone 1 - 3')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Darren.Walker@jcb.com',
				'Justin.Coates@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Obay Rec / S/out')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Stuart.Simmons@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Sub Assembly')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Steven-j.Allen@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Booms Roto')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Hannah.Alsopp@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Shot & Paint')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Tim.Barnicott@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Manufacturing Chassis')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Leigh.Elliot@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Manufacturing Inners')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Daniel.Lowe@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Manufacturing Outers')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Daniel.Lowe@jcb.com',
				'Billy.Walker@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Materials Kitting')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Arron.Kelly@jcb.com',
				'Michael.Swingewood@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		if (req.body.faultArea === 'Supplier Quality')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				'Juraj.Ferko@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		// if (req.body.faultArea === 'Finishing') theEmails = []
		if (req.body.faultArea === 'Cabs')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				// 'Soron.Glynn@jcb.com',
				'Georgina.Hart@jcb.com',
				'Josh.Hvaal@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
			]
		// if (req.body.faultArea === 'Shortages')
		// 	theEmails = [ 'ali.ebrahimi@jcb.com', 'Matthew.Riley@jcb.com' ]
		if (req.body.faultArea === 'Cabs Shortages')
			theEmails = [
				'Ali.Ebrahimi@jcb.com',
				'Mark.Norton@jcb.com',
				// 'Soron.Glynn@jcb.com',
				'Georgina.Hart@jcb.com',
				'Josh.Hvaal@jcb.com',
				'Sam.Gavin@jcb.com',
				'Sam.Moss@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
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
			subject: `*URGENT* Major fault at CFC.`,
			html:
				`<img src="cid:jcb-logo"/>` +
				`<h2>*URGENT* There has been a major fault found at CFC that has escaped from ${req.body.faultArea}.</h2>` +
				`<h4>The fault was on build number ${updatedThroughput.buildNumber}.</h4>` +
				`<h4>The fault is :</h4>` +
				`<h4>${req.body.fault}</h4>` +
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

	res.redirect(`/throughput/loadallThroughput/${updatedThroughput._id}`)
}
module.exports.createPDIThroughput = async (req, res, next) => {
	const throughput = new Throughput(req.body.throughput)
	const division = req.body.throughput.division

	let rft = 'No'

	if (
		req.body.throughput.assembly == 0 &&
		req.body.throughput.cabs == 0 &&
		req.body.throughput.fabrication == 0 &&
		throughput.shortages == 0 &&
		throughput.quality == 0
	) {
		rft = 'Yes'
	}

	throughput.startFaults = req.body.throughput.faults
	throughput.rft = rft
	throughput.signedOut = 'No'
	throughput.building = 'Loadall PDI'

	if (division === 'Cabs') {
		throughput.shortages = req.body.throughput.cosmetic
		throughput.buildFaults = req.body.throughput.functional
	}

	await throughput.save()

	res.redirect(`/throughput/pdi/${division}`)
}

module.exports.renderNewRedForm = async (req, res) => {
	const { division } = req.params
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	res.render('throughput/newred', {
		division,
		areas,
		detections,
		models,
		inspectors,
	})
}
module.exports.renderNewPDIForm = async (req, res) => {
	const { division } = req.params
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	res.render('throughput/newPDI', {
		division,
		areas,
		detections,
		models,
		inspectors,
	})
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const throughput = await Throughput.findById(id)
	if (!throughput) {
		req.flash('error', 'Cannot find that throughput')
		res.redirect('/')
	}

	const division = throughput.division
	const areas = await Area.find({ division: division }).sort({ name: '' })
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})
	const models = await Model.find({ division: division }).sort({ name: '' })
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	res.render('throughput/edit', {
		division,
		areas,
		detections,
		models,
		inspectors,
		throughput,
	})
}

module.exports.updateThroughput = async (req, res) => {
	const { id } = req.params
	const throughput = await Throughput.findByIdAndUpdate(id, {
		...req.body.throughput,
	})

	const division = throughput.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/throughput/reds/${division}`)
}
module.exports.signOutMachine = async (req, res) => {
	const { id } = req.params
	const throughput = await Throughput.findByIdAndUpdate(id, {
		...req.body.throughput,
		signedOutAt: Date.now(),
		signedOut: 'Yes',
		faults: '',
		red: 'No',
	})

	const division = throughput.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/throughput/reds/${division}`)
}

const MongoClient = require('mongodb').MongoClient
const url = process.env.DB_URL
const Json2csvParser = require('json2csv').Parser
const fs = require('fs')
// download claims
module.exports.download = async (req, res) => {
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
				.collection('throughputs')
				.find({ division: division })
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

					fs.writeFile('throughput.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./throughput.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}

module.exports.updateJack = async (req, res) => {
	const { id } = req.params

	const throughput = await Throughput.findByIdAndUpdate(
		id,
		{
			...req.body,
		},
		{ new: true }
	)

	console.log('Here')
	console.log(throughput)

	res.redirect(`/throughput/all/${throughput.division}/jack`)
	// res.redirect(`/dash/qmrd/LDL`)
}
