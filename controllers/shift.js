const Machine = require('../models/machine')
const Shift = require('../models/shift')
const User = require('../models/user')
const MachineUser = require('../models/machineUser')
const moment = require('moment')

module.exports.create = async (req, res) => {
	const machine = await Machine.findById(req.params.id)

	const userId = req.user._id

	const foundUser = await MachineUser.findOne({
		_id: userId,
		active: true,
	})

	if (!foundUser) {
		req.flash('error', 'Sorry clock number not recognised, please try again')
		res.redirect(`/equipment-monitoring/show/${machine.shortBu}/${machine._id}`)
		return
	}

	if (foundUser.division !== 'Group Operations') {
		if (foundUser.division !== machine.shortBu) {
			req.flash('error', 'Sorry you do not have permission to do that.')
			res.redirect(`/equipment-monitoring/show/${machine.shortBu}/${machine._id}`)

			return
		}
	}
	const shift = new Shift(req.body.shift)
	let shiftType = 'days'
	let timeNow = moment().format('YYYY-MM-DDTHH:mm:ss')
	let inShift = false
	let dayNow = moment().format('dddd').toLowerCase()

	const startHour = +shift.startTimeString.substring(0, 2)
	const endHour = +shift.endTimeString.substring(0, 2)

	let startTime = moment().format(`YYYY-MM-DDT${shift.startTimeString}:00`)
	let endTime = moment().format(`YYYY-MM-DDT${shift.endTimeString}:00`)
	console.log(shift)
	const startDateTime = new Date(startTime)
	const endDateTime = new Date(endTime)

	if (endDateTime < startDateTime) endDateTime.setDate(endDateTime.getDate() + 1)

	const totalShiftTime = endDateTime - startDateTime

	console.log('START => ', startDateTime)
	console.log('END => ', endDateTime)

	if (shift.monday || shift.tuesday || shift.wednesday || shift.thursday)
		if (totalShiftTime < 28800000) {
			req.flash('error', ' Monday - Thurday shifts must be at least 8 hours.')
			res.redirect(`/equipment-monitoring/show/${machine.shortBu}/${machine._id}`)

			return
		}
	if (shift.friday || shift.saturday || shift.sunday)
		if (totalShiftTime < 14400000) {
			req.flash('error', 'Friday, Saturday or Sunday shifts must be at least 4 hours.')
			res.redirect(`/equipment-monitoring/show/${machine.shortBu}/${machine._id}`)

			return
		}

	if (endHour < startHour) {
		shiftType = 'nights'
		startTime = moment().subtract(1, 'days').format(`YYYY-MM-DDT${shift.startTimeString}:00`)
		dayNow = moment().subtract(1, 'days').format('dddd').toLowerCase()
	}

	if (timeNow > startTime && timeNow < endTime && req.body.shift.hasOwnProperty(dayNow)) {
		inShift = true
	}
	shift.createdBy = foundUser._id
	shift.inShift = inShift
	shift.type = shiftType
	shift.shortBu = machine.shortBu
	shift.vin = machine.vin
	shift.createdBy = req.user._id
	machine.shifts.push(shift)
	await shift.save()
	await machine.save()

	// console.log(req.body.shift)

	res.redirect(`/equipment-monitoring/show/${machine.shortBu}/${machine._id}`)
}

module.exports.delete = async (req, res) => {
	const { mId, sId } = req.params

	const machine = await Machine.findById(mId)
	await Machine.findByIdAndUpdate(mId, { $pull: { shifts: sId } })
	await Shift.findByIdAndUpdate(sId, {
		active: false,
		removedBy: req.user._id,
		removedAt: Date.now(),
	})
	// await Shift.findByIdAndDelete(sId)
	// console.log(machine)

	res.redirect(`/equipment-monitoring/show/${machine.shortBu}/${machine._id}`)
}
// module.exports.delete = async (req, res) => {
// 	const { mId, sId } = req.params
// 	const machine = await Machine.findById(mId)
// 	await Machine.findByIdAndUpdate(mId, { $pull: { shifts: sId } })
// 	await Shift.findByIdAndDelete(sId)
// 	// console.log(machine)

// 	res.redirect(`/equipment-monitoring/show/${machine.shortBu}/${machine._id}`)
// }
