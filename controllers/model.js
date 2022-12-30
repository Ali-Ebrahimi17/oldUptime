const Model = require('../models/models')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const models = await Model.find({ division: division }).sort({ name: '' })

	res.render('models/all', { division, models })
}

module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params

	res.render('models/new', { division })
}

module.exports.createNew = async (req, res, next) => {
	const model = new Model(req.body.model)
	const division = req.body.model.division

	await model.save()

	res.redirect(`/model/all/${division}`)
	// res.redirect('/');
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const model = await Model.findById(id)
	if (!model) {
		req.flash('error', 'Cannot find that model')
		res.redirect('/')
	}
	const division = model.division
	res.render('models/edit', { division, model })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const model = await Model.findByIdAndUpdate(id, {
		...req.body.model,
	})

	const division = model.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/model/all/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
	const { id } = req.params
	await Model.findByIdAndDelete(id)
	req.flash('success', 'Successfully deleted model')
	res.redirect('/')
}
