const mongoose = require('mongoose')

// Schema Setup
const graveyardSchema = new mongoose.Schema(
  {
    buildNumber  : String,
    fault        : String,
    division     : String,
    responsible  : String,
    planFixDate  : Date,
    faultArea    : String,
    timeTaken    : String,
    reworkAction : String,
  },
  { timestamps: true },
)

module.exports = mongoose.model('Graveyard', graveyardSchema)
