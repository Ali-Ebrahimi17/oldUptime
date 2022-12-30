const Graveyard = require('../models/graveyard')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const graveyards = await Graveyard.find({ division: division }).sort({
		createdAt: '',
	})

	res.render('graveyard/all', { division, graveyards })
}

module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params

	res.render('graveyard/new', { division })
}

module.exports.createNew = async (req, res) => {
	const graveyard = new Graveyard(req.body.graveyard)
	const division = req.body.graveyard.division

	await graveyard.save()

	res.redirect(`/graveyard/all/${division}`)
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const graveyard = await Graveyard.findById(id)
	if (!graveyard) {
		req.flash('error', 'Cannot find that')
		res.redirect('/')
	}
	const division = graveyard.division
	res.render('graveyard/edit', { division, graveyard })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const graveyard = await Graveyard.findByIdAndUpdate(id, {
		...req.body.graveyard,
	})

	const division = graveyard.division

	res.redirect(`/graveyard/all/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
	const { id } = req.params
	await Graveyard.findByIdAndDelete(id)
	req.flash('success', 'Successfully deleted')
	res.redirect('/')
}
