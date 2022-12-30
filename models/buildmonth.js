const mongoose = require('mongoose')

// Schema Setup
const buildmonthSchema = new mongoose.Schema({
  name: { type: String },
})

module.exports = mongoose.model('BuildMonth', buildmonthSchema)
