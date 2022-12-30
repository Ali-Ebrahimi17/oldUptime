require('dotenv').config()
const TCard = require('../../models/tCard')
const Check = require('../../models/check')
const Name = require('../../models/name')

const CronJob = require('cron').CronJob
const nodemailer = require('nodemailer')
const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// scheduled jobs for loadall
let division = 'BHL'

// let ldlDaysEmails = [ 'ali.ebrahimi@jcb.com' ]
// let ldlDaysEmailsEsc = [ 'ali.ebrahimi@jcb.com' ]

let ldlDaysEmails = ['mark.norton@jcb.com', 'ali.ebrahimi@jcb.com', 'anthony.butler@jcb.com', 'andy.holmes@jcb.com']
let ldlDaysEmailsEsc = [
	'mark.norton@jcb.com',
	'ali.ebrahimi@jcb.com',
	'anthony.butler@jcb.com',
	'andy.holmes@jcb.com',
	'stacy.burnett@jcb.com',
	'richard.williams@jcb.com',
	'dave.parry@jcb.com',
]

// scheduled jobs for Cabs

let bhlDayShift = new CronJob('0 0 17 * * 1-4', async function () {
	try {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		const openTCards = await TCard.find({
			status: 'Open',
			location: 'Validation',
			frequency: 'Daily',
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
			subject: 'BHL Daily Paint Plant Health Status Update',
			html:
				'<h2>BHL Paint Plant Health</h2>' +
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
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfFailed} quality critical checks have failed</h4>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${failedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfContained > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${containedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfMissed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
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
			check.tCardId = card._id
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

let bhlNightsShift = new CronJob('0 0 5 * * 2-5', async function () {
	try {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		const openTCards = await TCard.find({
			status: 'Open',
			location: 'Validation',
			area: { $ne: 'quality' },
			frequency: 'Daily',
			division: division,
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
			subject: 'BHL Daily Paint Plant Health Status Update',
			html:
				'<h2>BHL Paint Plant Health</h2>' +
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
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfFailed} quality critical checks have failed</h4>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${failedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfContained > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
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
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
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

let bhlDayShiftFri = new CronJob('0 0 13 * * 5', async function () {
	try {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		const openTCards = await TCard.find({
			status: 'Open',
			location: 'Validation',
			frequency: 'Daily',
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
			subject: 'BHL Daily Paint Plant Health Status Update',
			html:
				'<h2>BHL Paint Plant Health</h2>' +
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
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
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
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${containedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfMissed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
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

//  3 hour emails

let bhlNightShift3hr = new CronJob('0 30 21 * * 1-4', async function () {
	try {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		const openTCards = await TCard.find({
			location: {
				$nin: ['Validation'],
			},
			area: { $ne: 'quality' },
			status: 'Open',
			frequency: {
				$in: ['Daily'],
			},
			division: division,
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
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
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

let bhlDayShift3hr = new CronJob('0 0 11 * * 5', async function () {
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
				subject: 'Escalation: BHL Paint Plant Health',
				html:
					'<h2>BHL Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/BHL/Paint%20Shop</h4>`,
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

let divisions = [
	{
		name: 'BHL',
		emails: [
			'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'anthony.butler@jcb.com',
			'andy.holmes@jcb.com',
			'stacy.burnett@jcb.com',
			'richard.williams@jcb.com',
			'dave.parry@jcb.com',
		],
	},
	{
		name: 'CABS',
		emails: [
			'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'martin.key@jcb.com',
			'jake.harwood@jcb.com',
			'steve-m.jones@jcb.com',
			'ben.emery@jcb.com',
			'ricci.deacon@jcb.com',
			'ryan.thursfield@jcb.com',
		],
	},
	{
		name: 'CP',
		emails: [
			'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'phil.jakeman@jcb.com',
			'simon.johnson@jcb.com',
			'mick.inch@jcb.com',
			'kevin.williams@jcb.com',
			'stuart.blake@jcb.com',
			'jamie.barker@jcb.com',
			'ryan.thursfield@jcb.com',
		],
	},
	{
		name: 'EM',
		emails: [
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
		],
	},
	{
		name: 'HBU',
		emails: [
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
		],
	},
	{
		name: 'HP',
		emails: [
			'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'martyn.richardson@jcb.com',
			'anthony.wiggan@jcb.com',
			'steven.smith@jcb.com',
			'chris.alcock@jcb.com',
			'chris.blackshaw@jcb.com',
			'eddie.trindade@jcb.com',
			'steve.parker@jcb.com',
			'aaron.brookes@jcb.com',
			'ryan.thursfield@jcb.com',
		],
	},
	{
		name: 'LDL',
		emails: [
			'mark.norton@jcb.com',
			'ali.ebrahimi@jcb.com',
			'robert.armett@jcb.com',
			'adam.tortoishell@jcb.com',
			'tim.barnicott@jcb.com',
			'wayne.clowes@jcb.com',
			'soron.glynn@jcb.com',
			'blair.jebson@jcb.com',
			'mick-a.smith@jcb.com',
			'ryan.thursfield@jcb.com',
			'andy.spurway@jcb.com',
			'Matthew.Scragg@jcb.com',
			'robert.griffin@jcb.com',
		],
	},
]

let divisionWeekly = new CronJob('0 0 18 * * 5', async function () {
	let frequency = 'Weekly'
	for (let division of divisions) {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		let openTCards = await TCard.find({
			division: division.name,
			status: 'Open',
			frequency: frequency,
			area: { $ne: 'quality' },
		})

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

		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: division.emails,
			subject: `${division.name} Paint Plant Health`,
			html:
				`<h2>${division.name}  Paint Plant Health</h2>` +
				'\n\n' +
				`<h2>Weekly Paint Check Status : ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} Weekly checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n',
		}
		transporter.sendMail(mailOptions, () => {})

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
	}
})

let divisionMonthly = new CronJob('0 0 18 28-31 * *', async function () {
	const today = new Date()
	const tomorrow = new Date()
	tomorrow.setDate(tomorrow.getDate() + 1)

	if (today.getMonth() !== tomorrow.getMonth()) {
		let frequency = 'Monthly'
		for (let division of divisions) {
			let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

			let openTCards = await TCard.find({
				division: division.name,
				status: 'Open',
				frequency: frequency,
				area: { $ne: 'quality' },
			})

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

			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: division.emails,
				subject: `${division.name} Paint Plant Health`,
				html:
					`<h2>${division.name} Paint Plant Health</h2>` +
					'\n\n' +
					`<h2>Monthly Paint Check Status : ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} Monthly checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n',
			}
			transporter.sendMail(mailOptions, () => {})

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
		}
	}
})

let divisionQuarterly = new CronJob('0 0 6 1 */3 *', async function () {
	let frequency = 'Quarterly'
	for (let division of divisions) {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		let openTCards = await TCard.find({
			division: division.name,
			status: 'Open',
			frequency: frequency,
			area: { $ne: 'quality' },
		})

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

		let mailOptions = {
			from: 'JCB-Quality.TCards@jcb.com',
			to: division.emails,
			subject: `${division.name} Paint Plant Health`,
			html:
				`<h2>${division.name} Paint Plant Health</h2>` +
				'\n\n' +
				`<h2>Quarterly Paint Check Status : ${timeNowStamp} hrs</h2>` +
				'\n\n' +
				`<h4>${numOfMissed} Quarterly checks have been missed<h4/>` +
				'\n\n' +
				`<h4>The checks are:</h4>` +
				`<h4>${missedDetail}</h4>` +
				'\n\n',
		}
		transporter.sendMail(mailOptions, () => {})

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
	}
})

divisionWeekly.start()
divisionMonthly.start()
divisionQuarterly.start()

// /////////////////---------BHL---------//////////////////////

//5pm end of day shift monday-thursday
// bhlDayShift.start()

// //1pm end of day shift friday
// bhlDayShiftFri.start()

// //6am end of night shift midnight tuesday-friday
// // bhlNightsShift.start()

// //3 hour emails

// //11am  monday-friday
// bhlDayShift3hr.start()

// //9:30pm  monday-thursday
// // bhlNightShift3hr.start()
