const mongoose = require('mongoose')

// Schema Setup
const mainSchema = new mongoose.Schema({
  name     : String,
  division : String,
})

module.exports = mongoose.model('Main', mainSchema)
