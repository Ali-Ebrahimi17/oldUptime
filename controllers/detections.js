const Detection = require('../models/detection')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const detections = await Detection.find({ division: division }).sort({
		name: '',
	})

	res.render('detections/all', { division, detections })
}

module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params

	res.render('detections/new', { division })
}

module.exports.createNew = async (req, res, next) => {
	const detection = new Detection(req.body.detection)
	const division = req.body.detection.division

	await detection.save()

	res.redirect(`/detection/all/${division}`)
	// res.redirect('/');
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const detection = await Detection.findById(id)
	if (!detection) {
		req.flash('error', 'Cannot find that detection point')
		res.redirect('/')
	}
	const division = detection.division
	res.render('detections/edit', { division, detection })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const detection = await Detection.findByIdAndUpdate(id, {
		...req.body.detection,
	})

	const division = detection.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/detection/all/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
	const { id } = req.params
	await Detection.findByIdAndDelete(id)
	req.flash('success', 'Successfully deleted detection point')
	res.redirect('/')
}
