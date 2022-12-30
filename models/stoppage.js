const mongoose = require('mongoose')

// Schema Setup
const stoppageSchema = new mongoose.Schema(
	{
		machineType: String,
		level: [],
		updates: [
			{
				updatedBy: { type: String },
				role: { type: String },
				updatedById: { type: mongoose.Schema.Types.ObjectId },
				updatedAt: { type: Date },
				concernUpdatedFrom: { type: String },
				concernUpdatedTo: { type: String },
				typeUpdatedFrom: { type: String },
				typeUpdatedTo: { type: String },
			},
		],
		startTime: Number,
		endTime: Number,
		shiftStart: Date,
		shiftEnd: Date,
		totalTime: Number,
		hour: Number,
		type: String,
		concern: String,
		detail: String,
		action: String,
		closeNotes: String,
		vin: String,
		shortBu: String,
		detail: String,
		closeNotes: String,
		closedBy: String,
		closedById: mongoose.Schema.Types.ObjectId,
		closedAt: Date,
		open: { type: Boolean, default: true },
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Stoppage', stoppageSchema)
