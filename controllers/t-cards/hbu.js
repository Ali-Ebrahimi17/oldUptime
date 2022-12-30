require('dotenv').config()
const TCard = require('../../models/tCard')
const Check = require('../../models/check')
const Name = require('../../models/name')

const CronJob = require('cron').CronJob
const nodemailer = require('nodemailer')
const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// scheduled jobs for loadall
let division = 'HBU'

// let ldlDaysEmails = [ 'ali.ebrahimi@jcb.com' ]
// let ldlDaysEmailsEsc = [ 'ali.ebrahimi@jcb.com' ]

let ldlDaysEmails = [
	'mark.norton@jcb.com',
	'ali.ebrahimi@jcb.com',
	'adam.ball@jcb.com',
	'grant.brookes@jcb.com',
	'john.thacker@jcb.com',
	'geoff.edensor@jcb.com',
	'craig.archer@jcb.com',
	'jason.washington@jcb.com',
	'ryan.thursfield@jcb.com',
]
let ldlDaysEmailsEsc = [
	'mark.norton@jcb.com',
	'ali.ebrahimi@jcb.com',
	'adam.ball@jcb.com',
	'grant.brookes@jcb.com',
	'john.thacker@jcb.com',
	'geoff.edensor@jcb.com',
	'craig.archer@jcb.com',
	'jason.washington@jcb.com',
	'shane.davis@jcb.com',
	'mark.cornwell@jcb.com',
	'russell.salt@jcb.com',
	'ian.minshall@jcb.com',
	'nigel.wilcox@jcb.com',
	'ryan.thursfield@jcb.com',
]

// let ldlDayShift = new  CronJob('* * * * * 1-5', async function() {
let hbuDayShift = new CronJob('0 0 17 * * 1-5', async function () {
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		frequency: {
			$in: ['Daily', 'Weekly', 'Monthly', 'Contractor'],
		},
		division: division,
		area: { $ne: 'quality' },
	})
	const failedTCards = await TCard.find({
		status: 'Failed',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		area: { $ne: 'quality' },
	})

	const passedTCards = await TCard.find({
		status: {
			$in: ['Passed', 'Not Required'],
		},
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		area: { $ne: 'quality' },
	})
	const containedTCards = await TCard.find({
		status: 'Contained',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		area: { $ne: 'quality' },
	})

	let missedDetail = openTCards.map((card) => ' <br> ' + card.name)
	let failedDetail = failedTCards.map((card) => ' <br> ' + card.name)
	let containedDetail = containedTCards.map((card) => ' <br> ' + card.name)

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
		to: ldlDaysEmails,
		subject: 'HBU Daily Paint Plant Health Status Update',
		html:
			'<h2>HBU Paint Plant Health</h2>' +
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
			`<h4>Checks Missed: ${numOfMissed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/HBU/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: HBU Paint Plant Health',
			html:
				'<h2>HBU Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/HBU/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: HBU Paint Plant Health',
			html:
				'<h2>HBU Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/HBU/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: HBU Paint Plant Health',
			html:
				'<h2>HBU Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/HBU/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}

	//create missed check

	for (let card of openTCards) {
		let idNumber = card.id
		const check = new Check()
		check.result = 'Missed'
		check.type = 'Missed'
		check.division = card.division
		check.area = card.area
		check.location = card.location
		check.shiftP = card.shiftP
		check.description = card.description
		check.unit = card.unit
		check.name = card.name
		check.frequency = card.frequency

		await TCard.findByIdAndUpdate(idNumber, { $push: { checks: check } })

		await check.save()
	}

	for (let card of passedTCards) {
		let idNumber = card.id

		await TCard.findByIdAndUpdate(idNumber, {
			status: 'Open',
		})
	}
	// console.log('Loadall T Card Days email just sent')
})

// loadall day 3hr
let hbuDaysShift3hr = new CronJob('0 0 11 * * 1-5', async function () {
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
		area: { $ne: 'quality' },
	}).sort({ area: '' })

	let missedDetail = openTCards.map((card) => ' <br> ' + card.name)

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
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: HBU Paint Plant Health',
			html:
				'<h2>HBU Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/HBU/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}

	//create missed check
	for (let card of openTCards) {
		let idNumber = card.id
		const check = new Check()
		check.result = 'Missed'
		check.type = 'Missed'
		check.division = card.division
		check.area = card.area
		check.location = card.location
		check.shiftP = card.shiftP
		check.description = card.description
		check.unit = card.unit
		check.name = card.name
		check.frequency = card.frequency

		await TCard.findByIdAndUpdate(idNumber, { $push: { checks: check } })

		await check.save()
	}

	// console.log('Loadall T Late Card Days email just sent')
})

// //6pm monday-friday
// hbuDayShift.start()

// // //9pm 3 hour into shift late check monday - thursday
// hbuDaysShift3hr.start()
