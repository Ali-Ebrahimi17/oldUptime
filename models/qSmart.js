const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const qSmartSchema = new mongoose.Schema(
	{
		['Business Unit']: String,
		['Model Category']: String,
		Model: String,
		['Build Number']: String,
		['Serial Number']: String,
		['Production Line']: String,
		Zone: String,
		['Zone Type']: String,
		['Major Assembly']: String,
		['Sub Assembly']: String,
		['Component Sub Assembly']: String,
		['User Defined Test']: String,
		Fault: String,
		FixedByComment: String,
		['Fault Code']: String,
		['Fault Code Detail']: String,
		['Fault Area']: String,
		['Created Date']: Date,
		['Created By']: String,
		['Fixed Date']: Date,
		['Fixed By']: String,
		Comments: String,
	},
	{ timestamps: true }
)

module.exports = mongoose.model('QSmart', qSmartSchema)
