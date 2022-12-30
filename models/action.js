const mongoose = require('mongoose')

// Schema Setup
const actionSchema = new mongoose.Schema(
  {
    name: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Action', actionSchema)
