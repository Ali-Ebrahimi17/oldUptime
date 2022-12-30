require('dotenv').config()
const TCard = require('../../models/tCard')
const Check = require('../../models/check')
const Name = require('../../models/name')

const CronJob = require('cron').CronJob
const nodemailer = require('nodemailer')
const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// scheduled jobs for EM
let division = 'EM'

// let ldlDaysEmails = [ 'ali.ebrahimi@jcb.com' ]
// let ldlDaysEmailsEsc = [ 'ali.ebrahimi@jcb.com' ]

let ldlDaysEmails = [
	'mark.norton@jcb.com',
	'ali.ebrahimi@jcb.com',
	'daniel.woodcock@jcb.com',
	'thomas.johnson@jcb.com',
	'james.stonier@jcb.com',
	'craig.bates@jcb.com',
	'keith.pilling@jcb.com',
	'darren-p.brown@jcb.com',
	'ryan.thursfield@jcb.com',
]
let ldlDaysEmailsEsc = [
	'mark.norton@jcb.com',
	'ali.ebrahimi@jcb.com',
	'john.godfrey@jcb.com',
	'mark.edwards@jcb.com',
	'craig.bates@jcb.com',
	'keith.pilling@jcb.com',
	'darren-p.brown@jcb.com',
	'craig.caddy@jcb.com',
	'steve.leedham@jcb.com',
	'dave-m.roberts@jcb.com',
	'ryan.thursfield@jcb.com',
]

// end of day shift em
let emDayShift = new CronJob('0 0 14 * * 1-4', async function () {
	// let emDayShift = new  CronJob('0 0 13 * * 1-5', async function() {

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
		subject: 'Earth Movers Daily Paint Plant Health Status Update',
		html:
			'<h2>Earth Movers Paint Plant Health</h2>' +
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
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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
	console.log('Earth Movers T Card Days email just sent')
})

// end of day shift em
let emDayShiftFriday = new CronJob('0 0 14 * * 5', async function () {
	// let emDayShift = new  CronJob('0 0 13 * * 1-5', async function() {

	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		location: 'Validation',
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
		subject: 'Earth Movers Daily Paint Plant Health Status Update',
		html:
			'<h2>Earth Movers Paint Plant Health</h2>' +
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
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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
	console.log('Earth Movers T Card Days email just sent')
})

// loadall day 3hr
let emDaysShift3hr = new CronJob('0 0 9 * * 1-5', async function () {
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
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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

	console.log('Earth Movers T Late Card Days email just sent')
})

//em noons

let emNoonShift = new CronJob('0 0 22 * * 1-4', async function () {
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		location: 'Validation',
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
		subject: 'Earth Movers Daily Paint Plant Health Status Update',
		html:
			'<h2>Earth Movers Paint Plant Health</h2>' +
			'\n\n' +
			`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
			'\n\n' +
			`<h4>${allNotMissed} of ${totalChecks} quality critical checks were completed on the noon shift</h4>` +
			'\n\n' +
			`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Contained: ${numOfContained} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Failed: ${numOfFailed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Missed: ${numOfMissed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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
	console.log('Earth Movers T Card Days email just sent')
})

let emNoonShiftFriday = new CronJob('0 0 20 * * 5', async function () {
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		location: 'Validation',
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
		subject: 'Earth Movers Daily Paint Plant Health Status Update',
		html:
			'<h2>Earth Movers Paint Plant Health</h2>' +
			'\n\n' +
			`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
			'\n\n' +
			`<h4>${allNotMissed} of ${totalChecks} quality critical checks were completed on the noon shift</h4>` +
			'\n\n' +
			`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Contained: ${numOfContained} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Failed: ${numOfFailed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>Checks Missed: ${numOfMissed} of ${totalChecks}</h4>` +
			'\n\n' +
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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
	console.log('Earth Movers T Card Days email just sent')
})

// loadall day 3hr
let emNoonShift3hr = new CronJob('0 0 17 * * 1-4', async function () {
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
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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

	console.log('Earth Movers T Late Card Days email just sent')
})

let emNoonShiftFriday3hr = new CronJob('0 0 16 * * 5', async function () {
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
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Noon Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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

	console.log('Earth Movers T Late Card Days email just sent')
})

// em nights

let emNightShift = new CronJob('0 0 6 * * 2-5', async function () {
	let division = 'EM'
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		location: 'Validation',
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
		subject: 'Earth Movers Daily Paint Plant Health Status Update',
		html:
			'<h2>Earth Movers Paint Plant Health</h2>' +
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
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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
	console.log('Earth Movers T Card Days email just sent')
})

let emNightShiftFriday = new CronJob('0 0 3 * * 6', async function () {
	let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

	const openTCards = await TCard.find({
		status: 'Open',
		location: 'Validation',
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
		subject: 'Earth Movers Daily Paint Plant Health Status Update',
		html:
			'<h2>Earth Movers Paint Plant Health</h2>' +
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
			`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
	}
	transporter.sendMail(mailOptions, () => {})

	if (numOfFailed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfFailed} quality critical checks have failed</h4>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${failedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfContained > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${containedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})
	}
	if (numOfMissed > 0) {
		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: ldlDaysEmailsEsc,
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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
	console.log('Earth Movers T Card Days email just sent')
})

// loadall day 3hr
let emNightShift3hr = new CronJob('0 0 1 * * 2-5', async function () {
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
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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

	console.log('Earth Movers T Late Card Days email just sent')
})

let emNightShiftFriday3hr = new CronJob('0 0 23 * * 5', async function () {
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
			subject: 'Escalation: Earth Movers Paint Plant Health',
			html:
				'<h2>Earth Movers Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/EM/Paint%20Shop</h4>`,
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

	console.log('Earth Movers T Late Card Days email just sent')
})

// // 2pm monday - thursday
// emDayShift.start()

// // 1pm friday
// emDayShift.start()

// // 9am monday - thursday
// emDaysShift3hr.start()

// // 10pm monday - thuirsday
// emNoonShift.start()

// // 8pm monday - friday
// emNoonShift.start()

// // 5pm monday - thursday
// emNoonShift3hr.start()

// // 4pm monday - friday
// emNoonShiftFriday3hr.start()

// // // 6amm tuesday - friday
// emNightShift.start()

// // // 3am saturday
// emNightShiftFriday.start()

// // // 1am tuesday - friday
// emNightShift3hr.start()

// //  11pm friday
// emNightShiftFriday3hr.start()
