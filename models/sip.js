const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const sipSchema = new mongoose.Schema({
	name      : String,
	division  : String,
	rec1      : String,
	rec2      : String,
	rec3      : String,
	rec4      : String,
	rec5      : String,
	rec6      : String,
	rec7      : String,
	rec8      : String,
	rec9      : String,
	rec10     : String,
	rec11     : String,
	rec12     : String,
	rec13     : String,
	rec14     : String,
	rec15     : String,
	rec16     : String,
	rec17     : String,
	rec18     : String,
	rec19     : String,
	rec20     : String,
	rec21     : String,
	rec22     : String,
	rec23     : String,
	rec24     : String,
	rec25     : String,
	startDate : Date,
	endDate   : Date,
	startTime : String,
	endTime   : String,
	lay       : String,
	track3lay : String,
})

module.exports = mongoose.model('Sip', sipSchema)
