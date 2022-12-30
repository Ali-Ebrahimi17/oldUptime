const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const tCardSchema = new mongoose.Schema(
	{
		division: String,
		section: {
			type: String,
			// required: [true, 'Please fill in all required data'],
		},
		category: {
			type: String,
		},
		area: String,
		primaryUserId: {
			type: Schema.Types.ObjectId,
		},
		primaryUserName: {
			type: String,
		},
		secondUserId: {
			type: Schema.Types.ObjectId,
		},

		secondUserName: {
			type: String,
		},

		location: String,
		shiftP: String,
		value: Number,
		target: Number,
		agreed: String,
		frequency: String,
		name: String,
		description: {
			type: String,
			trim: true,
		},
		requiresValue: String,
		status: String,
		min: Number,
		max: Number,
		unit: String,
		method: String,
		reason: String,
		action: String,
		type: String,
		checkedBy: String,
		maintenancePerson: String,
		maintenanceNotes: String,
		failedAt: Date,
		passedAt: Date,
		contractor: { type: Boolean, default: false },
		manual: String,
		comments: String,
		containedAt: Date,
		level: { type: String, default: 'QC' },
		missedAt: [],
		reasons: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Reason',
			},
		],
		actions: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Action',
			},
		],

		checks: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Check',
			},
		],
		notes: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Note',
			},
		],
		users: [
			{
				type: Schema.Types.ObjectId,
				ref: 'User',
			},
		],
		updatedAt: Date,
	},
	{ timestamps: true }
)

module.exports = mongoose.model('TCard', tCardSchema)
