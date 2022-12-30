const mongoose = require('mongoose')

// Schema Setup
const nameSchema = new mongoose.Schema({
  name     : String,
  division : String,
})

module.exports = mongoose.model('Name', nameSchema)
