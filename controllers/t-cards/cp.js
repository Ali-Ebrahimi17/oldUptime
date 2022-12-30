require('dotenv').config()
const TCard = require('../../models/tCard')
const Check = require('../../models/check')
const Name = require('../../models/name')

const CronJob = require('cron').CronJob
const nodemailer = require('nodemailer')
const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// scheduled jobs for loadall
let division = 'CP'

// let cpDaysEmails = [ 'ali.ebrahimi@jcb.com' ]
// let cpDaysEmailsEsc = [ 'ali.ebrahimi@jcb.com' ]

let cpDaysEmails = [
	'Ali.Ebrahimi@jcb.com',
	'Stuart.Blake@jcb.com',
	'Dave.Peake@jcb.com',
	'Georgia.Turner@jcb.com',
	'Martin.Meylan@jcb.com',
	'Kevin.Williams@jcb.com',
	'Mick.Inch@jcb.com',
	'Stephen.Causer@jcb.com',
	'Aaron.Hawley@jcb.com',
	'Josh.Cooper@jcb.com',
	'Maggie.Vassileva@jcb.com',
]
let cpDaysEmailsEsc = [
	'Ali.Ebrahimi@jcb.com',
	'Stuart.Blake@jcb.com',
	'Dave.Peake@jcb.com',
	'Georgia.Turner@jcb.com',
	'Martin.Meylan@jcb.com',
	'Kevin.Williams@jcb.com',
	'Mick.Inch@jcb.com',
	'Stephen.Causer@jcb.com',
	'Aaron.Hawley@jcb.com',
	'Josh.Cooper@jcb.com',
	'Maggie.Vassileva@jcb.com',
]

// end of day shift CP

let cpDayShift = new CronJob('0 0 18 * * 1-5', async function () {
	let division = 'CP'
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		location: 'Validation',
		frequency: 'Daily',
		division: division,
		section: 'Paint',
	})
	const failedTCards = await TCard.find({
		status: 'Failed',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
	})

	const passedTCards = await TCard.find({
		status: {
			$in: ['Passed', 'Not Required'],
		},
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
	})
	const containedTCards = await TCard.find({
		status: 'Contained',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
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
		to: cpDaysEmails,
		subject: 'Compact Products Daily Paint Plant Health Status Update',
		html:
			'<h2>Compact Products Paint Plant Health</h2>' +
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
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: cpDaysEmailsEsc,
			subject: 'Escalation: Compact Products Paint Plant Health',
			html:
				'<h2>Compact Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: cpDaysEmailsEsc,
			subject: 'Escalation: Compact Products Paint Plant Health',
			html:
				'<h2>Compact Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: cpDaysEmailsEsc,
			subject: 'Escalation: Compact Products Paint Plant Health',
			html:
				'<h2>Compact Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
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

	await TCard.updateMany(
		{
			division: division,
			frequency: 'Daily',
			section: 'Paint',
		},
		{ status: 'Open' }
	)
	console.log('Compact T Card Days email just sent')
})

// end of night shift CP

let cpNightShift = new CronJob('0 0 6 * * 2-5', async function () {
	let division = 'CP'
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		location: 'Validation',
		frequency: 'Daily',
		division: division,
		section: 'Paint',
	})
	const failedTCards = await TCard.find({
		status: 'Failed',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
	})

	const passedTCards = await TCard.find({
		status: {
			$in: ['Passed', 'Not Required'],
		},
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
	})
	const containedTCards = await TCard.find({
		status: 'Contained',
		frequency: {
			$in: ['Daily'],
		},
		division: division,
		section: 'Paint',
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
		to: cpDaysEmails,
		subject: 'Compact Products Daily Paint Plant Health Status Update',
		html:
			'<h2>Compact Products Paint Plant Health</h2>' +
			'\n\n' +
			`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
			'\n\n' +
			`<h4>${allNotMissed} of ${totalChecks} quality critical checks were completed on the night shift</h4>` +
			'\n\n' +
			`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Contained: ${numOfContained} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Failed: ${numOfFailed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Missed: ${numOfMissed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: cpDaysEmailsEsc,
			subject: 'Escalation: Compact Products Paint Plant Health',
			html:
				'<h2>Compact Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: cpDaysEmailsEsc,
			subject: 'Escalation: Compact Products Paint Plant Health',
			html:
				'<h2>Compact Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: cpDaysEmailsEsc,
			subject: 'Escalation: Compact Products Paint Plant Health',
			html:
				'<h2>Compact Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
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

	await TCard.updateMany(
		{
			division: division,
			frequency: 'Daily',
			area: { $ne: 'quality' },
		},
		{ status: 'Open' }
	)
	console.log('Compact T Card Days email just sent')
})

// 3 hour late night shift

let cpNightShift3hr = new CronJob('0 30 22 * * 1-4', async function () {
	let division = 'CP'
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		location: {
			$nin: ['Validation'],
		},
		status: 'Open',
		frequency: 'Daily',
		division: division,
		section: 'Paint',
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
			to: cpDaysEmailsEsc,
			subject: 'Escalation: Compact Products Paint Plant Health',
			html:
				'<h2>Compact Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
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

	console.log('CompactT Late Card Days email just sent')
})

//3 hour late days CP
let cpDayShift3hr = new CronJob('0 0 11 * * 1-5', async function () {
	let division = 'CP'
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
			to: cpDaysEmailsEsc,
			subject: 'Escalation: Compact Products Paint Plant Health',
			html:
				'<h2>Compact Products Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CP/Paint%20Shop</h4>`,
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

	console.log('CompactT Late Card Days email just sent')
})

// // 6pm monday-friday
// cpDayShift.start()

// // 6am tuesday-friday
// cpNightShift.start()

// //9am 3 hour into shift late check monday - friday
// cpDayShift3hr.start()

// //11:00 pm 3 hour into shift late check monday - friday
// cpNightShift3hr.start()
