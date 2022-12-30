const mongoose = require('mongoose')

// Schema Setup
const statSchema = new mongoose.Schema({
	division: String,
	month_year: String,
	doa_dpu: String,
	doa_machines: String,
	doa_claims: String,
	t3_dpu: String,
	t3_machines: String,
	t3_claims: String,
	t6_dpu: String,
	t6_machines: String,
	t6_claims: String,
	t0_leak_dpu: String,
	t1_leak_dpu: String,
	t3_leak_dpu: String,
})

module.exports = mongoose.model('Stat', statSchema)
