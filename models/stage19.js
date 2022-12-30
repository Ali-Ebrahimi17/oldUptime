const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const stage19Schema = new mongoose.Schema(
	{
		build       : Number,
		buildNo     : String,
		dateToStage : Date,
		track       : String,
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Stage19', stage19Schema)
