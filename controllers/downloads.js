const Claim = require('../models/claim')
const Retail = require('../models/retail')
const Doa25pt = require('../models/doa25pt')
const User = require('../models/user')
const CabsClaim = require('../models/cabsclaim')
const MriClaim = require('../models/mriClaim')
const Check = require('../models/check')

const fs = require('fs')
const Json2csvParser = require('json2csv').Parser

const axios = require('axios')

const moment = require('moment')
const check = require('../models/check')

module.exports.index = async (req, res) => {
	const { division } = req.params

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	let startDateAPI = moment().subtract(7, 'days').format('YYYY/MM/DD/00/00')
	let endDateAPI = moment().format('YYYY/MM/DD/00/00')

	let number = 0

	if (division === 'LDL' || division === 'BHL' || division === 'CP' || division === 'SD') {
		if (division === 'LDL') number = 19
		if (division === 'BHL') number = 18
		if (division === 'CP') number = 5
		if (division === 'SD') number = 64

		const apiResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/${number}/${startDateAPI}/${endDateAPI}}/1`)

		if (apiResponse && apiResponse.data) apiResult = apiResponse.data

		if (apiResult) {
			allAreas = apiResult.map((item) => item['Fault Area'])
		} else {
			allAreas = []
		}
	} else {
		allAreas = []
	}

	const areas = [...new Set(allAreas)].sort()

	const getCurrentWeekNumber = () => {
		//define a date object variable with date inside it
		const date1 = new Date()

		//find the year of the entered date
		const oneJan = new Date(date1.getFullYear(), 0, 1)

		// calculating number of days in given year before the given date
		const numberOfDays = Math.floor((date1 - oneJan) / (24 * 60 * 60 * 1000))

		// adding 1 since to current date and returns value starting from 0
		return Math.ceil((date1.getDay() + 1 + numberOfDays) / 7) - 1
	}

	const getFirstMondayOfWeek = (weekNo) => {
		const thisWeek = moment().subtract(1, 'weeks').isoWeek()

		if (weekNo < thisWeek) {
			firstMonday = new Date(new Date().getFullYear() - 1, 0, 4, 0, 0, 0, 0)
		} else {
			firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)
		}

		// let firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)

		while (firstMonday.getDay() != 1) {
			firstMonday.setDate(firstMonday.getDate() - 1)
		}
		if (1 <= weekNo && weekNo <= 52) return firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))

		firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))
		if ((weekNo = 53 && firstMonday.getDate() >= 22 && firstMonday.getDate() <= 28)) return firstMonday
		return null
	}

	// console.log(getCurrentWeekNumber())
	// console.log(new Date(getFirstMondayOfWeek(getCurrentWeekNumber())))

	const thisWeek = new Date(getFirstMondayOfWeek(getCurrentWeekNumber()))

	const lastWeekHelp = moment(thisWeek).subtract(1, 'weeks').format('YYYY, MM, DD, HH:mm:ss')

	// console.log(lastWeekHelp)

	res.render('downloads/main', { division, areas })
}

// download claims
module.exports.downloadClaims = async (req, res) => {
	const { division } = req.params
	const { startDate, endDate } = req.body
	const tPeriods = ['DOA', 'T000', 'T001', 'T002', 'T003']

	if (!startDate || !endDate) {
		req.flash('error', 'Please fill in start date and end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const startDB = new Date(startDate)
	const endDB = new Date(endDate)

	if (startDB >= endDB) {
		req.flash('error', 'Start date must be before end date.')

		res.redirect(`/download/main/${division}`)
		return
	}
	if (startDB < new Date('2021, 01, 01')) {
		req.flash('error', 'Start date must be after 01/01/2020.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const result = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: { $in: tPeriods },
			},
		},
		{
			$addFields: {
				formattedBuild: {
					$dateFromString: {
						dateString: '$buildDate',
						format: '%d/%m/%Y',
					},
				},
				linkedContaindDate: '',
				linkedClosedDate: '',
			},
		},

		{
			$match: {
				formattedBuild: { $gte: startDB, $lte: endDB },
			},
		},
		{
			$addFields: {
				buildMonth: {
					$month: {
						date: '$formattedBuild',
						timezone: 'Europe/London',
					},
				},
				buildYear: {
					$year: {
						date: '$formattedBuild',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$project: {
				buildMonth: 1,
				buildYear: 1,
				wasPickedUp: 1,

				_id: 1,
				abcd: 1,
				area: 1,
				asd: 1,
				buildDate: 1,
				claimDate: 1,
				claimNumber: 1,
				serial: '$name',
				cost: 1,
				country: 1,
				customer: 1,
				dealer: 1,
				description: 1,
				detection: 1,
				division: 1,
				failDate: 1,
				failureCode: '$failedAt',
				failedPart: 1,
				failuremode: 1,
				failuretype: 1,
				fourC: 1,
				hours: 1,
				model: 1,
				notes: 1,
				outcome: 1,
				partSupplier: {
					$cond: [{ $not: ['$partSupplier'] }, '$supplier', '$partSupplier'],
				},
				status: 'Open',
				tPeriod: 1,
				closureDate: 1,
				linked: 1,
				linkedTo: 1,
				linkedContaindDate: 1,
				linkedClosedDate: 1,
				closeNotes: 1,
				contained_date: {
					$substr: ['$containedAt', 0, 10],
				},
				closed_date: {
					$substr: ['$closedAt', 0, 10],
				},

				vetted_date: {
					$substr: ['$vettedAt', 0, 10],
				},
				import_date: {
					$substr: ['$importedDate', 0, 10],
				},

				vettedBy: 1,
				actioned: 1,
			},
		},
		{ $sort: { tPeriod: 1 } },
	])

	// for (let x of result) {
	// 	if (x.partSupplier === '' || x.partSupplier === 'Not assigned') {
	// 		const cabsClaim = await CabsClaim.findOne({
	// 			claimNumber: x.claimNumber,
	// 		})
	// 		if (cabsClaim) {
	// 			x.partSupplier = cabsClaim.supplier
	// 			await Claim.findByIdAndUpdate(x._id, {
	// 				supplier: cabsClaim.supplier,
	// 			})
	// 		}
	// 	}
	// }

	for (let r of result) {
		if (r.linked) {
			let foundClaim = await Claim.findById(r.linkedTo)
			if (foundClaim && foundClaim.claimNumber) r.linkedTo = foundClaim.claimNumber
			if (foundClaim && foundClaim.closedAt) r.linkedClosedDate = new Date(foundClaim.closedAt).toLocaleDateString('en-GB')
			if (foundClaim && foundClaim.containedAt) r.linkedContaindDate = new Date(foundClaim.containedAt).toLocaleDateString('en-GB')
			if (!r.closed_date && r.linkedClosedDate !== '') {
				r.closed_date = r.linkedClosedDate
			}
			if (!r.contained_date && r.linkedContainedDate !== '') {
				r.contained_date = r.linkedContainedDate
			}
		}
		if (!r.closed_date && r.closureDate !== '') {
			r.closed_date = r.closureDate
		}
	}
	for (let r of result) {
		if (r.closed_date) {
			r.status = 'Closed'
		}
		if (r.contained_date && !r.closed_date) {
			r.status = 'Contained'
		}
	}

	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('claims.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./claims.csv', () => {
				fs.unlinkSync('./claims.csv')
			})
		})
	}
}

// download retails
module.exports.downloadRetails = async (req, res) => {
	const { division } = req.params
	const { startDate, endDate } = req.body

	if (!startDate || !endDate) {
		req.flash('error', 'Please fill in start date and end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const startDB = new Date(startDate)
	const endDB = new Date(endDate)

	if (startDB >= endDB) {
		req.flash('error', 'Start date must be before end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const result = await Retail.aggregate([
		{
			$match: {
				division: division,
			},
		},
		{
			$addFields: {
				formattedBuild: {
					$dateFromString: {
						dateString: '$buildDate',
						format: '%d/%m/%Y',
					},
				},
			},
		},
		{
			$match: {
				formattedBuild: { $gte: startDB, $lte: endDB },
			},
		},
		{
			$project: {
				_id: 0,
				serialNumber: 1,
				dealer: 1,
				machineType: 1,
				salesModel: 1,
				engineSerialNumber: 1,
				buildDate: 1,
				soldDate: 1,
				customer: 1,
			},
		},
		{ $sort: { salesModel: 1 } },
	])
	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('build.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./build.csv', () => {
				fs.unlinkSync('./build.csv')
			})
		})
	}
}

// download major escapes
module.exports.downloadMajorEscapes = async (req, res) => {
	const { division } = req.params
	const { startDate, endDate } = req.body

	if (!startDate || !endDate) {
		req.flash('error', 'Please fill in start date and end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const startDB = new Date(startDate)
	const endDB = new Date(endDate)

	if (startDB >= endDB) {
		req.flash('error', 'Start date must be before end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (startDB < new Date('2021, 06, 01')) {
		req.flash('error', 'Start date must be after 01/06/2021.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const result = await Claim.aggregate([
		{
			$match: {
				division: division,
				level: 'Major',
			},
		},
		{
			$addFields: {
				formattedBuild: {
					$dateFromString: {
						dateString: '$buildDate',
						format: '%d/%m/%Y',
					},
				},
			},
		},
		// {
		// 	$match: {
		// 		formattedBuild: { $gte: startDB, $lte: endDB },
		// 	},
		// },
		{
			$project: {
				_id: 0,
				area: 1,
				asd: 1,
				buildDate: 1,
				techweb_number: '$claimNumber',
				serial: '$name',
				failure_mode: 1,
				failure_type: 1,
				dealer: 1,
				description: 1,
				hours: 1,
				model: 1,
				status: 1,
				notes: 1,
				outcome: 1,
				issue_date: {
					$substr: ['$vettedAt', 0, 10],
				},

				issued_by: '$vettedBy',
			},
		},
		{ $sort: { model: 1 } },
	])
	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('majors.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./majors.csv', () => {
				fs.unlinkSync('./majors.csv')
			})
		})
	}
}

// download q smart stage data
module.exports.downloadQSmartStage = async (req, res) => {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
	const { division } = req.params
	const { startDate, startTime, endDate, endTime, stage } = req.body

	if (!startDate || !endDate || !startTime || !endTime || !stage) {
		req.flash('error', 'Please fill in start date and end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const startDB = new Date(`${startDate} ${startTime}`)
	const endDB = new Date(`${endDate} ${endTime}`)

	if (startDB >= endDB) {
		req.flash('error', 'Start date must be before end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const timeDif = endDB - startDB

	if (timeDif > 8035000000) {
		req.flash('error', 'Sorry, maximum range is 3 months.')

		res.redirect(`/download/main/${division}`)
		return
	}

	let startDateAPI = moment(startDB).format('YYYY/MM/DD/HH/mm')
	let endDateAPI = moment(endDB).format('YYYY/MM/DD/HH/mm')

	let number = 0

	if (division === 'LDL') number = 19
	if (division === 'BHL') number = 18
	if (division === 'CP') number = 5
	if (division === 'SD') number = 64

	const apiResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/${number}/${stage}/${startDateAPI}/${endDateAPI}`)

	let apiResult = apiResponse.data

	if (!apiResult) {
		req.flash('error', 'Sorry no data available.')

		res.redirect(`/download/main/${division}`)
		return
	}

	//map through array and modify it
	const result = apiResult.map((item) => {
		const container = {}
		container.build_number = item.buildNo
		container.date_to_stage = moment(item.dateToStage).format('DD/MM/YYYY')
		container.time_to_stage = moment(item.dateToStage).format('HH:mm:ss')
		return container
	})

	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile(`stage${stage}.csv`, csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download(`./stage${stage}.csv`, () => {
				fs.unlinkSync(`./stage${stage}.csv`)
			})
		})
	}
}

// download q smart fault
module.exports.downloadQSmartFaults = async (req, res) => {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
	const { division } = req.params
	const { startDate, startTime, endDate, endTime, area } = req.body

	if (!startDate || !endDate || !startTime || !endTime) {
		req.flash('error', 'Please fill in start date and end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const startDB = new Date(`${startDate} ${startTime}`)
	const endDB = new Date(`${endDate} ${endTime}`)

	if (startDB >= endDB) {
		req.flash('error', 'Start date must be before end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const timeDif = endDB - startDB

	if (timeDif > 8035000000) {
		req.flash('error', 'Sorry, maximum range is 3 months.')

		res.redirect(`/download/main/${division}`)
		return
	}

	let startDateAPI = moment(startDB).format('YYYY/MM/DD/HH/mm')
	let endDateAPI = moment(endDB).format('YYYY/MM/DD/HH/mm')

	let number = 0

	if (division === 'LDL') number = 19
	if (division === 'BHL') number = 18
	if (division === 'CP') number = 5
	if (division === 'SD') number = 64

	const apiResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/${number}/${startDateAPI}/${endDateAPI}}/1`)

	let apiResult = apiResponse.data

	if (!apiResult) {
		req.flash('error', 'Sorry no data available.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (area === 'All Areas') {
		filteredResult = apiResult.filter((fault) => fault['Production Line'] !== 'P712')
	} else {
		filteredResult = apiResult.filter((fault) => fault['Fault Area'] === area && fault['Production Line'] !== 'P712')
	}

	//map through array and modify it
	const result = filteredResult.map((item) => {
		// const container = {}
		item['Fail Date'] = moment(item['Created Date']).format('DD/MM/YYYY')
		item['Fail Time'] = moment(item['Created Date']).format('HH:mm:ss')
		item !== 'Created Date'
		// container.time_to_stage = moment(item.dateToStage).format('HH:mm:ss')
		return item
	})

	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		try {
			fs.writeFile('faults.csv', csv, function (err) {
				if (err) console.log(err.message)
				// console.log('file saved');
				res.download('./faults.csv', () => {
					// fs.unlinkSync('./faults.csv')
				})
			})
		} catch (error) {
			console.log(error)
			res.redirect(`/download/main/${division}`)
			return
		}
	}
}

// download MRI DOA claims
module.exports.downloadMriDOAClaims = async (req, res) => {
	const { division } = req.params
	const { startDate, endDate } = req.body
	const tPeriods = ['DOA']

	if (!startDate || !endDate) {
		req.flash('error', 'Please fill in start date and end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const startDB = new Date(startDate)
	const endDB = new Date(endDate)

	if (startDB >= endDB) {
		req.flash('error', 'Start date must be before end date.')

		res.redirect(`/download/main/${division}`)
		return
	}
	if (startDB < new Date('2022, 01, 01')) {
		req.flash('error', 'Start date must be after 01/01/2022.')

		res.redirect(`/download/main/${division}`)
		return
	}

	await Claim.updateMany({ division: division, fourC: { $ne: 'Yes' }, rag: 'Closed' }, { status: 'Closed' })
	await Claim.updateMany({ division: division, fourC: { $ne: 'Yes' }, rag: 'Contained' }, { status: 'Contained' })

	const retails = await Retail.aggregate([
		{
			$match: {
				division: division,
				soldDate: { $ne: '#' },
			},
		},
		{
			$addFields: {
				formattedBuild: {
					$dateFromString: {
						dateString: '$buildDate',
						format: '%d/%m/%Y',
					},
				},
			},
		},
		{
			$addFields: {
				formattedSold: {
					$dateFromString: {
						dateString: '$soldDate',
						format: '%d/%m/%Y',
					},
				},
			},
		},
		{
			$match: {
				formattedBuild: { $gte: startDB, $lte: endDB },
			},
		},
	])

	const serials = retails.map((r) => r.serialNumber)

	const result = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: { $in: tPeriods },
				name: { $in: serials },
				$or: [
					{
						outcome: { $in: ['Reject', 'Z Code'] },
						actioned: { $ne: 'Yes' },
					},
					{
						outcome: { $nin: ['Reject', 'Z Code'] },
					},
				],
			},
		},
		{
			$addFields: {
				// formattedBuild: {
				// 	$dateFromString: {
				// 		dateString: '$buildDate',
				// 		format: '%d/%m/%Y',
				// 	},
				// },
				linkedContaindDate: '',
				linkedClosedDate: '',
			},
		},

		// {
		// 	$match: {
		// 		formattedBuild: { $gte: startDB, $lte: endDB },
		// 	},
		// },
		// {
		// 	$addFields: {
		// 		buildMonth: {
		// 			$month: {
		// 				date: '$formattedBuild',
		// 				timezone: 'Europe/London',
		// 			},
		// 		},
		// 		buildYear: {
		// 			$year: {
		// 				date: '$formattedBuild',
		// 				timezone: 'Europe/London',
		// 			},
		// 		},
		// 	},
		// },
		{
			$project: {
				_id: 1,
				area: 1,
				asd: 1,
				wasPickedUp: 1,
				buildDate: 1,
				claimDate: 1,
				claimNumber: 1,
				serial: '$name',
				country: 1,
				customer: 1,
				dealer: 1,
				description: 1,
				detection: 1,
				division: 1,
				failDate: 1,
				failureCode: '$failedAt',
				defectCode: '$dCode',
				failedPart: 1,
				failuremode: 1,
				failuretype: 1,
				fourC: 1,
				hours: 1,
				model: 1,
				notes: 1,
				outcome: 1,
				partSupplier: {
					$cond: [{ $not: ['$partSupplier'] }, '$supplier', '$partSupplier'],
				},
				status: 1,
				tPeriod: 1,
				closureDate: 1,
				linked: 1,
				linkedTo: 1,
				linkedContaindDate: 1,
				linkedClosedDate: 1,
				closeNotes: 1,
				contained_date: {
					$substr: ['$containedAt', 0, 10],
				},
				closed_date: {
					$substr: ['$closedAt', 0, 10],
				},

				vetted_date: {
					$substr: ['$vettedAt', 0, 10],
				},
				import_date: {
					$substr: ['$importedDate', 0, 10],
				},

				vettedBy: 1,
				actioned: 1,
			},
		},
		{ $sort: { tPeriod: 1 } },
	])

	for (let r of result) {
		if (r.linked && r.fouC === 'No' && r.status === 'Open') {
			let foundClaim = await Claim.findById(r.linkedTo)
			if (foundClaim && foundClaim.claimNumber) r.linkedTo = foundClaim.claimNumber
			if (foundClaim && foundClaim.closedAt) r.linkedClosedDate = new Date(foundClaim.closedAt).toLocaleDateString('en-GB')
			if (foundClaim && foundClaim.containedAt) r.linkedContaindDate = new Date(foundClaim.containedAt).toLocaleDateString('en-GB')
			if (!r.closed_date && r.linkedClosedDate !== '') {
				r.closed_date = r.linkedClosedDate
			}
			if (!r.contained_date && r.linkedContainedDate !== '') {
				r.contained_date = r.linkedContainedDate
			}
		}
		if (!r.closed_date && r.closureDate !== '') {
			r.closed_date = r.closureDate
		}
	}
	for (let r of result) {
		// if (r.closed_date) {
		// 	r.status = 'Closed'
		// }
		// if (r.contained_date && !r.closed_date) {
		// 	r.status = 'Contained'
		// }
		if (!r.linked && r.fourC === 'No' && r.status === 'Open') {
			r.status = 'Grey'
		}
	}

	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('claims.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./claims.csv', () => {
				fs.unlinkSync('./claims.csv')
			})
		})
	}
}

// download MRI t3 claims
module.exports.downloadMriT3Claims = async (req, res) => {
	const { division } = req.params
	const { startDate, endDate } = req.body
	// const tPeriods = ['T000', 'T001', 'T002', 'T003']
	const tPeriods = ['DOA']

	if (!startDate || !endDate) {
		req.flash('error', 'Please fill in start date and end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const startDB = new Date(startDate)
	const endDB = new Date(endDate)

	if (startDB >= endDB) {
		req.flash('error', 'Start date must be before end date.')

		res.redirect(`/download/main/${division}`)
		return
	}
	if (startDB < new Date('2022, 01, 01')) {
		req.flash('error', 'Start date must be after 01/01/2022.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const dateAddMOnthsFull = (date, num) => {
		let formatetdDate = moment(date).add(num, 'months').format('YYYY, MM, DD, 13:00:00')
		let fullDate = new Date(formatetdDate)
		return fullDate
	}

	const retails = await Retail.aggregate([
		{
			$match: {
				division: division,
				soldDate: { $ne: '#' },
			},
		},
		{
			$addFields: {
				formattedBuild: {
					$dateFromString: {
						dateString: '$buildDate',
						format: '%d/%m/%Y',
					},
				},
			},
		},
		{
			$addFields: {
				buildMonth: {
					$substr: ['$buildDate', 3, 2],
				},
				buildYear: {
					$substr: ['$buildDate', 6, 4],
				},
			},
		},
		{
			$addFields: {
				firstOfBuildMonth: {
					$concat: ['$buildMonth', '/', '01/', '$buildYear'],
				},
			},
		},
		{
			$addFields: {
				formattedFirstOfBuildMonth: {
					$dateFromString: {
						dateString: '$firstOfBuildMonth',
						format: '%d/%m/%Y',
						// timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$addFields: {
				t3ReportDate: new Date(moment('$firstOfBuildMonth').add(5, 'months')),
			},
		},

		{
			$addFields: {
				formattedSold: {
					$dateFromString: {
						dateString: '$soldDate',
						format: '%d/%m/%Y',
					},
				},
			},
		},

		{
			$match: {
				formattedBuild: { $gte: startDB, $lte: endDB },
			},
		},
	])

	const serials = retails.map((r) => r.serialNumber)

	const result = await Claim.aggregate([
		{
			$match: {
				division: division,
				tPeriod: { $in: tPeriods },
				name: { $in: serials },
				$or: [
					{
						outcome: { $in: ['Reject', 'Z Code'] },
						actioned: { $in: ['', 'No'] },
					},
					{
						outcome: { $nin: ['Reject', 'Z Code'] },
					},
				],
			},
		},
		{
			$addFields: {
				linkedContaindDate: '',
				linkedClosedDate: '',
			},
		},

		{
			$project: {
				_id: 1,
				firstOfBuildMonth: 1,
				area: 1,
				asd: 1,
				buildDate: 1,
				claimDate: 1,
				claimNumber: 1,
				serial: '$name',
				country: 1,
				customer: 1,
				dealer: 1,
				description: 1,
				detection: 1,
				division: 1,
				failDate: 1,
				failureCode: '$failedAt',
				defectCode: '$dCode',
				failedPart: 1,
				failuremode: 1,
				failuretype: 1,
				fourC: 1,
				hours: 1,
				model: 1,
				notes: 1,
				outcome: 1,
				partSupplier: {
					$cond: [{ $not: ['$partSupplier'] }, '$supplier', '$partSupplier'],
				},
				status: 1,
				tPeriod: 1,
				closureDate: 1,
				linked: 1,
				linkedTo: 1,
				linkedContaindDate: 1,
				linkedClosedDate: 1,
				closeNotes: 1,
				contained_date: {
					$substr: ['$containedAt', 0, 10],
				},
				closed_date: {
					$substr: ['$closedAt', 0, 10],
				},

				vetted_date: {
					$substr: ['$vettedAt', 0, 10],
				},
				import_date: {
					$substr: ['$importedDate', 0, 10],
				},

				vettedBy: 1,
				actioned: 1,
			},
		},
		{ $sort: { tPeriod: 1 } },
	])

	for (let r of result) {
		if (r.linked && r.fouC === 'No' && r.status === 'Open') {
			let foundClaim = await Claim.findById(r.linkedTo)
			if (foundClaim && foundClaim.claimNumber) r.linkedTo = foundClaim.claimNumber
			if (foundClaim && foundClaim.closedAt) r.linkedClosedDate = new Date(foundClaim.closedAt).toLocaleDateString('en-GB')
			if (foundClaim && foundClaim.containedAt) r.linkedContaindDate = new Date(foundClaim.containedAt).toLocaleDateString('en-GB')
			if (!r.closed_date && r.linkedClosedDate !== '') {
				r.closed_date = r.linkedClosedDate
			}
			if (!r.contained_date && r.linkedContainedDate !== '') {
				r.contained_date = r.linkedContainedDate
			}
		}
		if (!r.closed_date && r.closureDate !== '') {
			r.closed_date = r.closureDate
		}
	}
	for (let r of result) {
		// if (r.closed_date) {
		// 	r.status = 'Closed'
		// }
		// if (r.contained_date && !r.closed_date) {
		// 	r.status = 'Contained'
		// }
		if (!r.linked && r.fourC === 'No' && r.status === 'Open') {
			r.status = 'Grey'
		}
	}

	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('claims.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./claims.csv', () => {
				fs.unlinkSync('./claims.csv')
			})
		})
	}
}

// download paint tcard results
module.exports.downloadPaintCheckResults = async (req, res) => {
	const { division } = req.params
	const { startDate, endDate } = req.body

	if (!startDate || !endDate) {
		req.flash('error', 'Please fill in start date and end date.')

		res.redirect(`/download/main/${division}`)
		return
	}

	const startDB = new Date(startDate)
	const endDB = new Date(endDate)
	endDB.setHours(23, 59, 0)

	if (startDB >= endDB) {
		req.flash('error', 'Start date must be before end date.')

		res.redirect(`/download/main/${division}`)
		return
	}
	if (startDB < new Date('2021, 01, 01')) {
		req.flash('error', 'Start date must be after 01/01/2021.')

		res.redirect(`/download/main/${division}`)
		return
	}

	// const result = await Claim.aggregate([
	// 	{
	// 		$match: {
	// 			division: division,
	// 			tPeriod: { $in: tPeriods },
	// 		},
	// 	},
	// 	{
	// 		$addFields: {
	// 			formattedBuild: {
	// 				$dateFromString: {
	// 					dateString: '$buildDate',
	// 					format: '%d/%m/%Y',
	// 				},
	// 			},
	// 			linkedContaindDate: '',
	// 			linkedClosedDate: '',
	// 		},
	// 	},

	// 	{
	// 		$match: {
	// 			formattedBuild: { $gte: startDB, $lte: endDB },
	// 		},
	// 	},
	// 	{
	// 		$addFields: {
	// 			buildMonth: {
	// 				$month: {
	// 					date: '$formattedBuild',
	// 					timezone: 'Europe/London',
	// 				},
	// 			},
	// 			buildYear: {
	// 				$year: {
	// 					date: '$formattedBuild',
	// 					timezone: 'Europe/London',
	// 				},
	// 			},
	// 		},
	// 	},
	// 	{
	// 		$project: {
	// 			buildMonth: 1,
	// 			buildYear: 1,
	// 			wasPickedUp: 1,

	// 			_id: 1,
	// 			abcd: 1,
	// 			area: 1,
	// 			asd: 1,
	// 			buildDate: 1,
	// 			claimDate: 1,
	// 			claimNumber: 1,
	// 			serial: '$name',
	// 			cost: 1,
	// 			country: 1,
	// 			customer: 1,
	// 			dealer: 1,
	// 			description: 1,
	// 			detection: 1,
	// 			division: 1,
	// 			failDate: 1,
	// 			failureCode: '$failedAt',
	// 			failedPart: 1,
	// 			failuremode: 1,
	// 			failuretype: 1,
	// 			fourC: 1,
	// 			hours: 1,
	// 			model: 1,
	// 			notes: 1,
	// 			outcome: 1,
	// 			partSupplier: {
	// 				$cond: [{ $not: ['$partSupplier'] }, '$supplier', '$partSupplier'],
	// 			},
	// 			status: 'Open',
	// 			tPeriod: 1,
	// 			closureDate: 1,
	// 			linked: 1,
	// 			linkedTo: 1,
	// 			linkedContaindDate: 1,
	// 			linkedClosedDate: 1,
	// 			closeNotes: 1,
	// 			contained_date: {
	// 				$substr: ['$containedAt', 0, 10],
	// 			},
	// 			closed_date: {
	// 				$substr: ['$closedAt', 0, 10],
	// 			},

	// 			vetted_date: {
	// 				$substr: ['$vettedAt', 0, 10],
	// 			},
	// 			import_date: {
	// 				$substr: ['$importedDate', 0, 10],
	// 			},

	// 			vettedBy: 1,
	// 			actioned: 1,
	// 		},
	// 	},
	// 	{ $sort: { tPeriod: 1 } },
	// ])

	// for (let x of result) {
	// 	if (x.partSupplier === '' || x.partSupplier === 'Not assigned') {
	// 		const cabsClaim = await CabsClaim.findOne({
	// 			claimNumber: x.claimNumber,
	// 		})
	// 		if (cabsClaim) {
	// 			x.partSupplier = cabsClaim.supplier
	// 			await Claim.findByIdAndUpdate(x._id, {
	// 				supplier: cabsClaim.supplier,
	// 			})
	// 		}
	// 	}
	// }

	// for (let r of result) {
	// 	if (r.linked) {
	// 		let foundClaim = await Claim.findById(r.linkedTo)
	// 		if (foundClaim && foundClaim.claimNumber) r.linkedTo = foundClaim.claimNumber
	// 		if (foundClaim && foundClaim.closedAt) r.linkedClosedDate = new Date(foundClaim.closedAt).toLocaleDateString('en-GB')
	// 		if (foundClaim && foundClaim.containedAt) r.linkedContaindDate = new Date(foundClaim.containedAt).toLocaleDateString('en-GB')
	// 		if (!r.closed_date && r.linkedClosedDate !== '') {
	// 			r.closed_date = r.linkedClosedDate
	// 		}
	// 		if (!r.contained_date && r.linkedContainedDate !== '') {
	// 			r.contained_date = r.linkedContainedDate
	// 		}
	// 	}
	// 	if (!r.closed_date && r.closureDate !== '') {
	// 		r.closed_date = r.closureDate
	// 	}
	// }
	// for (let r of result) {
	// 	if (r.closed_date) {
	// 		r.status = 'Closed'
	// 	}
	// 	if (r.contained_date && !r.closed_date) {
	// 		r.status = 'Contained'
	// 	}
	// }

	let template = [
		{
			division: 'BHL',
			areas: ['Paint Shop1'],
			correctArea: '7 Bay',
			shiftsPerDay: 1,
			daysPerWeek: 5,
		},
		{
			division: 'BHL',
			areas: ['Paint Shop2'],
			correctArea: '8 Bay',
			shiftsPerDay: 1,
			daysPerWeek: 5,
		},
		{
			division: 'LDL',
			areas: ['Paint Shop'],
			correctArea: 'Paint Plant',
		},
		{
			division: 'CP',
			areas: ['Paint Shop'],
			correctArea: 'Paint Plant',
			shiftsPerDay: 2,
			daysPerWeek: 5,
		},
		{
			division: 'EM',
			areas: ['Paint Shop'],
			correctArea: 'Paint Plant',
			shiftsPerDay: 3,
			daysPerWeek: 3,
		},
		{
			division: 'HP',
			areas: ['Attachments'],
			correctArea: 'Attachments',
		},
		{
			division: 'HP',
			areas: ['Revolver'],
			correctArea: 'Revolver',
		},
		{
			division: 'HP',
			areas: ['Small Parts'],
			correctArea: 'Small Parts',
		},
		{
			division: 'CABS',
			areas: ['Paint Shop'],
			correctArea: 'Paint Plant',
			shiftsPerDay: 2,
			daysPerWeek: 5,
		},
		{
			division: 'HBU',
			areas: ['Paint Plant', 'Auto Paint Line', 'Offline Paint'],
			correctArea: 'Paint Plant',
			shiftsPerDay: 1,
			daysPerWeek: 5,
		},
	]

	const paintAreas = [
		'Attachments',
		'Auto Paint Line',
		'Offline Paint',
		'Paint Plant',
		'Paint Shop',
		'Paint Shop1',
		'Paint Shop2',
		'Revolver',
		'Small Parts',
	]

	const result = await Check.aggregate([
		{
			$match: {
				createdAt: { $gt: startDB, $lt: endDB },
				area: { $in: paintAreas },
				result: { $ne: 'Not Required' },
			},
		},
	])

	const getCurrentWeekNumber = () => {
		//define a date object variable with date inside it
		const date1 = new Date()

		//find the year of the entered date
		const oneJan = new Date(date1.getFullYear(), 0, 1)

		// calculating number of days in given year before the given date
		const numberOfDays = Math.floor((date1 - oneJan) / (24 * 60 * 60 * 1000))

		// adding 1 since to current date and returns value starting from 0
		return Math.ceil((date1.getDay() + 1 + numberOfDays) / 7) - 1
	}

	const getFirstMondayOfWeek = (weekNo) => {
		const thisWeek = moment().subtract(1, 'weeks').isoWeek()

		if (weekNo < thisWeek) {
			firstMonday = new Date(new Date().getFullYear() - 1, 0, 4, 0, 0, 0, 0)
		} else {
			firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)
		}

		// let firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)

		while (firstMonday.getDay() != 1) {
			firstMonday.setDate(firstMonday.getDate() - 1)
		}
		if (1 <= weekNo && weekNo <= 52) return firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))

		firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))
		if ((weekNo = 53 && firstMonday.getDate() >= 22 && firstMonday.getDate() <= 28)) return firstMonday
		return null
	}

	console.log(getCurrentWeekNumber())
	console.log(new Date(getFirstMondayOfWeek(getCurrentWeekNumber())))

	// const allPassedChecks = await Check.find({
	// 	result: 'Passed',
	// })

	// console.log('started')

	// for (let p of allPassedChecks) {
	// 	await check.updateMany(
	// 		{
	// 			result: 'Missed',
	// 			name: p.name,
	// 			division: p.division,
	// 			description: p.description,
	// 			location: p.location,
	// 			area: p.area,
	// 		},
	// 		{
	// 			tCardId: p._id,
	// 		}
	// 	)
	// }
	// console.log('finished')

	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	// console.log('START => ', startDB)
	// console.log('END => ', endDB)
	// console.log('RESULTS => ', result.length)
	// console.log('HBU => ', hbuCount)

	const resultArr = []

	for (let item of template) {
		let division = item.division
		let areasArr = item.areas
		let area = item.correctArea

		let passedPercent = '0%'
		let missedPercent = '0%'

		let allChecks = result
			.filter(
				(i) =>
					//area in areas arr
					areasArr.includes(i.area) &&
					// correct division
					i.division === division
			)
			.map((i) => {
				return JSON.stringify(i.tCardId)
			})

		// for (let x of allChecks) {
		// }

		let totalChecks = [...new Set(allChecks)].length

		let passed = result.filter(
			(i) =>
				//area in areas arr
				areasArr.includes(i.area) &&
				// correct division
				i.division === division &&
				// result passed
				i.result === 'Passed'
		).length

		let contained = result.filter(
			(i) =>
				//area in areas arr
				areasArr.includes(i.area) &&
				// correct division
				i.division === division &&
				// result passed
				i.result === 'Contained'
		).length

		let failed = result.filter(
			(i) =>
				//area in areas arr
				areasArr.includes(i.area) &&
				// correct division
				i.division === division &&
				// result passed
				i.result === 'Failed'
		).length

		let missed = result.filter(
			(i) =>
				//area in areas arr
				areasArr.includes(i.area) &&
				// correct division
				i.division === division &&
				// result passed
				i.result === 'Missed'
		).length

		// let totalChecks = passed + contained + failed + missed

		resultArr.push({
			division,
			area,
			totalChecks,
			passed,
			passedPercent,
			contained,
			failed,
			missed,
			missedPercent,
		})
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(resultArr)

		fs.writeFile('paint-checks.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./paint-checks.csv', () => {
				fs.unlinkSync('./paint-checks.csv')
			})
		})
	}
}

// download claims for victor
module.exports.downloadClaimsVictor = async (req, res) => {
	const tPeriods = ['DOA', 'T000', 'T001', 'T002', 'T003']

	const exemptOutcomes = ['Rejct', 'Z Code']

	const result = await Claim.aggregate([
		{
			$match: {
				// division: division,
				tPeriod: { $in: tPeriods },
				outcome: { $nin: exemptOutcomes },
			},
		},
		{
			$addFields: {
				osd: '',
			},
		},
		{
			$project: {
				_id: 0,
				claimNumber: 1,
				// outcome: 1,
				tPeriod: 1,
				serial: '$name',
				// asd: 1,
				asd: {
					$cond: [{ $eq: ['$outcome', 'Raise on Supplier'] }, 'Supplier', '$asd'],
				},
			},
		},
		{
			$match: {
				// division: division,
				asd: { $in: ['Assembly', 'Supplier', 'Design'] },
			},
		},

		{ $sort: { tPeriod: 1 } },
	])

	// for (let r of result) {
	// 	if (r.linked) {
	// 		let foundClaim = await Claim.findById(r.linkedTo)
	// 		if (foundClaim && foundClaim.claimNumber) r.linkedTo = foundClaim.claimNumber
	// 		if (foundClaim && foundClaim.closedAt) r.linkedClosedDate = new Date(foundClaim.closedAt).toLocaleDateString('en-GB')
	// 		if (foundClaim && foundClaim.containedAt) r.linkedContaindDate = new Date(foundClaim.containedAt).toLocaleDateString('en-GB')
	// 		if (!r.closed_date && r.linkedClosedDate !== '') {
	// 			r.closed_date = r.linkedClosedDate
	// 		}
	// 		if (!r.contained_date && r.linkedContainedDate !== '') {
	// 			r.contained_date = r.linkedContainedDate
	// 		}
	// 	}
	// 	if (!r.closed_date && r.closureDate !== '') {
	// 		r.closed_date = r.closureDate
	// 	}
	// }
	// for (let r of result) {
	// 	if (r.closed_date) {
	// 		r.status = 'Closed'
	// 	}
	// 	if (r.contained_date && !r.closed_date) {
	// 		r.status = 'Contained'
	// 	}
	// }

	// if (result.length < 1) {
	// 	req.flash('error', 'No data found.')

	// 	res.redirect(`/download/main/${division}`)
	// 	return
	// }

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		fs.writeFile('claims.csv', csv, function (err) {
			if (err) console.log(err.message)
			// console.log('file saved');
			res.download('./claims.csv', () => {
				fs.unlinkSync('./claims.csv')
			})
		})
	}
}

// download q smart fault
module.exports.downloadDpuForward = async (req, res) => {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
	const { division } = req.params
	let { stage } = req.body

	if (stage === 'CFC') stage = '20'

	let acceptedStages = ['16', '18', '19', '20']

	if (!acceptedStages.includes(stage)) {
		req.flash('error', 'Sorry no data available.')

		res.redirect(`/download/main/${division}`)
		return
	}

	let startDateAPI = moment().subtract(3, 'months').format('YYYY/MM/DD/HH/mm')
	let endDateAPI = moment().format('YYYY/MM/DD/HH/mm')

	let startDateStagesAPI = moment().subtract(1, 'months').format('YYYY/MM/DD/00/00')
	let endDateStagesAPI = moment().format('YYYY/MM/DD/23/59')

	const apiResponse = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/faults/19/${startDateAPI}/${endDateAPI}}/1`)

	let faults = apiResponse.data

	if (!faults) {
		req.flash('error', 'Sorry no data available.')

		res.redirect(`/download/main/${division}`)
		return
	}

	let filteredFaults = faults.filter(
		(item) => (item['Fault Area'] !== 'Shot & Paint' && item['Fault Code'] !== 'Paintwork') || item['Fault Code'] !== 'Paintwork'
	)

	// //map through array and modify it
	// const result = filteredFaults.map((item) => {
	// 	// const container = {}
	// 	item['Fail Date'] = moment(item['Created Date']).format('DD/MM/YYYY')
	// 	item['Fail Time'] = moment(item['Created Date']).format('HH:mm:ss')
	// 	item !== 'Created Date'
	// 	// container.time_to_stage = moment(item.dateToStage).format('HH:mm:ss')
	// 	return item
	// })

	const stage16Response = await axios(`https://internal.jcb.local/qsmartapi/api/qsmart/stages/19/${stage}/${startDateStagesAPI}/${endDateStagesAPI}`)

	// add hours to timestamp
	Date.prototype.addHours = function (h) {
		this.setHours(this.getHours() + h)
		return this
	}

	let noDate = new Date('2020, 01, 01')

	if (stage16Response && stage16Response.data) {
		stage16Number = stage16Response.data.length
		stage16MacinesData = stage16Response.data
		for (let s of stage16MacinesData) {
			let d = new Date(s.dateToStage)
			let time = d.addHours(0)
			s.dateToStage = time
		}
	} else {
		stage16Number = 0
		stage16MacinesData = []
	}

	for (let s16 of stage16MacinesData) {
		let faultsForward = 0
		let shortagesForward = 0
		let faultsOnthisMachine = filteredFaults.filter((fault) => fault['Build Number'] === s16.buildNo)
		// let areas = ['Cycle Test New', 'Layered PDI Inspection']

		if (faultsOnthisMachine.length > 0) {
			for (let fault of faultsOnthisMachine) {
				if (fault['Fault Code'] !== 'Shortage') {
					if (
						(new Date(fault['Fixed Date']) > new Date(s16.dateToStage) || new Date(fault['Fixed Date']) < noDate) &&
						new Date(fault['Created Date']) < new Date(s16.dateToStage) &&
						fault['Fault Code'] !== 'Scale'
					) {
						// console.log('date to Stage =>', new Date(s16.dateToStage))
						// console.log('failed =>', fault['Created Date'])
						// console.log('fixed =>', new Date(fault['Fixed Date']))
						// console.log('Zone =>', fault.Zone)
						// console.log('------------')
						faultsForward++
					}
				}
				if (fault['Fault Code'] === 'Shortage') {
					if (
						(new Date(fault['Fixed Date']) > new Date(s16.dateToStage) || new Date(fault['Fixed Date']) < noDate) &&
						new Date(fault['Created Date']) < new Date(s16.dateToStage) &&
						fault['Fault Code'] !== 'Scale'
					) {
						shortagesForward++
					}
				}
			}
		}
		s16.faultsForward = faultsForward
		s16.shortagesForward = shortagesForward

		s16.date = moment(s16.dateToStage).format('DD/MM/YYYY')
	}

	result = []

	stage16MacinesData.forEach(function (a) {
		if (!this[a.date]) {
			this[a.date] = { date: a.date, faultsForward: 0, shortagesForward: 0, mahcines: 0 }
			result.push(this[a.date])
		}
		this[a.date].faultsForward += a.faultsForward
		this[a.date].shortagesForward += a.shortagesForward
		this[a.date].mahcines += 1
	}, Object.create(null))

	// console.log(result)

	if (result.length < 1) {
		req.flash('error', 'No data found.')

		res.redirect(`/download/main/${division}`)
		return
	}

	if (result.length > 0) {
		const json2csvParser = new Json2csvParser({})
		const csv = json2csvParser.parse(result)

		try {
			fs.writeFile(`faults_forward_to_stage_${stage}.csv`, csv, function (err) {
				if (err) console.log(err.message)
				// console.log('file saved');
				res.download(`./faults_forward_to_stage_${stage}.csv`, () => {
					// fs.unlinkSync('./faults.csv')
				})
			})
		} catch (error) {
			console.log(error)
			res.redirect(`/download/main/${division}`)
			return
		}
	}
}
