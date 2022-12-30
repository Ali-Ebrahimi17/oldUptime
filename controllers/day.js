const Day = require('../models/day')

const moment = require('moment')
const axios = require('axios')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const days = await Day.find({}).sort({ date: 'desc' })

	res.render('day/all', { division, days })
}

module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params

	res.render('day/new', { division })
}

module.exports.createNew = async (req, res) => {
	const day = new Day(req.body.day)
	const division = req.body.day.division

	await day.save()

	res.redirect(`/day/all/${division}`)
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const day = await Day.findById(id)
	if (!day) {
		req.flash('error', 'Cannot find that date')
		res.redirect('/')
	}
	const division = day.division
	res.render('day/edit', { division, day })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const day = await Day.findByIdAndUpdate(id, {
		...req.body.day,
	})

	const division = day.division

	res.redirect(`/day/all/${division}`)
}

// // delete claim
// module.exports.delete = async (req, res) => {
// 	const { id } = req.params
// 	await Stage.findByIdAndDelete(id)
// 	req.flash('success', 'Successfully deleted area')
// 	res.redirect('/')
// }
