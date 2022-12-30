require('dotenv').config()
const TCard = require('../../models/tCard')
const Check = require('../../models/check')
const Name = require('../../models/name')

const CronJob = require('cron').CronJob
const nodemailer = require('nodemailer')
const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

// scheduled jobs for loadall
let division = 'LDL'

// let ldlDaysEmails = [ 'ali.ebrahimi@jcb.com' ]
// let ldlDaysEmailsEsc = [ 'ali.ebrahimi@jcb.com' ]

let ldlDaysEmails = [
	'ali.ebrahimi@jcb.com',
	'robert.armett@jcb.com',
	'adam.tortoishell@jcb.com',
	'tim.barnicott@jcb.com',
	'wayne.clowes@jcb.com',
	'ryan.thursfield@jcb.com',
	'Andy.Spurway@jcb.com',
	'Daniel-R.Curtis@jcb.com',
	'Matthew.Scragg@jcb.com',
	'james.harvey@jcb.com',
	'benjamin.terry@jcb.com',
	'robert.griffin@jcb.com',
]
let ldlDaysEmailsEsc = [
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
]

// end of day shift ldl

let ldlDayShift = new CronJob('0 0 18 * * *', async function () {
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
			subject: 'Loadall Daily Paint Plant Health Status Update',
			html:
				'<h2>Loadall Paint Plant Health</h2>' +
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
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Loadall Paint Plant Health',
				html:
					'<h2>Loadall Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfFailed} quality critical checks have failed</h4>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${failedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfContained > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Loadall Paint Plant Health',
				html:
					'<h2>Loadall Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${containedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfMissed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Loadall Paint Plant Health',
				html:
					'<h2>Loadall Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
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
		console.log('Loadall T Card Days email just sent')
	} catch (error) {
		console.log(error)
	}
})

// end of night shift ldl
let ldlNightsShift = new CronJob('0 0 6 * * *', async function () {
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
			subject: 'Loadall Daily Paint Plant Health Status Update',
			html:
				'<h2>Loadall Paint Plant Health</h2>' +
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
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

		if (numOfFailed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Loadall Paint Plant Health',
				html:
					'<h2>Loadall Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfFailed} quality critical checks have failed</h4>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${failedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfContained > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Loadall Paint Plant Health',
				html:
					'<h2>Loadall Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfContained} quality critical checks have failed but are now contained<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${containedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})
		}
		if (numOfMissed > 0) {
			let mailOptions = {
				from: 'JCB-Quality.TCards@jcb.com',
				to: ldlDaysEmailsEsc,
				subject: 'Escalation: Loadall Paint Plant Health',
				html:
					'<h2>Loadall Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have been missed<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
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
		console.log('Loadall T Card Nights email just sent')
	} catch (error) {
		console.log(error)
	}
})

// Loadall 3 hour email nights

let ldlNightShift3hr = new CronJob('0 0 22 * * *', async function () {
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
				subject: 'Escalation: Loadall Paint Plant Health',
				html:
					'<h2>Loadall Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Night Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
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

		console.log('Loadall T Late Card Days email just sent')
	} catch (error) {
		console.log(error)
	}
})

// loadall day 3hr
let ldlDaysShift3hr = new CronJob('0 0 9 * * *', async function () {
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
				subject: 'Escalation: Loadall Paint Plant Health',
				html:
					'<h2>Loadall Paint Plant Health</h2>' +
					'\n\n' +
					`<h2>Day Shift Status: ${timeNowStamp} hrs</h2>` +
					'\n\n' +
					`<h4>${numOfMissed} quality critical checks have not been completed in the first 3 hours of the shift<h4/>` +
					'\n\n' +
					`<h4>The checks are:</h4>` +
					`<h4>${missedDetail}</h4>` +
					'\n\n' +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/LDL/Paint%20Shop</h4>`,
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

		console.log('Loadall T Late Card Days email just sent')
	} catch (error) {
		console.log(error)
	}
})

let weekly = new CronJob('0 0 6 * * *', async function () {
	try {
		const weeklyTCards = await TCard.find({
			area: { $ne: 'quality' },
			frequency: {
				$in: ['Weekly'],
			},
			passedAt: {
				$lte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
			},
		})

		for (let card of weeklyTCards) {
			let idNumber = card.id

			await TCard.findByIdAndUpdate(idNumber, {
				status: 'Open',
			})
		}
	} catch (error) {
		console.log(error)
	}
})

// Seconds: 0-59
// Minutes: 0-59
// Hours: 0-23
// Day of Month: 1-31
// Months: 0-11 (Jan-Dec)
// Day of Week: 0-6 (Sun-Sat)

let monthly = new CronJob('0 0 6 * * *', async function () {
	try {
		const weeklyTCards = await TCard.find({
			area: { $ne: 'quality' },
			frequency: {
				$in: ['Monthly'],
			},
			passedAt: {
				$lte: new Date(new Date().getTime() - 31 * 24 * 60 * 60 * 1000),
			},
		})

		for (let card of weeklyTCards) {
			let idNumber = card.id

			await TCard.findByIdAndUpdate(idNumber, {
				status: 'Open',
			})
		}
	} catch (error) {
		console.log(error)
	}
})

// Seconds: 0-59
// Minutes: 0-59
// Hours: 0-23
// Day of Month: 1-31
// Months: 0-11 (Jan-Dec)
// Day of Week: 0-6 (Sun-Sat)

let quarterly = new CronJob('0 0 6 * * *', async function () {
	try {
		const cards = await TCard.find({
			area: { $ne: 'quality' },
			frequency: {
				$in: ['Quarterly'],
			},
			passedAt: {
				$lte: new Date(new Date().getTime() - 123 * 24 * 60 * 60 * 1000),
			},
		})

		for (let card of cards) {
			let idNumber = card.id

			await TCard.findByIdAndUpdate(idNumber, {
				status: 'Open',
			})
		}
	} catch (error) {
		console.log(error)
	}
})
// let removeMissed = new  CronJob('0 46 15 * * 1-5', async function() {
// 	try {
// 		const cards = await TCard.find({
// 			area      : 'quality',
// 			frequency : {
// 				$in : [ 'Weekly' ],
// 			},
// 			passedAt  : {
// 				$gte : new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
// 			},
// 		}).populate({
// 			path             : 'checks',
// 			match            : { result: 'Passed' },
// 			sort             : { _id: -1 },
// 			// select           : '_id',
// 			perDocumentLimit : 1,
// 		})

// 		let ids = []

// 		for (let c of cards) {
// 			if (c.checks.length > 0) {
// 				console.log(c.checks[0].createdAt)
// 				const updatedCard = await TCard.findByIdAndUpdate(
// 					c.checks[0].tCardId,
// 					{
// 						status    : 'Passed',
// 						updatedAt : c.checks[0].createdAt,
// 					},
// 					{ new: true },
// 				)
// 				// console.log(updatedCard)
// 			}
// 		}

// 		// for (let card of cards) {
// 		// 	let idNumber = card.id

// 		// 	await TCard.findByIdAndUpdate(idNumber, {
// 		// 		status : 'Open',
// 		// 	})
// 		// }
// 	} catch (error) {
// 		console.log(error)
// 	}
// })

// removeMissed.start()

/////////////////---------LDL---------//////////////////////

// //6pm everyday
// ldlDayShift.start()

// // 6am every day
// ldlNightsShift.start()

// //9am 3 hour into day shift check every day
// ldlDaysShift3hr.start()

// //10pm 3 hour into shift late check every day
// ldlNightShift3hr.start()

// /////////////////---------Week & Month---------//////////////////////

// // 6am monday to friday
// weekly.start()
// monthly.start()
// quarterly.start()
