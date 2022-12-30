const Zone = require('../models/zone')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
  const { division } = req.params
  const zones = await Zone.find({ division: division }).sort({ name: '' })

  res.render('zones/all', { division, zones })
}

module.exports.renderNewForm = async (req, res) => {
  const { division } = req.params

  res.render('zones/new', { division })
}

module.exports.createNew = async (req, res, next) => {
  const zone = new Zone(req.body.zone)
  const division = req.body.zone.division

  await zone.save()

  res.redirect(`/zone/all/${division}`)
  // res.redirect('/');
}

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params
  const zone = await Zone.findById(id)
  if (!zone) {
    req.flash('error', 'Cannot find that')
    res.redirect('/')
  }
  const division = zone.division
  res.render('zones/edit', { division, zone })
}
module.exports.renderEditFormTrack = async (req, res) => {
  const { id } = req.params
  const zone = await Zone.findById(id)
  if (!zone) {
    req.flash('error', 'Cannot find that')
    res.redirect('/')
  }
  const division = zone.division
  res.render('zones/editTrack', { division, zone })
}

module.exports.edit = async (req, res) => {
  const { id } = req.params
  const zone = await Zone.findByIdAndUpdate(id, {
    ...req.body.zone,
  })

  const division = zone.division

  // req.flash('success', 'Successfully updated claim');
  res.redirect(`/zone/all/${division}`)
}
module.exports.editTrack = async (req, res) => {
  const { id } = req.params
  const zone = await Zone.findByIdAndUpdate(id, {
    ...req.body.zone,
  })
  const theZone = zone.name
  const division = zone.division

  // req.flash('success', 'Successfully updated claim');
  res.redirect(`/dash/area/${theZone}/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
  const { id } = req.params
  await Zone.findByIdAndDelete(id)
  req.flash('success', 'Successfully deleted')
  res.redirect('/')
}
