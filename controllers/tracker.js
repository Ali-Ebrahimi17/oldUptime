const Tracker = require('../models/tracker')

const moment = require('moment')
const axios = require('axios')
const nodemailer = require('nodemailer')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.index = async (req, res) => {
  const { division } = req.params
  const trackers = await Tracker.find({
    division: division,
    status: 'Open',
  }).sort({ _id: 'desc' })

  res.render('tracker/todo', { division, trackers })
}

module.exports.closed = async (req, res) => {
  const { division } = req.params
  const trackers = await Tracker.find({
    division: division,
    status: 'Closed',
  }).sort({ updatedAt: 'desc' })

  res.render('tracker/done', { division, trackers })
}

module.exports.renderNewForm = async (req, res) => {
  const { division } = req.params

  res.render('tracker/new', { division })
}

module.exports.createNew = async (req, res) => {
  const tracker = new Tracker(req.body.tracker)
  const division = req.body.tracker.division
  tracker.submittedBy = req.user.firstName + ' ' + req.user.lastName

  const person = tracker.submittedBy

  await tracker.save()

  const theEmails = ['georgina.hart@jcb.com']
  const transporter = nodemailer.createTransport({
    host: process.env.HOST, //Host
    port: process.env.PORT, // Port
    tls: {
      rejectUnauthorized: false,
    },
  })

  let mailOptions = {
    from: 'Q-Smart-Tracker@jcb.com',
    to: theEmails,
    subject: `New Issue on the tracker.`,
    html:
      `<h3>A new issue has been added to the Q Smart tracker by ${person}.</h3>` +
      '\n\n' +
      `<h3>You can view the tracker using this link:</h3>` +
      '\n\n' +
      `<h3>http://quality-uptime.jcb.local/tracker/all/LDL</h3>` +
      '\n\n' +
      `<h3>Thanks</h3>`,
  }
  // send the email
  transporter.sendMail(mailOptions, () => {})

  req.flash('success', 'Issue added and email sent to Georgina.')

  res.redirect(`/tracker/all/${division}`)
}

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params
  const tracker = await Tracker.findById(id)
  if (!tracker) {
    req.flash('error', 'Cannot find that')
    res.redirect('/')
  }
  const division = tracker.division
  res.render('tracker/edit', { division, tracker })
}

module.exports.edit = async (req, res) => {
  const { id } = req.params
  const tracker = await Tracker.findByIdAndUpdate(id, {
    ...req.body.tracker,
  })

  const division = tracker.division

  res.redirect(`/tracker/all/${division}`)
}

// delete claim
module.exports.delete = async (req, res) => {
  const { id } = req.params
  await Tracker.findByIdAndDelete(id)
  req.flash('success', 'Successfully deleted')
  res.redirect('/')
}
