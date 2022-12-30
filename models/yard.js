const mongoose = require('mongoose')

// Schema Setup
const YardSchema = new mongoose.Schema(
	{
		buildNumber : String,
		serial      : String,
		division    : String,
		concern     : String,
		reviewed    : { type: Boolean, default: false },
		reviewedAt  : Date,
		comments    : String,
		returned    : { type: Boolean, default: false },
		returnedAt  : Date,
		onHold      : { type: Boolean, default: true },
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Yard', YardSchema)
