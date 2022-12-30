const Stage = require('../models/stage')
const Inspector = require('../models/inspector')

const moment = require('moment')
const axios = require('axios')
const inspector = require('../models/inspector')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const stages = await Stage.find({}).sort({ name: '' })

	res.render('stages/all', { division, stages })
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const stage = await Stage.findById(id)
	if (!stage) {
		req.flash('error', 'Cannot find that stage')
		res.redirect('/')
	}
	const division = stage.division
	const inspectors = await Inspector.find({ division: division })

	res.render('stages/edit', { division, stage, inspectors })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const stage = await Stage.findByIdAndUpdate(id, {
		...req.body.stage,
	})

	const division = stage.division

	res.redirect(`/stage/all/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
	const { id } = req.params
	await Stage.findByIdAndDelete(id)
	req.flash('success', 'Successfully deleted area')
	res.redirect('/')
}
