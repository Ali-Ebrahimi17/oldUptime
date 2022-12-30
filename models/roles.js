const mongoose = require('mongoose')

// Schema Setup
const roleSchema = new mongoose.Schema({
	name                 : String,
	create_notifications : Boolean,
	add_edit_shifts      : Boolean,
	view_shift_history   : Boolean,
	add_edit_users       : Boolean,
	end_update_stoppage  : Boolean,
})

module.exports = mongoose.model('Role', roleSchema)
