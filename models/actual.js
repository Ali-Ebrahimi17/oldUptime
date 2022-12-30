const mongoose = require('mongoose')

// Schema Setup
const actualSchema = new mongoose.Schema({
	division: { type: String },
	month_year: { type: String },
	doa_dpu: { type: Number },
	doa_dpu_target: { type: Number },
	doa_rft: { type: Number },
	doa_rft_target: { type: Number },
	doa_machines: { type: Number },
	t0_dpu: { type: Number },
	t0_rft: { type: Number },
	t0_machines: { type: Number },
	t1_dpu: { type: Number },
	t1_rft: { type: Number },
	t1_machines: { type: Number },
	t3_dpu: { type: Number },
	t3_dpu_target: { type: Number },
	t3_rft: { type: Number },
	t3_rft_target: { type: Number },
	t3_machines: { type: Number },
	t6_dpu: { type: Number },
	t6_rft: { type: Number },
	t6_machines: { type: Number },
	doa_dpu_ytd: { type: Number },
	doa_rft_ytd: { type: Number },
	t3_dpu_ytd: { type: Number },
	t3_rft_ytd: { type: Number },
	t1_leak_dpu: { type: Number },
	t3_leak_dpu: { type: Number },
})

module.exports = mongoose.model('Actual', actualSchema)
