const mongoose = require('mongoose')

// Schema Setup
const bconcernSchema = new mongoose.Schema({
  name: { type: String },
  machineType: { type: String },
  value: { type: String },
  header: { type: String },
  edit: { type: Boolean },
  notified: { type: String },
  escalate: { type: String },
})

module.exports = mongoose.model('BConcern', bconcernSchema)
