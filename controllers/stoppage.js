// import the stoppage & the machine
const Stoppage = require('../models/stoppage')
const Shift = require('../models/shift')
const Machine = require('../models/machine')
const Notification = require('../models/notification')
const MachineUser = require('../models/machineUser')

const nodemailer = require('nodemailer')
const moment = require('moment')
// use env data
require('dotenv').config()
let timeoutId = []

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

const capitalizeFirstLetterOfAllWords = (string) => {
	//    ^ matches the beginning of the string.
	//    w matches any word character.
	//    {1} takes only the first character.
	//     Thus, ^\w{1} matches the first letter of the word.
	//    | works like the boolean OR. It matches the expression after and before the |.
	//    \s+ matches any amount of whitespace between the words (for example spaces, tabs, or line breaks).

	// first convert to all lowercase
	let lowerString = string.toLowerCase()

	return lowerString.replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase())
}
// route to create new stoppage
module.exports.createNew = async (req, res) => {
	// disabling certificate verification to enable sms to be sent
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

	// get the machine id from the url
	const { id } = req.params
	// find the machine by the id
	const machine = await Machine.findById(id)
	// if for some reason the is an error or cant find that machine
	if (!machine) {
		req.flash('error', 'Cannot find that machine')
		res.redirect(`/equipment-monitoring/machine/${id}`)
		return
	}

	if (machine.linkedTo) {
		let linkedMachineId = machine.linkedTo
		let linkedMachine = await Machine.findOne(linkedMachineId)

		if (linkedMachine && linkedMachine.state !== 'Running') {
			// console.log(linkedMachine.machineName)
			// console.log(linkedMachine.state)
			req.flash('error', `Stoppage currently on linked machine - ${linkedMachine.machineName}`)
			res.redirect(`/equipment-monitoring/machine/${id}`)
			return
		}
	}
	if (machine.state === 'Running') {
		// remove the ms from the time now
		let theDate = new Date()
		theDate.setMilliseconds(0)

		// get the current hour of the stoppage
		let stoppageDate = new Date()
		let stoppageHour = stoppageDate.getHours()

		// declare what key value pairs in the stoppage object
		const stoppage = new Stoppage(req.body.stoppage)

		// if (req.body.stoppage.type === 'Unknown Stoppage or Breakdown - Request Team Leader') {
		// 	stoppage.type = 'Unplanned Stoppage'
		// 	stoppage.concern = 'Unknown'
		// 	// stoppage.escalateTo = 'Setter'
		// 	stoppage.level = ['Team Leader']
		// }
		// if (req.body.stoppage.type === 'Unknown Stoppage or Breakdown - Request Team Leader/Setter') {
		// 	stoppage.type = 'Unplanned Stoppage'
		// 	stoppage.concern = 'Unknown'
		// 	// stoppage.escalateTo = 'Maintenance'
		// 	stoppage.level = ['Team Leader', 'Setter']
		// 	// stoppage.level.push('Setter')
		// }
		if (req.body.stoppage.type === 'Unknown Stoppage or Breakdown - Request Team Leader/Setter/Maintenance') {
			stoppage.type = 'Breakdown'
			stoppage.concern = 'Unknown'
			stoppage.level = ['Team Leader', 'Setter', 'Maintenance', 'Manager']
			// stoppage.level.push('Maintenance')

			const teamLeaderEmails = await MachineUser.distinct('email', {
				$or: [{ division: 'Group Operations' }, { division: machine.shortBu }],
				role: { $in: ['Team Leader', 'Setter', 'Maintenance'] },
			})

			// const teamLeaderEmails = ['Ali.Ebrahimi@jcb.com']

			const transporter = nodemailer.createTransport({
				host: process.env.HOST, //Host
				port: process.env.PORT, // Port
				tls: {
					rejectUnauthorized: false,
				},
			})

			let stopDate = moment().format('DD/MM/YYYY')
			let stopTime = moment().format('HH:mm')

			let mailOptions = {
				from: 'JCB-Equipment.LiveLink@jcb.com',
				to: teamLeaderEmails,
				subject: `*${machine.machineName} has a unknown breakdown*`,
				html:
					`<p>${machine.machineName} has an unknown breakdown</p>` +
					`<p>the Breakdown was logged at ${stopTime} on ${stopDate}</p>` +
					`<p>Assistance is required from a Team Leader, Setter & Maintenance</p>` +
					`<p>Thanks</p>` +
					`<p>JCB Equipment LiveLink</p>`,
			}
			// send the email
			// transporter.sendMail(mailOptions, () => {})
		}
		stoppage.startTime = theDate
		stoppage.hour = stoppageHour
		stoppage.shortBu = machine.shortBu
		stoppage.shiftStart = machine.shiftStart
		stoppage.shiftEnd = machine.shiftEnd

		const linkedMachineId = machine.linkedTo

		const linkedMachine = await Machine.findOne(linkedMachineId)

		if (linkedMachineId) {
			linkedMachine.state = stoppage.type
			linkedMachine.stoppageStartTime = theDate
			linkedMachine.stoppages.push(stoppage)
			await linkedMachine.save()
		}

		// add the machine BU to the stoppage

		machine.state = stoppage.type
		machine.stoppageStartTime = theDate

		// save the new stoppage & updates to the machine to the db
		machine.stoppages.push(stoppage)

		await stoppage.save()
		await machine.save()

		// console.log(stoppage)
		// console.log(machine)

		// const AWS = require('aws-sdk')

		// AWS.config.update({
		// 	accessKeyId     : process.env.AWS_ACCESS_KEY_ID,
		// 	secretAccessKey : process.env.AWS_SECRET_ACCESS_KEY,
		// 	region          : process.env.AWS_REGION,
		// })

		// let params = {
		// 	Message           : `${machine.machineName} is down. ${stoppage.type}`,
		// 	PhoneNumber       : process.env.AWS_NUMBER,
		// 	MessageAttributes : {
		// 		'AWS.SNS.SMS.SenderID' : {
		// 			DataType    : 'String',
		// 			StringValue : 'Breakdown',
		// 		},
		// 	},
		// }

		// var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' })
		// 	.publish(params)
		// 	.promise()

		// publishTextPromise
		// 	.then(function(data) {
		// 		res.end(JSON.stringify({ MessageID: data.MessageId }))
		// 	})
		// 	.catch(function(err) {
		// 		res.end(JSON.stringify({ Error: err }))
		// 		console.log(err)
		// 	})

		function msToTime(duration) {
			if (duration === 60000) {
				return duration / 60000 + ' ' + 'minute'
			} else {
				return duration / 60000 + ' ' + 'minutes'
			}
		}

		// start
		//Function to_hms_string stands for "hour-minute-second" string. First name that came up.
		function to_hms_string(timearr) {
			let minutes = 60 + timearr[1]
			let hours = ''
			if (Math.abs(timearr[0]) < 10) {
				hours = '0'
			}
			hours = timearr[0] < 0 ? '-' + hours + Math.abs(timearr[0]) : hours + timearr[0]
			return new Date().setHours(hours, minutes, 0, 0)
		}

		// end
		const notifications = await Notification.find({
			ids: machine._id,
			types: stoppage.type,
			active: true,
		})

		for (let n of notifications) {
			let start_time = [+n.start.substring(0, 2), +n.start.substring(3)]
			let end_time = [+n.end.substring(0, 2), +n.end.substring(3)]
			// the two start times as an array of hours/minutes values.
			let dateObj = new Date()
			let now = [dateObj.getHours(), dateObj.getMinutes()] //Gets the current Hours/Minutes
			if (start_time[0] === end_time[0] && start_time[1] === end_time[1]) {
				start_time[0] -= 24
				end_time[0] += 24
			} else if (end_time[0] < start_time[0] && now[0] < start_time[0]) {
				start_time[0] -= 24
			} else if (start_time[0] > end_time[0]) {
				end_time[0] += 24
			}

			let start_string = new Date(to_hms_string(start_time)) //the start string converted to a date format. Made comparisons easier.
			let end_string = new Date(to_hms_string(end_time)) //See Above
			let now_string = new Date(to_hms_string(now)) //Above

			// console.log('START =>', start_string)
			// console.log('END =>', end_string)
			// console.log('NOW =>', now_string)

			if (now_string > start_string && now_string < end_string) {
				let stopDate = moment(stoppage.createdAt).format('DD/MM/YYYY')
				let stopTime = moment(stoppage.createdAt).format('HH:mm')
				let theEmails = n.emails
				// let theEmails = ['ali.ebrahimi@jcb.com']
				let time = n.time

				const transporter = nodemailer.createTransport({
					host: process.env.HOST, //Host
					port: process.env.PORT, // Port
					tls: {
						rejectUnauthorized: false,
					},
				})

				let mailOptions = {
					from: 'JCB-Equipment.LiveLink@jcb.com',
					to: theEmails,
					subject: `*${stoppage.type} - ${machine.machineName} - ${stoppage.concern} - ${stopTime}*`,
					text:
						`*${stoppage.type} on ${machine.machineName}* \n\n` +
						`The reason is ${stoppage.concern}\n\n` +
						`The stoppage started at ${stopTime} on ${stopDate} \n\n` +
						'Thanks.\n' +
						'JCB Equipment LiveLink\n',
				}

				timeoutId[machine._id] = setTimeout(async function () {
					const currentMachine = await Machine.findOne({
						_id: machine._id,
					}).populate({
						path: 'stoppages',
						select: 'concern',
						options: { sort: { _id: -1 }, limit: 1 },
					})
					// console.log(currentMachine.stoppages[0].concern)
					// console.log(stoppage.concern)
					// console.log(stoppage.type)
					if (currentMachine.state === stoppage.type && stoppage.concern === currentMachine.stoppages[0].concern) {
						// send the email
						// transporter.sendMail(mailOptions, () => {})
					}
				}, time)
			}
		}
	} else {
		req.flash('error', 'Andon Already Raised')
	}
	res.redirect(`/equipment-monitoring/machine/${id}`)
}

module.exports.edit = async (req, res) => {
	const { sId, mId } = req.params

	let timeStampNow = moment().format('DD/MM/YYYY - HH:mm:ss')

	const stoppage = await Stoppage.findOne({
		_id: sId,
		open: true,
	})
	const prevStoppage = await Stoppage.findOne({
		_id: sId,
		open: true,
	})
	const machine = await Machine.findOne({
		_id: mId,
	})

	if (!machine || !stoppage) {
		req.flash('error', 'Something went wrong')
		res.redirect('/equipment-monitoring/operations')

		return
	}

	const linkedMachineId = machine.linkedTo

	const linkedMachine = await Machine.findOne(linkedMachineId)

	// console.log(req.body)
	// return

	const foundUser = await MachineUser.findOne({
		clockNumber: req.body.clockNumber,
		active: true,
		// division    : { $in: [ machine.shortBu, 'Group Operations' ] },
	})

	function to_hms_string(timearr) {
		let minutes = 60 + timearr[1]
		let hours = ''
		if (Math.abs(timearr[0]) < 10) {
			hours = '0'
		}
		hours = timearr[0] < 0 ? '-' + hours + Math.abs(timearr[0]) : hours + timearr[0]
		return new Date().setHours(hours, minutes, 0, 0)
	}

	if (stoppage) {
		if (stoppage.level.length > 0) {
			if (!foundUser) {
				req.flash('error', 'Sorry clock number not recognised, please try again')
				res.redirect(`/equipment-monitoring/machine/${mId}`)
				return
			}

			// console.log('USER DIV => ', foundUser.division)
			// console.log('USER ROLE => ', foundUser.role)
			// console.log('STOPPAGE DIV => ', stoppage.shortBu)
			// console.log('STOPPAGE LEVEL => ', stoppage.level)

			if (foundUser.division !== 'Group Operations') {
				if (foundUser.division !== stoppage.shortBu || !stoppage.level.includes(foundUser.role)) {
					req.flash('error', 'Sorry you do not have permission to do that.')
					res.redirect(`/equipment-monitoring/machine/${mId}`)
					return
				}
			}

			// clock number needed to update stoppage

			let data = {}
			const userName = capitalizeFirstLetterOfAllWords(foundUser.firstName) + ' ' + capitalizeFirstLetterOfAllWords(foundUser.lastName)
			const userId = foundUser._id
			const userRole = foundUser.role

			let notifications = await Notification.find({
				ids: machine._id,
				types: stoppage.type,
				active: true,
			})

			if (req.body.stoppage.action === 'Update Stoppage') {
				if (req.body.stoppage.type === 'Unknown Stoppage or Breakdown - Request Team Leader/Setter/Maintenance') {
					stoppage.type = 'Breakdown'
					stoppage.concern = 'Unknown'
					stoppage.level = ['Team Leader', 'Setter', 'Maintenance', 'Manager']
					// stoppage.level.push('Maintenance')
					const teamLeaderEmails = await MachineUser.distinct('email', {
						$or: [{ division: 'Group Operations' }, { division: machine.shortBu }],
						role: { $in: ['Team Leader', 'Setter', 'Maintenance'] },
					})

					// const teamLeaderEmails = ['Ali.Ebrahimi@jcb.com']

					const transporter = nodemailer.createTransport({
						host: process.env.HOST, //Host
						port: process.env.PORT, // Port
						tls: {
							rejectUnauthorized: false,
						},
					})

					let stopDate = moment().format('DD/MM/YYYY')
					let stopTime = moment().format('HH:mm')

					let mailOptions = {
						from: 'JCB-Equipment.LiveLink@jcb.com',
						to: teamLeaderEmails,
						subject: `*${machine.machineName} has a unknown breakdown*`,
						html:
							`<p>${machine.machineName} has an unknown breakdown</p>` +
							`<p>the Breakdown was logged at ${stopTime} on ${stopDate}</p>` +
							`<p>Assistance is required from a Team Leader, Setter & Maintenance</p>` +
							`<p>Thanks</p>` +
							`<p>JCB Equipment LiveLink</p>`,
					}
					// send the email
					// transporter.sendMail(mailOptions, () => {})

					data = {
						updatedBy: userName,
						role: userRole,
						updatedById: userId,
						updatedAt: Date.now(),
						concernUpdatedFrom: prevStoppage.concern,
						concernUpdatedTo: req.body.stoppage.concern || 'Unknown',
						typeUpdatedFrom: prevStoppage.type,
						typeUpdatedTo: req.body.stoppage.type,
					}
				} else {
					stoppage.concern = req.body.stoppage.concern
					stoppage.type = req.body.stoppage.type
					stoppage.detail = req.body.stoppage.detail
					stoppage.level = []
					data = {
						updatedBy: userName,
						role: userRole,
						updatedById: userId,
						updatedAt: Date.now(),
						concernUpdatedFrom: prevStoppage.concern,
						concernUpdatedTo: req.body.stoppage.concern || 'Unknown',
						typeUpdatedFrom: prevStoppage.type,
						typeUpdatedTo: req.body.stoppage.type,
					}
				}

				stoppage.updates.push(data)

				await stoppage.save()
			}
			// clock number needed to close stoppage
			if (req.body.stoppage.action === 'End Stoppage') {
				// remove ms from the time now
				let theDate = new Date()
				theDate.setMilliseconds(0)

				let totalTime = theDate - stoppage.startTime
				stoppage.totalTime = totalTime
				stoppage.endTime = theDate
				stoppage.closedAt = Date.now()
				stoppage.open = false
				stoppage.closeNotes = req.body.stoppage.closeNotes
				stoppage.closedById = userId
				stoppage.closedBy = userName
				await stoppage.save()

				if (linkedMachineId) {
					await Machine.findByIdAndUpdate(linkedMachineId, {
						// change the machine state back to running
						state: 'Running',
					})
				}

				//  find the correct stoppage by its id
				await Machine.findByIdAndUpdate(mId, {
					// change the machine state back to running
					state: 'Running',
				})
			}

			for (let n of notifications) {
				let start_time = [+n.start.substring(0, 2), +n.start.substring(3)]
				let end_time = [+n.end.substring(0, 2), +n.end.substring(3)]
				// the two start times as an array of hours/minutes values.
				let dateObj = new Date()
				let now = [dateObj.getHours(), dateObj.getMinutes()] //Gets the current Hours/Minutes
				if (start_time[0] === end_time[0] && start_time[1] === end_time[1]) {
					start_time[0] -= 24
					end_time[0] += 24
				} else if (end_time[0] < start_time[0] && now[0] < start_time[0]) {
					start_time[0] -= 24
				} else if (start_time[0] > end_time[0]) {
					end_time[0] += 24
				}

				let start_string = new Date(to_hms_string(start_time)) //the start string converted to a date format. Made comparisons easier.
				let end_string = new Date(to_hms_string(end_time)) //See Above
				let now_string = new Date(to_hms_string(now)) //Above

				if (now_string > start_string && now_string < end_string) {
					let stopDate = moment(stoppage.createdAt).format('DD/MM/YYYY')
					let stopTime = moment(stoppage.createdAt).format('HH:mm')
					let theEmails = n.emails
					// let theEma.ils = ['ali.ebrahimi@jcb.com']

					const transporter = nodemailer.createTransport({
						host: process.env.HOST, //Host
						port: process.env.PORT, // Port
						tls: {
							rejectUnauthorized: false,
						},
					})

					let mailOptions = {
						from: 'JCB-Equipment.LiveLink@jcb.com',
						to: theEmails,
						subject: `*${machine.machineName} - now running again*`,
						text:
							`*${machine.machineName} is now running again* \n\n` +
							`The stoppage was ended on ${timeStampNow} by ${userName} \n\n` +
							`The action taken to end the stoppage was:\n\n` +
							`${req.body.stoppage.closeNotes}\n\n` +
							'Thanks.\n' +
							'JCB Equipment LiveLink\n',
					}
					// send the email
					// transporter.sendMail(mailOptions, () => {})
				}
			}
		} else {
			// no clock number needed to update check

			if (req.body.stoppage.action === 'Update Stoppage') {
				stoppage.concern = req.body.stoppage.concern
				stoppage.type = req.body.stoppage.type
				stoppage.detail = req.body.stoppage.detail
				stoppage.level = []

				if (req.body.stoppage.type === 'Unknown Stoppage or Breakdown - Request Team Leader/Setter/Maintenance') {
					stoppage.type = 'Breakdown'
					stoppage.concern = 'Unknown'
					// stoppage.escalateTo = ''
					stoppage.level = ['Team Leader', 'Setter', 'Maintenance', 'Manager']
					// stoppage.level.push('Maintenance')]
					const teamLeaderEmails = await MachineUser.distinct('email', {
						$or: [{ division: 'Group Operations' }, { division: machine.shortBu }],
						role: { $in: ['Team Leader', 'Setter', 'Maintenance'] },
					})

					// const teamLeaderEmails = ['Ali.Ebrahimi@jcb.com']

					const transporter = nodemailer.createTransport({
						host: process.env.HOST, //Host
						port: process.env.PORT, // Port
						tls: {
							rejectUnauthorized: false,
						},
					})

					let stopDate = moment().format('DD/MM/YYYY')
					let stopTime = moment().format('HH:mm')

					let mailOptions = {
						from: 'JCB-Equipment.LiveLink@jcb.com',
						to: teamLeaderEmails,
						subject: `*${machine.machineName} has a unknown breakdown*`,
						html:
							`<p>${machine.machineName} has an unknown breakdown</p>` +
							`<p>the Breakdown was logged at ${stopTime} on ${stopDate}</p>` +
							`<p>Assistance is required from a Team Leader, Setter & Maintenance</p>` +
							`<p>Thanks</p>` +
							`<p>JCB Equipment LiveLink</p>`,
					}
					// send the email
					// transporter.sendMail(mailOptions, () => {})
				}

				if (linkedMachineId) {
					linkedMachine.state = stoppage.type
					await linkedMachine.save()
				}

				machine.state = stoppage.type
				await stoppage.save()
				await machine.save()
			}
			// no clock number needed to end stoppage
			if (req.body.stoppage.action === 'End Stoppage') {
				// remove ms from the time now
				let theDate = new Date()
				theDate.setMilliseconds(0)
				let totalTime = theDate - stoppage.startTime
				stoppage.totalTime = totalTime
				stoppage.endTime = theDate
				stoppage.open = false
				stoppage.level = []
				stoppage.closeNotes = req.body.stoppage.closeNotes
				await stoppage.save()

				if (linkedMachineId) {
					await Machine.findByIdAndUpdate(linkedMachineId, {
						// change the machine state back to running
						state: 'Running',
					})
				}
				//  find the correct stoppage by its id
				await Machine.findByIdAndUpdate(mId, {
					// change the machine state back to running
					state: 'Running',
				})

				let notifications = await Notification.find({
					ids: machine._id,
					types: stoppage.type,
					active: true,
				})

				for (let n of notifications) {
					let start_time = [+n.start.substring(0, 2), +n.start.substring(3)]
					let end_time = [+n.end.substring(0, 2), +n.end.substring(3)]
					// the two start times as an array of hours/minutes values.
					let dateObj = new Date()
					let now = [dateObj.getHours(), dateObj.getMinutes()] //Gets the current Hours/Minutes
					if (start_time[0] === end_time[0] && start_time[1] === end_time[1]) {
						start_time[0] -= 24
						end_time[0] += 24
					} else if (end_time[0] < start_time[0] && now[0] < start_time[0]) {
						start_time[0] -= 24
					} else if (start_time[0] > end_time[0]) {
						end_time[0] += 24
					}

					let start_string = new Date(to_hms_string(start_time)) //the start string converted to a date format. Made comparisons easier.
					let end_string = new Date(to_hms_string(end_time)) //See Above
					let now_string = new Date(to_hms_string(now)) //Above

					if (now_string > start_string && now_string < end_string) {
						let stopDate = moment(stoppage.createdAt).format('DD/MM/YYYY')
						let stopTime = moment(stoppage.createdAt).format('HH:mm')
						let theEmails = n.emails
						// let theEmails = ['ali.ebrahimi@jcb.com']

						const transporter = nodemailer.createTransport({
							host: process.env.HOST, //Host
							port: process.env.PORT, // Port
							tls: {
								rejectUnauthorized: false,
							},
						})

						let mailOptions = {
							from: 'JCB-Equipment.LiveLink@jcb.com',
							to: theEmails,
							subject: `*${machine.machineName} - now running again*`,
							text:
								`*${machine.machineName} is now running again* \n\n` +
								`The stoppage did not require a clock number to close it \n\n` +
								`The action taken to end the stoppage was:\n\n` +
								`${req.body.stoppage.closeNotes}\n\n` +
								'Thanks.\n' +
								'JCB Equipment LiveLink\n',
						}
						// send the email
						// transporter.sendMail(mailOptions, () => {})

						// console.log(req.body)
					}
				}
			}
		}
	} else {
		req.flash('error', 'Andon Already Closed')
	}
	//}

	res.redirect(`/equipment-monitoring/machine/${mId}`)
}

module.exports.inProgram = async (req, res) => {
	const { mId } = req.params
	let theDate = new Date()
	theDate.setMilliseconds(0)

	const donorMachine = await Machine.findOne({
		_id: mId,
	})

	if (!donorMachine) {
		req.flash('error', 'Something went wrong, please try again')
		res.redirect(`/equipment-monitoring/machine/${mId}`)

		return
	}

	const foundUser = await MachineUser.findOne({
		clockNumber: req.body.clockNumber,
		active: true,
		$or: [{ division: 'Group Operations' }, { division: donorMachine.shortBu, role: 'Setter' }],
	})

	if (!foundUser) {
		req.flash('error', 'Sorry clock number not recognised, please try again')
		res.redirect(`/equipment-monitoring/machine/${mId}`)

		return
	}

	const setterName = capitalizeFirstLetterOfAllWords(foundUser.firstName) + ' ' + capitalizeFirstLetterOfAllWords(foundUser.lastName)

	//  find the correct stoppage by its id
	let machine = await Machine.findByIdAndUpdate(
		mId,
		{
			programming: true,
			inShift: false,
			state: 'Programming',
			// runningTime       : 0,
			// touchTime         : 0,
			// eff               : 0,
			// teff              : 0,
			lastProgrammeNote: req.body.notes,
			lastProgrammeDate: Date.now(),
			$push: {
				programmingNotes: {
					body: req.body.notes,
					createdAt: Date.now(),
				},
			},
			$push: {
				programmingLog: {
					createdAt: new Date(),
					createdBy: setterName,
					inOut: 'In',
					detail: req.body.notes,
					shiftStart: donorMachine.shiftStart,
					shiftEnd: donorMachine.shiftEnd,
				},
			},
		},
		{ new: true }
	)
		.populate({
			path: 'stoppages',
			match: { open: true },
		})
		.exec()

	if (machine.stoppages.length > 0) {
		let totalTime = theDate - machine.stoppages[0].startTime

		await Stoppage.findOneAndUpdate({ vin: machine.vin, open: true }, { $set: { endTime: theDate, open: false, totalTime: totalTime } })
	}

	let shifts = await Shift.updateMany(
		{ vin: machine.vin },
		{
			active: false,
		}
	)

	let theEmails = [
		'Jon.Bell@jcb.com',
		'Marcus.Hanson@jcb.com',
		'Ali.Ebrahimi@jcb.com',
		// 	'Josh.Wilcox@jcb.com',
	]

	const transporter = nodemailer.createTransport({
		host: process.env.HOST, //Host
		port: process.env.PORT, // Port
		tls: {
			rejectUnauthorized: false,
		},
	})

	let stopDate = moment().format('DD/MM/YYYY')
	let stopTime = moment().format('HH:mm')

	let mailOptions = {
		from: 'JCB-Equipment.LiveLink@jcb.com',
		to: theEmails,
		subject: `*${machine.machineName} in ${machine.businessUnit} put into programming mode*`,
		text:
			`${machine.machineName} in ${machine.businessUnit} put into programming mode by ${setterName} \n\n` +
			`It was put in programming mode at ${stopTime} on ${stopDate} \n\n` +
			`The reason given is:\n\n` +
			`${req.body.notes}\n\n` +
			'Thanks.\n' +
			'JCB Equipment LiveLink\n',
	}
	// send the email
	// transporter.sendMail(mailOptions, () => {})

	res.redirect(`/equipment-monitoring/machine/${mId}`)
}
module.exports.outProgram = async (req, res) => {
	const { mId } = req.params

	const donorMachine = await Machine.findOne({
		_id: mId,
	})

	if (!donorMachine) {
		req.flash('error', 'Something went wrong, please try again')
		res.redirect(`/equipment-monitoring/machine/${mId}`)

		return
	}

	const foundUser = await MachineUser.findOne({
		clockNumber: req.body.clockNumber,
		active: true,
		$or: [{ division: 'Group Operations' }, { division: donorMachine.shortBu, role: 'Setter' }],
	})

	if (!foundUser) {
		req.flash('error', 'Sorry clock number not recognised, please try again')
		res.redirect(`/equipment-monitoring/machine/${mId}`)

		return
	}

	const setterName = capitalizeFirstLetterOfAllWords(foundUser.firstName) + ' ' + capitalizeFirstLetterOfAllWords(foundUser.lastName)

	//  find the correct stoppage by its id
	const machine = await Machine.findByIdAndUpdate(
		mId,
		{
			// change the machine state back to running
			programming: false,
			lastProgrammeDate: null,
			lastProgrammeNote: null,
			inShift: false,
			state: 'Running',
			$push: {
				programmingLog: {
					createdAt: new Date(),
					createdBy: setterName,
					inOut: 'Out',
					// detail: req.body.notes,
				},
			},
			$push: {
				programmingLog: {
					createdAt: new Date(),
					createdBy: setterName,
					inOut: 'Out',
					detail: req.body.notes,
					shiftStart: donorMachine.shiftStart,
					shiftEnd: donorMachine.shiftEnd,
				},
			},
		},
		{ new: true }
	)

	let shifts = await Shift.updateMany(
		{ vin: machine.vin },
		{
			active: true,
		}
	)

	let theEmails = [
		'Jon.Bell@jcb.com',
		'Marcus.Hanson@jcb.com',
		'Ali.Ebrahimi@jcb.com',
		// 	'Josh.Wilcox@jcb.com',
	]

	const transporter = nodemailer.createTransport({
		host: process.env.HOST, //Host
		port: process.env.PORT, // Port
		tls: {
			rejectUnauthorized: false,
		},
	})

	let stopDate = moment().format('DD/MM/YYYY')
	let stopTime = moment().format('HH:mm')

	let mailOptions = {
		from: 'JCB-Equipment.LiveLink@jcb.com',
		to: theEmails,
		subject: `*${machine.machineName} in ${machine.businessUnit} taken out of programming mode*`,
		text:
			`${machine.machineName} in ${machine.businessUnit} has been taken out of programming mode by ${foundUser.firstName} ${foundUser.lastName}\n\n` +
			`It was taken out of programming mode at ${stopTime} on ${stopDate} \n\n` +
			'Thanks.\n' +
			'JCB Equipment LiveLink\n',
	}
	// send the email
	// transporter.sendMail(mailOptions, () => {})
	res.redirect(`/equipment-monitoring/machine/${mId}`)
}
