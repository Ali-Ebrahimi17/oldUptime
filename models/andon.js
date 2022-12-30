const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const andonSchema = new mongoose.Schema(
	{
		concern: { type: String },
		name: { type: String },
		type: { type: String },
		machineType: { type: String },
		startTime: { type: Date, default: Date.now },
		endTime: { type: Date },
		shiftStart: { type: Date },
		shiftEnd: { type: Date },
		vin: { type: String },
		shortBu: { type: String },
		open: { type: Boolean, default: true },
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Andon', andonSchema)
