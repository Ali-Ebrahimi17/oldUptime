const Yard = require('../models/yard')

const moment = require('moment')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
  const { division } = req.params
  const machines = await Yard.find({ onHold: true }).sort({ createdAt: -1 })

  // console.log(machines)

  res.render('yard/all', { division, machines })
}

module.exports.renderNewForm = async (req, res) => {
  const { division } = req.params

  res.render('yard/new', { division })
}

module.exports.createNew = async (req, res) => {
  const yard = new Yard(req.body.yard)
  const division = req.body.yard.division

  await yard.save()

  // console.log(yard)

  res.redirect(`/yard/all/${division}`)
}

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params
  const machine = await Yard.findById(id)
  if (!machine) {
    req.flash('error', 'Cannot find that machine')
    res.redirect('yard/all/LDL')
  }
  const division = machine.division
  res.render('yard/edit', { division, machine })
}

module.exports.edit = async (req, res) => {
  const { id } = req.params

  const yard = await Yard.findByIdAndUpdate(
    id,
    {
      ...req.body.machine,
    },
    { new: true }
  )

  // console.log(yard)

  const division = yard.division

  res.redirect(`/yard/all/${division}`)
}

module.exports.dispatch = async (req, res) => {
  const { id, division } = req.params

  const yard = await Yard.findByIdAndUpdate(
    id,
    {
      onHold: false,
    },
    { new: true }
  )

  res.redirect(`/yard/all/${division}`)
}
module.exports.reviewed = async (req, res) => {
  const { id, division } = req.params

  const yard = await Yard.findByIdAndUpdate(
    id,
    {
      reviewedAt: Date.now(),
      reviewed: true,
    },
    { new: true }
  )

  res.redirect(`/yard/edit/${id}`)
}
module.exports.returned = async (req, res) => {
  const { id, division } = req.params

  const yard = await Yard.findByIdAndUpdate(
    id,
    {
      returnedAt: Date.now(),
      returned: true,
    },
    { new: true }
  )

  res.redirect(`/yard/edit/${id}`)
}

// // delete claim
// module.exports.delete = async (req, res) => {
// 	const { id } = req.params
// 	await Stage.findByIdAndDelete(id)
// 	req.flash('success', 'Successfully deleted area')
// 	res.redirect('/')
// }
