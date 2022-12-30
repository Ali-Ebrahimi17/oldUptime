const mongoose = require('mongoose')

// Schema Setup
const aTypeSchema = new mongoose.Schema({
	name: { type: String },
})

module.exports = mongoose.model('AType', aTypeSchema)
