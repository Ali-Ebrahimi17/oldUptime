const mongoose = require('mongoose')

// Schema Setup
const detectionSchema = new mongoose.Schema({
  name: { type: String },
  division: { type: String },
})

module.exports = mongoose.model('Detection', detectionSchema)
