const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const cabinSchema = new mongoose.Schema(
	{
		name: { type: String },
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Cabin', cabinSchema)
