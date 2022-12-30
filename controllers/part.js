const Part = require('../models/part')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	let searchOptions = { division: division, partNumber: '' }
	let formattedSearch
	let search

	if (req.query.partNumber && req.query.partNumber.trim() !== null && req.query.partNumber.trim() !== '') {
		search = true
		formattedSearch = req.query.partNumber.toUpperCase().trim()
		searchOptions.partNumber = formattedSearch
	}

	const part = await Part.findOne(searchOptions)

	res.render('materials/index', { division, part, search })
}

module.exports.createNew = async (req, res) => {
	const division = req.body.division
	if (
		!req.body.partNumber ||
		req.body.partNumber.trim().length < 1 ||
		!req.body.description ||
		req.body.description.trim().length < 1 ||
		!req.body.supplier ||
		req.body.supplier.trim().length < 1 ||
		!req.body.category ||
		req.body.category.trim().length < 1
	) {
		req.flash('error', 'Please fill in all fields')
		return res.redirect(`/materials/parts-risk-search/${division}`)
	}

	const enteredPartNumber = req.body.partNumber.trim().toUpperCase()

	const foundPart = await Part.findOne({ partNumber: enteredPartNumber, division: division })

	if (foundPart) {
		req.flash('error', 'Part number already exists')
		return res.redirect(`/materials/parts-risk-search/${division}`)
	}

	const part = new Part(req.body)

	await part.save()

	req.flash('success', 'Part Added')
	res.redirect(`/materials/parts-risk-search/${division}`)
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const division = req.body.division
	if (
		!req.body.partNumber ||
		req.body.partNumber.trim().length < 1 ||
		!req.body.description ||
		req.body.description.trim().length < 1 ||
		!req.body.supplier ||
		req.body.supplier.trim().length < 1 ||
		!req.body.category ||
		req.body.category.trim().length < 1
	) {
		req.flash('error', 'Please fill in all fields')
		return res.redirect(`/materials/parts-risk-search/${division}`)
	}

	const enteredPartNumber = req.body.partNumber.trim().toUpperCase()

	const foundPart = await Part.findOne({ partNumber: enteredPartNumber, division: division })

	// // console.log(id)
	// console.log(JSON.stringify(foundPart._id) === JSON.stringify(id))

	if (foundPart && JSON.stringify(foundPart._id) !== JSON.stringify(id)) {
		req.flash('error', 'Part number already exists')
		return res.redirect(`/materials/parts-risk-search/${division}`)
	}
	const updatedPart = await Part.findByIdAndUpdate(
		id,
		{
			...req.body,
		},
		{ new: true }
	)

	req.flash('success', 'Part Updated')
	res.redirect(`/materials/parts-risk-search/${division}`)
}
