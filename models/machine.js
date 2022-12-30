const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const machineSchema = new mongoose.Schema(
	{
		country: String,
		linkedTo: {
			type: Schema.Types.ObjectId,
		},
		thelastSignal: Date,
		programming: Boolean,
		lastProgrammeNote: String,
		lastProgrammeDate: Date,
		programmingNotes: [
			{
				body: String,
				createdAt: Date,
			},
		],
		programmingLog: [
			{
				inOut: String,
				createdAt: Date,
				createdBy: String,
				detail: String,
				shiftStart: Date,
				shiftEnd: Date,
			},
		],
		location: String,
		lastUpdateTime: Date,
		weeklyEff: Number,
		weeklyTeff: Number,
		helpFrom: String,
		businessUnit: String,
		shortBu: String,
		screenName: String,
		screenAsset: String,
		screenGroup: Number,
		andonGroup: String,
		dataStatus: String,
		sumOfStoppages: String,
		sumOfRunningTime: String,
		sumOfBdTime: String,
		sumOfUnKnownTime: String,
		sumOfPartsTime: String,
		sumOfWireTime: String,
		knownBdPercent: Number,
		unKnownBdPercent: Number,
		partsTimePercent: Number,
		wireTimePercent: Number,
		area: String,
		method: String,
		type: String,
		state: String,
		runningTime: Number,
		runningMins: Number,
		touchMins: Number,
		touchTime: Number,
		eff: Number,
		teff: Number,
		stoppageStartTime: Date,
		machineName: String,
		lastUpdate: Date,
		abbreviatedName: String,
		vin: String,
		dayNow: String,
		inShift: Boolean,
		shiftStart: Date,
		shiftEnd: Date,
		andon: Boolean,
		shiftHours: [],
		signal: { type: Boolean, default: false },
		serialNumber: Number,
		shifts: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Shift',
			},
		],
		stoppages: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Stoppage',
			},
		],
		updates: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Update',
			},
		],
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Machine', machineSchema)
