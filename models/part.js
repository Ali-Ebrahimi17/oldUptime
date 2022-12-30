const mongoose = require('mongoose')

// Schema Setup
const partSchema = new mongoose.Schema({
	partNumber: {
		type: String,
		required: [true, 'Please enter a part number'],
		trim: true,
		uppercase: true,
		maxLength: [20, 'Part number cannot exceed 20 characters'],
	},
	description: {
		type: String,
		required: [true, 'Please enter a description'],
		trim: true,
		// lowercase: true,
		maxLength: [50, 'Description cannot exceed 50 characters'],
	},
	supplier: {
		type: String,
		required: [true, 'Please enter a supplier'],
		trim: true,
		// lowercase: true,
		maxLength: [50, 'Supplier cannot exceed 50 characters'],
	},
	category: {
		type: String,
		required: [true, 'Please enter a category'],
		trim: true,
		// lowercase: true,
		maxLength: [10, 'category cannot exceed 10 characters'],
	},
	division: {
		type: String,
		required: [true, 'Please enter a division'],
		enum: {
			values: ['LDL', 'BHL', 'CABS', 'CP', 'EM', 'LP', 'HP'],
			message: 'Please select a valid division',
		},
	},
})

module.exports = mongoose.model('Part', partSchema)
