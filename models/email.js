const mongoose = require('mongoose')

// Schema Setup
const emailSchema = new mongoose.Schema({
	address : String,
})

module.exports = mongoose.model('Email', emailSchema)
