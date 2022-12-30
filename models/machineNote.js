const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const machineNoteSchema = new mongoose.Schema(
  {
    vin       : String,
    readAt    : Date,
    shortBu   : String,
    read      : { type: Boolean, default: false },
    body      : String,
    assetName : String,
  },
  { timestamps: true },
)

module.exports = mongoose.model('MachineNote', machineNoteSchema)
