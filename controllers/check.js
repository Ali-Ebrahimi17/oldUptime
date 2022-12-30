const TCard = require('../models/tCard')
const Check = require('../models/check')
const Note = require('../models/note')
const User = require('../models/user')

const tCard = require('../models/tCard')

const nodemailer = require('nodemailer')
const moment = require('moment')

// const  CronJob = require('cron').CronJob

// let updateNames = new  CronJob('5 */1 * * * *', async function (req, res) {
// 	console.log('Just updated Names')

// 	const toUpdate = await Check.find({
// 		checkedBy: 'undefined undefined',
// 	})

// 	// console.log(toUpdate)

// 	for (let update of toUpdate) {
// 		let id = update._id

// 		let donorCheck = await Check.find({
// 			// division: update.division,
// 			type: 'Check',
// 			tCardId: update.tCardId,
// 			checkedBy: { $ne: 'undefined undefined' },
// 			_id: { $ne: id },
// 		})
// 			.sort({ _id: -1 })
// 			.limit(1)

// 		if (donorCheck.length > 0) {
// 			update.submittedBy = donorCheck[0].checkedBy
// 			await update.save()

// 			let tCardToUpdate = await TCard.findById(update.tCardId)

// 			if (tCardToUpdate && tCardToUpdate.checkedBy === 'undefined undefined') {
// 				await TCard.findByIdAndUpdate(update.tCardId, {
// 					checkedBy: donorCheck[0].checkedBy,
// 				})
// 			}
// 		}

// 		// console.log(donorCheck)
// 	}
// })

// updateNames.start()

module.exports.byPassCheck = async (req, res) => {
	const tCard = await TCard.findById(req.params.id)
	const check = new Check(req.body.check)

	let foundUser = await User.findById(req.user._id)

	let area = tCard.area
	let division = tCard.division
	let location = tCard.location
	let section = tCard.section
	let shiftP = tCard.shiftP

	if (area === 'quality') {
		const primaryUserId = tCard.primaryUserId
		const secondUserId = tCard.secondUserId
		const currentUserId = req.user._id
		const match = JSON.stringify(currentUserId) === JSON.stringify(primaryUserId) || JSON.stringify(currentUserId) === JSON.stringify(secondUserId)

		if (!foundUser.isTCardAdmin) {
			if (!match) {
				req.flash('error', 'You are not the primary or secondary user')
				// change to checks home page
				return res.redirect(`/tCard/qcs/all-checks/${division}`)
				// return res.redirect(`/tCard/qcs`)
			}
		}
		if (!foundUser.isTCardAdmin) {
			req.flash('error', 'Sorry, You do not have permission to do that')
			// change to checks home page
			return res.redirect(`/tCard/qcs/all-checks/${division}`)
			// return res.redirect(`/tCard/qcs`)
		}
	}

	tCard.status = 'Not Required'
	tCard.passedAt = Date.now()
	if (tCard.type === 'Value') {
		tCard.value = 0
	}
	if (tCard.type === 'OK/Not OK') {
		tCard.value = 0
	}
	if (tCard.type === 'Yes/No') {
		tCard.value = 0
	}
	if (tCard.type === 'On Plan/Off Plan') {
		tCard.value = 0
	}

	check.type = 'Check'
	check.result = 'Not Required'
	check.division = tCard.division
	check.area = tCard.area
	check.location = tCard.location
	check.section = tCard.section
	check.shiftP = tCard.shiftP
	check.description = tCard.description
	check.unit = tCard.unit
	check.name = tCard.name
	if (tCard.area === 'quality') {
		check.checkedBy = req.user.firstName + ' ' + req.user.lastName
		check.checkedById = req.user._id

		tCard.checkedBy = req.user.firstName + ' ' + req.user.lastName
		tCard.checkedById = req.user._id
	} else {
		tCard.checkedBy = check.checkedBy
	}

	tCard.checks.push(check)
	await check.save()
	await tCard.save()

	res.redirect(`/tCard/show/${tCard.division}/${tCard.area}/${tCard.location}/${tCard.shiftP}`)
}
module.exports.createCheck = async (req, res) => {
	const tCard = await TCard.findById(req.params.id)
	const check = new Check(req.body.check)

	// const cards = await TCard.find({
	// 	primaryUserId: '62013ab53dea11130818790a',
	// })

	let area = tCard.area
	let division = tCard.division
	let location = tCard.location
	let shiftP = tCard.shiftP

	if (area === 'quality') {
		const primaryUserId = tCard.primaryUserId
		const secondUserId = tCard.secondUserId
		const currentUserId = req.user._id
		const match = JSON.stringify(currentUserId) === JSON.stringify(primaryUserId) || JSON.stringify(currentUserId) === JSON.stringify(secondUserId)

		if (!req.user.isTCardAdmin) {
			if (!match) {
				req.flash('error', 'You are not the primary or secondary user')
				// change to checks home page
				return res.redirect(`/tCard/qcs/all-checks/${division}`)
				// return res.redirect(`/tCard/qcs`)
			}
		}
	}

	if (tCard.manual === 'Yes') {
		const lower = (+check.target / 100) * 90
		const upper = (+check.target / 100) * 110

		if ((check.value >= lower && check.value <= upper) || check.value >= lower || check.value <= upper) {
			tCard.status = 'Passed'
			tCard.passedAt = Date.now()
			tCard.value = check.value
		}
		if (check.value < lower || check.value > upper) {
			tCard.status = 'Failed'
			tCard.failedAt = Date.now()
			tCard.value = check.value
		}
	} else {
		if (tCard.type === 'Value') {
			if ((check.value >= tCard.min && check.value <= tCard.max) || check.value >= tCard.min || check.value <= tCard.max) {
				tCard.status = 'Passed'
				tCard.passedAt = Date.now()
				tCard.value = check.value
			}
			if (check.value < tCard.min || check.value > tCard.max) {
				tCard.status = 'Failed'
				tCard.failedAt = Date.now()
				tCard.value = check.value
			}
		}
		if (tCard.type === 'OK/Not OK') {
			if (check.agreed === 'OK') {
				tCard.status = 'Passed'
				tCard.passedAt = Date.now()
				tCard.agreed = check.agreed
			}
			if (check.agreed === 'Not OK') {
				tCard.status = 'Failed'
				tCard.failedAt = Date.now()
				tCard.agreed = check.agreed
			}
		}
		if (tCard.type === 'Yes/No') {
			if (check.agreed === 'Yes') {
				tCard.status = 'Passed'
				tCard.passedAt = Date.now()
				tCard.agreed = check.agreed
			}
			if (check.agreed === 'No') {
				tCard.status = 'Failed'
				tCard.failedAt = Date.now()
				tCard.agreed = check.agreed
			}
		}
		if (tCard.type === 'On Plan/Off Plan') {
			if (check.agreed === 'On Plan') {
				tCard.status = 'Passed'
				tCard.passedAt = Date.now()
				tCard.agreed = check.agreed
			}
			if (check.agreed === 'Off Plan') {
				tCard.status = 'Failed'
				tCard.failedAt = Date.now()
				tCard.agreed = check.agreed
			}
		}
	}

	check.type = 'Check'
	check.result = tCard.status
	check.division = tCard.division
	check.area = tCard.area
	check.location = tCard.location
	check.section = tCard.section
	check.shiftP = tCard.shiftP
	check.description = tCard.description
	check.unit = tCard.unit
	check.name = tCard.name
	check.tCardId = tCard._id
	check.level = tCard.level
	check.manual = tCard.manual

	if (tCard.area === 'quality') {
		check.checkedBy = req.user.firstName + ' ' + req.user.lastName
		check.checkedById = req.user._id

		tCard.checkedBy = req.user.firstName + ' ' + req.user.lastName
		tCard.checkedById = req.user._id
	} else {
		tCard.checkedBy = check.checkedBy
	}
	tCard.comments = check.comments

	tCard.checks.push(check)
	await check.save()
	await tCard.save()
	// console.log(check)

	if (check.level === 'CTQ') {
		// console.log('email just sent')
		const transporter = nodemailer.createTransport({
			host: process.env.HOST, //Host
			port: process.env.PORT, // Port
			tls: {
				rejectUnauthorized: false,
			},
		})

		let emails = []
		if (division === 'EM') {
			emails = [
				'Ali.Ebrahimi@jcb.com',
				'Nick.Briggs@jcb.com',
				'Mark.Edwards@jcb.com',
				'Adam.Wainwright@jcb.com',
				'Mark.Norton@jcb.com',
				'Maggie.Vassileva',
			]
		}
		if (division === 'BHL') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Stacy.Burnett@jcb.com', 'Steve-c.Lewiss@jcb.com']
		}
		if (division === 'CP') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Stuart.Blake@jcb.com', 'Stephen.Causer@jcb.com']
		}
		if (division === 'HP') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Steve.Parker@jcb.com', 'Leila.Dunbar@jcb.com']
		}
		if (division === 'LDL') {
			emails = [
				'Ali.Ebrahimi@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
				'Richard.Hooper@jcb.com',
				'Maggie.Vassileva@jcb.com',
				'Sam.Wildsmith@jcb.com',
				'Sam.Dailly@jcb.com',
				'Mark.Norton@jcb.com',
			]
		}

		if (check.result === 'Failed') {
			if (check.manual === 'Yes') {
				mailOptions = {
					from: 'JCB-Quality.QCS@jcb.com',
					to: emails,
					subject: 'URGENT: Failed CTQ Failure',
					html:
						'<h2>A critical to quality check has failed. Stop any process affected until a containment has been implemented.</h2>' +
						'\n\n' +
						'<h2>See details below.</h2>' +
						'\n\n' +
						`<h4>Check name: ${check.name}</h4>` +
						'\n\n' +
						`<h4>Failed on: ${moment(check.createdAt).format('DD/MM/YYYY - HH:mm')}</h4>` +
						'\n\n' +
						`<h4>Failed by: ${check.checkedBy}</h4>` +
						'\n\n' +
						`<h4>Check result: ${check.value} NM</h4>` +
						'\n\n' +
						`<h4>Check target: ${Math.round((+check.target / 100) * 90)} - ${Math.round((+check.target / 100) * 110)} NM</h4>` +
						'\n\n' +
						`<h4>Comments: ${check.comments}</h4>`,
				}
			} else {
				mailOptions = {
					from: 'JCB-Quality.QCS@jcb.com',
					to: emails,
					subject: 'URGENT: Failed CTQ Failure',
					html:
						'<h2>A critical to quality check has failed. Stop any process affected until a containment has been implemented. See details below.</h2>' +
						'\n\n' +
						`<h4>Check name: ${check.name}</h4>` +
						'\n\n' +
						`<h4>Failed on: ${moment(check.createdAt).format('DD/MM/YYYY - HH:mm')}</h4>` +
						'\n\n' +
						`<h4>Failed by: ${check.checkedBy}</h4>` +
						'\n\n' +
						`<h4>Check result: ${check.value} NM</h4>` +
						'\n\n' +
						`<h4>Comments: ${check.comments}</h4>`,
				}
			}
			// transporter.sendMail(mailOptions, () => {})
		}
		if (check.result === 'Contained') {
			mailOptions = {
				from: 'JCB-Quality.QCS@jcb.com',
				to: emails,
				subject: 'CTQ Check Contained',
				html:
					'<h2>A critical to quality check has been contained.</h2>' +
					'\n\n' +
					'<h2>See details below.</h2>' +
					'\n\n' +
					`<h4>Check name: ${check.name}</h4>` +
					'\n\n' +
					`<h4>Contained on: ${moment(check.createdAt).format('DD/MM/YYYY - HH:mm')}</h4>` +
					'\n\n' +
					`<h4>Reason for failure: ${check.reason}</h4>` +
					'\n\n' +
					`<h4>Action Taken: ${check.action}</h4>`,
			}
			// transporter.sendMail(mailOptions, () => {})
		}
	}

	res.redirect(`/tCard/show/${division}/${area}/${location}/${tCard.shiftP}`)
}

//route to create containment actions
module.exports.containCheck = async (req, res) => {
	const tCard = await TCard.findById(req.params.id).populate({
		path: 'checks',
		options: { sort: { _id: -1 } },
		perDocumentLimit: 1,
	})
	let check = new Check(req.body.check)
	const note = new Note(req.body.check)
	const person = check.maintenancePerson
	let theEmails = [
		// 'richard.birchall@jcb.com',
		// 'ali.ebrahimi@jcb.com',
	]

	let division = tCard.division

	if (division === 'HBU') {
		theEmails = [
			'ben.cooper@jcb.com',
			'jonathan.fox@jcb.com',
			// 'richard.birchall@jcb.com',
			// 'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			// 'ryan.thursfield@jcb.com',
		]
	}
	if (division === 'CABS') {
		theEmails = [
			// 'richard.birchall@jcb.com',
			// 'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'wayne.beardmore@jcb.com',
			'ben.reeves@jcb.com',
			// 'ryan.thursfield@jcb.com',
		]
	}
	if (division === 'HP') {
		theEmails = [
			// 'richard.birchall@jcb.com',
			// 'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'robert.gaunt@jcb.com',
			'adam.cottier@jcb.com',
			'ben.mcAdam@jcb.com',
			'15be256c.jcbit.onmicrosoft.com@emea.teams.ms',
			// 'ryan.thursfield@jcb.com',
		]
	}
	if (division === 'CP') {
		theEmails = [
			// 'richard.birchall@jcb.com',
			// 'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'martyn.holdcroft@jcb.com',
			'joe.plant@jcb.com',
			'martin.brown@jcb.com',
			'paul.stokes@jcb.com',
			// 'ryan.thursfield@jcb.com',
		]
	}
	if (division === 'EM') {
		theEmails = [
			// 'richard.birchall@jcb.com',
			// 'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'lee.spurr@jcb.com',
			// 'ryan.thursfield@jcb.com',
		]
	}
	if (division === 'LDL') {
		theEmails = [
			// 'richard.birchall@jcb.com',
			// 'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'matthew.walker@jcb.com',
			// 'ryan.thursfield@jcb.com',
		]
	}
	if (division === 'BHL') {
		theEmails = [
			// 'richard.birchall@jcb.com',
			// 'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'backhoe.assymaintenance@jcb.com',
			// 'ryan.thursfield@jcb.com',
		]
	}

	// console.log(req.body.check.maintenancePerson)
	const transporter = nodemailer.createTransport({
		host: process.env.HOST, //Host
		port: process.env.PORT, // Port
		tls: {
			rejectUnauthorized: false,
		},
	})

	const area = tCard.location
	const theCheck = tCard.name

	let mailOptions = {
		from: 'JCB-Quality.TCards@jcb.com',
		to: theEmails,
		subject: `Failed Paint Plant Critical Check.`,

		html:
			`<h3>A paint plant critical check has failed been reported to ${person} in maintenance.</h3>` +
			'\n\n' +
			`<h3>The check that has failed is ${theCheck} in ${area}</h3>` +
			'\n\n' +
			`<h3>Please do not respond. This is an automated email</h3>` +
			'\n\n' +
			`<h3>Thanks</h3>`,
	}

	// send the email

	tCard.containedAt = Date.now()

	check.tCardId = tCard._id

	if (req.body.check.reason) {
		tCard.reason = check.reason
		tCard.action = check.action
		tCard.status = 'Contained'
		check.result = 'Contained'
		check.type = 'Containment'
		check.division = tCard.division
		check.area = tCard.area
		check.location = tCard.location
		check.section = tCard.section
		check.shiftP = tCard.shiftP
		check.description = tCard.description
		check.unit = tCard.unit
		check.name = tCard.name
		check.level = tCard.level
		if (tCard.area === 'quality') {
			check.checkedBy = req.user.firstName + ' ' + req.user.lastName
			check.checkedById = req.user._id

			tCard.checkedBy = req.user.firstName + ' ' + req.user.lastName
			tCard.checkedById = req.user._id
		} else {
			tCard.checkedBy = check.checkedBy
		}
		tCard.comments = check.comments
		tCard.maintenancePerson = check.maintenancePerson
		await check.save()
		tCard.checks.push(check)
		if (req.body.check.maintenancePerson) {
			// transporter.sendMail(mailOptions, () => {})
			// console.log('mail sent')
		}
	}

	if (req.body.check.maintenanceNotes) {
		// note.detail = check.maintenanceNotes
		await note.save()
		tCard.notes.push(note)
	}

	await tCard.save()
	// console.log(check)

	// console.log(check)

	if (check.level === 'CTQ') {
		let emails = []
		if (division === 'EM') {
			emails = [
				'Ali.Ebrahimi@jcb.com',
				'Nick.Briggs@jcb.com',
				'Mark.Edwards@jcb.com',
				'Tom.Godfrey@jcb.com',
				'Mark.Norton@jcb.com',
				'Maggie.Vassileva',
				'Adam.Wainwright@jcb.com',
			]
		}
		if (division === 'BHL') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Stacy.Burnett@jcb.com', 'Steve-c.Lewiss@jcb.com']
		}
		if (division === 'CP') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Stuart.Blake@jcb.com', 'Stephen.Causer@jcb.com']
		}
		if (division === 'HP') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Steve.Parker@jcb.com', 'Leila.Dunbar@jcb.com']
		}
		if (division === 'LDL') {
			emails = [
				'Ali.Ebrahimi@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
				'Richard.Hooper@jcb.com',
				'Maggie.Vassileva@jcb.com',
				'Sam.Wildsmith@jcb.com',
				'Sam.Dailly@jcb.com',
				'Mark.Norton@jcb.com',
			]
		}
		mailOptions = {
			from: 'JCB-Quality.QCS@jcb.com',
			to: emails,
			subject: 'CTQ Check Contained',
			html:
				'<h2>A critical to quality check has been contained.</h2>' +
				'\n\n' +
				'<h2>See details below.</h2>' +
				'\n\n' +
				`<h4>Check name: ${check.name}</h4>` +
				'\n\n' +
				`<h4>Contained on: ${moment(check.createdAt).format('DD/MM/YYYY - HH:mm')}</h4>` +
				'\n\n' +
				`<h4>Reason for failure: ${check.reason}</h4>` +
				'\n\n' +
				`<h4>Action Taken: ${check.action}</h4>`,
		}
		// transporter.sendMail(mailOptions, () => {})
	}

	res.redirect(`/tCard/show/${division}/${tCard.area}/${tCard.location}/${tCard.shiftP}`)
}

//close check
//route to create containment actions
module.exports.closeCheck = async (req, res) => {
	const tCard = await TCard.findById(req.params.id)
	const check = new Check(req.body.check)

	tCard.containedAt = Date.now()
	tCard.status = 'Contained'
	tCard.reason = check.reason
	tCard.action = check.action

	check.result = 'Contained'
	check.type = 'Containment'
	check.division = tCard.division
	check.area = tCard.area
	check.location = tCard.location
	check.shiftP = tCard.shiftP
	if (tCard.area === 'quality') {
		check.checkedBy = req.user.firstName + ' ' + req.user.lastName
		check.checkedById = req.user._id

		tCard.checkedBy = req.user.firstName + ' ' + req.user.lastName
		tCard.checkedById = req.user._id
	} else {
		tCard.checkedBy = check.checkedBy
	}
	tCard.comments = check.comments

	// console.log(check);
	tCard.checks.push(check)
	await check.save()
	await tCard.save()

	res.redirect(`/tCard/show/${tCard.division}/${tCard.area}/${tCard.location}/${tCard.shiftP}`)
}

module.exports.showFailDetail = async (req, res) => {
	const { id } = req.params
	const check = await Check.findById(id)
	if (!check) {
		req.flash('error', 'Cannot find that check')
		res.redirect('/tCard/operations')
	}

	const area = check.area

	res.render('checks/failed', { check, area })
}
module.exports.showContainDetail = async (req, res) => {
	const { id } = req.params
	const check = await Check.findById(id)
	if (!check) {
		req.flash('error', 'Cannot find that check')
		res.redirect('/tCard/operations')
	}

	const area = check.area

	const tCard = await TCard.findOne({
		division: check.division,
		location: check.location,
		area: check.area,
		name: check.name,
		// description : check.description,
	}).populate({ path: 'notes', options: { sort: { createdAt: -1 } } })

	res.render('checks/contained', { check, tCard, area })
}
module.exports.showPassDetail = async (req, res) => {
	const { id } = req.params
	const check = await Check.findById(id)
	if (!check) {
		req.flash('error', 'Cannot find that check')
		res.redirect('/tCard/operations')
	}
	const area = check.area

	res.render('checks/passed', { check, area })
}

// quality section

module.exports.createCheckQasi = async (req, res) => {
	let { id, page } = req.params
	const tCard = await TCard.findById(id)
	const check = new Check(req.body.check)

	// const cards = await TCard.find({
	// 	primaryUserId: '62013ab53dea11130818790a',
	// })

	let foundUser = await User.findById(req.user._id)

	let area = tCard.area
	let division = tCard.division
	let location = tCard.location
	let shiftP = tCard.shiftP

	if (area === 'quality') {
		const currentUserId = req.user._id
		// const match = JSON.stringify(currentUserId) === JSON.stringify(primaryUserId) || JSON.stringify(currentUserId) === JSON.stringify(secondUserId)
		const match = tCard.users.includes(currentUserId)

		if (!req.user.isTCardAdmin) {
			if (!match) {
				req.flash('error', 'You are not the primary or secondary user')
				// change to checks home page
				return res.redirect(`/tCard/qcs/all-checks/${division}`)
				// return res.redirect(`/tCard/qcs`)
			}
		}
	}

	if (tCard.manual === 'Yes') {
		const lower = (+check.target / 100) * 90
		const upper = (+check.target / 100) * 110

		if ((check.value >= lower && check.value <= upper) || check.value >= lower || check.value <= upper) {
			tCard.status = 'Passed'
			tCard.passedAt = Date.now()
			tCard.value = check.value
		}
		if (check.value < lower || check.value > upper) {
			tCard.status = 'Failed'
			tCard.failedAt = Date.now()
			tCard.value = check.value
		}
	} else {
		if (tCard.type === 'Value') {
			if ((check.value >= tCard.min && check.value <= tCard.max) || check.value >= tCard.min || check.value <= tCard.max) {
				tCard.status = 'Passed'
				tCard.passedAt = Date.now()
				tCard.value = check.value
			}
			if (check.value < tCard.min || check.value > tCard.max) {
				tCard.status = 'Failed'
				tCard.failedAt = Date.now()
				tCard.value = check.value
			}
		}
		if (tCard.type === 'OK/Not OK') {
			if (check.agreed === 'OK') {
				tCard.status = 'Passed'
				tCard.passedAt = Date.now()
				tCard.agreed = check.agreed
			}
			if (check.agreed === 'Not OK') {
				tCard.status = 'Failed'
				tCard.failedAt = Date.now()
				tCard.agreed = check.agreed
			}
		}
		if (tCard.type === 'Yes/No') {
			if (check.agreed === 'Yes') {
				tCard.status = 'Passed'
				tCard.passedAt = Date.now()
				tCard.agreed = check.agreed
			}
			if (check.agreed === 'No') {
				tCard.status = 'Failed'
				tCard.failedAt = Date.now()
				tCard.agreed = check.agreed
			}
		}
		if (tCard.type === 'On Plan/Off Plan') {
			if (check.agreed === 'On Plan') {
				tCard.status = 'Passed'
				tCard.passedAt = Date.now()
				tCard.agreed = check.agreed
			}
			if (check.agreed === 'Off Plan') {
				tCard.status = 'Failed'
				tCard.failedAt = Date.now()
				tCard.agreed = check.agreed
			}
		}
	}

	check.type = 'Check'
	check.result = tCard.status
	check.division = tCard.division
	check.area = tCard.area
	check.location = tCard.location
	check.shiftP = tCard.shiftP
	check.description = tCard.description
	check.unit = tCard.unit
	check.name = tCard.name
	check.tCardId = tCard._id
	check.category = tCard.category
	check.section = tCard.section
	check.level = tCard.level
	check.manual = tCard.manual

	if (tCard.area === 'quality') {
		check.checkedBy = req.user.firstName + ' ' + req.user.lastName
		check.checkedById = req.user._id

		tCard.checkedBy = req.user.firstName + ' ' + req.user.lastName
		tCard.checkedById = req.user._id
	} else {
		tCard.checkedBy = check.checkedBy
	}
	tCard.comments = check.comments

	tCard.checks.push(check)
	await check.save()
	await tCard.save()
	// console.log(check)

	if (check.level === 'CTQ') {
		// console.log('email just sent')
		const transporter = nodemailer.createTransport({
			host: process.env.HOST, //Host
			port: process.env.PORT, // Port
			tls: {
				rejectUnauthorized: false,
			},
		})

		let emails = []
		if (division === 'EM') {
			emails = [
				'Ali.Ebrahimi@jcb.com',
				'Nick.Briggs@jcb.com',
				'Mark.Edwards@jcb.com',
				'Adam.Wainwright@jcb.com',
				'Mark.Norton@jcb.com',
				'Maggie.Vassileva',
			]
		}
		if (division === 'BHL') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Stacy.Burnett@jcb.com', 'Steve-c.Lewiss@jcb.com']
		}
		if (division === 'CP') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Stuart.Blake@jcb.com', 'Stephen.Causer@jcb.com']
		}
		if (division === 'HP') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Steve.Parker@jcb.com', 'Leila.Dunbar@jcb.com']
		}
		if (division === 'LDL') {
			emails = [
				'Ali.Ebrahimi@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
				'Richard.Hooper@jcb.com',
				'Maggie.Vassileva@jcb.com',
				'Sam.Wildsmith@jcb.com',
				'Sam.Dailly@jcb.com',
				'Mark.Norton@jcb.com',
			]
		}

		if (check.result === 'Failed') {
			if (check.manual === 'Yes') {
				mailOptions = {
					from: 'JCB-Quality.QCS@jcb.com',
					to: emails,
					subject: 'URGENT: Failed CTQ Failure',
					html:
						'<h2>A critical to quality check has failed. Stop any process affected until a containment has been implemented.</h2>' +
						'\n\n' +
						'<h2>See details below.</h2>' +
						'\n\n' +
						`<h4>Check name: ${check.name}</h4>` +
						'\n\n' +
						`<h4>Failed on: ${moment(check.createdAt).format('DD/MM/YYYY - HH:mm')}</h4>` +
						'\n\n' +
						`<h4>Failed by: ${check.checkedBy}</h4>` +
						'\n\n' +
						`<h4>Check result: ${check.value} NM</h4>` +
						'\n\n' +
						`<h4>Check target: ${Math.round((+check.target / 100) * 90)} - ${Math.round((+check.target / 100) * 110)} NM</h4>` +
						'\n\n' +
						`<h4>Comments: ${check.comments}</h4>`,
				}
			} else {
				mailOptions = {
					from: 'JCB-Quality.QCS@jcb.com',
					to: emails,
					subject: 'URGENT: Failed CTQ Failure',
					html:
						'<h2>A critical to quality check has failed. Stop any process affected until a containment has been implemented. See details below.</h2>' +
						'\n\n' +
						`<h4>Check name: ${check.name}</h4>` +
						'\n\n' +
						`<h4>Failed on: ${moment(check.createdAt).format('DD/MM/YYYY - HH:mm')}</h4>` +
						'\n\n' +
						`<h4>Failed by: ${check.checkedBy}</h4>` +
						'\n\n' +
						`<h4>Check result: ${check.value} NM</h4>` +
						'\n\n' +
						`<h4>Comments: ${check.comments}</h4>`,
				}
			}
			// transporter.sendMail(mailOptions, () => {})
		}
		if (check.result === 'Contained') {
			mailOptions = {
				from: 'JCB-Quality.QCS@jcb.com',
				to: emails,
				subject: 'CTQ Check Contained',
				html:
					'<h2>A critical to quality check has been contained.</h2>' +
					'\n\n' +
					'<h2>See details below.</h2>' +
					'\n\n' +
					`<h4>Check name: ${check.name}</h4>` +
					'\n\n' +
					`<h4>Contained on: ${moment(check.createdAt).format('DD/MM/YYYY - HH:mm')}</h4>` +
					'\n\n' +
					`<h4>Reason for failure: ${check.reason}</h4>` +
					'\n\n' +
					`<h4>Action Taken: ${check.action}</h4>`,
			}
			// transporter.sendMail(mailOptions, () => {})
		}
	}
	let address = `/tCard/qcs/section-checks/${division}/${page}`

	if (page === 'all') address = `/tCard/qcs/all-checks/${division}`
	if (page === 'my-checks') address = `/tCard/qcs/my-checks/${division}/${foundUser._id}`

	res.redirect(address)
}

//route to create containment actions
module.exports.containCheckQasi = async (req, res) => {
	let { id, page } = req.params

	let foundUser = await User.findById(req.user._id)

	const tCard = await TCard.findById(id).populate({
		path: 'checks',
		options: { sort: { _id: -1 } },
		perDocumentLimit: 1,
	})

	const currentUserId = req.user._id
	// const match = JSON.stringify(currentUserId) === JSON.stringify(primaryUserId) || JSON.stringify(currentUserId) === JSON.stringify(secondUserId)
	const match = tCard.users.includes(currentUserId)

	if (!req.user.isTCardAdmin) {
		if (!match) {
			req.flash('error', 'You are not the primary or secondary user')
			// change to checks home page
			return res.redirect(`/tCard/qcs/all-checks/${division}`)
			// return res.redirect(`/tCard/qcs`)
		}
	}

	let check = new Check(req.body.check)
	const note = new Note(req.body.check)
	const person = check.maintenancePerson

	if (!req.body.check.reason || !req.body.check.action) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect(`/tCard/qcs/all-checks/${tCard.division}`)
	}

	let division = tCard.division

	const area = tCard.location
	const theCheck = tCard.name

	check.tCardId = tCard._id
	check.category = tCard.category
	check.section = tCard.category

	await check.save()

	tCard.containedAt = Date.now()

	if (req.body.check.reason) {
		tCard.reason = check.reason
		tCard.action = check.action
		tCard.status = 'Contained'
		check.result = 'Contained'
		check.type = 'Containment'
		check.division = tCard.division
		check.area = tCard.area
		check.location = tCard.location
		check.shiftP = tCard.shiftP
		check.description = tCard.description
		check.unit = tCard.unit
		check.name = tCard.name
		check.level = tCard.level
		check.tCardId = tCard._id
		check.category = tCard.category
		check.section = tCard.section

		check.checkedBy = req.user.firstName + ' ' + req.user.lastName
		check.checkedById = req.user._id

		tCard.checkedBy = req.user.firstName + ' ' + req.user.lastName
		tCard.checkedById = req.user._id

		tCard.comments = check.comments
		tCard.maintenancePerson = check.maintenancePerson
		await check.save()
		tCard.checks.push(check)
	}

	await tCard.save()
	// console.log(check)

	if (check.level === 'CTQ') {
		const transporter = nodemailer.createTransport({
			host: process.env.HOST, //Host
			port: process.env.PORT, // Port
			tls: {
				rejectUnauthorized: false,
			},
		})
		let emails = []
		if (division === 'EM') {
			emails = [
				'Ali.Ebrahimi@jcb.com',
				'Nick.Briggs@jcb.com',
				'Mark.Edwards@jcb.com',
				'Tom.Godfrey@jcb.com',
				'Mark.Norton@jcb.com',
				'Maggie.Vassileva',
				'Adam.Wainwright@jcb.com',
			]
		}
		if (division === 'BHL') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Stacy.Burnett@jcb.com', 'Steve-c.Lewiss@jcb.com']
		}
		if (division === 'CP') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Stuart.Blake@jcb.com', 'Stephen.Causer@jcb.com']
		}
		if (division === 'HP') {
			emails = ['Ali.Ebrahimi@jcb.com', 'Mark.Norton@jcb.com', 'Maggie.Vassileva@jcb.com', 'Steve.Parker@jcb.com', 'Leila.Dunbar@jcb.com']
		}
		if (division === 'LDL') {
			emails = [
				'Ali.Ebrahimi@jcb.com',
				'Soron.Glynn@jcb.com',
				'Matthew.Scragg@jcb.com',
				'Richard.Hooper@jcb.com',
				'Maggie.Vassileva@jcb.com',
				'Sam.Wildsmith@jcb.com',
				'Sam.Dailly@jcb.com',
				'Mark.Norton@jcb.com',
			]
		}
		mailOptions = {
			from: 'JCB-Quality.QCS@jcb.com',
			to: emails,
			subject: 'CTQ Check Contained',
			html:
				'<h2>A critical to quality check has been contained.</h2>' +
				'\n\n' +
				'<h2>See details below.</h2>' +
				'\n\n' +
				`<h4>Check name: ${check.name}</h4>` +
				'\n\n' +
				`<h4>Contained on: ${moment(check.createdAt).format('DD/MM/YYYY - HH:mm')}</h4>` +
				'\n\n' +
				`<h4>Reason for failure: ${check.reason}</h4>` +
				'\n\n' +
				`<h4>Action Taken: ${check.action}</h4>`,
		}
		// // transporter.sendMail(mailOptions, () => {})
	}

	let address = `/tCard/qcs/section-checks/${division}/${page}`

	if (page === 'all') address = `/tCard/qcs/all-checks/${division}`
	if (page === 'my-checks') address = `/tCard/qcs/my-checks/${division}/${foundUser._id}`

	res.redirect(address)
}

module.exports.byPassCheckQasi = async (req, res) => {
	let { id, page } = req.params

	const tCard = await TCard.findById(id)
	const check = new Check(req.body.check)

	let foundUser = await User.findById(req.user._id)

	let area = tCard.area
	let division = tCard.division
	let location = tCard.location
	let shiftP = tCard.shiftP
	let section = tCard.section

	if (area === 'quality') {
		const currentUserId = req.user._id
		// const match = JSON.stringify(currentUserId) === JSON.stringify(primaryUserId) || JSON.stringify(currentUserId) === JSON.stringify(secondUserId)
		const match = tCard.users.includes(currentUserId)

		if (!foundUser.isTCardAdmin) {
			if (!match) {
				req.flash('error', 'You are not the primary or secondary user')
				// change to checks home page
				return res.redirect(`/tCard/qcs/all-checks/${division}`)
				// return res.redirect(`/tCard/qcs`)
			}
		}
	}

	tCard.status = 'Not Required'
	tCard.passedAt = Date.now()
	if (tCard.type === 'Value') {
		tCard.value = 0
	}
	if (tCard.type === 'OK/Not OK') {
		tCard.value = 0
	}
	if (tCard.type === 'Yes/No') {
		tCard.value = 0
	}
	if (tCard.type === 'On Plan/Off Plan') {
		tCard.value = 0
	}

	check.type = 'Check'
	check.result = 'Not Required'
	check.division = tCard.division
	check.area = tCard.area
	check.location = tCard.location
	check.shiftP = tCard.shiftP
	check.description = tCard.description
	check.unit = tCard.unit
	check.name = tCard.name
	check.tCardId = tCard._id
	check.category = tCard.category
	check.section = tCard.section

	if (tCard.area === 'quality') {
		check.checkedBy = req.user.firstName + ' ' + req.user.lastName
		check.checkedById = req.user._id

		tCard.checkedBy = req.user.firstName + ' ' + req.user.lastName
		tCard.checkedById = req.user._id
	} else {
		tCard.checkedBy = check.checkedBy
	}

	tCard.checks.push(check)
	await check.save()
	await tCard.save()

	let address = `/tCard/qcs/section-checks/${division}/${page}`

	if (page === 'all') address = `/tCard/qcs/all-checks/${division}`
	if (page === 'my-checks') address = `/tCard/qcs/my-checks/${division}/${foundUser._id}`

	res.redirect(address)
}
