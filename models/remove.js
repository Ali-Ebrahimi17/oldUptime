const mongoose = require('mongoose')

// Schema Setup
const removeSchema = new mongoose.Schema({
	name     : String,
	division : String,
})

module.exports = mongoose.model('Remove', removeSchema)
