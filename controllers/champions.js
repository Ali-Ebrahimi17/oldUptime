const Champion = require('../models/champions')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
	const { division } = req.params
	const champions = await Champion.find({ division: division }).sort({
		name: '',
	})

	res.render('champions/all', { division, champions })
}

module.exports.renderNewForm = async (req, res) => {
	const { division } = req.params

	res.render('champions/new', { division })
}

module.exports.createNew = async (req, res, next) => {
	const champion = new Champion(req.body.champion)
	const division = req.body.champion.division

	await champion.save()

	res.redirect(`/champion/all/${division}`)
	// res.redirect('/');
}

module.exports.renderEditForm = async (req, res) => {
	const { id } = req.params
	const champion = await Champion.findById(id)
	if (!champion) {
		req.flash('error', 'Cannot find that champion')
		res.redirect('/')
	}
	const division = champion.division
	res.render('champions/edit', { division, champion })
}

module.exports.edit = async (req, res) => {
	const { id } = req.params
	const champion = await Champion.findByIdAndUpdate(id, {
		...req.body.champion,
	})

	const division = champion.division

	// req.flash('success', 'Successfully updated claim');
	res.redirect(`/champion/all/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
	const { id } = req.params
	await Champion.findByIdAndDelete(id)
	req.flash('success', 'Successfully deleted champion')
	res.redirect('/')
}
