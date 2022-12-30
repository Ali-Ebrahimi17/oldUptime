const mongoose = require('mongoose')

// Schema Setup
const cabsSchema = new mongoose.Schema({
  name: { type: String },
})

module.exports = mongoose.model('Cabs', cabsSchema)
