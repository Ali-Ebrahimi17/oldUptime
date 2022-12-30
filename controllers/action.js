const TCard = require('../models/tCard')
const Action = require('../models/action')

module.exports.renderReasonAndActionPage = async (req, res) => {
	const { division, area, location, shiftP, frequency, id } = req.params
	const tCard = await TCard.findById(id)
	if (!tCard) {
		req.flash('error', 'Cannot find that T Card')
	}
	res.render('tCards/newaction', {
		tCard,
		division,
		area,
		location,
		shiftP,
		frequency,
	})
}

module.exports.create = async (req, res) => {
	const tCard = await TCard.findById(req.params.id)
	const action = new Action(req.body.action)

	tCardsToUpdate = await TCard.find({
		name: tCard.name,
	})

	for (let t of tCardsToUpdate) {
		t.actions.push(action)
		await t.save()
	}

	await action.save()
	// req.flash('success', 'Reason added');
	res.redirect(
		`/tCard/adminreason/${tCard.division}/${tCard.area}/${tCard.location}/${tCard.shiftP}/${tCard.frequency}/${tCard._id}`
	)
}

module.exports.delete = async (req, res) => {
	const { id, actionId } = req.params
	const tCard = await TCard.findById(req.params.id)
	await TCard.findByIdAndUpdate(id, { $pull: { actions: actionId } })
	await Action.findByIdAndDelete(actionId)
	// req.flash('success', 'Reason deleted');
	res.redirect(
		`/tCard/adminreason/${tCard.division}/${tCard.area}/${tCard.location}/${tCard.shiftP}/${tCard.frequency}/${tCard._id}`
	)
}
