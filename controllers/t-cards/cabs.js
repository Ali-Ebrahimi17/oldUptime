require('dotenv').config()
const TCard = require('../../models/tCard')
const Check = require('../../models/check')
const Name = require('../../models/name')

const CronJob = require('cron').CronJob
const nodemailer = require('nodemailer')
const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// scheduled jobs for loadall
let division = 'CABS'

// let ldlDaysEmails = [ 'ali.ebrahimi@jcb.com' ]
// let ldlDaysEmailsEsc = [ 'ali.ebrahimi@jcb.com' ]

let ldlDaysEmails = [
	'mark.norton@jcb.com',
	'ali.ebrahimi@jcb.com',
	'martin.key@jcb.com',
	'jake.harwood@jcb.com',
	'steve-m.jones@jcb.com',
	'ryan.thursfield@jcb.com',
]
let ldlDaysEmailsEsc = [
	'mark.norton@jcb.com',
	'ali.ebrahimi@jcb.com',
	'martin.key@jcb.com',
	'jake.harwood@jcb.com',
	'steve-m.jones@jcb.com',
	'ben.emery@jcb.com',
	'ricci.deacon@jcb.com',
	'ryan.thursfield@jcb.com',
]

// scheduled jobs for Cabs

let cabsDayShiftMonThu = new CronJob('0 0 15 * * 1-4', async function () {
	try {
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
			subject: 'Cabs Daily Paint Plant Health Status Update',
			html:
				'<h2>Cabs Paint Plant Health</h2>' +
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
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfFailed} quality critical checks have failed</h4>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${failedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfContained > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${containedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfMissed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
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
	} catch (error) {
		console.log(error)
	}
})

let cabsNightsShiftMonThu = new CronJob('0 0 0 * * 2-5', async function () {
	try {
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
			subject: 'Cabs Daily Paint Plant Health Status Update',
			html:
				'<h2>Cabs Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${allNotMissed} of ${totalChecks} quality critical checks were completed on the Night shift</h4>` +
				'\n\n' +
				`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
				'\n\n' +
				`<h4>Checks Contained: ${numOfContained} of ${totalChecks}</h4>` +
				'\n\n' +
				`<h4>Checks Failed: ${numOfFailed} of ${totalChecks}</h4>` +
				'\n\n' +
				`<h4>Checks Missed: ${numOfMissed} of ${totalChecks}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfFailed} quality critical checks have failed</h4>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${failedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfContained > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${containedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfMissed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
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
		// console.log('Loadall T Card Nights email just sent')
	} catch (error) {
		console.log(error)
	}
})

let cabsDayShiftFri = new CronJob('0 0 11 * * 5', async function () {
	try {
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
			subject: 'Cabs Daily Paint Plant Health Status Update',
			html:
				'<h2>Cabs Paint Plant Health</h2>' +
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
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfFailed} quality critical checks have failed</h4>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${failedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfContained > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${containedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfMissed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
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
	} catch (error) {
		console.log(error)
	}
})

let cabsNightsShiftFri = new CronJob('0 0 16 * * 5', async function () {
	try {
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
			subject: 'Cabs Daily Paint Plant Health Status Update',
			html:
				'<h2>Cabs Paint Plant Health</h2>' +
				'\n\n' +
				`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${allNotMissed} of ${totalChecks} quality critical checks were completed on the Night shift</h4>` +
				'\n\n' +
				`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
				'\n\n' +
				`<h4>Checks Contained: ${numOfContained} of ${totalChecks}</h4>` +
				'\n\n' +
				`<h4>Checks Failed: ${numOfFailed} of ${totalChecks}</h4>` +
				'\n\n' +
				`<h4>Checks Missed: ${numOfMissed} of ${totalChecks}</h4>` +
				'\n\n' +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfFailed} quality critical checks have failed</h4>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${failedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfContained > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${containedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfMissed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
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
		// console.log('Loadall T Card Nights email just sent')
	} catch (error) {
		console.log(error)
	}
})

//  3 hour email nights

let cabsNightShiftMonThu3hr = new CronJob('0 0 18 * * 1-4', async function () {
	try {
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
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
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
	} catch (error) {
		console.log(error)
	}
})

let cabsNightShiftFri3hr = new CronJob('0 0 14 * * 5', async function () {
	try {
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
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
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
	} catch (error) {
		console.log(error)
	}
})

// loadall day 3hr
let cabsDaysShiftMonFir3hr = new CronJob('0 0 9 * * 1-5', async function () {
	try {
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
				subject: 'Escalation: Cabs Paint Plant Health',
				html:
					'<h2>Cabs Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/CABS/Paint%20Shop</h4>`,
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
	} catch (error) {
		console.log(error)
	}

	// console.log('Loadall T Late Card Days email just sent')
})

// /////////////////---------CABS---------//////////////////////

// //3pm end of day shift monday-thursday
// cabsDayShiftMonThu.start()

// // 11am end of day shift friday
// cabsDayShiftFri.start()

// // end of night shift midnight monday-thursday
// cabsNightsShiftMonThu.start()

// // end of night shift 4pm friday
// cabsNightsShiftFri.start()

// // 9am 3 hour into shift late check monday - friday
// cabsDaysShiftMonFir3hr.start()

// //6pm 3 hour into shift late check monday - thursday
// cabsNightShiftMonThu3hr.start()

// //2pm 3 hour into shift late check friday
// cabsNightShiftFri3hr.start()
