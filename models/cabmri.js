const mongoose = require('mongoose')

// Schema Setup
const cabmriSchema = new mongoose.Schema({
  name: { type: String },
  jan: { type: Number },
  feb: { type: Number },
  mar: { type: Number },
  apr: { type: Number },
  may: { type: Number },
  jun: { type: Number },
  jul: { type: Number },
  aug: { type: Number },
  sep: { type: Number },
  oct: { type: Number },
  nov: { type: Number },
  dec: { type: Number },
  jan_target: { type: Number },
  feb_target: { type: Number },
  mar_target: { type: Number },
  apr_target: { type: Number },
  may_target: { type: Number },
  jun_target: { type: Number },
  jul_target: { type: Number },
  aug_target: { type: Number },
  sep_target: { type: Number },
  oct_target: { type: Number },
  nov_target: { type: Number },
  dec_target: { type: Number },
  line: { type: String },
  dpu_dec_21: { type: String },
  dpu_Dec_21_actual: { type: String },
  closed_top_5: { type: String },
  open_top_5: { type: String },
})

module.exports = mongoose.model('CabMri', cabmriSchema)
