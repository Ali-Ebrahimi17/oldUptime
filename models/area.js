const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const areaSchema = new mongoose.Schema({
	name: { type: String },
	division: { type: String },
	emails: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Email',
		},
	],
})

module.exports = mongoose.model('Area', areaSchema)
