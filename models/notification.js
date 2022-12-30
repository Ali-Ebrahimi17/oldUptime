const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Schema Setup
const notificicationSchema = new mongoose.Schema(
	{
		ids     : [
			{
				type : Schema.Types.ObjectId,
			},
		],
		shortBu : String,
		types   : [ String ],
		event   : String,
		body    : String,
		method  : String,
		time    : Number,
		start   : String,
		end     : String,
		emails  : [ String ],
		numbers : [ String ],
		active  : { type: Boolean, default: true },
	},
	{ timestamps: true },
)

module.exports = mongoose.model('Notification', notificicationSchema)
