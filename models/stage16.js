const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const stage16Schema = new mongoose.Schema(
	{
		build       : Number,
		buildNo     : String,
		dateToStage : Date,
		track       : String,
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Stage16', stage16Schema)
