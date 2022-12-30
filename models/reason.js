const mongoose = require('mongoose')

// Schema Setup
const reasonSchema = new mongoose.Schema(
	{
		name : String,
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Reason', reasonSchema)
