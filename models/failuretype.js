const mongoose = require('mongoose');

// Schema Setup
const failuretypeSchema = new mongoose.Schema({
	name : String,
});

module.exports = mongoose.model('FailureType', failuretypeSchema);
