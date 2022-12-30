const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const orderSchema = new mongoose.Schema({
	buildNumber: String,
	dealer: String,
	customer: String,
	serial: String,
	engineNumber: String,
	model: String,
	orderDate: String,
	plannedDate: String,
	completedDate: String,
	projectedDate: String,
	despatchDate: String,
	modelCategory: String,
})

module.exports = mongoose.model('Order', orderSchema)
