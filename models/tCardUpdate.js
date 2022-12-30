const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const tCardUpdateSchema = new mongoose.Schema(
	{
		body: {
			type: String,
			trim: true,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
		updatedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
		},
	},

	{ timestamps: true }
)

module.exports = mongoose.model('TCardUpdate', tCardUpdateSchema)
