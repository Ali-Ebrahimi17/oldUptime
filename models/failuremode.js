const mongoose = require('mongoose')

// Schema Setup
const failuremodeSchema = new mongoose.Schema({
	name : String,
})

module.exports = mongoose.model('FailureMode', failuremodeSchema)
