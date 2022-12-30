const mongoose = require('mongoose')

// Schema Setup
const throughputSchema = new mongoose.Schema({
	buildNumber         : String,
	cfcFaults           : [
		{
			fault     : String,
			faultArea : String,
			major     : String,
		},
	],
	name                : String,
	model               : String,
	ardent              : String,
	cabsFaults          : Number,
	electricalFaults    : Number,
	fabFaults           : Number,
	mechanicalFaults    : Number,
	shortages           : Number,
	morris              : String,
	p33                 : String,
	tenMmShim           : String,
	inspector           : String,
	tester              : String,
	openFaults          : Number,
	building            : String,
	functional          : Number,
	cosmetic            : Number,
	assembly            : Number,
	cabs                : Number,
	quality             : Number,
	fabrication         : Number,
	buildFaults         : Number,
	startFaults         : String,
	submittedBy         : String,
	faults              : String,
	totalFaults         : Number,
	red                 : String,
	green               : String,
	rft                 : String,
	tCard               : Number,
	signedOut           : String,
	video               : String,
	signedOutAt         : Date,
	startFaultsEditedAt : Date,
	startFaultsEditedBy : String,
	division            : String,

	createdAt           : { type: Date, default: Date.now },
})

module.exports = mongoose.model('Throughput', throughputSchema)
