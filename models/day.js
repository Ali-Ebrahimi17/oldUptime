const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const daySchema = new mongoose.Schema(
  {
    date: { type: Date },
    division: { type: String },
    build: { type: Number },
    faults: { type: Number },
    target: { type: Number },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Day', daySchema)
