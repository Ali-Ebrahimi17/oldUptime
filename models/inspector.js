const mongoose = require('mongoose')

// Schema Setup
const inspectorSchema = new mongoose.Schema({
  name     : String,
  division : String,
})

module.exports = mongoose.model('Inspector', inspectorSchema)
