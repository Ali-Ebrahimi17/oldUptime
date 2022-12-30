const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const stage12Schema = new mongoose.Schema(
	{
		build: Number,
		buildNo: String,
		dateToStage: Date,
		track: String,
		dealer: String,
		customer: String,
		engineNumber: String,
		model: String,
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Stage12', stage12Schema)
