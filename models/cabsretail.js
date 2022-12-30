const mongoose = require('mongoose')

// Schema Setup
const cabsretailSchema = new mongoose.Schema({
	serialNumber: String,
	buildDate: String,
	soldDate: String,
	division: String,
	customer: String,
	dealer: String,
	salesModel: String,
})

module.exports = mongoose.model('Cabsretail', cabsretailSchema)
