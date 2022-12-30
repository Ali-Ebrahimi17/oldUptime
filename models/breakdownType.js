const mongoose = require('mongoose')

// Schema Setup
const btypeSchema = new mongoose.Schema({
  name: { type: String },
  value: { type: String },
})

module.exports = mongoose.model('BType', btypeSchema)
