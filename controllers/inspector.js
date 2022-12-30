const Inspector = require('../models/inspector')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const inspectors = await Inspector.find({ division: division }).sort({
		name: '',
	})

	res.render('inspectors/all', { division, inspectors })
}

module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params

	res.render('inspectors/new', { division })
}

module.exports.createNew = async (req, res, next) => {
	const inspector = new Inspector(req.body.inspector)
	const division = req.body.inspector.division

	await inspector.save()

	res.redirect(`/inspector/all/${division}`)
	// res.redirect('/');
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const inspector = await Inspector.findById(id)
	if (!inspector) {
		req.flash('error', 'Cannot find that inspector')
		res.redirect('/')
	}
	const division = inspector.division
	res.render('inspectors/edit', { division, inspector })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const inspector = await Inspector.findByIdAndUpdate(id, {
		...req.body.inspector,
	})

	const division = inspector.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/inspector/all/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
	const { id } = req.params
	await Inspector.findByIdAndDelete(id)
	req.flash('success', 'Successfully deleted inspector')
	res.redirect('/')
}
