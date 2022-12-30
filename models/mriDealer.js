const mongoose = require('mongoose')

// Schema Setup
const qmrSchema = new mongoose.Schema(
  {
    division  : String,
    name      : String,
    type      : String,
    issues    : String,
    process   : String,
    visit     : String,
    status    : String,
    updatedBy : String,
    who       : String,
    when      : String,
    status    : String,
  },
  { timestamps: true },
)

module.exports = mongoose.model('Qmr', qmrSchema)
