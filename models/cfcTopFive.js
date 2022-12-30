const mongoose = require('mongoose')

// Schema Setup
const cfcTopFiveschema = new mongoose.Schema(
  {
    concern: { type: String },
    division: { type: String },
    area: { type: String },
    status: { type: String },
    comments: { type: String },
    containment: { type: String },
    closure: { type: String },
    action: { type: String },
    updatedBy: { type: String },
    containCutIn: { type: String },
    closeCutIn: { type: String },
    type: { type: String },
    buildNumber: { type: String },
    person: { type: String },
  },
  { timestamps: true }
)

module.exports = mongoose.model('CfcTopFive', cfcTopFiveschema)
