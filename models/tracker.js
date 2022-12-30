const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const trackerSchema = new mongoose.Schema(
	{
		area         : String,
		division     : String,
		serialNumber : String,
		teamLeader   : String,
		issue        : String,
		rating       : { type: String, default: 'Red' },
		comments     : String,
		submittedBy  : String,
		status       : { type: String, default: 'Open' },
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Tracker', trackerSchema)
