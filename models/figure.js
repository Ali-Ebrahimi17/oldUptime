const mongoose = require("mongoose");

// Schema Setup
const figureSchema = new mongoose.Schema({
  month: String,
  stat: Number,
  metric: String,
  division: String,
});

module.exports = mongoose.model("Figure", figureSchema);
