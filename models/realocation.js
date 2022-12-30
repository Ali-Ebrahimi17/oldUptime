const mongoose = require('mongoose');

// Schema Setup
const reallocationSchema = new mongoose.Schema({
	buildNumber  : String,
	fault        : String,
	sipInspector : String,
	areaFrom     : String,
	areaTo       : String,
	agreed       : String,
	reason       : String,
	submittedBy  : String,
	actioned     : String,
	notes        : String,
	createdAt    : Date,
	actionedAt   : Date,
	actionedBy   : String,
	processed    : String,
	division     : String,
});

module.exports = mongoose.model('Reallocation', reallocationSchema);
