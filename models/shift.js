const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const shiftSchema = new mongoose.Schema(
	{
		startTimeString: String,
		active: { type: Boolean, default: true },
		createdBy: { type: String },
		removedBy: { type: String },
		removedAt: Date,
		endTimeString: String,
		shortBu: String,
		vin: String,
		type: String,
		inShift: Boolean,
		startTime: Date,
		endTimeTime: Date,
		monday: Boolean,
		tuesday: Boolean,
		wednesday: Boolean,
		thursday: Boolean,
		friday: Boolean,
		saturday: Boolean,
		sunday: Boolean,
		updates: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Update',
			},
		],
	},
	{ timestamps: true }
)
module.exports = mongoose.model('Shift', shiftSchema)
