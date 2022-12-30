const express = require('express')
const router = express.Router()
const User = require('../models/machineUser')
const async = require('async')
const nodemailer = require('nodemailer')
const crypto = require('crypto')

// forgot password
router.get('/password_reset', (req, res) => res.render('machine_password_reset'))

// send confirmation emails
router.post('/password_reset', (req, res, next) => {
	// use waterfall to increase readability of the following callbacks
	async.waterfall(
		[
			function (done) {
				// generate random token
				crypto.randomBytes(20, (err, buf) => {
					let token = buf.toString('hex')
					done(err, token)
				})
			},
			function (token, done) {
				// find who made the request and assign the token to them
				User.findOne({ email: req.body.email }, (err, user) => {
					if (err) console.log(err)
					if (!user) {
						req.flash('error', "That account doesn't exist.")
						return res.redirect('/machinePassword/password_reset')
					}

					user.resetPasswordToken = token
					user.resetPasswordExpires = Date.now() + 3600000 // ms, 1hour

					user.save((err) => done(err, token, user))
				})
			},

			function (token, user, done) {
				// indicate email
				const transporter = nodemailer.createTransport({
					host: process.env.HOST, //Host
					port: process.env.PORT, // Port
					tls: {
						rejectUnauthorized: false,
					},
				})

				let mailOptions = {
					from: 'JCB-Equipment.LiveLink@jcb.com',
					to: user.email,
					subject: 'Reset your Password',
					text:
						'Hi ' +
						user.firstName +
						',\n\n' +
						"We've received a request to reset your password. If you didn't make the request, just ignore this email. Otherwise, you can reset your password using this link:\n\n" +
						'http://' +
						req.headers.host +
						'/machinePassword/reset/' +
						token +
						'\n\n' +
						'Thanks.\n' +
						'JCB Quality Uptime\n',
				}
				// send the email
				transporter.sendMail(mailOptions, (err) => {
					if (err) console.log(err)
					// console.log('mail sent');
					req.flash('success', 'An email has been sent to ' + user.email + ' with further instructions.')
					done(err, 'done')
				})
			},
		],
		(err) => {
			if (err) return next(err)
			res.redirect('/machinePassword/password_reset')
		}
	)
})

// reset password ($gt -> selects those documents where the value is greater than)
router.get('/reset/:token', (req, res) => {
	User.findOne(
		{
			resetPasswordToken: req.params.token,
			resetPasswordExpires: { $gt: Date.now() },
		},
		(err, user) => {
			if (err) console.log(err)
			if (!user) {
				req.flash('error', 'Password reset token is invalid or has expired.')
				res.redirect('machinePassword/password_reset')
			} else {
				res.render('machine_reset', { token: req.params.token })
			}
		}
	)
})

// update password
router.post('/reset/:token', (req, res) => {
	async.waterfall(
		[
			function (done) {
				User.findOne(
					{
						resetPasswordToken: req.params.token,
						resetPasswordExpires: { $gt: Date.now() },
					},
					(err, user) => {
						if (err) console.log(err)
						if (!user) {
							req.flash('error', 'Password reset token is invalid or has expired.')
							return res.redirect('/machinePassword/password_reset')
						}
						// check password and confirm password
						if (req.body.password === req.body.confirm) {
							// reset password using setPassword of passport-local-mongoose
							user.setPassword(req.body.password, (err) => {
								if (err) console.log(err)
								user.resetPasswordToken = null
								user.resetPasswordExpires = null

								user.save((err) => {
									if (err) console.log(err)
									req.logIn(user, (err) => {
										done(err, user)
									})
								})
							})
						} else {
							req.flash('error', 'Passwords do not match')
							return res.redirect('back')
						}
					}
				)
			},
			function (user, done) {
				const transporter = nodemailer.createTransport({
					host: process.env.HOST, //Host
					port: process.env.PORT, // Port
					tls: {
						rejectUnauthorized: false,
					},
				})
				let mailOptions = {
					from: 'JCB-Equipment.LiveLink@jcb.com',
					to: user.email,
					subject: 'Your Password has been changed',
					text:
						'Hi ' +
						user.firstName +
						',\n\n' +
						'This is a confirmation that the password for your account ' +
						user.email +
						'  has just been changed.\n\n' +
						'Thanks,\n' +
						'JCB Quality Uptime\n',
				}
				transporter.sendMail(mailOptions, (err) => {
					if (err) console.log(err)
					req.flash('success', 'Your password has been changed.')
					done(err)
				})
			},
		],
		(err) => {
			if (err) console.log(err)
			res.redirect('/equipment-monitoring/operations')
		}
	)
})

module.exports = router
