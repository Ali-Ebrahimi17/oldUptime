const mongoose = require('mongoose')

// Schema Setup
const retailSchema = new mongoose.Schema({
	serialNumber: String,
	buildDate: String,
	soldDate: String,
	division: String,
	customer: String,
	dealer: String,
	salesModel: String,
})

module.exports = mongoose.model('Retail', retailSchema)
