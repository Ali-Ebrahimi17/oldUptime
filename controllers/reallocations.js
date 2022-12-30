const Reallocation = require('../models/realocation')

const Inspector = require('../models/inspector')
const Area = require('../models/area')

const Model = require('../models/models')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// const  CronJob = require('cron').CronJob

// let updateNames = new  CronJob('5 */1 * * * *', async function (req, res) {
// 	console.log('Just updated Names')

// 	const toUpdate = await Reallocation.find({
// 		submittedBy: 'undefined undefined',
// 	})

// 	// console.log(toUpdate)

// 	for (let update of toUpdate) {
// 		let id = update._id

// 		let donorCheck = await Reallocation.find({
// 			division: update.division,
// 			areaFrom: update.areaFrom,
// 			submittedBy: { $ne: 'undefined undefined' },
// 			_id: { $ne: id },
// 		})
// 			.sort({ _id: -1 })
// 			.limit(1)

// 		update.submittedBy = donorCheck[0].submittedBy
// 		await update.save()

// 		// console.log(donorCheck)
// 	}
// })

// updateNames.start()

module.exports.index = async (req, res) => {
	const { division } = req.params
	let searchOptions = { division: division, processed: 'No' }

	// if (req.query.buildNumber != null && req.query.buildNumber != '') {
	// 	searchOptions.buildNumber = new RegExp(escapeRegex(req.query.buildNumber), 'gi');
	// }
	// if (req.query.building != null && req.query.building != '') {
	// 	searchOptions.building = new RegExp(escapeRegex(req.query.building), 'gi');
	// }
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	let areas = []

	if (division === 'LDL') {
		areas = await Area.find({
			division: division,
			// name: { $ne: 'Cabs Systems' },
		}).sort({ name: '' })
	} else {
		areas = await Area.find({ division: division }).sort({ name: '' })
	}
	const models = await Model.find({ division: division }).sort({ name: '' })
	const reallocations = await Reallocation.find(searchOptions).sort({ createdAt: 'desc' }).limit(500)
	const number = reallocations.length
	res.render('reallocations/todo', {
		reallocations,
		inspectors,
		models,
		division,
		areas,
		number,
	})
	// console.log(reallocations);
}
module.exports.done = async (req, res) => {
	const { division } = req.params
	let searchOptions = { division: division, processed: 'Yes' }

	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})
	let areas = []

	if (division === 'LDL') {
		areas = await Area.find({
			division: division,
			// name: { $ne: 'Cabs Systems' },
		}).sort({ name: '' })
	} else {
		areas = await Area.find({ division: division }).sort({ name: '' })
	}
	const models = await Model.find({ division: division }).sort({ name: '' })
	const reallocations = await Reallocation.find(searchOptions).sort({ actionedAt: 'desc' }).limit(250)
	res.render('reallocations/done', {
		reallocations,
		inspectors,
		models,
		division,
		areas,
	})
}

module.exports.renderNewReallocationForm = async (req, res) => {
	const { division } = req.params
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})

	let areasTo = []

	if (division === 'LDL') {
		areasTo = await Area.find({
			division: division,
			// name: { $ne: 'Cabs Systems' },
		}).sort({ name: '' })
	} else {
		areasTo = await Area.find({ division: division }).sort({ name: '' })
	}

	const areasFrom = await Area.find({ division: division }).sort({ name: '' })
	const models = await Model.find({ division: division }).sort({ name: '' })

	res.render('reallocations/new', {
		inspectors,
		models,
		division,
		areasFrom,
		areasTo,
	})
}

module.exports.renderNewReallocationFormFourC = async (req, res) => {
	const { division } = req.params
	let areas = []

	if (division === 'LDL') {
		areas = await Area.find({
			division: division,
			// name: { $ne: 'Cabs Systems' },
		}).sort({ name: '' })
	} else {
		areas = await Area.find({ division: division }).sort({ name: '' })
	}
	const models = await Model.find({ division: division }).sort({ name: '' })

	res.render('reallocations/fourC', { models, division, areas })
}

module.exports.createReallocation = async (req, res, next) => {
	const reallocation = new Reallocation(req.body.reallocation)
	const division = req.body.reallocation.division
	reallocation.submittedBy = req.user.firstName + ' ' + req.user.lastName
	reallocation.createdAt = Date.now()
	reallocation.processed = 'No'

	const person = req.user.firstName + ' ' + req.user.lastName

	await reallocation.save()
	let theEmails = []

	if (division === 'EM' || division === 'LP') {
		theEmails = ['Martin.Harper@jcb.com']
	}
	if (division === 'BHL' || division === 'SD') {
		theEmails = ['steve.clay@jcb.com', 'scott.frame@jcb.com']
	}

	const nodemailer = require('nodemailer')

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
		subject: `New Reallocation.`,
		text:
			`A new ${division} reallocation has been for requested by ${person}. \n\n` +
			`Please check the tracker for more detail\n\n` +
			'\n\n' +
			'Thanks.\n' +
			'JCB Quality Uptime\n',
	}
	// send the email
	transporter.sendMail(mailOptions, () => {})

	res.redirect(`/reallocation/todo/${division}`)
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const reallocation = await Reallocation.findById(id)
	if (!reallocation) {
		req.flash('error', 'Cannot find that reallocation')
		return res.redirect('/')
	}
	const division = reallocation.division

	res.render('reallocations/edit', {
		reallocation,
		division,
	})
}

module.exports.updateReallocation = async (req, res) => {
	const { id } = req.params
	const reallocation = await Reallocation.findByIdAndUpdate(id, {
		...req.body.reallocation,
		processed: 'Yes',
		actionedBy: req.user.firstName + ' ' + req.user.lastName,
		actionedAt: Date.now(),
	})

	const division = reallocation.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/reallocation/todo/${division}`)
}

const MongoClient = require('mongodb').MongoClient
const url = process.env.DB_URL
const Json2csvParser = require('json2csv').Parser
const fs = require('fs')
// download reallocations
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
				.collection('reallocations')
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

					fs.writeFile('reallocations.csv', csv, function (err) {
						if (err) throw err.message
						// console.log('file saved');
						res.download('./reallocations.csv', () => {
							// fs.unlinkSync('./customer.csv');
						})
					})

					db.close()
				})
		}
	)
}
