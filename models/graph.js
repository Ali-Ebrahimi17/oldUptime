const mongoose = require('mongoose')

// Schema Setup
const graphSchema = new mongoose.Schema({
	month: String,
	stat: String,
	metric: String,
	division: String,
})

module.exports = mongoose.model('Graph', graphSchema)
