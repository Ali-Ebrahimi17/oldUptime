const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const stageSchema = new mongoose.Schema({
	name     : String,
	division : String,
	sip      : String,
	target   : Number,
	rec1     : String,
	rec2     : String,
	rec3     : String,
	rec4     : String,
	rec5     : String,
	rec6     : String,
	rec7     : String,
	rec8     : String,
	rec9     : String,
	rec10    : String,
})

module.exports = mongoose.model('Stage', stageSchema)
