const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const stage17Schema = new mongoose.Schema(
	{
		build       : Number,
		buildNo     : String,
		dateToStage : Date,
		track       : String,
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Stage17', stage17Schema)
