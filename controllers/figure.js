const Figure = require('../models/figure')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const figures = await Figure.find({ division: division })

	res.render('figures/all', { division, figures })
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const figure = await Figure.findById(id)
	if (!figure) {
		req.flash('error', 'Error')
		res.redirect('/')
	}
	const division = figure.division
	res.render('figures/edit', { division, figure })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const figure = await Figure.findByIdAndUpdate(id, {
		...req.body.figure,
	})

	const division = figure.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/figure/all/${division}`)
}
