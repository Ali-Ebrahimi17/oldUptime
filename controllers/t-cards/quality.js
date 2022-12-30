require('dotenv').config()
const TCard = require('../../models/tCard')
const Check = require('../../models/check')
const Name = require('../../models/name')

const CronJob = require('cron').CronJob
const nodemailer = require('nodemailer')
const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

let divisions = [
	{
		name: 'BHL',
		emails: [
			'Ali.Ebrahimi@jcb.com',
			'Stacy.Burnett@jcb.com',
			'Steve-c.Lewis@jcb.com',
			'Pete.Hendry@jcb.com',
			'Danile.Phillips-moul@jcb.com',
			'Mohammed.Khan@jcb.com',
			'Maggie.Vassileva@jcb.com',
		],
	},
	{
		name: 'CP',
		emails: [
			'Ali.Ebrahimi@jcb.com',
			'Stuart.Blake@jcb.com',
			'Dave.Peake@jcb.com',
			'Chris.Gumbley@jcb.com',
			'Steve.Stanley@jcb.com',
			'Stephen.Causer@jcb.com',
			'Aaron.Hawley@jcb.com',
			'Josh.Cooper@jcb.com',
			'Dave.Lea@jcb.com',
			'Maggie.Vassileva@jcb.com',
		],
	},
	{
		name: 'EM',
		emails: [
			'Ali.Ebrahimi@jcb.com',
			'Nick.Briggs@jcb.com',
			'Mark.Edwards@jcb.com',
			'Tom.Godfrey@jcb.com',
			'Maggie.Vassileva@jcb.com',
			'Adam.Wainwright@jcb.com',
		],
	},
	{
		name: 'HP',
		emails: [
			'Ali.Ebrahimi@jcb.com',
			'Steve.Parker@jcb.com',
			'Georgia.Turner@jcb.com',
			'Simon.Phillip@jcb.com',
			'Leila.Dunbar@jcb.com',
			'Stuart.Poole@jcb.com',
			'Brandon.Pegg@jcb.com',
			'Maggie.Vassileva@jcb.com',
		],
	},
	{
		name: 'LDL',
		emails: ['Ali.Ebrahimi@jcb.com', 'Soron.Glynn@jcb.com', 'Matthew.Scragg@jcb.com', 'Richard.Hooper@jcb.com', 'Maggie.Vassileva@jcb.com'],
	},
	{
		name: 'Cabs',
		emails: ['Ali.Ebrahimi@jcb.com', 'Matthew.Riley@jcb.com', 'Chris.Lydell@jcb.com', 'Maggie.Vassileva@jcb.com'],
	},
	{
		name: 'PS',
		emails: ['Ali.Ebrahimi@jcb.com', 'John.Gibson@jcb.com', 'Maggie.Vassileva@jcb.com'],
	},
]

// Seconds: 0-59
// Minutes: 0-59
// Hours: 0-23
// Day of Month: 1-31
// Months: 0-11 (Jan-Dec)
// Day of Week: 0-6 (Sun-Sat)

let qualityDaily = new CronJob('0 0 18 * * 1-5', async function () {
	let frequency = 'Daily'
	for (let division of divisions) {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		let openTCards = await TCard.find({
			division: division.name,
			status: 'Open',
			frequency: frequency,
			area: 'quality',
		})
		let failedTCards = await TCard.find({
			division: division.name,
			status: 'Failed',
			frequency: frequency,
			area: 'quality',
		})
		let passedTCards = await TCard.find({
			division: division.name,
			status: {
				$in: ['Passed', 'Not Required'],
			},
			frequency: frequency,

			area: 'quality',
		})
		let containedTCards = await TCard.find({
			division: division.name,
			status: 'Contained',
			frequency: frequency,
			area: 'quality',
		})
		let failedTCardsQTC = await TCard.find({
			division: division.name,
			status: 'Failed',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})
		let containedTCardsQTC = await TCard.find({
			division: division.name,
			status: 'Contained',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})
		let openTCardsCTQ = await TCard.find({
			division: division.name,
			status: 'Open',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})

		let missedDetail = openTCards.map((card) => ' <br> ' + card.name)
		let failedDetail = failedTCards.map((card) => ' <br> ' + card.name)

		let numOfPassed = passedTCards.length
		let numOfFailed = failedTCards.length
		let numOfMissed = openTCards.length
		let numOfContained = containedTCards.length

		let numOfFailedCTQ = failedTCardsQTC.length
		let numOfContainedCTQ = containedTCardsQTC.length
		let numOfMissedCTQ = openTCardsCTQ.length

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
			from: 'JCB-Quality.QCS@jcb.com',
			to: division.emails,
			subject: `${division.name} ${frequency} QCS Status Update`,
			html:
				`<h2> ${division.name} Quality Checks Update</h2>` +
				`<h2>Status: ${timeNowStamp} hrs</h2>` +
				`<h4>${allNotMissed} of ${totalChecks} quality critical checks have been completed</h4>` +
				`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
				`<h4>Checks Contained: ${numOfContained} of ${totalChecks} (CTQ = ${numOfContainedCTQ})</h4>` +
				`<h4>Checks Failed: ${numOfFailed} of ${totalChecks} (CTQ = ${numOfFailedCTQ})</h4>` +
				`<h4>Checks Missed: ${numOfMissed} of ${totalChecks} (CTQ = ${numOfMissedCTQ})</h4>` +
				`<h4>The misssed checks are:` +
				`${missedDetail}</h4>` +
				`<h4>The failed checks are:` +
				`${failedDetail}</h4>` +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/${division.name}/quality</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

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
		//reset all t cards
		await TCard.updateMany(
			{
				division: division.name,
				area: 'quality',
				frequency: frequency,
			},
			{
				$set: {
					status: 'Open',
				},
			}
		)
	}
})

let qualityWeekly = new CronJob('0 0 18 * * 5', async function () {
	let frequency = 'Weekly'
	for (let division of divisions) {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		let openTCards = await TCard.find({
			division: division.name,
			status: 'Open',
			frequency: frequency,
			area: 'quality',
		})
		let failedTCards = await TCard.find({
			division: division.name,
			status: 'Failed',
			frequency: frequency,
			area: 'quality',
		})
		let passedTCards = await TCard.find({
			division: division.name,
			status: {
				$in: ['Passed', 'Not Required'],
			},
			frequency: frequency,

			area: 'quality',
		})
		let containedTCards = await TCard.find({
			division: division.name,
			status: 'Contained',
			frequency: frequency,
			area: 'quality',
		})
		let failedTCardsQTC = await TCard.find({
			division: division.name,
			status: 'Failed',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})
		let containedTCardsQTC = await TCard.find({
			division: division.name,
			status: 'Contained',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})
		let openTCardsCTQ = await TCard.find({
			division: division.name,
			status: 'Open',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})

		let missedDetail = openTCards.map((card) => ' <br> ' + card.name)
		let failedDetail = failedTCards.map((card) => ' <br> ' + card.name)

		let numOfPassed = passedTCards.length
		let numOfFailed = failedTCards.length
		let numOfMissed = openTCards.length
		let numOfContained = containedTCards.length

		let numOfFailedCTQ = failedTCardsQTC.length
		let numOfContainedCTQ = containedTCardsQTC.length
		let numOfMissedCTQ = openTCardsCTQ.length

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
			from: 'JCB-Quality.QCS@jcb.com',
			to: division.emails,
			subject: `${division.name} ${frequency} QCS Status Update`,
			html:
				`<h2> ${division.name} Quality Checks Update</h2>` +
				`<h2>Status: ${timeNowStamp} hrs</h2>` +
				`<h4>${allNotMissed} of ${totalChecks} quality critical checks have been completed</h4>` +
				`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
				`<h4>Checks Contained: ${numOfContained} of ${totalChecks} (CTQ = ${numOfContainedCTQ})</h4>` +
				`<h4>Checks Failed: ${numOfFailed} of ${totalChecks} (CTQ = ${numOfFailedCTQ})</h4>` +
				`<h4>Checks Missed: ${numOfMissed} of ${totalChecks} (CTQ = ${numOfMissedCTQ})</h4>` +
				`<h4>The misssed checks are:` +
				`${missedDetail}</h4>` +
				`<h4>The failed checks are:` +
				`${failedDetail}</h4>` +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/${division.name}/quality</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

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
		//reset all t cards
		await TCard.updateMany(
			{
				division: division.name,
				area: 'quality',
				frequency: frequency,
			},
			{
				$set: {
					status: 'Open',
				},
			}
		)
	}
})

let qualityMonthly = new CronJob('0 0 18 28-31 * *', async function () {
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
				area: 'quality',
			})
			let failedTCards = await TCard.find({
				division: division.name,
				status: 'Failed',
				frequency: frequency,
				area: 'quality',
			})
			let passedTCards = await TCard.find({
				division: division.name,
				status: {
					$in: ['Passed', 'Not Required'],
				},
				frequency: frequency,

				area: 'quality',
			})
			let containedTCards = await TCard.find({
				division: division.name,
				status: 'Contained',
				frequency: frequency,
				area: 'quality',
			})
			let failedTCardsQTC = await TCard.find({
				division: division.name,
				status: 'Failed',
				frequency: frequency,
				area: 'quality',
				level: 'CTQ',
			})
			let containedTCardsQTC = await TCard.find({
				division: division.name,
				status: 'Contained',
				frequency: frequency,
				area: 'quality',
				level: 'CTQ',
			})
			let openTCardsCTQ = await TCard.find({
				division: division.name,
				status: 'Open',
				frequency: frequency,
				area: 'quality',
				level: 'CTQ',
			})

			let missedDetail = openTCards.map((card) => ' <br> ' + card.name)
			let failedDetail = failedTCards.map((card) => ' <br> ' + card.name)

			let numOfPassed = passedTCards.length
			let numOfFailed = failedTCards.length
			let numOfMissed = openTCards.length
			let numOfContained = containedTCards.length

			let numOfFailedCTQ = failedTCardsQTC.length
			let numOfContainedCTQ = containedTCardsQTC.length
			let numOfMissedCTQ = openTCardsCTQ.length

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
				from: 'JCB-Quality.QCS@jcb.com',
				to: division.emails,
				subject: `${division.name} ${frequency} QCS Status Update`,
				html:
					`<h2> ${division.name} Quality Checks Update</h2>` +
					`<h2>Status: ${timeNowStamp} hrs</h2>` +
					`<h4>${allNotMissed} of ${totalChecks} quality critical checks have been completed</h4>` +
					`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
					`<h4>Checks Contained: ${numOfContained} of ${totalChecks} (CTQ = ${numOfContainedCTQ})</h4>` +
					`<h4>Checks Failed: ${numOfFailed} of ${totalChecks} (CTQ = ${numOfFailedCTQ})</h4>` +
					`<h4>Checks Missed: ${numOfMissed} of ${totalChecks} (CTQ = ${numOfMissedCTQ})</h4>` +
					`<h4>The misssed checks are:` +
					`${missedDetail}</h4>` +
					`<h4>The failed checks are:` +
					`${failedDetail}</h4>` +
					`<h4>http://quality-uptime.jcb.local/tCard/allhistory/${division.name}/quality</h4>`,
			}
			transporter.sendMail(mailOptions, () => {})

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
			//reset all t cards
			await TCard.updateMany(
				{
					division: division.name,
					area: 'quality',
					frequency: frequency,
				},
				{
					$set: {
						status: 'Open',
					},
				}
			)
		}
	}
})

let qualityQuarterly = new CronJob('0 0 6 1 */3 *', async function () {
	let frequency = 'Quarterly'
	for (let division of divisions) {
		let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm')

		let openTCards = await TCard.find({
			division: division.name,
			status: 'Open',
			frequency: frequency,
			area: 'quality',
		})
		let failedTCards = await TCard.find({
			division: division.name,
			status: 'Failed',
			frequency: frequency,
			area: 'quality',
		})
		let passedTCards = await TCard.find({
			division: division.name,
			status: {
				$in: ['Passed', 'Not Required'],
			},
			frequency: frequency,

			area: 'quality',
		})
		let containedTCards = await TCard.find({
			division: division.name,
			status: 'Contained',
			frequency: frequency,
			area: 'quality',
		})
		let failedTCardsQTC = await TCard.find({
			division: division.name,
			status: 'Failed',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})
		let containedTCardsQTC = await TCard.find({
			division: division.name,
			status: 'Contained',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})
		let openTCardsCTQ = await TCard.find({
			division: division.name,
			status: 'Open',
			frequency: frequency,
			area: 'quality',
			level: 'CTQ',
		})

		let missedDetail = openTCards.map((card) => ' <br> ' + card.name)
		let failedDetail = failedTCards.map((card) => ' <br> ' + card.name)

		let numOfPassed = passedTCards.length
		let numOfFailed = failedTCards.length
		let numOfMissed = openTCards.length
		let numOfContained = containedTCards.length

		let numOfFailedCTQ = failedTCardsQTC.length
		let numOfContainedCTQ = containedTCardsQTC.length
		let numOfMissedCTQ = openTCardsCTQ.length

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
			from: 'JCB-Quality.QCS@jcb.com',
			to: division.emails,
			subject: `${division.name} ${frequency} QCS Status Update`,
			html:
				`<h2> ${division.name} Quality Checks Update</h2>` +
				`<h2>Status: ${timeNowStamp} hrs</h2>` +
				`<h4>${allNotMissed} of ${totalChecks} quality critical checks have been completed</h4>` +
				`<h4>Checks Passed: ${numOfPassed} of ${totalChecks}</h4>` +
				`<h4>Checks Contained: ${numOfContained} of ${totalChecks} (CTQ = ${numOfContainedCTQ})</h4>` +
				`<h4>Checks Failed: ${numOfFailed} of ${totalChecks} (CTQ = ${numOfFailedCTQ})</h4>` +
				`<h4>Checks Missed: ${numOfMissed} of ${totalChecks} (CTQ = ${numOfMissedCTQ})</h4>` +
				`<h4>The misssed checks are:` +
				`${missedDetail}</h4>` +
				`<h4>The failed checks are:` +
				`${failedDetail}</h4>` +
				`<h4>http://quality-uptime.jcb.local/tCard/allhistory/${division.name}/quality</h4>`,
		}
		transporter.sendMail(mailOptions, () => {})

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
		//reset all t cards
		await TCard.updateMany(
			{
				division: division.name,
				area: 'quality',
				frequency: frequency,
			},
			{
				$set: {
					status: 'Open',
				},
			}
		)
	}
})

// qualityDaily.start()
// qualityWeekly.start()
// qualityMonthly.start()
// qualityQuarterly.start()
