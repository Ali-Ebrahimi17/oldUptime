const mongoose = require('mongoose')

// Schema Setup
const aconcernSchema = new mongoose.Schema({
  name: { type: String },
})

module.exports = mongoose.model('AConcern', aconcernSchema)
