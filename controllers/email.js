const Area = require('../models/area')
const Email = require('../models/email')

module.exports.create = async (req, res) => {
	const area = await Area.findById(req.params.id)
	const email = new Email(req.body.email)
	area.emails.push(email)
	await email.save()
	await area.save()

	res.redirect(`/area/editemail/${area._id}`)
}

module.exports.delete = async (req, res) => {
	const { id, emailId } = req.params
	const area = await Area.findById(req.params.id)
	await Area.findByIdAndUpdate(id, { $pull: { emails: emailId } })
	await Email.findByIdAndDelete(emailId)
	// req.flash('success', 'Successfully deleted update');
	res.redirect(`/area/editemail/${area._id}`)
}

module.exports.createMachineEmail = async (req, res) => {
	const { shortBu } = req.params

	const email = new Email(req.body.email)

	await email.save()

	res.redirect(`/equipment-monitoring/notifications/${shortBu}`)
}
