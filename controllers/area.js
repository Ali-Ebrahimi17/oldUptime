const Area = require('../models/area')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const areas = await Area.find({ division: division }).sort({ name: '' })

	res.render('areas/all', { division, areas })
}

module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params

	res.render('areas/new', { division })
}

module.exports.renderNewEmailForm = async (req, res) => {
	const { division, id } = req.params
	const area = await Area.findById(id).populate({ path: 'emails' })
	if (!area) {
		req.flash('error', 'Cannot find that area')
		res.redirect('/')
	}

	res.render('areas/newemail', { division, area })
}

module.exports.createNew = async (req, res) => {
	const area = new Area(req.body.area)
	const division = req.body.area.division

	await area.save()

	res.redirect(`/area/all/${division}`)
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const area = await Area.findById(id)
	if (!area) {
		req.flash('error', 'Cannot find that area')
		res.redirect('/')
	}
	const division = area.division
	res.render('areas/edit', { division, area })
}
module.exports.renderEmailEditPage = async (req, res) => {
	const { id } = req.params
	const area = await Area.findById(id).populate({ path: 'emails' })
	if (!area) {
		req.flash('error', 'Cannot find that area')
		res.redirect('/')
	}
	const division = area.division
	res.render('areas/emailedit', { division, area })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const area = await Area.findByIdAndUpdate(id, {
		...req.body.area,
	})

	const division = area.division

	res.redirect(`/area/all/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
	const { id } = req.params
	await Area.findByIdAndDelete(id)
	req.flash('success', 'Successfully deleted area')
	res.redirect('/')
}
