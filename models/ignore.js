const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const ignoreSchema = new mongoose.Schema(
	{
		fault: { type: String },
		faultArea: { type: String },
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Ignore', ignoreSchema)
