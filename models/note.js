const mongoose = require('mongoose')

// Schema Setup
const noteSchema = new mongoose.Schema(
	{
		maintenanceNotes : String,
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Note', noteSchema)
