const TCard = require('../models/tCard')
const Reason = require('../models/reason')

module.exports.renderReasonAndActionPage = async (req, res) => {
	const { division, area, location, shiftP, frequency, id } = req.params
	const tCard = await TCard.findById(id)
	if (!tCard) {
		req.flash('error', 'Cannot find that T Card')
	}
	res.render('tCards/newreason', {
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
	const reason = new Reason(req.body.reason)

	tCardsToUpdate = await TCard.find({
		name : tCard.name,
	})

	for (let t of tCardsToUpdate) {
		t.reasons.push(reason)
		await t.save()
	}

	// createdAt = Date.now()
	// tCard.reasons.push(reason)
	await reason.save()
	// await tCard.save()
	// req.flash('success', 'Reason added');
	res.redirect(
		`/tCard/adminreason/${tCard.division}/${tCard.area}/${tCard.location}/${tCard.shiftP}/${tCard.frequency}/${tCard._id}`,
	)
}

module.exports.delete = async (req, res) => {
	const { id, reasonId } = req.params
	const tCard = await TCard.findById(req.params.id)
	await TCard.findByIdAndUpdate(id, { $pull: { reasons: reasonId } })
	await Reason.findByIdAndDelete(reasonId)
	// req.flash('success', 'Reason deleted');
	res.redirect(
		`/tCard/adminreason/${tCard.division}/${tCard.area}/${tCard.location}/${tCard.shiftP}/${tCard.frequency}/${tCard._id}`,
	)
}
