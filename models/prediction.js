const mongoose = require('mongoose')

// Schema Setup
const predictionSchema = new mongoose.Schema({
	name     : String,
	division : String,
	month    : String,
})

module.exports = mongoose.model('Prediction', predictionSchema)
