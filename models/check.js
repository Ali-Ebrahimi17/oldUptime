const mongoose = require('mongoose')
const Schema = mongoose.Schema

const checkSchema = new Schema(
	{
		body: { type: String },
		missedBy: { type: String },
		type: { type: String },
		value: { type: Number },
		target: { type: Number },
		agreed: { type: String },
		result: { type: String },
		frequency: { type: String },
		checkedBy: { type: String },
		reason: { type: String },
		action: { type: String },
		division: { type: String },
		description: { type: String },
		category: { type: String },
		section: { type: String },
		unit: { type: String },
		area: { type: String },
		name: { type: String },
		manual: { type: String },
		maintenancePerson: { type: String },
		comments: { type: String },
		level: { type: String },
		tCardId: mongoose.Schema.Types.ObjectId,
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Check', checkSchema)
