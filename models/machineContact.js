const mongoose = require('mongoose')

// Schema Setup
const machineContactSchema = new mongoose.Schema({
    name: String,
    shortBu: String,
    email: String,
    mobile: String,
    active: { type: Boolean, default: true },
})

module.exports = mongoose.model('MachineContact', machineContactSchema)
