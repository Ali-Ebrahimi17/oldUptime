const mongoose = require('mongoose')

// Schema Setup
const modelSchema = new mongoose.Schema({
  name     : String,
  division : String,
})

module.exports = mongoose.model('Model', modelSchema)
