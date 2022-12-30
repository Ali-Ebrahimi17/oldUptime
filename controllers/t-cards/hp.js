require('dotenv').config()
const TCard = require('../../models/tCard')
const Check = require('../../models/check')
const Name = require('../../models/name')

const CronJob = require('cron').CronJob
const nodemailer = require('nodemailer')
const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// scheduled jobs for HP
let division = 'HP'

// let hpDaysEmails = [ 'ali.ebrahimi@jcb.com' ]
// let hpDaysEmailsEsc = [ 'ali.ebrahimi@jcb.com' ]

let hpDaysEmails = [
	'Ali.Ebrahimi@jcb.com',
	'Steve.Parker@jcb.com',
	'Georgia.Turner@jcb.com',
	'Simon.Phillip@jcb.com',
	'Leila.Dunbar@jcb.com',
	'Stuart.Poole@jcb.com',
	'Brandon.Pegg@jcb.com',
	'Maggie.Vassileva@jcb.com',
]
let hpDaysEmailsEsc = [
	'Ali.Ebrahimi@jcb.com',
	'Steve.Parker@jcb.com',
	'Georgia.Turner@jcb.com',
	'Simon.Phillip@jcb.com',
	'Leila.Dunbar@jcb.com',
	'Stuart.Poole@jcb.com',
	'Brandon.Pegg@jcb.com',
	'Maggie.Vassileva@jcb.com',
]

let hpDayShift = new CronJob('0 0 18 * * 1-5', async function () {
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		location: 'Validation',
		frequency: {
			$in: ['Daily', 'Weekly', 'Monthly', 'Contractor'],
		},
		division: division,
		section: 'Paint',
	}).sort({ area: '' })

	const failedTCards = await TCard.find({
		status: 'Failed',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
	}).sort({ area: '' })

	const passedTCards = await TCard.find({
		status: {
			$in: ['Passed', 'Not Required'],
		},
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
	}).sort({ area: '' })

	const containedTCards = await TCard.find({
		status: 'Contained',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
	}).sort({ area: '' })

	let missedDetail = openTCards.map((card) => ' <br> ' + card.name + ' - ' + card.area)
	let failedDetail = failedTCards.map((card) => ' <br> ' + card.name + ' - ' + card.area)
	let containedDetail = containedTCards.map((card) => ' <br> ' + card.name + ' - ' + card.area)

	// console.log(missedDetail)

	let numOfPassed = passedTCards.length
	let numOfFailed = failedTCards.length
	let numOfMissed = openTCards.length
	let numOfContained = containedTCards.length

	let totalChecks = numOfPassed + numOfFailed + numOfMissed + numOfContained
	let allNotMissed = numOfPassed + numOfFailed + numOfContained

	// console.log('email just sent')
	const transporter = nodemailer.createTransport({
		host: process.env.HOST, //Host
		port: process.env.PORT, // Port
		tls: {
			rejectUnauthorized: false,
		},
	})

	let mailOptions = {
		from: 'JCB-Quality.TCards@jcb.com',
		to: hpDaysEmails,
		subject: 'Heavy Products Daily Paint Plant Health Status Update',
		html:
			'<h2>Heavy Products Paint Plant Health</h2>' +
			'\n\n' +
			`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
			'\n\n' +
			`<h4>${allNotMissed} of ${totalChecks} quality critical checks were completed on the day shift</h4>` +
			'\n\n' +
			`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Contained: ${numOfContained} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Failed: ${numOfFailed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Missed: ${numOfMissed} of ${totalChecks}</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: hpDaysEmailsEsc,
			subject: 'Escalation: Loadall Paint Plant Health',
			html:
				'<h2>Heavy Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: hpDaysEmailsEsc,
			subject: 'Escalation: Heavy Products Paint Plant Health',
			html:
				'<h2>Heavy Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: hpDaysEmailsEsc,
			subject: 'Escalation: Heavy Products Paint Plant Health',
			html:
				'<h2>Heavy Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}

	//create missed check

	for (let card of openTCards) {
		let idNumber = card.id
		const check = new Check()
		check.result = 'Missed'
		check.type = 'Missed'
		check.missedBy = card.primaryUserName
		check.division = card.division
		check.area = card.area
		check.location = card.location
		check.shiftP = card.shiftP
		check.description = card.description
		check.unit = card.unit
		check.name = card.name
		check.level = card.level
		check.frequency = card.frequency
		check.tCardId = card._id
		check.section = card.section

		await TCard.findByIdAndUpdate(idNumber, { $push: { checks: check } })

		await check.save()
	}

	for (let card of passedTCards) {
		let idNumber = card.id

		await TCard.findByIdAndUpdate(idNumber, {
			status: 'Open',
		})
	}
})

// hp 3 hour email

let hpDayShift3hr = new CronJob('0 0 11 * * 1-5', async function () {
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		location: {
			$nin: ['Validation'],
		},
		status: 'Open',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
	}).sort({ area: '' })

	let missedDetail = openTCards.map((card) => ' <br> ' + card.name + ' - ' + card.area)

	// console.log(missedDetail)

	let numOfMissed = openTCards.length

	// console.log('email just sent')
	const transporter = nodemailer.createTransport({
		host: process.env.HOST, //Host
		port: process.env.PORT, // Port
		tls: {
			rejectUnauthorized: false,
		},
	})

	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: hpDaysEmailsEsc,
			subject: 'Escalation: Heavy Products Paint Plant Health',
			html:
				'<h2>Heavy Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been carried out in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}

	//create missed check
	for (let card of openTCards) {
		let idNumber = card.id
		const check = new Check()
		check.result = 'Missed'
		check.type = 'Missed'
		check.missedBy = card.primaryUserName
		check.division = card.division
		check.area = card.area
		check.location = card.location
		check.shiftP = card.shiftP
		check.description = card.description
		check.unit = card.unit
		check.name = card.name
		check.level = card.level
		check.frequency = card.frequency
		check.tCardId = card._id
		check.section = card.section

		await TCard.findByIdAndUpdate(idNumber, { $push: { checks: check } })

		await check.save()
	}

	for (let card of openTCards) {
		let idNumber = card.id

		await TCard.findByIdAndUpdate(idNumber, {
			status: 'Failed',
			checkedBy: 'Missed',
		})
	}

	console.log('Heavy T Late Card Days email just sent')
})

// // // 6pm monday-friday
// hpDayShift.start()

// // // 11am monday-friday
// hpDayShift3hr.start()
