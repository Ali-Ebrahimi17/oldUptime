const mongoose = require('mongoose')

// Schema Setup
const championSchema = new mongoose.Schema({
  name: { type: String },
  division: { type: String },
})

module.exports = mongoose.model('Champion', championSchema)
