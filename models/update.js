const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const updateSchema = new mongoose.Schema(
	{
		vin: String,
		date: Date,
		thelastSignal: Date,
		updatedLastSignal: Date,
		day: String,
		eff: Number,
		teff: Number,
		shiftStart: Date,
		shiftEnd: Date,
		shortBu: String,
		machineName: String,
		type: String,
		runningMins: Number,
		touchMins: Number,
		availableMins: Number,
		oldEff: Number,
		oldTeff: Number,
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Update', updateSchema)
