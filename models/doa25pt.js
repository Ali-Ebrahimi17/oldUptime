const mongoose = require('mongoose')

// Schema Setup
const doa25ptSchema = new mongoose.Schema(
	{
		name: { type: String },
		division: { type: String },
		reportedBy: { type: String },
		assignedToArea: { type: Date },
		area: { type: String },
		postCutIn: { type: String },
		buildDate: { type: Date },
		callDate: { type: String },
		despatchDate: { type: String },
		dealer: { type: String },
		hours: { type: String },
		hasFourC: { type: String },
		serviceArea: { type: String },
		twNumber: { type: String },
		inspector: { type: String },
		model: { type: String },
		score: { type: String },
		description: { type: String },
		wasPickedUp: { type: String },
		onVideo: { type: String },
		scc: { type: String },
		closure: { type: String },
		createdAt: { type: Date },
		vettedBy: { type: String },
		status: { type: String },
		failuremode: { type: String },
		failuretype: { type: String },
		grade: { type: String },
		graded: { type: String },
		gradedBy: { type: String },
		shortDescription: { type: String },
		gradedAt: { type: Date },
		count: { type: Number },
		points: { type: String },
	},
	{ timestamps: true }
)

module.exports = mongoose.model('Doa25pt', doa25ptSchema)
