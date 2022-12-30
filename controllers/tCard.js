require('dotenv').config()
const TCard = require('../models/tCard')
const TCardUpdate = require('../models/tCardUpdate')
const Check = require('../models/check')
const Name = require('../models/name')
const Claim = require('../models/claim')
const User = require('../models/user')
const moment = require('moment')
const CronJob = require('cron').CronJob
const axios = require('axios')

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

module.exports.register = async (req, res, next) => {
	const { firstName, lastName, email, password, username } = req.body
	const { division } = req.params

	const createdBy = req.user._id
	// const createdBy = '6089821c3ab4c91a04e4ddf3'
	try {
		const lastPart = email.slice(-8).toLowerCase()
		if (lastPart === '@jcb.com') {
			const foundEmail = await User.findOne({
				email,
			})

			if (foundEmail) {
				req.flash('error', 'User already regsitered with this email')
				res.redirect(`/tCard/qcs-assign-card-users/${division}`)
				return
			}

			const user = new User({
				firstName,
				lastName,
				username,
				email,
			})

			await User.register(user, password)
			// req.login(registeredUser, (err) => {
			// 	if (err) return next(err)
			req.flash('success', 'User Created')
			res.redirect(`/tCard/qcs-assign-card-users/${division}`)
			//})
		} else {
			req.flash('error', 'Must be a JCB email address')
			res.redirect(`/tCard/qcs-assign-card-users/${division}`)
		}
	} catch (e) {
		req.flash('error', e.message)
		res.redirect(`/tCard/qcs-assign-card-users/${division}`)
	}
	// req.flash('success', 'User Created')
	// res.redirect('/equipment-monitoring/operations')
}

module.exports.renderLogin = (req, res) => {
	const { division } = req.params
	const area = 'paint'
	res.render('tCards/login', { division, area })
}

module.exports.login = (req, res) => {
	// req.flash('success', 'welcome back!')
	const redirectUrl = req.session.returnTo || '/tCard/operations'
	delete req.session.returnTo
	res.redirect(redirectUrl)
}
module.exports.renderLoginQCS = (req, res) => {
	const { division } = req.params
	const area = 'quality'
	res.render('tCards/login', { division, area })
}

module.exports.loginQCS = (req, res) => {
	const { division } = req.params
	// req.flash('success', 'welcome back!')
	const redirectUrl = req.session.returnTo || `/tCard/qcs/all-checks/${division}`
	delete req.session.returnTo
	res.redirect(redirectUrl)
}

module.exports.loginTraining = (req, res) => {
	// req.flash('success', 'welcome back!')
	const redirectUrl = req.session.returnTo || '/tCard/training'
	delete req.session.returnTo
	res.redirect(redirectUrl)
}

module.exports.logout = (req, res) => {
	req.logout()
	// req.flash('success', 'Goodbye!')
	res.redirect('/tCard/operations')
}
module.exports.logoutQCS = (req, res) => {
	const { division } = req.params
	req.logout()
	// req.flash('success', 'Goodbye!')
	res.redirect(`/tCard/qcs/all-checks/${division}`)
}

module.exports.divisionView = async (req, res) => {
	// get total number of checks completed  earth movers
	const totalEM = await TCard.countDocuments({
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		division: 'EM',
		location: { $ne: 'Validation' },
	})
	const totalEMOpen = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
		location: { $ne: 'Validation' },
	})

	const doneEM = totalEM - totalEMOpen

	const totalEMV = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		location: 'Validation',
	})
	const totalEMOpenV = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
		location: 'Validation',
	})

	const doneEMV = totalEMV - totalEMOpenV

	const totalSBEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSBEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBEM = totalSBEM - totalOpenSBEM

	const totalWEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
	})
	const totalOpenWEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Open',
	})
	const doneWEM = totalWEM - totalOpenWEM

	const totalOEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
	})
	const totalOpenOEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Open',
	})
	const doneOEM = totalOEM - totalOpenOEM

	const totalPEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
	})
	const totalOpenPEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Open',
	})
	const donePEM = totalPEM - totalOpenPEM

	const allEMChecks = await Check.find({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const EarthMoversUpdate = allEMChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlastEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintTEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintAEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOvenEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlastEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintTEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintAEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOvenEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Contained',
	})

	// total fails EM
	const totalFailsEarthMovers = await TCard.countDocuments({
		division: 'EM',
		status: 'Failed',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		location: { $ne: 'Validation' },
	})
	const totalContainedEarthMovers = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
		location: { $ne: 'Validation' },
	})
	// total fails loadall
	const totalFailsEarthMoversV = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
		location: 'Validation',
	})
	const totalContainedEarthMoversV = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
		location: 'Validation',
	})

	// get total number of checks completed  backhoe

	// 7 bay
	const totalBHL1 = await TCard.countDocuments({
		division: 'BHL',
		area: 'Paint Shop1',
		location: { $ne: 'Validation' },
	})
	const totalBHLOpen1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Open',
		area: 'Paint Shop1',
		location: { $ne: 'Validation' },
	})

	const doneBHL1 = totalBHL1 - totalBHLOpen1

	const totalBHLV1 = await TCard.countDocuments({
		division: 'BHL',
		area: 'Paint Shop1',
		location: 'Validation',
	})
	const totalBHLOpenV1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Open',
		area: 'Paint Shop1',
		location: 'Validation',
	})

	const doneBHLV1 = totalBHLV1 - totalBHLOpenV1

	const totalSBBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Shot Blast',
	})
	const totalOpenSBBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBBHL1 = totalSBBHL1 - totalOpenSBBHL1

	const totalWBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Wash',
	})
	const totalOpenWBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Wash',
		status: 'Open',
	})
	const doneWBHL1 = totalWBHL1 - totalOpenWBHL1

	const totalOBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Oven',
	})
	const totalOpenOBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Oven',
		status: 'Open',
	})
	const doneOBHL1 = totalOBHL1 - totalOpenOBHL1

	const totalPBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Paint',
	})
	const totalOpenPBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Paint',
		status: 'Open',
	})
	const donePBHL1 = totalPBHL1 - totalOpenPBHL1

	const failsShotBlastBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintTBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintABHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOvenBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlastBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintTBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintABHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOvenBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Paint',
		status: 'Contained',
	})

	// total fails BHL 7 bay
	const totalFailsBackhoe1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
		area: 'Paint Shop1',
		location: { $ne: 'Validation' },
	})
	const totalContainedBackhoe1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Contained',
		area: 'Paint Shop1',
		location: { $ne: 'Validation' },
	})
	// total fails loadall
	const totalFailsBackhoeV1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
		area: 'Paint Shop1',
		location: 'Validation',
	})
	const totalContainedBackhoeV1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Contained',
		area: 'Paint Shop1',
		location: 'Validation',
	})

	// 8 bay
	const totalBHL2 = await TCard.countDocuments({
		division: 'BHL',
		area: 'Paint Shop2',
		location: { $ne: 'Validation' },
	})
	const totalBHLOpen2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Open',
		area: 'Paint Shop2',
		location: { $ne: 'Validation' },
	})

	const doneBHL2 = totalBHL2 - totalBHLOpen2

	const totalBHLV2 = await TCard.countDocuments({
		division: 'BHL',
		area: 'Paint Shop2',
		location: 'Validation',
	})
	const totalBHLOpenV2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Open',
		area: 'Paint Shop2',
		location: 'Validation',
	})

	const doneBHLV2 = totalBHLV2 - totalBHLOpenV2

	const totalSBBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Shot Blast',
	})
	const totalOpenSBBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBBHL2 = totalSBBHL2 - totalOpenSBBHL2

	const totalWBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Wash',
	})
	const totalOpenWBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Wash',
		status: 'Open',
	})
	const doneWBHL2 = totalWBHL2 - totalOpenWBHL2

	const totalOBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Oven',
	})
	const totalOpenOBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Oven',
		status: 'Open',
	})
	const doneOBHL2 = totalOBHL2 - totalOpenOBHL2

	const totalPBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Paint',
	})
	const totalOpenPBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Paint',
		status: 'Open',
	})
	const donePBHL2 = totalPBHL2 - totalOpenPBHL2

	const failsShotBlastBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintTBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintABHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOvenBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlastBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintTBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintABHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOvenBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Paint',
		status: 'Contained',
	})

	// total fails BHL 8 bay
	const totalFailsBackhoe2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
		area: 'Paint Shop2',
		location: { $ne: 'Validation' },
	})
	const totalContainedBackhoe2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Contained',
		area: 'Paint Shop2',
		location: { $ne: 'Validation' },
	})
	// total fails loadall
	const totalFailsBackhoeV2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
		area: 'Paint Shop2',
		location: 'Validation',
	})
	const totalContainedBackhoeV2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Contained',
		area: 'Paint Shop2',
		location: 'Validation',
	})

	const allBHLChecks = await Check.find({
		division: 'BHL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const BackhoeUpdate = allBHLChecks[0] || []

	// get total number of checks completed  loadall
	const totalLoadall = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		location: { $ne: 'Validation' },
	})
	const totalLoadallOpen = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
		location: { $ne: 'Validation' },
	})

	const doneLoadall = totalLoadall - totalLoadallOpen

	const totalLoadallV = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		location: 'Validation',
	})
	const totalLoadallOpenV = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
		location: 'Validation',
	})

	const doneLoadallV = totalLoadallV - totalLoadallOpenV

	const totalSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSB = totalSB - totalOpenSB

	const totalW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
	})
	const totalOpenW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Open',
	})
	const doneW = totalW - totalOpenW

	const totalO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
	})
	const totalOpenO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Open',
	})
	const doneO = totalO - totalOpenO

	const totalP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
	})
	const totalOpenP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Open',
	})
	const doneP = totalP - totalOpenP

	const allLDLChecks = await Check.find({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const loadallUpdate = allLDLChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Failed',
	})
	const failsSixBaySB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Six Wheel Shot Blast',
		status: 'Failed',
	})
	// contained
	const containedSixBaySBShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Six Wheel Shot Blast',
		status: 'Contained',
	})
	const containedShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Contained',
	})

	//heavy stuff

	// get total number of checks completed  heavy

	const totalHeavy = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
	})
	const totalHeavyOpen = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
	})
	const doneHeavy = totalHeavy - totalHeavyOpen
	// get total number of checks completed  heavy

	const totalHeavyAttachments = await TCard.countDocuments({
		division: 'HP',
		area: 'Attachments',
		location: { $ne: 'Validation' },
	})
	const totalHeavyOpenAttachments = await TCard.countDocuments({
		division: 'HP',
		status: 'Open',
		area: 'Attachments',
		location: { $ne: 'Validation' },
	})
	const totalHeavyContainedAttachments = await TCard.countDocuments({
		division: 'HP',
		status: 'Contained',
		area: 'Attachments',
		location: { $ne: 'Validation' },
	})
	const totalHeavyFailedAttachments = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
		area: 'Attachments',
		location: { $ne: 'Validation' },
	})
	const totalHeavyContainedRevolver = await TCard.countDocuments({
		division: 'HP',
		status: 'Contained',
		area: 'Revolver',
		location: { $ne: 'Validation' },
	})
	const totalHeavyFailedRevolver = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
		area: 'Revolver',
		location: { $ne: 'Validation' },
	})
	const totalHeavyFailedSmallParts = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
		area: 'Small Parts',
		location: { $ne: 'Validation' },
	})

	const doneHeavyAttachments = totalHeavyAttachments - totalHeavyOpenAttachments

	const totalHeavyRevolver1 = await TCard.countDocuments({
		division: 'HP',
		area: 'Revolver',
		location: { $ne: 'Validation' },
	})
	const totalHeavyOpenRevolver1 = await TCard.countDocuments({
		division: 'HP',
		status: 'Open',
		area: 'Revolver',
		location: { $ne: 'Validation' },
	})
	const doneHeavyRevolver1 = totalHeavyRevolver1 - totalHeavyOpenRevolver1

	const totalHeavySmallParts = await TCard.countDocuments({
		division: 'HP',
		area: 'Small Parts',
		location: { $ne: 'Validation' },
	})
	const totalHeavyOpenSmallParts = await TCard.countDocuments({
		division: 'HP',
		status: 'Open',
		area: 'Small Parts',
		location: { $ne: 'Validation' },
	})

	const totalHeavyContainedSmallParts = await TCard.countDocuments({
		division: 'HP',
		status: 'Contained',
		area: 'Small Parts',
		location: { $ne: 'Validation' },
	})
	const doneHeavySmallParts = totalHeavySmallParts - totalHeavyOpenSmallParts

	const allHPChecks = await Check.find({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const heavyUpdate = allHPChecks[0] || []

	const totalAttSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
	})
	const totalAttOpenSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneAttSBHeavy = totalAttSBHeavy - totalAttOpenSBHeavy

	const totalAttPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
	})
	const totalAttOpenPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneAttPTHeavy = totalAttPTHeavy - totalAttOpenPTHeavy

	const totalAttPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
	})
	const totalAttOpenPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Open',
	})
	const doneAttPAHeavy = totalAttPAHeavy - totalAttOpenPAHeavy

	const totalAttOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
	})
	const totalAttOpenOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneAttOCHeavy = totalAttOCHeavy - totalAttOpenOCHeavy

	const totalAttVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
	})
	const totalAttOpenVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Open',
	})
	const doneAttVHeavy = totalAttVHeavy - totalAttOpenVHeavy

	// revolver
	const totalRSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
	})
	const totalROpenSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneRSBHeavy = totalRSBHeavy - totalROpenSBHeavy

	const totalRPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
	})
	const totalROpenPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneRPTHeavy = totalRPTHeavy - totalROpenPTHeavy

	const totalRPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
	})
	const totalROpenPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Open',
	})
	const doneRPAHeavy = totalRPAHeavy - totalROpenPAHeavy

	const totalROCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
	})
	const totalROpenOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneROCHeavy = totalROCHeavy - totalROpenOCHeavy

	const totalRVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
	})
	const totalROpenVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Open',
	})
	const doneRVHeavy = totalRVHeavy - totalROpenVHeavy

	// small parts
	const totalSPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
	})
	const totalOpenSPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneSPTHeavy = totalSPTHeavy - totalOpenSPTHeavy

	const totalSPVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
	})
	const totalOpenSPVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Open',
	})
	const doneSPVHeavy = totalSPVHeavy - totalOpenSPVHeavy

	// attachments failures
	const failsSBAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsPAAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Failed',
	})
	const failsOCAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Failed',
	})

	// revolver failures
	const failsSBRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsPARHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Failed',
	})
	const failsOCRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Failed',
	})
	// small parts failures
	const failsPTSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsVSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Failed',
	})
	// attachments contained
	const contSBAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contPAAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Contained',
	})
	const contOCAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Contained',
	})

	// revolver failures
	const contSBRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contPARHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Contained',
	})
	const contOCRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Contained',
	})
	// small parts failures
	const contPTSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contVSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Contained',
	})

	// compact stuff

	// get total number of checks completed  compact

	const totalCompact = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		location: { $ne: 'Validation' },
	})
	const totalCompactOpen = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
		location: { $ne: 'Validation' },
	})
	const doneCompact = totalCompact - totalCompactOpen

	const allCPChecks = await Check.find({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const compactUpdate = allCPChecks[0] || []

	const totalSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBCompact = totalSBCompact - totalOpenSBCompact

	const totalPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
	})
	const totalOpenPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const donePTCompact = totalPTCompact - totalOpenPTCompact

	const totalOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
	})
	const totalOpenOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneOCCompact = totalOCCompact - totalOpenOCCompact

	const totalVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
	})
	const totalOpenVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Open',
	})
	const doneVCompact = totalVCompact - totalOpenVCompact

	// compact failures
	const failsSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Failed',
	})
	// compact contained
	const contSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Contained',
	})

	//totals

	// total fails loadall
	const totalFailsLoadall = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
		location: { $ne: 'Validation' },
	})
	const totalContainedLoadall = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
		location: { $ne: 'Validation' },
	})
	// total fails loadall
	const totalFailsLoadallV = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
		location: 'Validation',
	})
	const totalContainedLoadallV = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
		location: 'Validation',
	})

	const doneLoadallPercent = Math.round((doneLoadall / totalLoadall) * 100)
	const toDoLoadallPercent = 100 - doneLoadallPercent

	// total fails Compact
	const totalFailsCompact = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
		location: { $ne: 'Validation' },
	})
	const totalContainedCompact = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
		location: { $ne: 'Validation' },
	})

	const doneCompactPercent = Math.round((doneCompact / totalCompact) * 100)
	const toDoCompactPercent = 100 - doneCompactPercent

	// total fails heavy
	const totalFailsHeavy = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const totalContainedHeavy = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
	})

	const totalHeavyAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
	})
	const totalHeavyDoneAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		status: { $ne: 'Open' },
	})
	const totalHeavyFailedAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		status: 'Failed',
	})
	const totalHeavyContainedAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		status: 'Contained',
	})
	const totalHeavyRevolver = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
	})
	const totalHeavyDoneRevolver = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		status: { $ne: 'Open' },
	})
	const totalHeavyFailedRevolver1 = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		status: 'Failed',
	})
	const totalHeavyContainedRevolver1 = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		status: 'Contained',
		location: { $ne: 'Validation' },
	})
	const totalHeavySAp = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
	})
	const totalHeavyDoneSp = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		status: { $ne: 'Open' },
	})

	const doneHeavyAttPercent = Math.round((totalHeavyDoneAtt / totalHeavyAtt) * 100)
	const toDoHeavyAttPercent = 100 - doneHeavyAttPercent

	const doneHeavyRevolverPercent = Math.round((totalHeavyDoneRevolver / totalHeavyRevolver) * 100)
	const toDoHeavyRevolverPercent = 100 - doneHeavyRevolverPercent

	const doneHeavySpPercent = Math.round((totalHeavyDoneSp / totalHeavySAp) * 100)
	const toDoHeavySpPercent = 100 - doneHeavySpPercent

	// get total number of checks completed  CabS
	const totalCabs = await TCard.countDocuments({
		division: 'CABS',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		location: { $ne: 'Validation' },
	})
	const totalCabsOpen = await TCard.countDocuments({
		division: 'CABS',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
		location: { $ne: 'Validation' },
	})
	const totalCabsContained = await TCard.countDocuments({
		division: 'CABS',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
		location: { $ne: 'Validation' },
	})
	const totalCabsFailed = await TCard.countDocuments({
		division: 'CABS',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
		location: { $ne: 'Validation' },
	})

	const doneCabs = totalCabs - totalCabsOpen

	const totalT1 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 1  Alkali cleaner',
	})
	const totalOpenT1 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 1  Alkali cleaner',
		status: 'Open',
	})
	const doneT1 = totalT1 - totalOpenT1

	const ContainedT1 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 1  Alkali cleaner',
		status: 'Contained',
	})
	const failedT1 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 1  Alkali cleaner',
		status: 'Failed',
	})

	// tank 2
	const totalT2 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 2  Alkali cleaner',
	})
	const totalOpenT2 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 2  Alkali cleaner',
		status: 'Open',
	})
	const doneT2 = totalT2 - totalOpenT2

	const ContainedT2 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 2  Alkali cleaner',
		status: 'Contained',
	})
	const failedT2 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 2  Alkali cleaner',
		status: 'Failed',
	})
	// tank 3

	const totalT3 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 3  Town’s water rinse',
	})
	const totalOpenT3 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 3  Town’s water rinse',
		status: 'Open',
	})
	const doneT3 = totalT3 - totalOpenT3

	const ContainedT3 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 3  Town’s water rinse',
		status: 'Contained',
	})
	const failedT3 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 3  Town’s water rinse',
		status: 'Failed',
	})

	// tank 5
	const totalT5 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 5  Acid descale',
	})
	const totalOpenT5 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 5  Acid descale',
		status: 'Open',
	})
	const doneT5 = totalT5 - totalOpenT5

	const ContainedT5 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 5  Acid descale',
		status: 'Contained',
	})
	const failedT5 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 5  Acid descale',
		status: 'Failed',
	})
	//Tank 6
	const totalT6 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 6  Ultrasonic descale',
	})
	const totalOpenT6 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 6  Ultrasonic descale',
		status: 'Open',
	})
	const doneT6 = totalT6 - totalOpenT6

	const ContainedT6 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 6  Ultrasonic descale',
		status: 'Contained',
	})
	const failedT6 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 6  Ultrasonic descale',
		status: 'Failed',
	})

	//Tank 7
	const totalT7 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 7  Alkali rinse',
	})
	const totalOpenT7 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 7  Alkali rinse',
		status: 'Open',
	})
	const doneT7 = totalT7 - totalOpenT7

	const ContainedT7 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 7  Alkali rinse',
		status: 'Contained',
	})
	const failedT7 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 7  Alkali rinse',
		status: 'Failed',
	})
	//Tank 10
	const totalT10 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 10 RO Water rinse',
	})
	const totalOpenT10 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 10 RO Water rinse',
		status: 'Open',
	})
	const doneT10 = totalT10 - totalOpenT10

	const ContainedT10 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 10 RO Water rinse',
		status: 'Contained',
	})
	const failedT10 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 10 RO Water rinse',
		status: 'Failed',
	})

	// tank 11
	const totalT11 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 11 Oxsilan conversion',
	})
	const totalOpenT11 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 11 Oxsilan conversion',
		status: 'Open',
	})
	const doneT11 = totalT11 - totalOpenT11

	const ContainedT11 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 11 Oxsilan conversion',
		status: 'Contained',
	})
	const failedT11 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 11 Oxsilan conversion',
		status: 'Failed',
	})

	//tank 12
	const totalT12 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 12 RO Water rinse',
	})
	const totalOpenT12 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 12 RO Water rinse',
		status: 'Open',
	})
	const doneT12 = totalT12 - totalOpenT12

	const ContainedT12 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 12 RO Water rinse',
		status: 'Contained',
	})
	const failedT12 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 12 RO Water rinse',
		status: 'Failed',
	})
	//tank 13
	const totalT13 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 13 RO Water rinse',
	})
	const totalOpenT13 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 13 RO Water rinse',
		status: 'Open',
	})
	const doneT13 = totalT13 - totalOpenT13

	const ContainedT13 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 13 RO Water rinse',
		status: 'Contained',
	})
	const failedT13 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 13 RO Water rinse',
		status: 'Failed',
	})

	//tank 14
	const totalT14 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 14 RO Water rinse',
	})
	const totalOpenT14 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 14 RO Water rinse',
		status: 'Open',
	})
	const doneT14 = totalT14 - totalOpenT14

	const ContainedT14 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 14 RO Water rinse',
		status: 'Contained',
	})
	const failedT14 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 14 RO Water rinse',
		status: 'Failed',
	})

	//tank 15
	const totalT15 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 15 E-Coat',
	})
	const totalOpenT15 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 15 E-Coat',
		status: 'Open',
	})
	const doneT15 = totalT15 - totalOpenT15

	const ContainedT15 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 15 E-Coat',
		status: 'Contained',
	})
	const failedT15 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 15 E-Coat',
		status: 'Failed',
	})

	//ro tank
	const totalTRO = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment RO Tank',
	})
	const totalOpenTRO = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment RO Tank',
		status: 'Open',
	})
	const doneTRO = totalTRO - totalOpenTRO

	const ContainedTRO = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment RO Tank',
		status: 'Contained',
	})
	const failedTRO = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment RO Tank',
		status: 'Failed',
	})

	// boiler

	const totalBoiler = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Boiler',
	})
	const totalOpenBoiler = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Boiler',
		status: 'Open',
	})
	const doneBoiler = totalBoiler - totalOpenBoiler

	const ContainedBoiler = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Boiler',
		status: 'Contained',
	})
	const failedBoiler = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Boiler',
		status: 'Failed',
	})

	//other
	const totalOther = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Other',
	})
	const totalOpenOther = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Other',
		status: 'Open',
	})
	const doneOther = totalOther - totalOpenOther

	const ContainedOther = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Other',
		status: 'Contained',
	})
	const failedOther = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Other',
		status: 'Failed',
	})
	//ovens
	const totalOvens = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Ovens',
	})
	const totalOpenOvens = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Ovens',
		status: 'Open',
	})
	const doneOvens = totalOvens - totalOpenOvens

	const ContainedOvens = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Ovens',
		status: 'Contained',
	})
	const failedOvens = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Ovens',
		status: 'Failed',
	})

	// paint kitchen

	const totalPaintKitchen = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint Kitchen',
	})
	const totalOpenPaintKitchen = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint Kitchen',
		status: 'Open',
	})
	const donePaintKitchen = totalPaintKitchen - totalOpenPaintKitchen

	const ContainedPaintKitchen = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint Kitchen',
		status: 'Contained',
	})
	const failedPaintKitchen = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint Kitchen',
		status: 'Failed',
	})

	// validation

	const totalCabsValidation = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
	})
	const totalOpenCabsValidation = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Open',
	})
	const doneCabsValidation = totalCabsValidation - totalOpenCabsValidation

	const ContainedCabsValidation = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Contained',
	})
	const failedCabsValidation = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Failed',
	})

	const allCabsChecks = await Check.find({
		division: 'CABS',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const cabsUpdate = allCabsChecks[0] || []

	//HBU

	// get total number of checks completed  heavy

	const totalHBUAuto = await TCard.countDocuments({
		division: 'HBU',
		area: 'Auto Paint Line',
		location: { $ne: 'Validation' },
	})
	const totalHBUOpenAuto = await TCard.countDocuments({
		division: 'HBU',
		status: 'Open',
		area: 'Auto Paint Line',
		location: { $ne: 'Validation' },
	})
	const totalHBUContainedAuto = await TCard.countDocuments({
		division: 'HBU',
		status: 'Contained',
		area: 'Auto Paint Line',
		location: { $ne: 'Validation' },
	})
	const totalHBUFailedAuto = await TCard.countDocuments({
		division: 'HBU',
		status: 'Failed',
		area: 'Auto Paint Line',
		location: { $ne: 'Validation' },
	})
	const totalHBUContainedOffline = await TCard.countDocuments({
		division: 'HBU',
		status: 'Contained',
		area: 'Offline Paint',
		location: { $ne: 'Validation' },
	})
	const totalHBUFailedOffline = await TCard.countDocuments({
		division: 'HBU',
		status: 'Failed',
		area: 'Offline Paint',
		location: { $ne: 'Validation' },
	})
	const totalHBUContainedOfflineV = await TCard.countDocuments({
		division: 'HBU',
		status: 'Contained',
		area: 'Offline Paint',
		location: 'Validation',
	})
	const totalHBUFailedOfflineV = await TCard.countDocuments({
		division: 'HBU',
		status: 'Failed',
		area: 'Offline Paint',
		location: 'Validation',
	})
	const totalHBUContainedPaintPlant = await TCard.countDocuments({
		division: 'HBU',
		status: 'Contained',
		area: 'Paint Plant',
	})
	const totalHBUFailedPaintPlant = await TCard.countDocuments({
		division: 'HBU',
		status: 'Failed',
		area: 'Paint Plant',
	})

	const doneHBUAuto = totalHBUAuto - totalHBUOpenAuto

	const totalHBUOffline = await TCard.countDocuments({
		division: 'HBU',
		area: 'Offline Paint',
		location: { $ne: 'Validation' },
	})
	const totalHBUOpenOffline = await TCard.countDocuments({
		division: 'HBU',
		status: 'Open',
		area: 'Offline Paint',
		location: { $ne: 'Validation' },
	})
	const doneHBUOffline = totalHBUOffline - totalHBUOpenOffline

	const totalHBUOfflineV = await TCard.countDocuments({
		division: 'HBU',
		area: 'Offline Paint',
		location: 'Validation',
	})
	const totalHBUOpenOfflineV = await TCard.countDocuments({
		division: 'HBU',
		status: 'Open',
		area: 'Offline Paint',
		location: 'Validation',
	})
	const doneHBUOfflineV = totalHBUOfflineV - totalHBUOpenOfflineV

	const totalHBUPaintPlant = await TCard.countDocuments({
		division: 'HBU',
		area: 'Paint Plant',
	})
	const totalHBUOpenPaintPlant = await TCard.countDocuments({
		division: 'HBU',
		status: 'Open',
		area: 'Paint Plant',
	})
	const doneHBUPaintPlant = totalHBUPaintPlant - totalHBUOpenPaintPlant

	// Pre treatment operator

	const totalHBUPreTreatmentOperator = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment Operator',
	})
	const totalOpenHBUPreTreatmentOperator = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment Operator',
		status: 'Open',
	})
	const doneHBUPreTreatmentOperator = totalHBUPreTreatmentOperator - totalOpenHBUPreTreatmentOperator

	const ContainedHBUPreTreatmentOperator = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment Operator',
		status: 'Contained',
	})
	const failedHBUPreTreatmentOperator = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment Operator',
		status: 'Failed',
	})

	// pre treatment Tech

	const totalHBUPreTreatmentTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment',
	})
	const totalOpenHBUPreTreatmentTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneHBUPreTreatmentTech = totalHBUPreTreatmentTech - totalOpenHBUPreTreatmentTech

	const ContainedHBUPreTreatmentTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const failedHBUPreTreatmentTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment',
		status: 'Failed',
	})

	//paint booth operator

	const totalHBUPreTreatmentPaintBoothOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth Operator',
	})
	const totalOpenHBUPreTreatmentPaintBoothOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth Operator',
		status: 'Open',
	})
	const doneHBUPreTreatmentPaintBoothOp = totalHBUPreTreatmentPaintBoothOp - totalOpenHBUPreTreatmentPaintBoothOp

	const ContainedHBUPreTreatmentPaintBoothOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth Operator',
		status: 'Contained',
	})
	const failedHBUPreTreatmentPaintBoothOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth Operator',
		status: 'Failed',
	})

	//paint booth tech

	const totalHBUPreTreatmentPaintBoothTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth',
	})
	const totalOpenHBUPreTreatmentPaintBoothTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth',
		status: 'Open',
	})
	const doneHBUPreTreatmentPaintBoothTech = totalHBUPreTreatmentPaintBoothTech - totalOpenHBUPreTreatmentPaintBoothTech

	const ContainedHBUPreTreatmentPaintBoothTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth',
		status: 'Contained',
	})
	const failedHBUPreTreatmentPaintBoothTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth',
		status: 'Failed',
	})

	//ovens curing oven

	const totalHBUPreTreatmentOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Curing Oven',
	})
	const totalOpenHBUPreTreatmentOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Curing Oven',
		status: 'Open',
	})
	const doneHBUPreTreatmentOvenCuringOven = totalHBUPreTreatmentOvenCuringOven - totalOpenHBUPreTreatmentOvenCuringOven

	const ContainedHBUPreTreatmentOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Curing Oven',
		status: 'Contained',
	})
	const failedHBUPreTreatmentOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Curing Oven',
		status: 'Failed',
	})

	//ovens drying oven

	const totalHBUPreTreatmentOvenDryingOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Drying Oven',
	})
	const totalOpenHBUPreTreatmentOvenDryingOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Drying Oven',
		status: 'Open',
	})
	const doneHBUPreTreatmentOvenDryingOven = totalHBUPreTreatmentOvenDryingOven - totalOpenHBUPreTreatmentOvenDryingOven

	const ContainedHBUPreTreatmentOvenDryingOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Drying Oven',
		status: 'Contained',
	})
	const failedHBUPreTreatmentOvenDryingOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Drying Oven',
		status: 'Failed',
	})

	// manipulator operator

	const totalHBUPreTreatmentManipulatorOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator Operator',
	})
	const totalOpenHBUPreTreatmentManipulatorOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator Operator',
		status: 'Open',
	})
	const doneHBUPreTreatmentManipulatorOp = totalHBUPreTreatmentManipulatorOp - totalOpenHBUPreTreatmentManipulatorOp

	const ContainedHBUPreTreatmentManipulatorOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator Operator',
		status: 'Contained',
	})
	const failedHBUPreTreatmentManipulatorOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator Operator',
		status: 'Failed',
	})

	// manipulator tech

	const totalHBUPreTreatmentManipulatorTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator',
	})
	const totalOpenHBUPreTreatmentManipulatorTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator',
		status: 'Open',
	})
	const doneHBUPreTreatmentManipulatorTech = totalHBUPreTreatmentManipulatorTech - totalOpenHBUPreTreatmentManipulatorTech

	const ContainedHBUPreTreatmentManipulatorTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator',
		status: 'Contained',
	})
	const failedHBUPreTreatmentManipulatorTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator',
		status: 'Failed',
	})

	//track
	const totalHBUPreTreatmentTrack = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Track',
	})
	const totalOpenHBUPreTreatmentTrack = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Track',
		status: 'Open',
	})
	const doneHBUPreTreatmentTrack = totalHBUPreTreatmentTrack - totalOpenHBUPreTreatmentTrack

	const ContainedHBUPreTreatmentTrack = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Track',
		status: 'Contained',
	})
	const failedHBUPreTreatmentTrack = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Track',
		status: 'Failed',
	})

	// validation
	const totalHBUPreTreatmentValidation = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Validation',
	})
	const totalOpenHBUPreTreatmentValidation = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Validation',
		status: 'Open',
	})
	const doneHBUPreTreatmentValidation = totalHBUPreTreatmentValidation - totalOpenHBUPreTreatmentValidation

	const ContainedHBUPreTreatmentValidation = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Validation',
		status: 'Contained',
	})
	const failedHBUPreTreatmentValidation = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Validation',
		status: 'Failed',
	})

	// offline pre treatment operator
	const totalHBUOfflineOOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment Operator',
	})
	const totalOpenHBUOfflineOOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment Operator',
		status: 'Open',
	})
	const doneHBUOfflineOOp = totalHBUOfflineOOp - totalOpenHBUOfflineOOp

	const ContainedHBUOfflineOOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment Operator',
		status: 'Contained',
	})
	const failedHBUOfflineOOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment Operator',
		status: 'Failed',
	})

	// offline pre treatment tech
	const totalHBUOfflineOTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment',
	})
	const totalOpenHBUOfflineOTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneHBUOfflineOTech = totalHBUOfflineOTech - totalOpenHBUOfflineOTech

	const ContainedHBUOfflineOTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const failedHBUOfflineOTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment',
		status: 'Failed',
	})

	//paint booth operator
	const totalHBUOfflinePBOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth Operator',
	})
	const totalOpenHBUOfflinePBOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth Operator',
		status: 'Open',
	})
	const doneHBUOfflinePBOp = totalHBUOfflinePBOp - totalOpenHBUOfflinePBOp

	const ContainedHBUOfflinePBOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth Operator',
		status: 'Contained',
	})
	const failedHBUOfflinePBOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth Operator',
		status: 'Failed',
	})

	//paint booth tech
	const totalHBUOfflinePBTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth',
	})
	const totalOpenHBUOfflinePBTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth',
		status: 'Open',
	})
	const doneHBUOfflinePBTech = totalHBUOfflinePBTech - totalOpenHBUOfflinePBTech

	const ContainedHBUOfflinePBTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth',
		status: 'Contained',
	})
	const failedHBUOfflinePBTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth',
		status: 'Failed',
	})

	//ovens curing oven

	const totalHBUOfflineOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Ovens Curing Oven',
	})
	const totalOpenHBUOfflineOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Ovens Curing Oven',
		status: 'Open',
	})
	const doneHBUOfflineOvenCuringOven = totalHBUOfflineOvenCuringOven - totalOpenHBUOfflineOvenCuringOven

	const ContainedHBUOfflineOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Ovens Curing Oven',
		status: 'Contained',
	})
	const failedHBUOfflineOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Ovens Curing Oven',
		status: 'Failed',
	})

	//hoist operator

	const totalHBUOfflineHoistOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist Operator',
	})
	const totalOpenHBUOfflineHoistOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist Operator',
		status: 'Open',
	})
	const doneHBUOfflineHoistOp = totalHBUOfflineHoistOp - totalOpenHBUOfflineHoistOp

	const ContainedHBUOfflineHoistOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist Operator',
		status: 'Contained',
	})
	const failedHBUOfflineHoistOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist Operator',
		status: 'Failed',
	})

	//hoist tech

	const totalHBUOfflineHoistTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist',
	})
	const totalOpenHBUOfflineHoistTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist',
		status: 'Open',
	})
	const doneHBUOfflineHoistTech = totalHBUOfflineHoistTech - totalOpenHBUOfflineHoistTech

	const ContainedHBUOfflineHoistTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist',
		status: 'Contained',
	})
	const failedHBUOfflineHoistTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist',
		status: 'Failed',
	})

	// paint paint kitchen

	const totalHBUPaintPlantPK = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Paint Paint',
		location: 'Paint Kitchen',
	})
	const totalOpenHBUPaintPlantPK = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Paint Paint',
		location: 'Paint Kitchen',
		status: 'Open',
	})
	const doneHBUPaintPlantPK = totalHBUPaintPlantPK - totalOpenHBUPaintPlantPK

	const ContainedHBUPaintPlantPK = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Paint Paint',
		location: 'Paint Kitchen',
		status: 'Contained',
	})
	const failedHBUPaintPlantPK = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Paint Paint',
		location: 'Paint Kitchen',
		status: 'Failed',
	})

	const tCardsHBU = await TCard.find({
		division: 'HBU',
		area: {
			$in: ['Auto Paint Line', 'Offline Paint', 'Paint Plant'],
		},
	}).populate({
		path: 'checks',
		options: { sort: { _id: -1 } },
		perDocumentLimit: 1,
	})

	let allHBUChecks = []
	for (let card of tCardsHBU) {
		card.checks.forEach(function (check) {
			if (check.checkedBy) {
				allHBUChecks.push(check)
			}
		})
	}

	allHBUChecks.sort((a, b) => b.createdAt - a.createdAt)

	const HBUUpdate = allHBUChecks[0] || []

	// CABS PT
	const totalPreTCabs =
		totalT1 +
		totalT2 +
		totalT3 +
		totalT5 +
		totalT6 +
		totalT7 +
		totalT10 +
		totalT11 +
		totalT12 +
		totalT13 +
		totalT14 +
		totalT15 +
		totalTRO +
		totalBoiler +
		totalOther

	const totalDonePreTCabs =
		doneT1 + doneT2 + doneT3 + doneT5 + doneT6 + doneT7 + doneT10 + doneT11 + doneT12 + doneT13 + doneT14 + doneT15 + doneTRO + doneBoiler + doneOther

	const totalContainedPreTCabs =
		ContainedT1 +
		ContainedT2 +
		ContainedT3 +
		ContainedT5 +
		ContainedT6 +
		ContainedT7 +
		ContainedT10 +
		ContainedT11 +
		ContainedT12 +
		ContainedT13 +
		ContainedT14 +
		ContainedT15 +
		ContainedTRO +
		ContainedBoiler +
		ContainedOther

	const totalFailedPreTCabs =
		failedT1 +
		failedT2 +
		failedT3 +
		failedT5 +
		failedT6 +
		failedT7 +
		failedT10 +
		failedT11 +
		failedT12 +
		failedT13 +
		failedT14 +
		failedT15 +
		failedTRO +
		failedBoiler +
		failedOther

	const failedsixBaySB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Six Wheel Shot Blast',
		status: 'Failed',
	})
	const contsinedsixBaySB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Six Wheel Shot Blast',
		status: 'Contained',
	})

	const totalSixBaySB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Six Wheel Shot Blast',
	})
	const totalOpenSixBaySB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Six Wheel Shot Blast',
		status: 'Open',
	})

	const doneSixBaySB = totalSixBaySB - totalOpenSixBaySB

	const area = 'paint'

	res.render('tCards/division-view', {
		failedsixBaySB,
		contsinedsixBaySB,
		totalSixBaySB,
		doneSixBaySB,

		area,
		totalPreTCabs,
		totalDonePreTCabs,
		totalContainedPreTCabs,
		totalFailedPreTCabs,
		// compact
		totalCompact,
		doneCompact,
		totalSBCompact,
		doneSBCompact,
		totalPTCompact,
		donePTCompact,
		totalOCCompact,
		doneOCCompact,
		totalVCompact,
		doneVCompact,
		failsSBCompact,
		failsPTCompact,
		failsOCCompact,
		failsVCompact,
		contSBCompact,
		contPTCompact,
		contOCCompact,
		contVCompact,
		compactUpdate,
		totalFailsCompact,
		totalContainedCompact,
		doneCompactPercent,
		toDoCompactPercent,

		// loadall

		totalFailsLoadallV,
		totalContainedLoadallV,
		doneLoadallV,
		totalLoadallV,
		totalLoadall,
		doneLoadall,
		failsShotBlast,
		failsPaintT,
		failsPaintA,
		failsOven,
		containedShotBlast,
		containedPaintT,
		containedPaintA,
		containedOven,
		doneSB,
		totalSB,
		doneW,
		totalW,
		doneO,
		totalO,
		doneP,
		totalP,
		loadallUpdate,
		totalFailsLoadall,
		totalContainedLoadall,
		doneLoadallPercent,
		toDoLoadallPercent,

		//earth movers
		totalFailsEarthMoversV,
		totalContainedEarthMoversV,
		doneEMV,
		totalEMV,
		totalEM,
		doneEM,
		failsShotBlastEM,
		failsPaintTEM,
		failsPaintAEM,
		failsOvenEM,
		containedShotBlastEM,
		containedPaintTEM,
		containedPaintAEM,
		containedOvenEM,
		doneSBEM,
		totalSBEM,
		doneWEM,
		totalWEM,
		doneOEM,
		totalOEM,
		donePEM,
		totalPEM,
		EarthMoversUpdate,
		totalFailsEarthMovers,
		totalContainedEarthMovers,

		//bhl
		//7 bay
		totalFailsBackhoeV1,
		totalContainedBackhoeV1,
		doneBHLV1,
		totalBHLV1,
		totalBHL1,
		doneBHL1,
		failsShotBlastBHL1,
		failsPaintTBHL1,
		failsPaintABHL1,
		failsOvenBHL1,
		containedShotBlastBHL1,
		containedPaintTBHL1,
		containedPaintABHL1,
		containedOvenBHL1,
		doneSBBHL1,
		totalSBBHL1,
		doneWBHL1,
		totalWBHL1,
		doneOBHL1,
		totalOBHL1,
		donePBHL1,
		totalPBHL1,
		BackhoeUpdate,
		totalFailsBackhoe1,
		totalContainedBackhoe1,

		//8 bay
		totalFailsBackhoeV2,
		totalContainedBackhoeV2,
		doneBHLV2,
		totalBHLV2,
		totalBHL2,
		doneBHL2,
		failsShotBlastBHL2,
		failsPaintTBHL2,
		failsPaintABHL2,
		failsOvenBHL2,
		containedShotBlastBHL2,
		containedPaintTBHL2,
		containedPaintABHL2,
		containedOvenBHL2,
		doneSBBHL2,
		totalSBBHL2,
		doneWBHL2,
		totalWBHL2,
		doneOBHL2,
		totalOBHL2,
		donePBHL2,
		totalPBHL2,
		totalFailsBackhoe2,
		totalContainedBackhoe2,

		BackhoeUpdate,

		// heavy
		totalHeavy,
		doneHeavy,
		totalHeavyAttachments,
		doneHeavyAttachments,
		totalHeavyRevolver1,
		doneHeavyRevolver1,
		totalHeavySmallParts,
		doneHeavySmallParts,
		totalHeavyContainedAttachments,
		totalHeavyFailedAttachments,
		totalHeavyContainedRevolver,
		totalHeavyFailedRevolver,
		totalHeavyContainedSmallParts,
		totalHeavyFailedSmallParts,
		heavyUpdate,
		// attachments
		doneAttSBHeavy,
		totalAttSBHeavy,
		doneAttPTHeavy,
		totalAttPTHeavy,
		doneAttPAHeavy,
		totalAttPAHeavy,
		doneAttOCHeavy,
		totalAttOCHeavy,
		doneAttVHeavy,
		totalAttVHeavy,
		failsSBAttHeavy,
		failsPTAttHeavy,
		failsPAAttHeavy,
		failsOCAttHeavy,
		failsVAttHeavy,
		contSBAttHeavy,
		contPTAttHeavy,
		contPAAttHeavy,
		contOCAttHeavy,
		contVAttHeavy,
		// revolver
		doneRSBHeavy,
		totalRSBHeavy,
		doneRPTHeavy,
		totalRPTHeavy,
		doneRPAHeavy,
		totalRPAHeavy,
		doneROCHeavy,
		totalROCHeavy,
		doneRVHeavy,
		totalRVHeavy,
		failsSBRHeavy,
		failsPTRHeavy,
		failsPARHeavy,
		failsOCRHeavy,
		failsVRHeavy,
		contSBRHeavy,
		contPTRHeavy,
		contPARHeavy,
		contOCRHeavy,
		contVRHeavy,
		// small parts
		doneSPTHeavy,
		totalOpenSPTHeavy,
		doneSPVHeavy,
		totalOpenSPVHeavy,
		failsPTSPHeavy,
		failsVSPHeavy,
		contPTSPHeavy,
		contVSPHeavy,
		totalSPTHeavy,
		totalSPVHeavy,

		doneHeavyAttPercent,
		toDoHeavyAttPercent,
		doneHeavyRevolverPercent,
		toDoHeavyRevolverPercent,
		doneHeavySpPercent,
		toDoHeavySpPercent,
		totalFailsHeavy,
		totalContainedHeavy,
		totalHeavyDoneAtt,
		totalHeavyAtt,
		totalHeavyDoneRevolver,
		totalHeavyRevolver,
		totalHeavyDoneSp,
		totalHeavySAp,
		totalHBUFailedOfflineV,
		totalHBUContainedOfflineV,
		doneHBUOfflineV,
		totalHBUOfflineV,

		// HBU
		HBUUpdate,
		totalHBUAuto,
		doneHBUAuto,
		totalHBUOffline,
		doneHBUOffline,
		totalHBUPaintPlant,
		doneHBUPaintPlant,
		totalHBUContainedAuto,
		totalHBUFailedAuto,
		totalHBUContainedOffline,
		totalHBUFailedOffline,
		totalHBUContainedPaintPlant,
		totalHBUFailedPaintPlant,

		totalHBUPreTreatmentOperator,
		doneHBUPreTreatmentOperator,
		ContainedHBUPreTreatmentOperator,
		failedHBUPreTreatmentOperator,
		totalHBUPreTreatmentTech,
		doneHBUPreTreatmentTech,
		ContainedHBUPreTreatmentTech,
		failedHBUPreTreatmentTech,
		totalHBUPreTreatmentPaintBoothOp,
		doneHBUPreTreatmentPaintBoothOp,
		ContainedHBUPreTreatmentPaintBoothOp,
		failedHBUPreTreatmentPaintBoothOp,
		totalHBUPreTreatmentPaintBoothTech,
		doneHBUPreTreatmentPaintBoothTech,
		ContainedHBUPreTreatmentPaintBoothTech,
		failedHBUPreTreatmentPaintBoothTech,
		totalHBUPreTreatmentOvenCuringOven,
		doneHBUPreTreatmentOvenCuringOven,
		ContainedHBUPreTreatmentOvenCuringOven,
		failedHBUPreTreatmentOvenCuringOven,
		totalHBUPreTreatmentOvenDryingOven,
		doneHBUPreTreatmentOvenDryingOven,
		ContainedHBUPreTreatmentOvenDryingOven,
		failedHBUPreTreatmentOvenDryingOven,
		totalHBUPreTreatmentManipulatorOp,
		doneHBUPreTreatmentManipulatorOp,
		ContainedHBUPreTreatmentManipulatorOp,
		failedHBUPreTreatmentManipulatorOp,
		totalHBUPreTreatmentManipulatorTech,
		doneHBUPreTreatmentManipulatorTech,
		ContainedHBUPreTreatmentManipulatorTech,
		failedHBUPreTreatmentManipulatorTech,
		totalHBUPreTreatmentTrack,
		doneHBUPreTreatmentTrack,
		ContainedHBUPreTreatmentTrack,
		failedHBUPreTreatmentTrack,
		totalHBUPreTreatmentValidation,
		doneHBUPreTreatmentValidation,
		ContainedHBUPreTreatmentValidation,
		failedHBUPreTreatmentValidation,

		totalHBUOfflineOOp,
		doneHBUOfflineOOp,
		ContainedHBUOfflineOOp,
		failedHBUOfflineOOp,
		totalHBUOfflineOTech,
		doneHBUOfflineOTech,
		ContainedHBUOfflineOTech,
		failedHBUOfflineOTech,
		totalHBUOfflinePBOp,
		doneHBUOfflinePBOp,
		ContainedHBUOfflinePBOp,
		failedHBUOfflinePBOp,
		totalHBUOfflinePBTech,
		doneHBUOfflinePBTech,
		ContainedHBUOfflinePBTech,
		failedHBUOfflinePBTech,
		totalHBUOfflineOvenCuringOven,
		doneHBUOfflineOvenCuringOven,
		ContainedHBUOfflineOvenCuringOven,
		failedHBUOfflineOvenCuringOven,
		totalHBUOfflineHoistOp,
		doneHBUOfflineHoistOp,
		ContainedHBUOfflineHoistOp,
		failedHBUOfflineHoistOp,
		totalHBUOfflineHoistTech,
		doneHBUOfflineHoistTech,
		ContainedHBUOfflineHoistTech,
		failedHBUOfflineHoistTech,
		totalHBUPaintPlantPK,
		doneHBUPaintPlantPK,
		ContainedHBUPaintPlantPK,
		failedHBUPaintPlantPK,

		// cabs
		cabsUpdate,
		totalCabs,
		doneCabs,
		totalCabsContained,
		totalCabsFailed,
		totalT1,
		doneT1,
		ContainedT1,
		failedT1,
		totalT2,
		doneT2,
		ContainedT2,
		failedT2,
		totalT3,
		doneT3,
		ContainedT3,
		failedT3,
		totalT5,
		doneT5,
		ContainedT5,
		failedT5,
		totalT6,
		doneT6,
		ContainedT6,
		failedT6,
		totalT7,
		doneT7,
		ContainedT7,
		failedT7,
		totalT10,
		doneT10,
		ContainedT10,
		failedT10,
		totalT11,
		doneT11,
		ContainedT11,
		failedT11,
		totalT12,
		doneT12,
		ContainedT12,
		failedT12,
		totalT13,
		doneT13,
		ContainedT13,
		failedT13,
		totalT14,
		doneT14,
		ContainedT14,
		failedT14,
		totalT15,
		doneT15,
		ContainedT15,
		failedT15,
		totalTRO,
		doneTRO,
		ContainedTRO,
		failedTRO,
		totalBoiler,
		doneBoiler,
		ContainedBoiler,
		failedBoiler,
		totalOther,
		doneOther,
		ContainedOther,
		failedOther,
		totalOvens,
		doneOvens,
		ContainedOvens,
		failedOvens,
		donePaintKitchen,
		totalPaintKitchen,
		ContainedPaintKitchen,
		failedPaintKitchen,
		totalCabsValidation,
		doneCabsValidation,
		ContainedCabsValidation,
		failedCabsValidation,

		totalHeavyFailedAtt,

		totalHeavyContainedAtt,
		totalHeavyFailedRevolver1,
		totalHeavyContainedRevolver1,
	})
}

//v3

module.exports.divisionV3 = async (req, res) => {
	// get total number of checks completed  earth movers
	const totalEM = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		location: { $ne: 'Validation' },
	})
	const totalEMOpen = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
		location: { $ne: 'Validation' },
	})

	const doneEM = totalEM - totalEMOpen

	const totalEMV = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		location: 'Validation',
	})
	const totalEMOpenV = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
		location: 'Validation',
	})

	const doneEMV = totalEMV - totalEMOpenV

	const totalSBEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSBEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBEM = totalSBEM - totalOpenSBEM

	const totalWEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
	})
	const totalOpenWEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Open',
	})
	const doneWEM = totalWEM - totalOpenWEM

	const totalOEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
	})
	const totalOpenOEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Open',
	})
	const doneOEM = totalOEM - totalOpenOEM

	const totalPEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
	})
	const totalOpenPEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Open',
	})
	const donePEM = totalPEM - totalOpenPEM

	const allEMChecks = await Check.find({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const EarthMoversUpdate = allEMChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlastEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintTEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintAEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOvenEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlastEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintTEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintAEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOvenEM = await TCard.countDocuments({
		division: 'EM',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Contained',
	})

	// total fails EM
	const totalFailsEarthMovers = await TCard.countDocuments({
		division: 'EM',

		status: 'Failed',
		location: { $ne: 'Validation' },
	})
	const totalContainedEarthMovers = await TCard.countDocuments({
		division: 'EM',
		status: 'Contained',
		location: { $ne: 'Validation' },
	})
	// total fails loadall
	const totalFailsEarthMoversV = await TCard.countDocuments({
		division: 'EM',
		status: 'Failed',
		location: 'Validation',
	})
	const totalContainedEarthMoversV = await TCard.countDocuments({
		division: 'EM',
		status: 'Contained',
		location: 'Validation',
	})

	// get total number of checks completed  backhoe

	// 7 bay
	const totalBHL1 = await TCard.countDocuments({
		division: 'BHL',
		area: 'Paint Shop1',
		location: { $ne: 'Validation' },
	})
	const totalBHLOpen1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Open',
		area: 'Paint Shop1',
		location: { $ne: 'Validation' },
	})

	const doneBHL1 = totalBHL1 - totalBHLOpen1

	const totalBHLV1 = await TCard.countDocuments({
		division: 'BHL',
		area: 'Paint Shop1',
		location: 'Validation',
	})
	const totalBHLOpenV1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Open',
		area: 'Paint Shop1',
		location: 'Validation',
	})

	const doneBHLV1 = totalBHLV1 - totalBHLOpenV1

	const totalSBBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Shot Blast',
	})
	const totalOpenSBBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBBHL1 = totalSBBHL1 - totalOpenSBBHL1

	const totalWBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Wash',
	})
	const totalOpenWBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Wash',
		status: 'Open',
	})
	const doneWBHL1 = totalWBHL1 - totalOpenWBHL1

	const totalOBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Oven',
	})
	const totalOpenOBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Oven',
		status: 'Open',
	})
	const doneOBHL1 = totalOBHL1 - totalOpenOBHL1

	const totalPBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Paint',
	})
	const totalOpenPBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Paint',
		status: 'Open',
	})
	const donePBHL1 = totalPBHL1 - totalOpenPBHL1

	const failsShotBlastBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintTBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintABHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOvenBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlastBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintTBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintABHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOvenBHL1 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop1',
		location: 'Paint',
		status: 'Contained',
	})

	// total fails BHL 7 bay
	const totalFailsBackhoe1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
		area: 'Paint Shop1',
		location: { $ne: 'Validation' },
	})
	const totalContainedBackhoe1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Contained',
		area: 'Paint Shop1',
		location: { $ne: 'Validation' },
	})
	// total fails loadall
	const totalFailsBackhoeV1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
		area: 'Paint Shop1',
		location: 'Validation',
	})
	const totalContainedBackhoeV1 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Contained',
		area: 'Paint Shop1',
		location: 'Validation',
	})

	// 8 bay
	const totalBHL2 = await TCard.countDocuments({
		division: 'BHL',
		area: 'Paint Shop2',
		location: { $ne: 'Validation' },
	})
	const totalBHLOpen2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Open',
		area: 'Paint Shop2',
		location: { $ne: 'Validation' },
	})

	const doneBHL2 = totalBHL2 - totalBHLOpen2

	const totalBHLV2 = await TCard.countDocuments({
		division: 'BHL',
		area: 'Paint Shop2',
		location: 'Validation',
	})
	const totalBHLOpenV2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Open',
		area: 'Paint Shop2',
		location: 'Validation',
	})

	const doneBHLV2 = totalBHLV2 - totalBHLOpenV2

	const totalSBBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Shot Blast',
	})
	const totalOpenSBBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBBHL2 = totalSBBHL2 - totalOpenSBBHL2

	const totalWBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Wash',
	})
	const totalOpenWBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Wash',
		status: 'Open',
	})
	const doneWBHL2 = totalWBHL2 - totalOpenWBHL2

	const totalOBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Oven',
	})
	const totalOpenOBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Oven',
		status: 'Open',
	})
	const doneOBHL2 = totalOBHL2 - totalOpenOBHL2

	const totalPBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Paint',
	})
	const totalOpenPBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Paint',
		status: 'Open',
	})
	const donePBHL2 = totalPBHL2 - totalOpenPBHL2

	const failsShotBlastBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintTBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintABHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOvenBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlastBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintTBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintABHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOvenBHL2 = await TCard.countDocuments({
		division: 'BHL',
		shiftP: 'Days',
		area: 'Paint Shop2',
		location: 'Paint',
		status: 'Contained',
	})

	// total fails BHL 8 bay
	const totalFailsBackhoe2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
		area: 'Paint Shop2',
		location: { $ne: 'Validation' },
	})
	const totalContainedBackhoe2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Contained',
		area: 'Paint Shop2',
		location: { $ne: 'Validation' },
	})
	// total fails loadall
	const totalFailsBackhoeV2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
		area: 'Paint Shop2',
		location: 'Validation',
	})
	const totalContainedBackhoeV2 = await TCard.countDocuments({
		division: 'BHL',
		status: 'Contained',
		area: 'Paint Shop2',
		location: 'Validation',
	})

	const allBHLChecks = await Check.find({
		division: 'BHL',
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const BackhoeUpdate = allBHLChecks[0] || []

	// get total number of checks completed  loadall
	const totalLoadall = await TCard.countDocuments({
		division: 'LDL',
		location: { $ne: 'Validation' },
	})
	const totalLoadallOpen = await TCard.countDocuments({
		division: 'LDL',
		status: 'Open',
		location: { $ne: 'Validation' },
	})

	const doneLoadall = totalLoadall - totalLoadallOpen

	const totalLoadallV = await TCard.countDocuments({
		division: 'LDL',
		location: 'Validation',
	})
	const totalLoadallOpenV = await TCard.countDocuments({
		division: 'LDL',
		status: 'Open',
		location: 'Validation',
	})

	const doneLoadallV = totalLoadallV - totalLoadallOpenV

	const totalSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSB = totalSB - totalOpenSB

	const totalW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
	})
	const totalOpenW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Open',
	})
	const doneW = totalW - totalOpenW

	const totalO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
	})
	const totalOpenO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Open',
	})
	const doneO = totalO - totalOpenO

	const totalP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
	})
	const totalOpenP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Open',
	})
	const doneP = totalP - totalOpenP

	const allLDLChecks = await Check.find({
		division: 'LDL',
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const loadallUpdate = allLDLChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Contained',
	})

	//heavy stuff

	// get total number of checks completed  heavy

	const totalHeavy = await TCard.countDocuments({
		division: 'HP',
	})
	const totalHeavyOpen = await TCard.countDocuments({
		division: 'HP',
		status: 'Open',
	})
	const doneHeavy = totalHeavy - totalHeavyOpen
	// get total number of checks completed  heavy

	const totalHeavyAttachments = await TCard.countDocuments({
		division: 'HP',
		area: 'Attachments',
		location: { $ne: 'Validation' },
	})
	const totalHeavyOpenAttachments = await TCard.countDocuments({
		division: 'HP',
		status: 'Open',
		area: 'Attachments',
		location: { $ne: 'Validation' },
	})
	const totalHeavyContainedAttachments = await TCard.countDocuments({
		division: 'HP',
		status: 'Contained',
		area: 'Attachments',
		location: { $ne: 'Validation' },
	})
	const totalHeavyFailedAttachments = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
		area: 'Attachments',
		location: { $ne: 'Validation' },
	})
	const totalHeavyContainedRevolver = await TCard.countDocuments({
		division: 'HP',
		status: 'Contained',
		area: 'Revolver',
		location: { $ne: 'Validation' },
	})
	const totalHeavyFailedRevolver = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
		area: 'Revolver',
		location: { $ne: 'Validation' },
	})
	const totalHeavyFailedSmallParts = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
		area: 'Small Parts',
		location: { $ne: 'Validation' },
	})

	const doneHeavyAttachments = totalHeavyAttachments - totalHeavyOpenAttachments

	const totalHeavyRevolver1 = await TCard.countDocuments({
		division: 'HP',
		area: 'Revolver',
		location: { $ne: 'Validation' },
	})
	const totalHeavyOpenRevolver1 = await TCard.countDocuments({
		division: 'HP',
		status: 'Open',
		area: 'Revolver',
		location: { $ne: 'Validation' },
	})
	const doneHeavyRevolver1 = totalHeavyRevolver1 - totalHeavyOpenRevolver1

	const totalHeavySmallParts = await TCard.countDocuments({
		division: 'HP',
		area: 'Small Parts',
		location: { $ne: 'Validation' },
	})
	const totalHeavyOpenSmallParts = await TCard.countDocuments({
		division: 'HP',
		status: 'Open',
		area: 'Small Parts',
		location: { $ne: 'Validation' },
	})

	const totalHeavyContainedSmallParts = await TCard.countDocuments({
		division: 'HP',
		status: 'Contained',
		area: 'Small Parts',
		location: { $ne: 'Validation' },
	})
	const doneHeavySmallParts = totalHeavySmallParts - totalHeavyOpenSmallParts

	const allHPChecks = await Check.find({
		division: 'HP',
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const heavyUpdate = allHPChecks[0] || []

	const totalAttSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
	})
	const totalAttOpenSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneAttSBHeavy = totalAttSBHeavy - totalAttOpenSBHeavy

	const totalAttPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
	})
	const totalAttOpenPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneAttPTHeavy = totalAttPTHeavy - totalAttOpenPTHeavy

	const totalAttPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
	})
	const totalAttOpenPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Open',
	})
	const doneAttPAHeavy = totalAttPAHeavy - totalAttOpenPAHeavy

	const totalAttOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
	})
	const totalAttOpenOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneAttOCHeavy = totalAttOCHeavy - totalAttOpenOCHeavy

	const totalAttVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
	})
	const totalAttOpenVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Open',
	})
	const doneAttVHeavy = totalAttVHeavy - totalAttOpenVHeavy

	// revolver
	const totalRSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
	})
	const totalROpenSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneRSBHeavy = totalRSBHeavy - totalROpenSBHeavy

	const totalRPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
	})
	const totalROpenPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneRPTHeavy = totalRPTHeavy - totalROpenPTHeavy

	const totalRPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
	})
	const totalROpenPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Open',
	})
	const doneRPAHeavy = totalRPAHeavy - totalROpenPAHeavy

	const totalROCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
	})
	const totalROpenOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneROCHeavy = totalROCHeavy - totalROpenOCHeavy

	const totalRVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
	})
	const totalROpenVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Open',
	})
	const doneRVHeavy = totalRVHeavy - totalROpenVHeavy

	// small parts
	const totalSPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
	})
	const totalOpenSPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneSPTHeavy = totalSPTHeavy - totalOpenSPTHeavy

	const totalSPVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
	})
	const totalOpenSPVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Open',
	})
	const doneSPVHeavy = totalSPVHeavy - totalOpenSPVHeavy

	// attachments failures
	const failsSBAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsPAAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Failed',
	})
	const failsOCAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Failed',
	})

	// revolver failures
	const failsSBRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsPARHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Failed',
	})
	const failsOCRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Failed',
	})
	// small parts failures
	const failsPTSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsVSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Failed',
	})
	// attachments contained
	const contSBAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contPAAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Contained',
	})
	const contOCAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Contained',
	})

	// revolver failures
	const contSBRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contPARHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Contained',
	})
	const contOCRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Contained',
	})
	// small parts failures
	const contPTSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contVSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Contained',
	})

	// compact stuff

	// get total number of checks completed  compact

	const totalCompact = await TCard.countDocuments({
		division: 'CP',
		location: { $ne: 'Validation' },
	})
	const totalCompactOpen = await TCard.countDocuments({
		division: 'CP',
		status: 'Open',
		location: { $ne: 'Validation' },
	})
	const doneCompact = totalCompact - totalCompactOpen

	const allCPChecks = await Check.find({
		division: 'CP',
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const compactUpdate = allCPChecks[0] || []

	const totalSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBCompact = totalSBCompact - totalOpenSBCompact

	const totalPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
	})
	const totalOpenPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const donePTCompact = totalPTCompact - totalOpenPTCompact

	const totalOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
	})
	const totalOpenOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneOCCompact = totalOCCompact - totalOpenOCCompact

	const totalVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
	})
	const totalOpenVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Open',
	})
	const doneVCompact = totalVCompact - totalOpenVCompact

	// compact failures
	const failsSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Failed',
	})
	// compact contained
	const contSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Contained',
	})

	//totals

	// total fails loadall
	const totalFailsLoadall = await TCard.countDocuments({
		division: 'LDL',
		status: 'Failed',
		location: { $ne: 'Validation' },
	})
	const totalContainedLoadall = await TCard.countDocuments({
		division: 'LDL',
		status: 'Contained',
		location: { $ne: 'Validation' },
	})
	// total fails loadall
	const totalFailsLoadallV = await TCard.countDocuments({
		division: 'LDL',
		status: 'Failed',
		location: 'Validation',
	})
	const totalContainedLoadallV = await TCard.countDocuments({
		division: 'LDL',
		status: 'Contained',
		location: 'Validation',
	})

	const doneLoadallPercent = Math.round((doneLoadall / totalLoadall) * 100)
	const toDoLoadallPercent = 100 - doneLoadallPercent

	// total fails Compact
	const totalFailsCompact = await TCard.countDocuments({
		division: 'CP',
		status: 'Failed',
		location: { $ne: 'Validation' },
	})
	const totalContainedCompact = await TCard.countDocuments({
		division: 'CP',
		status: 'Contained',
		location: { $ne: 'Validation' },
	})

	const doneCompactPercent = Math.round((doneCompact / totalCompact) * 100)
	const toDoCompactPercent = 100 - doneCompactPercent

	// total fails heavy
	const totalFailsHeavy = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
	})
	const totalContainedHeavy = await TCard.countDocuments({
		division: 'HP',
		status: 'Contained',
	})

	const totalHeavyAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
	})
	const totalHeavyDoneAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		status: { $ne: 'Open' },
	})
	const totalHeavyFailedAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		status: 'Failed',
	})
	const totalHeavyContainedAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		status: 'Contained',
	})
	const totalHeavyRevolver = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
	})
	const totalHeavyDoneRevolver = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		status: { $ne: 'Open' },
	})
	const totalHeavyFailedRevolver1 = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		status: 'Failed',
	})
	const totalHeavyContainedRevolver1 = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		status: 'Contained',
		location: { $ne: 'Validation' },
	})
	const totalHeavySAp = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
	})
	const totalHeavyDoneSp = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		status: { $ne: 'Open' },
	})

	const doneHeavyAttPercent = Math.round((totalHeavyDoneAtt / totalHeavyAtt) * 100)
	const toDoHeavyAttPercent = 100 - doneHeavyAttPercent

	const doneHeavyRevolverPercent = Math.round((totalHeavyDoneRevolver / totalHeavyRevolver) * 100)
	const toDoHeavyRevolverPercent = 100 - doneHeavyRevolverPercent

	const doneHeavySpPercent = Math.round((totalHeavyDoneSp / totalHeavySAp) * 100)
	const toDoHeavySpPercent = 100 - doneHeavySpPercent

	// get total number of checks completed  CabS
	const totalCabs = await TCard.countDocuments({
		division: 'CABS',
		location: { $ne: 'Validation' },
	})
	const totalCabsOpen = await TCard.countDocuments({
		division: 'CABS',
		status: 'Open',
		location: { $ne: 'Validation' },
	})
	const totalCabsContained = await TCard.countDocuments({
		division: 'CABS',
		status: 'Contained',
		location: { $ne: 'Validation' },
	})
	const totalCabsFailed = await TCard.countDocuments({
		division: 'CABS',
		status: 'Failed',
		location: { $ne: 'Validation' },
	})

	const doneCabs = totalCabs - totalCabsOpen

	const totalT1 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 1  Alkali cleaner',
	})
	const totalOpenT1 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 1  Alkali cleaner',
		status: 'Open',
	})
	const doneT1 = totalT1 - totalOpenT1

	const ContainedT1 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 1  Alkali cleaner',
		status: 'Contained',
	})
	const failedT1 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 1  Alkali cleaner',
		status: 'Failed',
	})

	// tank 2
	const totalT2 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 2  Alkali cleaner',
	})
	const totalOpenT2 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 2  Alkali cleaner',
		status: 'Open',
	})
	const doneT2 = totalT2 - totalOpenT2

	const ContainedT2 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 2  Alkali cleaner',
		status: 'Contained',
	})
	const failedT2 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 2  Alkali cleaner',
		status: 'Failed',
	})
	// tank 3

	const totalT3 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 3  Town’s water rinse',
	})
	const totalOpenT3 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 3  Town’s water rinse',
		status: 'Open',
	})
	const doneT3 = totalT3 - totalOpenT3

	const ContainedT3 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 3  Town’s water rinse',
		status: 'Contained',
	})
	const failedT3 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 3  Town’s water rinse',
		status: 'Failed',
	})

	// tank 5
	const totalT5 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 5  Acid descale',
	})
	const totalOpenT5 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 5  Acid descale',
		status: 'Open',
	})
	const doneT5 = totalT5 - totalOpenT5

	const ContainedT5 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 5  Acid descale',
		status: 'Contained',
	})
	const failedT5 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 5  Acid descale',
		status: 'Failed',
	})
	//Tank 6
	const totalT6 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 6  Ultrasonic descale',
	})
	const totalOpenT6 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 6  Ultrasonic descale',
		status: 'Open',
	})
	const doneT6 = totalT6 - totalOpenT6

	const ContainedT6 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 6  Ultrasonic descale',
		status: 'Contained',
	})
	const failedT6 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 6  Ultrasonic descale',
		status: 'Failed',
	})

	//Tank 7
	const totalT7 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 7  Alkali rinse',
	})
	const totalOpenT7 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 7  Alkali rinse',
		status: 'Open',
	})
	const doneT7 = totalT7 - totalOpenT7

	const ContainedT7 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 7  Alkali rinse',
		status: 'Contained',
	})
	const failedT7 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 7  Alkali rinse',
		status: 'Failed',
	})
	//Tank 10
	const totalT10 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 10 RO Water rinse',
	})
	const totalOpenT10 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 10 RO Water rinse',
		status: 'Open',
	})
	const doneT10 = totalT10 - totalOpenT10

	const ContainedT10 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 10 RO Water rinse',
		status: 'Contained',
	})
	const failedT10 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 10 RO Water rinse',
		status: 'Failed',
	})

	// tank 11
	const totalT11 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 11 Oxsilan conversion',
	})
	const totalOpenT11 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 11 Oxsilan conversion',
		status: 'Open',
	})
	const doneT11 = totalT11 - totalOpenT11

	const ContainedT11 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 11 Oxsilan conversion',
		status: 'Contained',
	})
	const failedT11 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 11 Oxsilan conversion',
		status: 'Failed',
	})

	//tank 12
	const totalT12 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 12 RO Water rinse',
	})
	const totalOpenT12 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 12 RO Water rinse',
		status: 'Open',
	})
	const doneT12 = totalT12 - totalOpenT12

	const ContainedT12 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 12 RO Water rinse',
		status: 'Contained',
	})
	const failedT12 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 12 RO Water rinse',
		status: 'Failed',
	})
	//tank 13
	const totalT13 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 13 RO Water rinse',
	})
	const totalOpenT13 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 13 RO Water rinse',
		status: 'Open',
	})
	const doneT13 = totalT13 - totalOpenT13

	const ContainedT13 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 13 RO Water rinse',
		status: 'Contained',
	})
	const failedT13 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 13 RO Water rinse',
		status: 'Failed',
	})

	//tank 14
	const totalT14 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 14 RO Water rinse',
	})
	const totalOpenT14 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 14 RO Water rinse',
		status: 'Open',
	})
	const doneT14 = totalT14 - totalOpenT14

	const ContainedT14 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 14 RO Water rinse',
		status: 'Contained',
	})
	const failedT14 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 14 RO Water rinse',
		status: 'Failed',
	})

	//tank 15
	const totalT15 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 15 E-Coat',
	})
	const totalOpenT15 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 15 E-Coat',
		status: 'Open',
	})
	const doneT15 = totalT15 - totalOpenT15

	const ContainedT15 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 15 E-Coat',
		status: 'Contained',
	})
	const failedT15 = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Tank 15 E-Coat',
		status: 'Failed',
	})

	//ro tank
	const totalTRO = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment RO Tank',
	})
	const totalOpenTRO = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment RO Tank',
		status: 'Open',
	})
	const doneTRO = totalTRO - totalOpenTRO

	const ContainedTRO = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment RO Tank',
		status: 'Contained',
	})
	const failedTRO = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment RO Tank',
		status: 'Failed',
	})

	// boiler

	const totalBoiler = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Boiler',
	})
	const totalOpenBoiler = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Boiler',
		status: 'Open',
	})
	const doneBoiler = totalBoiler - totalOpenBoiler

	const ContainedBoiler = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Boiler',
		status: 'Contained',
	})
	const failedBoiler = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Boiler',
		status: 'Failed',
	})

	//other
	const totalOther = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Other',
	})
	const totalOpenOther = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Other',
		status: 'Open',
	})
	const doneOther = totalOther - totalOpenOther

	const ContainedOther = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Other',
		status: 'Contained',
	})
	const failedOther = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment Other',
		status: 'Failed',
	})
	//ovens
	const totalOvens = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Ovens',
	})
	const totalOpenOvens = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Ovens',
		status: 'Open',
	})
	const doneOvens = totalOvens - totalOpenOvens

	const ContainedOvens = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Ovens',
		status: 'Contained',
	})
	const failedOvens = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Ovens',
		status: 'Failed',
	})

	// paint kitchen

	const totalPaintKitchen = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint Kitchen',
	})
	const totalOpenPaintKitchen = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint Kitchen',
		status: 'Open',
	})
	const donePaintKitchen = totalPaintKitchen - totalOpenPaintKitchen

	const ContainedPaintKitchen = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint Kitchen',
		status: 'Contained',
	})
	const failedPaintKitchen = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint Kitchen',
		status: 'Failed',
	})

	// validation

	const totalCabsValidation = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
	})
	const totalOpenCabsValidation = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Open',
	})
	const doneCabsValidation = totalCabsValidation - totalOpenCabsValidation

	const ContainedCabsValidation = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Contained',
	})
	const failedCabsValidation = await TCard.countDocuments({
		division: 'CABS',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Failed',
	})

	const allCabsChecks = await Check.find({
		division: 'CABS',
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const cabsUpdate = allCabsChecks[0] || []

	//HBU

	// get total number of checks completed  heavy

	const totalHBUAuto = await TCard.countDocuments({
		division: 'HBU',
		area: 'Auto Paint Line',
		location: { $ne: 'Validation' },
	})
	const totalHBUOpenAuto = await TCard.countDocuments({
		division: 'HBU',
		status: 'Open',
		area: 'Auto Paint Line',
		location: { $ne: 'Validation' },
	})
	const totalHBUContainedAuto = await TCard.countDocuments({
		division: 'HBU',
		status: 'Contained',
		area: 'Auto Paint Line',
		location: { $ne: 'Validation' },
	})
	const totalHBUFailedAuto = await TCard.countDocuments({
		division: 'HBU',
		status: 'Failed',
		area: 'Auto Paint Line',
		location: { $ne: 'Validation' },
	})
	const totalHBUContainedOffline = await TCard.countDocuments({
		division: 'HBU',
		status: 'Contained',
		area: 'Offline Paint',
		location: { $ne: 'Validation' },
	})
	const totalHBUFailedOffline = await TCard.countDocuments({
		division: 'HBU',
		status: 'Failed',
		area: 'Offline Paint',
		location: { $ne: 'Validation' },
	})
	const totalHBUContainedOfflineV = await TCard.countDocuments({
		division: 'HBU',
		status: 'Contained',
		area: 'Offline Paint',
		location: 'Validation',
	})
	const totalHBUFailedOfflineV = await TCard.countDocuments({
		division: 'HBU',
		status: 'Failed',
		area: 'Offline Paint',
		location: 'Validation',
	})
	const totalHBUContainedPaintPlant = await TCard.countDocuments({
		division: 'HBU',
		status: 'Contained',
		area: 'Paint Plant',
	})
	const totalHBUFailedPaintPlant = await TCard.countDocuments({
		division: 'HBU',
		status: 'Failed',
		area: 'Paint Plant',
	})

	const doneHBUAuto = totalHBUAuto - totalHBUOpenAuto

	const totalHBUOffline = await TCard.countDocuments({
		division: 'HBU',
		area: 'Offline Paint',
		location: { $ne: 'Validation' },
	})
	const totalHBUOpenOffline = await TCard.countDocuments({
		division: 'HBU',
		status: 'Open',
		area: 'Offline Paint',
		location: { $ne: 'Validation' },
	})
	const doneHBUOffline = totalHBUOffline - totalHBUOpenOffline

	const totalHBUOfflineV = await TCard.countDocuments({
		division: 'HBU',
		area: 'Offline Paint',
		location: 'Validation',
	})
	const totalHBUOpenOfflineV = await TCard.countDocuments({
		division: 'HBU',
		status: 'Open',
		area: 'Offline Paint',
		location: 'Validation',
	})
	const doneHBUOfflineV = totalHBUOfflineV - totalHBUOpenOfflineV

	const totalHBUPaintPlant = await TCard.countDocuments({
		division: 'HBU',
		area: 'Paint Plant',
	})
	const totalHBUOpenPaintPlant = await TCard.countDocuments({
		division: 'HBU',
		status: 'Open',
		area: 'Paint Plant',
	})
	const doneHBUPaintPlant = totalHBUPaintPlant - totalHBUOpenPaintPlant

	// Pre treatment operator

	const totalHBUPreTreatmentOperator = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment Operator',
	})
	const totalOpenHBUPreTreatmentOperator = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment Operator',
		status: 'Open',
	})
	const doneHBUPreTreatmentOperator = totalHBUPreTreatmentOperator - totalOpenHBUPreTreatmentOperator

	const ContainedHBUPreTreatmentOperator = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment Operator',
		status: 'Contained',
	})
	const failedHBUPreTreatmentOperator = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment Operator',
		status: 'Failed',
	})

	// pre treatment Tech

	const totalHBUPreTreatmentTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment',
	})
	const totalOpenHBUPreTreatmentTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneHBUPreTreatmentTech = totalHBUPreTreatmentTech - totalOpenHBUPreTreatmentTech

	const ContainedHBUPreTreatmentTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const failedHBUPreTreatmentTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Pre Treatment',
		status: 'Failed',
	})

	//paint booth operator

	const totalHBUPreTreatmentPaintBoothOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth Operator',
	})
	const totalOpenHBUPreTreatmentPaintBoothOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth Operator',
		status: 'Open',
	})
	const doneHBUPreTreatmentPaintBoothOp = totalHBUPreTreatmentPaintBoothOp - totalOpenHBUPreTreatmentPaintBoothOp

	const ContainedHBUPreTreatmentPaintBoothOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth Operator',
		status: 'Contained',
	})
	const failedHBUPreTreatmentPaintBoothOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth Operator',
		status: 'Failed',
	})

	//paint booth tech

	const totalHBUPreTreatmentPaintBoothTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth',
	})
	const totalOpenHBUPreTreatmentPaintBoothTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth',
		status: 'Open',
	})
	const doneHBUPreTreatmentPaintBoothTech = totalHBUPreTreatmentPaintBoothTech - totalOpenHBUPreTreatmentPaintBoothTech

	const ContainedHBUPreTreatmentPaintBoothTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth',
		status: 'Contained',
	})
	const failedHBUPreTreatmentPaintBoothTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Paint Booth',
		status: 'Failed',
	})

	//ovens curing oven

	const totalHBUPreTreatmentOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Curing Oven',
	})
	const totalOpenHBUPreTreatmentOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Curing Oven',
		status: 'Open',
	})
	const doneHBUPreTreatmentOvenCuringOven = totalHBUPreTreatmentOvenCuringOven - totalOpenHBUPreTreatmentOvenCuringOven

	const ContainedHBUPreTreatmentOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Curing Oven',
		status: 'Contained',
	})
	const failedHBUPreTreatmentOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Curing Oven',
		status: 'Failed',
	})

	//ovens drying oven

	const totalHBUPreTreatmentOvenDryingOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Drying Oven',
	})
	const totalOpenHBUPreTreatmentOvenDryingOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Drying Oven',
		status: 'Open',
	})
	const doneHBUPreTreatmentOvenDryingOven = totalHBUPreTreatmentOvenDryingOven - totalOpenHBUPreTreatmentOvenDryingOven

	const ContainedHBUPreTreatmentOvenDryingOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Drying Oven',
		status: 'Contained',
	})
	const failedHBUPreTreatmentOvenDryingOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Ovens Drying Oven',
		status: 'Failed',
	})

	// manipulator operator

	const totalHBUPreTreatmentManipulatorOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator Operator',
	})
	const totalOpenHBUPreTreatmentManipulatorOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator Operator',
		status: 'Open',
	})
	const doneHBUPreTreatmentManipulatorOp = totalHBUPreTreatmentManipulatorOp - totalOpenHBUPreTreatmentManipulatorOp

	const ContainedHBUPreTreatmentManipulatorOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator Operator',
		status: 'Contained',
	})
	const failedHBUPreTreatmentManipulatorOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator Operator',
		status: 'Failed',
	})

	// manipulator tech

	const totalHBUPreTreatmentManipulatorTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator',
	})
	const totalOpenHBUPreTreatmentManipulatorTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator',
		status: 'Open',
	})
	const doneHBUPreTreatmentManipulatorTech = totalHBUPreTreatmentManipulatorTech - totalOpenHBUPreTreatmentManipulatorTech

	const ContainedHBUPreTreatmentManipulatorTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator',
		status: 'Contained',
	})
	const failedHBUPreTreatmentManipulatorTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Manipulator',
		status: 'Failed',
	})

	//track
	const totalHBUPreTreatmentTrack = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Track',
	})
	const totalOpenHBUPreTreatmentTrack = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Track',
		status: 'Open',
	})
	const doneHBUPreTreatmentTrack = totalHBUPreTreatmentTrack - totalOpenHBUPreTreatmentTrack

	const ContainedHBUPreTreatmentTrack = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Track',
		status: 'Contained',
	})
	const failedHBUPreTreatmentTrack = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Track',
		status: 'Failed',
	})

	// validation
	const totalHBUPreTreatmentValidation = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Validation',
	})
	const totalOpenHBUPreTreatmentValidation = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Validation',
		status: 'Open',
	})
	const doneHBUPreTreatmentValidation = totalHBUPreTreatmentValidation - totalOpenHBUPreTreatmentValidation

	const ContainedHBUPreTreatmentValidation = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Validation',
		status: 'Contained',
	})
	const failedHBUPreTreatmentValidation = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Auto Paint Line',
		location: 'Validation',
		status: 'Failed',
	})

	// offline pre treatment operator
	const totalHBUOfflineOOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment Operator',
	})
	const totalOpenHBUOfflineOOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment Operator',
		status: 'Open',
	})
	const doneHBUOfflineOOp = totalHBUOfflineOOp - totalOpenHBUOfflineOOp

	const ContainedHBUOfflineOOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment Operator',
		status: 'Contained',
	})
	const failedHBUOfflineOOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment Operator',
		status: 'Failed',
	})

	// offline pre treatment tech
	const totalHBUOfflineOTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment',
	})
	const totalOpenHBUOfflineOTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneHBUOfflineOTech = totalHBUOfflineOTech - totalOpenHBUOfflineOTech

	const ContainedHBUOfflineOTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const failedHBUOfflineOTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Pre Treatment',
		status: 'Failed',
	})

	//paint booth operator
	const totalHBUOfflinePBOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth Operator',
	})
	const totalOpenHBUOfflinePBOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth Operator',
		status: 'Open',
	})
	const doneHBUOfflinePBOp = totalHBUOfflinePBOp - totalOpenHBUOfflinePBOp

	const ContainedHBUOfflinePBOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth Operator',
		status: 'Contained',
	})
	const failedHBUOfflinePBOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth Operator',
		status: 'Failed',
	})

	//paint booth tech
	const totalHBUOfflinePBTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth',
	})
	const totalOpenHBUOfflinePBTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth',
		status: 'Open',
	})
	const doneHBUOfflinePBTech = totalHBUOfflinePBTech - totalOpenHBUOfflinePBTech

	const ContainedHBUOfflinePBTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth',
		status: 'Contained',
	})
	const failedHBUOfflinePBTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Paint Booth',
		status: 'Failed',
	})

	//ovens curing oven

	const totalHBUOfflineOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Ovens Curing Oven',
	})
	const totalOpenHBUOfflineOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Ovens Curing Oven',
		status: 'Open',
	})
	const doneHBUOfflineOvenCuringOven = totalHBUOfflineOvenCuringOven - totalOpenHBUOfflineOvenCuringOven

	const ContainedHBUOfflineOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Ovens Curing Oven',
		status: 'Contained',
	})
	const failedHBUOfflineOvenCuringOven = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Ovens Curing Oven',
		status: 'Failed',
	})

	//hoist operator

	const totalHBUOfflineHoistOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist Operator',
	})
	const totalOpenHBUOfflineHoistOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist Operator',
		status: 'Open',
	})
	const doneHBUOfflineHoistOp = totalHBUOfflineHoistOp - totalOpenHBUOfflineHoistOp

	const ContainedHBUOfflineHoistOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist Operator',
		status: 'Contained',
	})
	const failedHBUOfflineHoistOp = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist Operator',
		status: 'Failed',
	})

	//hoist tech

	const totalHBUOfflineHoistTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist',
	})
	const totalOpenHBUOfflineHoistTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist',
		status: 'Open',
	})
	const doneHBUOfflineHoistTech = totalHBUOfflineHoistTech - totalOpenHBUOfflineHoistTech

	const ContainedHBUOfflineHoistTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist',
		status: 'Contained',
	})
	const failedHBUOfflineHoistTech = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Offline Paint',
		location: 'Hoist',
		status: 'Failed',
	})

	// paint paint kitchen

	const totalHBUPaintPlantPK = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Paint Paint',
		location: 'Paint Kitchen',
	})
	const totalOpenHBUPaintPlantPK = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Paint Paint',
		location: 'Paint Kitchen',
		status: 'Open',
	})
	const doneHBUPaintPlantPK = totalHBUPaintPlantPK - totalOpenHBUPaintPlantPK

	const ContainedHBUPaintPlantPK = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Paint Paint',
		location: 'Paint Kitchen',
		status: 'Contained',
	})
	const failedHBUPaintPlantPK = await TCard.countDocuments({
		division: 'HBU',
		shiftP: 'Days',
		area: 'Paint Paint',
		location: 'Paint Kitchen',
		status: 'Failed',
	})

	const tCardsHBU = await TCard.find({
		division: 'HBU',
	}).populate({
		path: 'checks',
		options: { sort: { _id: -1 } },
		perDocumentLimit: 1,
	})

	let allHBUChecks = []
	for (let card of tCardsHBU) {
		card.checks.forEach(function (check) {
			if (check.checkedBy) {
				allHBUChecks.push(check)
			}
		})
	}

	allHBUChecks.sort((a, b) => b.createdAt - a.createdAt)

	const HBUUpdate = allHBUChecks[0] || []

	// CABS PT
	const totalPreTCabs =
		totalT1 +
		totalT2 +
		totalT3 +
		totalT5 +
		totalT6 +
		totalT7 +
		totalT10 +
		totalT11 +
		totalT12 +
		totalT13 +
		totalT14 +
		totalT15 +
		totalTRO +
		totalBoiler +
		totalOther

	const totalDonePreTCabs =
		doneT1 + doneT2 + doneT3 + doneT5 + doneT6 + doneT7 + doneT10 + doneT11 + doneT12 + doneT13 + doneT14 + doneT15 + doneTRO + doneBoiler + doneOther

	const totalContainedPreTCabs =
		ContainedT1 +
		ContainedT2 +
		ContainedT3 +
		ContainedT5 +
		ContainedT6 +
		ContainedT7 +
		ContainedT10 +
		ContainedT11 +
		ContainedT12 +
		ContainedT13 +
		ContainedT14 +
		ContainedT15 +
		ContainedTRO +
		ContainedBoiler +
		ContainedOther

	const totalFailedPreTCabs =
		failedT1 +
		failedT2 +
		failedT3 +
		failedT5 +
		failedT6 +
		failedT7 +
		failedT10 +
		failedT11 +
		failedT12 +
		failedT13 +
		failedT14 +
		failedT15 +
		failedTRO +
		failedBoiler +
		failedOther

	res.render('tCards/division-v3', {
		totalPreTCabs,
		totalDonePreTCabs,
		totalContainedPreTCabs,
		totalFailedPreTCabs,
		// compact
		totalCompact,
		doneCompact,
		totalSBCompact,
		doneSBCompact,
		totalPTCompact,
		donePTCompact,
		totalOCCompact,
		doneOCCompact,
		totalVCompact,
		doneVCompact,
		failsSBCompact,
		failsPTCompact,
		failsOCCompact,
		failsVCompact,
		contSBCompact,
		contPTCompact,
		contOCCompact,
		contVCompact,
		compactUpdate,
		totalFailsCompact,
		totalContainedCompact,
		doneCompactPercent,
		toDoCompactPercent,

		// loadall
		totalFailsLoadallV,
		totalContainedLoadallV,
		doneLoadallV,
		totalLoadallV,
		totalLoadall,
		doneLoadall,
		failsShotBlast,
		failsPaintT,
		failsPaintA,
		failsOven,
		containedShotBlast,
		containedPaintT,
		containedPaintA,
		containedOven,
		doneSB,
		totalSB,
		doneW,
		totalW,
		doneO,
		totalO,
		doneP,
		totalP,
		loadallUpdate,
		totalFailsLoadall,
		totalContainedLoadall,
		doneLoadallPercent,
		toDoLoadallPercent,

		//earth movers
		totalFailsEarthMoversV,
		totalContainedEarthMoversV,
		doneEMV,
		totalEMV,
		totalEM,
		doneEM,
		failsShotBlastEM,
		failsPaintTEM,
		failsPaintAEM,
		failsOvenEM,
		containedShotBlastEM,
		containedPaintTEM,
		containedPaintAEM,
		containedOvenEM,
		doneSBEM,
		totalSBEM,
		doneWEM,
		totalWEM,
		doneOEM,
		totalOEM,
		donePEM,
		totalPEM,
		EarthMoversUpdate,
		totalFailsEarthMovers,
		totalContainedEarthMovers,

		//bhl
		//7 bay
		totalFailsBackhoeV1,
		totalContainedBackhoeV1,
		doneBHLV1,
		totalBHLV1,
		totalBHL1,
		doneBHL1,
		failsShotBlastBHL1,
		failsPaintTBHL1,
		failsPaintABHL1,
		failsOvenBHL1,
		containedShotBlastBHL1,
		containedPaintTBHL1,
		containedPaintABHL1,
		containedOvenBHL1,
		doneSBBHL1,
		totalSBBHL1,
		doneWBHL1,
		totalWBHL1,
		doneOBHL1,
		totalOBHL1,
		donePBHL1,
		totalPBHL1,
		BackhoeUpdate,
		totalFailsBackhoe1,
		totalContainedBackhoe1,

		//8 bay
		totalFailsBackhoeV2,
		totalContainedBackhoeV2,
		doneBHLV2,
		totalBHLV2,
		totalBHL2,
		doneBHL2,
		failsShotBlastBHL2,
		failsPaintTBHL2,
		failsPaintABHL2,
		failsOvenBHL2,
		containedShotBlastBHL2,
		containedPaintTBHL2,
		containedPaintABHL2,
		containedOvenBHL2,
		doneSBBHL2,
		totalSBBHL2,
		doneWBHL2,
		totalWBHL2,
		doneOBHL2,
		totalOBHL2,
		donePBHL2,
		totalPBHL2,
		totalFailsBackhoe2,
		totalContainedBackhoe2,

		BackhoeUpdate,

		// heavy
		totalHeavy,
		doneHeavy,
		totalHeavyAttachments,
		doneHeavyAttachments,
		totalHeavyRevolver1,
		doneHeavyRevolver1,
		totalHeavySmallParts,
		doneHeavySmallParts,
		totalHeavyContainedAttachments,
		totalHeavyFailedAttachments,
		totalHeavyContainedRevolver,
		totalHeavyFailedRevolver,
		totalHeavyContainedSmallParts,
		totalHeavyFailedSmallParts,
		heavyUpdate,
		// attachments
		doneAttSBHeavy,
		totalAttSBHeavy,
		doneAttPTHeavy,
		totalAttPTHeavy,
		doneAttPAHeavy,
		totalAttPAHeavy,
		doneAttOCHeavy,
		totalAttOCHeavy,
		doneAttVHeavy,
		totalAttVHeavy,
		failsSBAttHeavy,
		failsPTAttHeavy,
		failsPAAttHeavy,
		failsOCAttHeavy,
		failsVAttHeavy,
		contSBAttHeavy,
		contPTAttHeavy,
		contPAAttHeavy,
		contOCAttHeavy,
		contVAttHeavy,
		// revolver
		doneRSBHeavy,
		totalRSBHeavy,
		doneRPTHeavy,
		totalRPTHeavy,
		doneRPAHeavy,
		totalRPAHeavy,
		doneROCHeavy,
		totalROCHeavy,
		doneRVHeavy,
		totalRVHeavy,
		failsSBRHeavy,
		failsPTRHeavy,
		failsPARHeavy,
		failsOCRHeavy,
		failsVRHeavy,
		contSBRHeavy,
		contPTRHeavy,
		contPARHeavy,
		contOCRHeavy,
		contVRHeavy,
		// small parts
		doneSPTHeavy,
		totalOpenSPTHeavy,
		doneSPVHeavy,
		totalOpenSPVHeavy,
		failsPTSPHeavy,
		failsVSPHeavy,
		contPTSPHeavy,
		contVSPHeavy,
		totalSPTHeavy,
		totalSPVHeavy,

		doneHeavyAttPercent,
		toDoHeavyAttPercent,
		doneHeavyRevolverPercent,
		toDoHeavyRevolverPercent,
		doneHeavySpPercent,
		toDoHeavySpPercent,
		totalFailsHeavy,
		totalContainedHeavy,
		totalHeavyDoneAtt,
		totalHeavyAtt,
		totalHeavyDoneRevolver,
		totalHeavyRevolver,
		totalHeavyDoneSp,
		totalHeavySAp,
		totalHBUFailedOfflineV,
		totalHBUContainedOfflineV,
		doneHBUOfflineV,
		totalHBUOfflineV,

		// HBU
		HBUUpdate,
		totalHBUAuto,
		doneHBUAuto,
		totalHBUOffline,
		doneHBUOffline,
		totalHBUPaintPlant,
		doneHBUPaintPlant,
		totalHBUContainedAuto,
		totalHBUFailedAuto,
		totalHBUContainedOffline,
		totalHBUFailedOffline,
		totalHBUContainedPaintPlant,
		totalHBUFailedPaintPlant,

		totalHBUPreTreatmentOperator,
		doneHBUPreTreatmentOperator,
		ContainedHBUPreTreatmentOperator,
		failedHBUPreTreatmentOperator,
		totalHBUPreTreatmentTech,
		doneHBUPreTreatmentTech,
		ContainedHBUPreTreatmentTech,
		failedHBUPreTreatmentTech,
		totalHBUPreTreatmentPaintBoothOp,
		doneHBUPreTreatmentPaintBoothOp,
		ContainedHBUPreTreatmentPaintBoothOp,
		failedHBUPreTreatmentPaintBoothOp,
		totalHBUPreTreatmentPaintBoothTech,
		doneHBUPreTreatmentPaintBoothTech,
		ContainedHBUPreTreatmentPaintBoothTech,
		failedHBUPreTreatmentPaintBoothTech,
		totalHBUPreTreatmentOvenCuringOven,
		doneHBUPreTreatmentOvenCuringOven,
		ContainedHBUPreTreatmentOvenCuringOven,
		failedHBUPreTreatmentOvenCuringOven,
		totalHBUPreTreatmentOvenDryingOven,
		doneHBUPreTreatmentOvenDryingOven,
		ContainedHBUPreTreatmentOvenDryingOven,
		failedHBUPreTreatmentOvenDryingOven,
		totalHBUPreTreatmentManipulatorOp,
		doneHBUPreTreatmentManipulatorOp,
		ContainedHBUPreTreatmentManipulatorOp,
		failedHBUPreTreatmentManipulatorOp,
		totalHBUPreTreatmentManipulatorTech,
		doneHBUPreTreatmentManipulatorTech,
		ContainedHBUPreTreatmentManipulatorTech,
		failedHBUPreTreatmentManipulatorTech,
		totalHBUPreTreatmentTrack,
		doneHBUPreTreatmentTrack,
		ContainedHBUPreTreatmentTrack,
		failedHBUPreTreatmentTrack,
		totalHBUPreTreatmentValidation,
		doneHBUPreTreatmentValidation,
		ContainedHBUPreTreatmentValidation,
		failedHBUPreTreatmentValidation,

		totalHBUOfflineOOp,
		doneHBUOfflineOOp,
		ContainedHBUOfflineOOp,
		failedHBUOfflineOOp,
		totalHBUOfflineOTech,
		doneHBUOfflineOTech,
		ContainedHBUOfflineOTech,
		failedHBUOfflineOTech,
		totalHBUOfflinePBOp,
		doneHBUOfflinePBOp,
		ContainedHBUOfflinePBOp,
		failedHBUOfflinePBOp,
		totalHBUOfflinePBTech,
		doneHBUOfflinePBTech,
		ContainedHBUOfflinePBTech,
		failedHBUOfflinePBTech,
		totalHBUOfflineOvenCuringOven,
		doneHBUOfflineOvenCuringOven,
		ContainedHBUOfflineOvenCuringOven,
		failedHBUOfflineOvenCuringOven,
		totalHBUOfflineHoistOp,
		doneHBUOfflineHoistOp,
		ContainedHBUOfflineHoistOp,
		failedHBUOfflineHoistOp,
		totalHBUOfflineHoistTech,
		doneHBUOfflineHoistTech,
		ContainedHBUOfflineHoistTech,
		failedHBUOfflineHoistTech,
		totalHBUPaintPlantPK,
		doneHBUPaintPlantPK,
		ContainedHBUPaintPlantPK,
		failedHBUPaintPlantPK,

		// cabs
		cabsUpdate,
		totalCabs,
		doneCabs,
		totalCabsContained,
		totalCabsFailed,
		totalT1,
		doneT1,
		ContainedT1,
		failedT1,
		totalT2,
		doneT2,
		ContainedT2,
		failedT2,
		totalT3,
		doneT3,
		ContainedT3,
		failedT3,
		totalT5,
		doneT5,
		ContainedT5,
		failedT5,
		totalT6,
		doneT6,
		ContainedT6,
		failedT6,
		totalT7,
		doneT7,
		ContainedT7,
		failedT7,
		totalT10,
		doneT10,
		ContainedT10,
		failedT10,
		totalT11,
		doneT11,
		ContainedT11,
		failedT11,
		totalT12,
		doneT12,
		ContainedT12,
		failedT12,
		totalT13,
		doneT13,
		ContainedT13,
		failedT13,
		totalT14,
		doneT14,
		ContainedT14,
		failedT14,
		totalT15,
		doneT15,
		ContainedT15,
		failedT15,
		totalTRO,
		doneTRO,
		ContainedTRO,
		failedTRO,
		totalBoiler,
		doneBoiler,
		ContainedBoiler,
		failedBoiler,
		totalOther,
		doneOther,
		ContainedOther,
		failedOther,
		totalOvens,
		doneOvens,
		ContainedOvens,
		failedOvens,
		donePaintKitchen,
		totalPaintKitchen,
		ContainedPaintKitchen,
		failedPaintKitchen,
		totalCabsValidation,
		doneCabsValidation,
		ContainedCabsValidation,
		failedCabsValidation,

		totalHeavyFailedAtt,

		totalHeavyContainedAtt,
		totalHeavyFailedRevolver1,
		totalHeavyContainedRevolver1,
	})
}

module.exports.division = async (req, res) => {
	// get total number of checks completed  loadall
	const totalLoadall = await TCard.countDocuments({
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		division: 'LDL',
	})
	const totalLoadallOpen = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
	})

	const doneLoadall = totalLoadall - totalLoadallOpen

	const totalSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSB = totalSB - totalOpenSB

	const totalW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
	})
	const totalOpenW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Open',
	})
	const doneW = totalW - totalOpenW

	const totalO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
	})
	const totalOpenO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Open',
	})
	const doneO = totalO - totalOpenO

	const totalP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
	})
	const totalOpenP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Open',
	})
	const doneP = totalP - totalOpenP

	const allLDLChecks = await Check.find({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const loadallUpdate = allLDLChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Contained',
	})

	//heavy stuff

	// get total number of checks completed  heavy

	const totalHeavy = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
	})
	const totalHeavyOpen = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
	})
	const doneHeavy = totalHeavy - totalHeavyOpen

	const allHPChecks = await Check.find({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const heavyUpdate = allHPChecks[0] || []

	const totalAttSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
	})
	const totalAttOpenSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneAttSBHeavy = totalAttSBHeavy - totalAttOpenSBHeavy

	const totalAttPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
	})
	const totalAttOpenPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneAttPTHeavy = totalAttPTHeavy - totalAttOpenPTHeavy

	const totalAttPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
	})
	const totalAttOpenPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Open',
	})
	const doneAttPAHeavy = totalAttPAHeavy - totalAttOpenPAHeavy

	const totalAttOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
	})
	const totalAttOpenOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneAttOCHeavy = totalAttOCHeavy - totalAttOpenOCHeavy

	const totalAttVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
	})
	const totalAttOpenVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Open',
	})
	const doneAttVHeavy = totalAttVHeavy - totalAttOpenVHeavy

	// revolver
	const totalRSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
	})
	const totalROpenSBHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneRSBHeavy = totalRSBHeavy - totalROpenSBHeavy

	const totalRPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
	})
	const totalROpenPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneRPTHeavy = totalRPTHeavy - totalROpenPTHeavy

	const totalRPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
	})
	const totalROpenPAHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Open',
	})
	const doneRPAHeavy = totalRPAHeavy - totalROpenPAHeavy

	const totalROCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
	})
	const totalROpenOCHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneROCHeavy = totalROCHeavy - totalROpenOCHeavy

	const totalRVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
	})
	const totalROpenVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Open',
	})
	const doneRVHeavy = totalRVHeavy - totalROpenVHeavy

	// small parts
	const totalSPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
	})
	const totalOpenSPTHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const doneSPTHeavy = totalSPTHeavy - totalOpenSPTHeavy

	const totalSPVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
	})
	const totalOpenSPVHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Open',
	})
	const doneSPVHeavy = totalSPVHeavy - totalOpenSPVHeavy

	// attachments failures
	const failsSBAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsPAAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Failed',
	})
	const failsOCAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Failed',
	})

	// revolver failures
	const failsSBRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsPARHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Failed',
	})
	const failsOCRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Failed',
	})
	// small parts failures
	const failsPTSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsVSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Failed',
	})
	// attachments contained
	const contSBAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contPAAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Powder Application',
		status: 'Contained',
	})
	const contOCAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVAttHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		location: 'Validation',
		status: 'Contained',
	})

	// revolver failures
	const contSBRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contPARHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Powder Application',
		status: 'Contained',
	})
	const contOCRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVRHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		location: 'Validation',
		status: 'Contained',
	})
	// small parts failures
	const contPTSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contVSPHeavy = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		location: 'Validation',
		status: 'Contained',
	})

	// compact stuff

	// get total number of checks completed  compact

	const totalCompact = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
	})
	const totalCompactOpen = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
	})
	const doneCompact = totalCompact - totalCompactOpen

	const allCPChecks = await Check.find({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const compactUpdate = allCPChecks[0] || []

	const totalSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSBCompact = totalSBCompact - totalOpenSBCompact

	const totalPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
	})
	const totalOpenPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Open',
	})
	const donePTCompact = totalPTCompact - totalOpenPTCompact

	const totalOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
	})
	const totalOpenOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Open',
	})
	const doneOCCompact = totalOCCompact - totalOpenOCCompact

	const totalVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
	})
	const totalOpenVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Open',
	})
	const doneVCompact = totalVCompact - totalOpenVCompact

	// compact failures
	const failsSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Failed',
	})
	const failsOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Failed',
	})
	const failsVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Failed',
	})
	// compact contained
	const contSBCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const contPTCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Pre Treatment',
		status: 'Contained',
	})
	const contOCCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven Cure',
		status: 'Contained',
	})
	const contVCompact = await TCard.countDocuments({
		division: 'CP',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Validation',
		status: 'Contained',
	})

	//totals

	// total fails loadall
	const totalFailsLoadall = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const totalContainedLoadall = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
	})

	const doneLoadallPercent = Math.round((doneLoadall / totalLoadall) * 100)
	const toDoLoadallPercent = 100 - doneLoadallPercent

	// total fails Compact
	const totalFailsCompact = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const totalContainedCompact = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
	})

	const doneCompactPercent = Math.round((doneCompact / totalCompact) * 100)
	const toDoCompactPercent = 100 - doneCompactPercent

	// total fails heavy
	const totalFailsHeavy = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const totalContainedHeavy = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Contained',
	})

	const totalHeavyAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
	})
	const totalHeavyDoneAtt = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Attachments',
		status: { $ne: 'Open' },
	})
	const totalHeavyRevolver = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
	})
	const totalHeavyDoneRevolver = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Revolver',
		status: { $ne: 'Open' },
	})
	const totalHeavySAp = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
	})
	const totalHeavyDoneSp = await TCard.countDocuments({
		division: 'HP',
		shiftP: 'Days',
		area: 'Small Parts',
		status: { $ne: 'Open' },
	})

	const doneHeavyAttPercent = Math.round((totalHeavyDoneAtt / totalHeavyAtt) * 100)
	const toDoHeavyAttPercent = 100 - doneHeavyAttPercent

	const doneHeavyRevolverPercent = Math.round((totalHeavyDoneRevolver / totalHeavyRevolver) * 100)
	const toDoHeavyRevolverPercent = 100 - doneHeavyRevolverPercent

	const doneHeavySpPercent = Math.round((totalHeavyDoneSp / totalHeavySAp) * 100)
	const toDoHeavySpPercent = 100 - doneHeavySpPercent

	res.render('tCards/division', {
		// compact
		totalCompact,
		doneCompact,
		totalSBCompact,
		doneSBCompact,
		totalPTCompact,
		donePTCompact,
		totalOCCompact,
		doneOCCompact,
		totalVCompact,
		doneVCompact,
		failsSBCompact,
		failsPTCompact,
		failsOCCompact,
		failsVCompact,
		contSBCompact,
		contPTCompact,
		contOCCompact,
		contVCompact,
		compactUpdate,
		totalFailsCompact,
		totalContainedCompact,
		doneCompactPercent,
		toDoCompactPercent,

		// loadall
		totalLoadall,
		doneLoadall,
		failsShotBlast,
		failsPaintT,
		failsPaintA,
		failsOven,
		containedShotBlast,
		containedPaintT,
		containedPaintA,
		containedOven,
		doneSB,
		totalSB,
		doneW,
		totalW,
		doneO,
		totalO,
		doneP,
		totalP,
		loadallUpdate,
		totalFailsLoadall,
		totalContainedLoadall,
		doneLoadallPercent,
		toDoLoadallPercent,
		// heavy
		totalHeavy,
		doneHeavy,
		heavyUpdate,
		// attachments
		doneAttSBHeavy,
		totalAttSBHeavy,
		doneAttPTHeavy,
		totalAttPTHeavy,
		doneAttPAHeavy,
		totalAttPAHeavy,
		doneAttOCHeavy,
		totalAttOCHeavy,
		doneAttVHeavy,
		totalAttVHeavy,
		failsSBAttHeavy,
		failsPTAttHeavy,
		failsPAAttHeavy,
		failsOCAttHeavy,
		failsVAttHeavy,
		contSBAttHeavy,
		contPTAttHeavy,
		contPAAttHeavy,
		contOCAttHeavy,
		contVAttHeavy,
		// revolver
		doneRSBHeavy,
		totalRSBHeavy,
		doneRPTHeavy,
		totalRPTHeavy,
		doneRPAHeavy,
		totalRPAHeavy,
		doneROCHeavy,
		totalROCHeavy,
		doneRVHeavy,
		totalRVHeavy,
		failsSBRHeavy,
		failsPTRHeavy,
		failsPARHeavy,
		failsOCRHeavy,
		failsVRHeavy,
		contSBRHeavy,
		contPTRHeavy,
		contPARHeavy,
		contOCRHeavy,
		contVRHeavy,
		// small parts
		doneSPTHeavy,
		totalOpenSPTHeavy,
		doneSPVHeavy,
		totalOpenSPVHeavy,
		failsPTSPHeavy,
		failsVSPHeavy,
		contPTSPHeavy,
		contVSPHeavy,
		totalSPTHeavy,
		totalSPVHeavy,

		doneHeavyAttPercent,
		toDoHeavyAttPercent,
		doneHeavyRevolverPercent,
		toDoHeavyRevolverPercent,
		doneHeavySpPercent,
		toDoHeavySpPercent,
		totalFailsHeavy,
		totalContainedHeavy,
		totalHeavyDoneAtt,
		totalHeavyAtt,
		totalHeavyDoneRevolver,
		totalHeavyRevolver,
		totalHeavyDoneSp,
		totalHeavySAp,
	})
}

module.exports.area = async (req, res) => {
	const { division } = req.params

	const totalLoadall = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
	})
	const totalLoadallOpen = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
	})
	const doneLoadall = totalLoadall - totalLoadallOpen

	const totalSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSB = totalSB - totalOpenSB

	const totalW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
	})
	const totalOpenW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Open',
	})
	const doneW = totalW - totalOpenW

	const totalO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
	})
	const totalOpenO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Open',
	})
	const doneO = totalO - totalOpenO

	const totalP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
	})
	const totalOpenP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Open',
	})
	const doneP = totalP - totalOpenP

	const allLDLChecks = await Check.find({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const loadallUpdate = allLDLChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Contained',
	})
	const failsBHL = await TCard.countDocuments({
		division: 'BHL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsCP = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsEM = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsHP = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsLDL = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsLP = await TCard.countDocuments({
		division: 'LP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsSD = await TCard.countDocuments({
		division: 'SD',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})

	res.render('tCards/area', {
		failsBHL,
		failsCP,
		failsEM,
		failsHP,
		failsLDL,
		failsLP,
		failsSD,
		failsShotBlast,
		failsPaintT,
		failsPaintA,
		failsOven,
		containedShotBlast,
		containedPaintT,
		containedPaintA,
		containedOven,
		totalLoadall,
		doneLoadall,
		doneSB,
		totalSB,
		doneW,
		totalW,
		doneO,
		totalO,
		doneP,
		totalP,
		loadallUpdate,
	})
}
module.exports.location = async (req, res) => {
	const { division, area } = req.params

	const totalLoadall = await TCard.countDocuments({
		division: division,
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
	})
	const totalLoadallOpen = await TCard.countDocuments({
		division: division,
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Open',
	})
	const doneLoadall = totalLoadall - totalLoadallOpen

	const totalSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
	})
	const totalOpenSB = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSB = totalSB - totalOpenSB

	const totalW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
	})
	const totalOpenW = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Open',
	})
	const doneW = totalW - totalOpenW

	const totalO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
	})
	const totalOpenO = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Open',
	})
	const doneO = totalO - totalOpenO

	const totalP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
	})
	const totalOpenP = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Open',
	})
	const doneP = totalP - totalOpenP

	const allLDLChecks = await Check.find({
		division: 'LDL',
		type: 'Check',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
	})
		.sort({ _id: -1 })
		.limit(1)

	const loadallUpdate = allLDLChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlast = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintT = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintA = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOven = await TCard.countDocuments({
		division: 'LDL',
		shiftP: 'Days',
		area: 'Paint Shop',
		location: 'Paint',
		status: 'Contained',
	})
	const failsBHL = await TCard.countDocuments({
		division: 'BHL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsCP = await TCard.countDocuments({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsEM = await TCard.countDocuments({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsHP = await TCard.countDocuments({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsLDL = await TCard.countDocuments({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsLP = await TCard.countDocuments({
		division: 'LP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})
	const failsSD = await TCard.countDocuments({
		division: 'SD',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		status: 'Failed',
	})

	res.render('tCards/location', {
		division,
		failsBHL,
		failsCP,
		failsEM,
		failsHP,
		failsLDL,
		failsLP,
		failsSD,
		failsShotBlast,
		failsPaintT,
		failsPaintA,
		failsOven,
		containedShotBlast,
		containedPaintT,
		containedPaintA,
		containedOven,
		totalLoadall,
		doneLoadall,
		doneSB,
		totalSB,
		doneW,
		totalW,
		doneO,
		totalO,
		doneP,
		totalP,
		loadallUpdate,
	})
}

module.exports.ShiftP = async (req, res) => {
	const { division, area, location } = req.params

	const failsDays = await TCard.countDocuments({
		division: division,
		area: area,
		location: location,
		shiftP: 'Days',
		status: 'Failed',
	})

	const failsNights = await TCard.countDocuments({
		division: division,
		area: area,
		location: location,
		shiftP: 'Nights',
		status: 'Failed',
	})

	const fails4On4Off = await TCard.countDocuments({
		division: division,
		area: area,
		location: location,
		shiftP: '4 On 4 Off',
		status: 'Failed',
	})

	res.render('tCards/shiftP', {
		division,
		area,
		location,
		failsDays,
		failsNights,
		fails4On4Off,
	})
}

module.exports.checks = async (req, res) => {
	const { division, area, location, shiftP } = req.params
	const tCardsDaily = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: 'Daily',
	}).sort({ failedAt: -1, status: 1, _id: 1 })
	const tCardsWeekly = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: 'Weekly',
	}).sort({ failedAt: -1, status: 1, _id: 1 })

	const tCardsMonthly = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: 'Monthly',
	}).sort({ failedAt: -1, status: 1, _id: 1 })

	const tCardsQuarterly = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: 'Quarterly',
	}).sort({ failedAt: -1, status: 1, _id: 1 })

	res.render('tCards/checks', {
		division,
		area,
		location,
		shiftP,
		tCardsDaily,
		tCardsWeekly,
		tCardsMonthly,
		tCardsQuarterly,
	})
}

module.exports.renderDoCheckForm = async (req, res) => {
	const { id } = req.params
	const tCard = await TCard.findById(id).populate({ path: 'reasons' }).populate({ path: 'checks' }).populate({ path: 'actions' })

	// .populate('author');
	if (!tCard) {
		req.flash('error', 'Cannot find that T-Card')
		// change to checks home page
		res.redirect('/')
	}

	const division = tCard.division
	const area = tCard.area
	const shiftP = tCard.shiftP
	const location = tCard.location

	if (area === 'quality') {
		const currentUserId = req.user._id
		// const match = JSON.stringify(currentUserId) === JSON.stringify(primaryUserId) || JSON.stringify(currentUserId) === JSON.stringify(secondUserId)
		const match = tCard.users.includes(currentUserId)

		if (!req.user.isTCardAdmin) {
			if (!match) {
				req.flash('error', 'You are not the primary or secondary user')
				// change to checks home page
				return res.redirect(`/tCard/show/${division}/${area}/${location}/${shiftP}`)
				// return res.redirect(`/tCard/qcs`)
			}
		}
	}

	const names = await Name.find({ division: division }).sort({ name: 1 })

	res.render('tCards/doCheck', { names, tCard, division, area, shiftP })
}
module.exports.renderContainCheckForm = async (req, res) => {
	const { id } = req.params
	const tCard = await TCard.findById(id)
		.populate({ path: 'reasons' })
		.populate({ path: 'checks' })
		.populate({ path: 'actions' })
		.populate({
			path: 'notes',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 10,
		})

	// .populate('author');
	if (!tCard) {
		req.flash('error', 'Cannot find that T-Card')
		// change to checks home page
		res.redirect('/')
	}
	const division = tCard.division
	const area = tCard.area
	const shiftP = tCard.shiftP
	res.render('tCards/containCheck', { tCard, division, area, shiftP })
}

module.exports.renderCloseCheckForm = async (req, res) => {
	const { id } = req.params
	const tCard = await TCard.findById(id)
		.populate({ path: 'reasons' })
		.populate({ path: 'checks' })
		.populate({ path: 'actions' })
		.populate({
			path: 'notes',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 10,
		})

	// .populate('author');
	if (!tCard) {
		req.flash('error', 'Cannot find that T-Card')
		// change to checks home page
		res.redirect('/')
	}
	const division = tCard.division
	const area = tCard.area
	const shiftP = tCard.shiftP
	res.render('tCards/closeCheck', { tCard, division, area, shiftP })
}

module.exports.renderAdminPage = async (req, res) => {
	const { division, area, location, shiftP, frequency } = req.params

	const cards = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: frequency,
	})
		.sort({
			name: '',
		})
		.populate({ path: 'reasons' })
		.populate({ path: 'checks' })

	res.render('tCards/admin', {
		cards,
		division,
		area,
		location,
		shiftP,
		frequency,
	})
}
module.exports.renderHistoryPage = async (req, res) => {
	const { division, area, location, shiftP, frequency } = req.params

	const dailyCards = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: 'Daily',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})
	const weeklyCards = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: 'Weekly',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	const monthlyCards = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: 'Monthly',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	const quarterlyCards = await TCard.find({
		division: division,
		area: area,
		location: location,
		shiftP: shiftP,
		frequency: 'Quarterly',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	res.render('tCards/history', {
		quarterlyCards,
		monthlyCards,
		weeklyCards,
		dailyCards,
		division,
		area,
		location,
		shiftP,
		frequency,
	})
}

module.exports.renderHistoryPageQasi = async (req, res) => {
	const { division, area, category } = req.params

	const plantCards = await TCard.find({
		division,
		area,
		category,
		section: 'Plant Quality',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})
	const assemblyCards = await TCard.find({
		division,
		area,
		category,
		section: 'Assembly',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	const manufacturingCards = await TCard.find({
		division,
		area,
		category,
		section: 'Manufacturing',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	res.render('tCards/historyQasi', {
		plantCards,
		assemblyCards,
		manufacturingCards,
		division,
		area,
		category,
	})
}
module.exports.renderHistoryPageQasiScection = async (req, res) => {
	const { division, area, category, section } = req.params

	const dailyCards = await TCard.find({
		division,
		area,
		category,
		section,
		frequency: 'Daily',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})
	const weeklyCards = await TCard.find({
		division,
		area,
		category,
		section,
		frequency: 'Weekly',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	const monthlyCards = await TCard.find({
		division,
		area,
		category,
		section,
		frequency: 'Monthly',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	const quarterlyCards = await TCard.find({
		division,
		area,
		category,
		section,
		frequency: 'Quarterly',
	})
		.sort({
			name: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	res.render('tCards/historyQasiSection', {
		quarterlyCards,
		monthlyCards,
		weeklyCards,
		dailyCards,
		division,
		area,
		category,
		section,
	})
}

module.exports.renderAllHistoryPage = async (req, res) => {
	let { division, area } = req.params

	let areas = [area]

	if (division === 'HP' && area !== 'quality') {
		areas = ['Attachments', 'Revolver', 'Small parts']
	}
	if (division === 'HBU' && area !== 'quality') {
		areas = ['Auto Paint Plant', 'Offline Paint', 'Paint Plant']
	}
	if (division === 'BHL' && area !== 'quality') {
		areas = ['Paint Shop1', 'Paint Shop2']
	}

	const dailyCards = await TCard.find({
		division: division,
		area: { $in: areas },
		frequency: 'Daily',
	})
		.sort({
			location: '',
		})
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	const weeklyCards = await TCard.find({
		division: division,
		area: { $in: areas },
		frequency: 'Weekly',
	})
		.sort({ location: 1, name: 1 })
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	const monthlyCards = await TCard.find({
		division: division,
		area: { $in: areas },
		frequency: 'Monthly',
	})
		.sort({ location: 1, name: 1 })
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	const quarterlyCards = await TCard.find({
		division: division,
		area: { $in: areas },
		frequency: 'Quarterly',
	})
		.sort({ location: 1, name: 1 })
		.populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 50,
		})

	res.render('tCards/allHistory', {
		quarterlyCards,
		monthlyCards,
		weeklyCards,
		dailyCards,
		division,
		area,
	})
}

module.exports.renderNewForm = async (req, res) => {
	const { division, area, location, shiftP, frequency } = req.params

	res.render('tCards/new', { division, area, location, shiftP, frequency })
}

module.exports.createNew = async (req, res) => {
	const { division, area, location, shiftP, frequency } = req.params

	///////////////////////Keep this ///////////////////////////
	const tCard = new TCard(req.body.tCard)
	tCard.status = 'Open'
	tCard.division = division

	if (area === 'quality') tCard.area = 'quality'

	await tCard.save()

	console.log(req.body)
	console.log(tCard)

	///////////////////////Keep this ///////////////////////////

	///////////////////////////////copy checks///////////////////////////////////
	// const divisions = ['PS', 'CABS']
	// const tCards = await TCard.find(
	// 	{
	// 		area: 'quality',
	// 		division: 'BHL',
	// 		// name     : { $nin: names },
	// 	},
	// 	{ _id: 0, __v: 0, division: 0, createdAt: 0, checks: 0 }
	// )

	// for (let division of divisions) {
	// 	for (let t of tCards) {
	// 		t.division = division
	// 		t.status = 'Open'
	// 		t.status = 'Open'
	// 		t.checkedBy = ''
	// 	}
	// 	await TCard.insertMany(tCards)
	// }

	///////////////////////////////copy checks///////////////////////////////////

	// /////////////////////remove dup missed/////////////////////////////////////

	// const allChecksOne = await Check.find({
	// 	area: 'quality',
	// 	result: 'Missed',
	// })

	// for (let a of allChecksOne) {
	// 	let name = a.name
	// 	let id = a._id

	// 	let card = await TCard.findOne({ name })

	// 	if (card) {
	// 		await Check.findByIdAndUpdate(id, {
	// 			frequency: card.frequency,
	// 		})
	// 	}
	// }

	// const checksToKeep = []

	// const allWeeklyChecks = await Check.aggregate([
	// 	{
	// 		$match: {
	// 			area: 'quality',
	// 			result: 'Missed',
	// 			frequency: 'Weekly',
	// 		},
	// 	},
	// 	{
	// 		$addFields: {
	// 			week: {
	// 				$isoWeek: {
	// 					date: '$createdAt',
	// 					timezone: 'Europe/London',
	// 				},
	// 			},
	// 		},
	// 	},
	// 	{
	// 		$group: {
	// 			_id: {
	// 				week: '$week',
	// 				name: '$name',
	// 				division: '$division',
	// 			},
	// 			result: { $push: '$_id' },
	// 		},
	// 	},
	// ])

	// const allMonthyChecks = await Check.aggregate([
	// 	{
	// 		$match: {
	// 			area: 'quality',
	// 			result: 'Missed',
	// 			frequency: 'Monthly',
	// 		},
	// 	},
	// 	{
	// 		$addFields: {
	// 			week: {
	// 				$month: {
	// 					date: '$createdAt',
	// 					timezone: 'Europe/London',
	// 				},
	// 			},
	// 		},
	// 	},
	// 	{
	// 		$group: {
	// 			_id: {
	// 				week: '$week',
	// 				name: '$name',
	// 				division: '$division',
	// 			},
	// 			result: { $push: '$_id' },
	// 		},
	// 	},
	// ])

	// // console.log(allWeeklyChecks)

	// for (let c of allWeeklyChecks) {
	// 	checksToKeep.push(c.result[0])
	// }
	// for (let c of allMonthyChecks) {
	// 	checksToKeep.push(c.result[0])
	// }

	// // console.log(allWeeklyChecks.length)
	// // console.log(checksToKeep.length)
	// // console.log(allMonthyChecks.length)
	// // console.log(checksToKeep)

	// await Check.deleteMany({
	// 	area: 'quality',
	// 	result: 'Missed',

	// 	_id: { $nin: checksToKeep },
	// })

	// /////////////////////remove dup missed/////////////////////////////////////

	let address = `/tCard/admin/${division}/${area}/${location}/${shiftP}/${frequency}`

	if (area === 'quality') address = `/tCard/qcs-assign-card-users/${division}`

	res.redirect(address)
}

module.exports.renderEditForm = async (req, res) => {
	const { division, area, location, shiftP, frequency, id } = req.params
	const tCard = await TCard.findById(id).populate({ path: 'reasons' }).populate({ path: 'checks' }).populate({ path: 'actions' })
	if (!tCard) {
		req.flash('error', 'Cannot find that T Card')
	}

	const users = await Name.find({
		division,
	})

	res.render('tCards/edit', {
		division,
		area,
		location,
		shiftP,
		tCard,
		frequency,
		users,
	})
}

module.exports.edit = async (req, res) => {
	const { division, area, location, shiftP, id } = req.params

	const donorCard = await TCard.findById(id)
	const donormachines = await TCard.find({
		name: donorCard.name,
	})

	const name = req.body.tCard.primaryUser

	const key = 'primaryUser'
	delete req.body.tCard[key]

	if (donorCard.area === 'quality') {
		await TCard.updateMany(
			{ name: donorCard.name },
			{
				...req.body.tCard,
			},
			{ new: true }
		)
	} else {
		await TCard.findByIdAndUpdate(
			id,
			{
				...req.body.tCard,
			},
			{ new: true }
		)
	}

	if (name) {
		await TCard.findByIdAndUpdate(
			id,
			{
				primaryUser: name,
			},
			{ new: true }
		)
	}

	let address = `/tCard/show/${division}/${area}/${location}/${shiftP}`

	if (area === 'quality') address = `/tCard/qcs-assign-card-users/${division}`

	res.redirect(address)
}

module.exports.renderReasonAndActionPage = async (req, res) => {
	const { division, area, location, shiftP, frequency, id } = req.params
	const tCard = await TCard.findById(id).populate({ path: 'reasons' }).populate({ path: 'checks' }).populate({ path: 'actions' })

	if (!tCard) {
		req.flash('error', 'Cannot find that T Card')
	}
	res.render('tCards/reasons', {
		tCard,
		division,
		area,
		location,
		shiftP,
		frequency,
	})
}

// delete
module.exports.delete = async (req, res) => {
	const { division, area, location, shiftP, frequency, id } = req.params
	await TCard.findByIdAndDelete(id)
	// req.flash('success', 'Successfully deleted T-Card');
	res.redirect(`/tCard/admin/${division}/${area}/${location}/${shiftP}/${frequency}`)
}

module.exports.deleteQasi = async (req, res) => {
	const { division, id } = req.params
	await TCard.findByIdAndUpdate(id, { division: 'deleted' })
	// req.flash('success', 'Successfully deleted T-Card');
	res.redirect(`/tCard/qcs-assign-card-users/${division}`)
}

module.exports.training = async (req, res) => {
	const totalLoadall = await TCard.countDocuments({
		division: 'Training',
	})
	const totalLoadallOpen = await TCard.countDocuments({
		division: 'Training',
		status: 'Open',
	})
	const doneLoadall = totalLoadall - totalLoadallOpen

	const totalSB = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Shot Blast',
	})
	const totalOpenSB = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSB = totalSB - totalOpenSB

	const totalW = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Wash',
	})
	const totalOpenW = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Wash',
		status: 'Open',
	})
	const doneW = totalW - totalOpenW

	const totalO = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Oven',
	})
	const totalOpenO = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Oven',
		status: 'Open',
	})
	const doneO = totalO - totalOpenO

	const totalP = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Paint',
	})
	const totalOpenP = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Paint',
		status: 'Open',
	})
	const doneP = totalP - totalOpenP

	const allLDLChecks = await Check.find({
		division: 'LDL',
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const loadallUpdate = allLDLChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlast = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintT = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintA = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOven = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlast = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintT = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintA = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOven = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Paint',
		status: 'Contained',
	})
	const failsBHL = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
	})
	const failsCP = await TCard.countDocuments({
		division: 'CP',
		status: 'Failed',
	})
	const failsEM = await TCard.countDocuments({
		division: 'EM',
		status: 'Failed',
	})
	const failsHP = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
	})
	const failsLDL = await TCard.countDocuments({
		division: 'LDL',
		status: 'Failed',
	})
	const failsLP = await TCard.countDocuments({
		division: 'LP',
		status: 'Failed',
	})
	const failsSD = await TCard.countDocuments({
		division: 'SD',
		status: 'Failed',
	})

	res.render('tCards/training', {
		failsBHL,
		failsCP,
		failsEM,
		failsHP,
		failsLDL,
		failsLP,
		failsSD,
		failsShotBlast,
		failsPaintT,
		failsPaintA,
		failsOven,
		containedShotBlast,
		containedPaintT,
		containedPaintA,
		containedOven,
		totalLoadall,
		doneLoadall,
		doneSB,
		totalSB,
		doneW,
		totalW,
		doneO,
		totalO,
		doneP,
		totalP,
		loadallUpdate,
	})
}

module.exports.reset = async (req, res) => {
	await TCard.updateMany(
		{
			division: 'Training',
		},
		{
			$set: {
				status: 'Open',
			},
		},
		{ multi: true }
	)
	const totalLoadall = await TCard.countDocuments({
		division: 'Training',
	})
	const totalLoadallOpen = await TCard.countDocuments({
		division: 'Training',
		status: 'Open',
	})
	const doneLoadall = totalLoadall - totalLoadallOpen

	const totalSB = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Shot Blast',
	})
	const totalOpenSB = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Shot Blast',
		status: 'Open',
	})
	const doneSB = totalSB - totalOpenSB

	const totalW = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Wash',
	})
	const totalOpenW = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Wash',
		status: 'Open',
	})
	const doneW = totalW - totalOpenW

	const totalO = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Oven',
	})
	const totalOpenO = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Oven',
		status: 'Open',
	})
	const doneO = totalO - totalOpenO

	const totalP = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Paint',
	})
	const totalOpenP = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Paint',
		status: 'Open',
	})
	const doneP = totalP - totalOpenP

	const allLDLChecks = await Check.find({
		division: 'LDL',
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const loadallUpdate = allLDLChecks[0] || []

	// console.log(tCardsLoadall)

	const failsShotBlast = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Shot Blast',
		status: 'Failed',
	})
	const failsPaintT = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Wash',
		status: 'Failed',
	})
	const failsPaintA = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Oven',
		status: 'Failed',
	})
	const failsOven = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Paint',
		status: 'Failed',
	})
	// contained
	const containedShotBlast = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Shot Blast',
		status: 'Contained',
	})
	const containedPaintT = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Wash',
		status: 'Contained',
	})
	const containedPaintA = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Oven',
		status: 'Contained',
	})
	const containedOven = await TCard.countDocuments({
		division: 'Training',
		shiftP: 'Days',
		area: 'Training',
		location: 'Paint',
		status: 'Contained',
	})
	const failsBHL = await TCard.countDocuments({
		division: 'BHL',
		status: 'Failed',
	})
	const failsCP = await TCard.countDocuments({
		division: 'CP',
		status: 'Failed',
	})
	const failsEM = await TCard.countDocuments({
		division: 'EM',
		status: 'Failed',
	})
	const failsHP = await TCard.countDocuments({
		division: 'HP',
		status: 'Failed',
	})
	const failsLDL = await TCard.countDocuments({
		division: 'LDL',
		status: 'Failed',
	})
	const failsLP = await TCard.countDocuments({
		division: 'LP',
		status: 'Failed',
	})
	const failsSD = await TCard.countDocuments({
		division: 'SD',
		status: 'Failed',
	})

	res.render('tCards/training', {
		failsBHL,
		failsCP,
		failsEM,
		failsHP,
		failsLDL,
		failsLP,
		failsSD,
		failsShotBlast,
		failsPaintT,
		failsPaintA,
		failsOven,
		containedShotBlast,
		containedPaintT,
		containedPaintA,
		containedOven,
		totalLoadall,
		doneLoadall,
		doneSB,
		totalSB,
		doneW,
		totalW,
		doneO,
		totalO,
		doneP,
		totalP,
		loadallUpdate,
	})
}

module.exports.analysis = async (req, res) => {
	const allBhlChecks = await Check.find({
		division: 'BHL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const bhlUpdate = allBhlChecks[0]

	const allCabsChecks = await Check.find({
		division: 'CABS',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const cabsUpdate = allCabsChecks[0]

	const allCompactChecks = await Check.find({
		division: 'CP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const compactUpdate = allCompactChecks[0]

	const allEarthMoversChecks = await Check.find({
		division: 'EM',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const earthMoversUpdate = allEarthMoversChecks[0]

	const allHbuChecks = await Check.find({
		division: 'HBU',
		area: {
			$in: ['Auto Paint Line', 'Offline Paint', 'Paint Plant'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const hbuUpdate = allHbuChecks[0]

	const allHeavyChecks = await Check.find({
		division: 'HP',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const heavyUpdate = allHeavyChecks[0]

	const allLdlChecks = await Check.find({
		division: 'LDL',
		area: {
			$in: ['Paint Shop', 'Paint Shop1', 'Paint Shop2', 'Attachments', 'Revolver', 'Small Parts'],
		},
		type: 'Check',
	})
		.sort({ _id: -1 })
		.limit(1)

	const ldlUpdate = allLdlChecks[0]

	//count occurences in array
	const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0)

	// work out percentages of occurences in array
	const percentages = (xs) => xs.reduce((pcts, x) => ({ ...pcts, [x]: (pcts[x] || 0) + 100 / xs.length }), {})

	const tCardStatus = await TCard.aggregate([
		{
			$match: {
				area: {
					$in: [
						'Paint Shop',
						'Paint Shop1',
						'Paint Shop2',
						'Attachments',
						'Revolver',
						'Small Parts',
						'Auto Paint Line',
						'Offline Paint',
						'Paint Plant',
					],
				},
			},
		},
		{
			$project: {
				_id: '$division',
				status: 1,
			},
		},
		{
			$group: {
				_id: '$_id',
				status: { $push: '$status' },
				count: {
					$sum: 1,
				},
			},
		},

		{ $sort: { _id: 1 } },
	])

	for (let d of tCardStatus) {
		if (d._id === 'BHL') {
			bhlPassed = countOccurrences(d.status, 'Passed')
			bhlContained = countOccurrences(d.status, 'Contained')
			bhlFailed = countOccurrences(d.status, 'Failed')
			bhlOpen = countOccurrences(d.status, 'Open')

			bhlPercentages = percentages(d.status)
		}
		if (d._id === 'CABS') {
			cabsPassed = countOccurrences(d.status, 'Passed')
			cabsContained = countOccurrences(d.status, 'Contained')
			cabsFailed = countOccurrences(d.status, 'Failed')
			cabsOpen = countOccurrences(d.status, 'Open')
		}
		if (d._id === 'CP') {
			cpPassed = countOccurrences(d.status, 'Passed')
			cpContained = countOccurrences(d.status, 'Contained')
			cpFailed = countOccurrences(d.status, 'Failed')
			cpOpen = countOccurrences(d.status, 'Open')
		}
		if (d._id === 'EM') {
			emPassed = countOccurrences(d.status, 'Passed')
			emContained = countOccurrences(d.status, 'Contained')
			emFailed = countOccurrences(d.status, 'Failed')
			emOpen = countOccurrences(d.status, 'Open')
		}
		if (d._id === 'HBU') {
			hbuPassed = countOccurrences(d.status, 'Passed')
			hbuContained = countOccurrences(d.status, 'Contained')
			hbuFailed = countOccurrences(d.status, 'Failed')
			hbuOpen = countOccurrences(d.status, 'Open')
		}
		if (d._id === 'HP') {
			hpPassed = countOccurrences(d.status, 'Passed')
			hpContained = countOccurrences(d.status, 'Contained')
			hpFailed = countOccurrences(d.status, 'Failed')
			hpOpen = countOccurrences(d.status, 'Open')
		}
		if (d._id === 'LDL') {
			ldlPassed = countOccurrences(d.status, 'Passed')
			ldlContained = countOccurrences(d.status, 'Contained')
			ldlFailed = countOccurrences(d.status, 'Failed')
			ldlOpen = countOccurrences(d.status, 'Open')
		}
	}

	const bhlTotal = bhlPassed + bhlContained + bhlFailed + bhlOpen
	const cabsTotal = cabsPassed + cabsContained + cabsFailed + cabsOpen
	const cpTotal = cpPassed + cpContained + cpFailed + cpOpen
	const emTotal = emPassed + emContained + emFailed + emOpen
	const hbuTotal = hbuPassed + hbuContained + hbuFailed + hbuOpen
	const hpTotal = hpPassed + hpContained + hpFailed + hpOpen
	const ldlTotal = ldlPassed + ldlContained + ldlFailed + ldlOpen

	const bhlPassedPercent = Math.round((bhlPassed / bhlTotal) * 100)
	const bhlContainedPercent = Math.round((bhlContained / bhlTotal) * 100)
	const bhlfailedPercent = Math.round((bhlFailed / bhlTotal) * 100)

	if (bhlPassedPercent + bhlContainedPercent + bhlfailedPercent >= 100) {
		bhlOpenPercent = 0
	} else {
		bhlOpenPercent = 100 - bhlPassedPercent - bhlContainedPercent - bhlfailedPercent
	}

	const cabsPassedPercent = Math.round((cabsPassed / cabsTotal) * 100)
	const cabsContainedPercent = Math.round((cabsContained / cabsTotal) * 100)
	const cabsfailedPercent = Math.round((cabsFailed / cabsTotal) * 100)
	if (cabsPassedPercent + cabsContainedPercent + cabsfailedPercent >= 100) {
		cabsOpenPercent = 0
	} else {
		cabsOpenPercent = 100 - cabsPassedPercent - cabsContainedPercent - cabsfailedPercent
	}

	const cpPassedPercent = Math.round((cpPassed / cpTotal) * 100)
	const cpContainedPercent = Math.round((cpContained / cpTotal) * 100)
	const cpfailedPercent = Math.round((cpFailed / cpTotal) * 100)
	if (cpPassedPercent + cpContainedPercent + cpfailedPercent >= 100) {
		cpOpenPercent = 0
	} else {
		cpOpenPercent = 100 - cpPassedPercent - cpContainedPercent - cpfailedPercent
	}

	const emPassedPercent = Math.round((emPassed / emTotal) * 100)
	const emContainedPercent = Math.round((emContained / emTotal) * 100)
	const emfailedPercent = Math.round((emFailed / emTotal) * 100)
	if (emPassedPercent + emContainedPercent + emfailedPercent >= 100) {
		emOpenPercent = 0
	} else {
		emOpenPercent = 100 - emPassedPercent - emContainedPercent - emfailedPercent
	}

	const hbuPassedPercent = Math.round((hbuPassed / hbuTotal) * 100)
	const hbuContainedPercent = Math.round((hbuContained / hbuTotal) * 100)
	const hbufailedPercent = Math.round((hbuFailed / hbuTotal) * 100)
	if (hbuPassedPercent + hbuContainedPercent + hbufailedPercent >= 100) {
		hbuOpenPercent = 0
	} else {
		hbuOpenPercent = 100 - hbuPassedPercent - hbuContainedPercent - hbufailedPercent
	}

	const hpPassedPercent = Math.round((hpPassed / hpTotal) * 100)
	const hpContainedPercent = Math.round((hpContained / hpTotal) * 100)
	const hpfailedPercent = Math.round((hpFailed / hpTotal) * 100)
	if (hpPassedPercent + hpContainedPercent + hpfailedPercent >= 100) {
		hpOpenPercent = 0
	} else {
		hpOpenPercent = 100 - hpPassedPercent - hpContainedPercent - hpfailedPercent
	}

	const ldlPassedPercent = Math.round((ldlPassed / ldlTotal) * 100)
	const ldlContainedPercent = Math.round((ldlContained / ldlTotal) * 100)
	const ldlfailedPercent = Math.round((ldlFailed / ldlTotal) * 100)
	if (ldlPassedPercent + ldlContainedPercent + ldlfailedPercent >= 100) {
		ldlOpenPercent = 0
	} else {
		ldlOpenPercent = 100 - ldlPassedPercent - ldlContainedPercent - ldlfailedPercent
	}

	const sevenDaysAgo = moment().subtract(7, 'days').format('YYYY, MM, DD')
	const oneDayAgo = moment().subtract(0, 'days').format('YYYY, MM, DD')

	const sevenDaysAgoDayHelp = moment().subtract(7, 'days').format('DD')
	const sixDaysAgoDayHelp = moment().subtract(6, 'days').format('DD')
	const fiveDaysAgoDayHelp = moment().subtract(5, 'days').format('DD')
	const fourDaysAgoDayHelp = moment().subtract(4, 'days').format('DD')
	const threeDaysAgoDayHelp = moment().subtract(3, 'days').format('DD')
	const twoDaysAgoDayHelp = moment().subtract(2, 'days').format('DD')
	const oneDaysAgoDayHelp = moment().subtract(1, 'days').format('DD')

	const sevenMonthsAgoDayHelp = moment().subtract(7, 'days').format('MM')
	const sixMonthsAgoDayHelp = moment().subtract(6, 'days').format('MM')
	const fiveMonthsAgoDayHelp = moment().subtract(5, 'days').format('MM')
	const fourMonthsAgoDayHelp = moment().subtract(4, 'days').format('MM')
	const threeMonthsAgoDayHelp = moment().subtract(3, 'days').format('MM')
	const twoMonthsAgoDayHelp = moment().subtract(2, 'days').format('MM')
	const oneMonthsAgoDayHelp = moment().subtract(1, 'days').format('MM')

	const sevenDaysAgoDB = new Date(sevenDaysAgo)
	const oneDayAgoDB = new Date(oneDayAgo)

	const sevenDaysChecks = await Check.aggregate([
		{
			$match: {
				area: {
					$in: [
						'Paint Shop',
						'Paint Shop1',
						'Paint Shop2',
						'Attachments',
						'Revolver',
						'Small Parts',
						'Auto Paint Line',
						'Offline Paint',
						'Paint Plant',
					],
				},
				createdAt: { $gt: sevenDaysAgoDB },
			},
		},
		{
			$project: {
				_id: {
					_id: '$division',
					month: { $month: '$createdAt' },
					day: { $dayOfMonth: '$createdAt' },
				},
				result: 1,
			},
		},
		{
			$group: {
				_id: '$_id',
				result: { $push: '$result' },
				count: {
					$sum: 1,
				},
			},
		},

		{ $sort: { _id: 1 } },
	])

	let dates = [
		`${sevenDaysAgoDayHelp}/${sevenMonthsAgoDayHelp}`,
		`${sixDaysAgoDayHelp}/${sixMonthsAgoDayHelp}`,
		`${fiveDaysAgoDayHelp}/${fiveMonthsAgoDayHelp}`,
		`${fourDaysAgoDayHelp}/${fourMonthsAgoDayHelp}`,
		`${threeDaysAgoDayHelp}/${threeMonthsAgoDayHelp}`,
		`${twoDaysAgoDayHelp}/${twoMonthsAgoDayHelp}`,
		`${oneDaysAgoDayHelp}/${oneMonthsAgoDayHelp}`,
	]

	let bhlPassedSevenDaysAgo = 0
	let bhlFailedSevenDaysAgo = 0
	let bhlContainedSevenDaysAgo = 0
	let bhlMissedSevenDaysAgo = 0
	let bhlPassedSixDaysAgo = 0
	let bhlFailedSixDaysAgo = 0
	let bhlContainedSixDaysAgo = 0
	let bhlMissedSixDaysAgo = 0
	let bhlPassedFiveDaysAgo = 0
	let bhlFailedFiveDaysAgo = 0
	let bhlContainedFiveDaysAgo = 0
	let bhlMissedFiveDaysAgo = 0
	let bhlPassedFourDaysAgo = 0
	let bhlFailedFourDaysAgo = 0
	let bhlContainedFourDaysAgo = 0
	let bhlMissedFourDaysAgo = 0
	let bhlPassedThreeDaysAgo = 0
	let bhlFailedThreeDaysAgo = 0
	let bhlContainedThreeDaysAgo = 0
	let bhlMissedThreeDaysAgo = 0
	let bhlPassedTwoDaysAgo = 0
	let bhlFailedTwoDaysAgo = 0
	let bhlContainedTwoDaysAgo = 0
	let bhlMissedTwoDaysAgo = 0
	let bhlPassedOneDaysAgo = 0
	let bhlFailedOneDaysAgo = 0
	let bhlContainedOneDaysAgo = 0
	let bhlMissedOneDaysAgo = 0
	//cabs
	let cabsPassedSevenDaysAgo = 0
	let cabsFailedSevenDaysAgo = 0
	let cabsContainedSevenDaysAgo = 0
	let cabsMissedSevenDaysAgo = 0
	let cabsPassedSixDaysAgo = 0
	let cabsFailedSixDaysAgo = 0
	let cabsContainedSixDaysAgo = 0
	let cabsMissedSixDaysAgo = 0
	let cabsPassedFiveDaysAgo = 0
	let cabsFailedFiveDaysAgo = 0
	let cabsContainedFiveDaysAgo = 0
	let cabsMissedFiveDaysAgo = 0
	let cabsPassedFourDaysAgo = 0
	let cabsFailedFourDaysAgo = 0
	let cabsContainedFourDaysAgo = 0
	let cabsMissedFourDaysAgo = 0
	let cabsPassedThreeDaysAgo = 0
	let cabsFailedThreeDaysAgo = 0
	let cabsContainedThreeDaysAgo = 0
	let cabsMissedThreeDaysAgo = 0
	let cabsPassedTwoDaysAgo = 0
	let cabsFailedTwoDaysAgo = 0
	let cabsContainedTwoDaysAgo = 0
	let cabsMissedTwoDaysAgo = 0
	let cabsPassedOneDaysAgo = 0
	let cabsFailedOneDaysAgo = 0
	let cabsContainedOneDaysAgo = 0
	let cabsMissedOneDaysAgo = 0
	//cp
	let cpPassedSevenDaysAgo = 0
	let cpFailedSevenDaysAgo = 0
	let cpContainedSevenDaysAgo = 0
	let cpMissedSevenDaysAgo = 0
	let cpPassedSixDaysAgo = 0
	let cpFailedSixDaysAgo = 0
	let cpContainedSixDaysAgo = 0
	let cpMissedSixDaysAgo = 0
	let cpPassedFiveDaysAgo = 0
	let cpFailedFiveDaysAgo = 0
	let cpContainedFiveDaysAgo = 0
	let cpMissedFiveDaysAgo = 0
	let cpPassedFourDaysAgo = 0
	let cpFailedFourDaysAgo = 0
	let cpContainedFourDaysAgo = 0
	let cpMissedFourDaysAgo = 0
	let cpPassedThreeDaysAgo = 0
	let cpFailedThreeDaysAgo = 0
	let cpContainedThreeDaysAgo = 0
	let cpMissedThreeDaysAgo = 0
	let cpPassedTwoDaysAgo = 0
	let cpFailedTwoDaysAgo = 0
	let cpContainedTwoDaysAgo = 0
	let cpMissedTwoDaysAgo = 0
	let cpPassedOneDaysAgo = 0
	let cpFailedOneDaysAgo = 0
	let cpContainedOneDaysAgo = 0
	let cpMissedOneDaysAgo = 0
	//cp
	let emPassedSevenDaysAgo = 0
	let emFailedSevenDaysAgo = 0
	let emContainedSevenDaysAgo = 0
	let emMissedSevenDaysAgo = 0
	let emPassedSixDaysAgo = 0
	let emFailedSixDaysAgo = 0
	let emContainedSixDaysAgo = 0
	let emMissedSixDaysAgo = 0
	let emPassedFiveDaysAgo = 0
	let emFailedFiveDaysAgo = 0
	let emContainedFiveDaysAgo = 0
	let emMissedFiveDaysAgo = 0
	let emPassedFourDaysAgo = 0
	let emFailedFourDaysAgo = 0
	let emContainedFourDaysAgo = 0
	let emMissedFourDaysAgo = 0
	let emPassedThreeDaysAgo = 0
	let emFailedThreeDaysAgo = 0
	let emContainedThreeDaysAgo = 0
	let emMissedThreeDaysAgo = 0
	let emPassedTwoDaysAgo = 0
	let emFailedTwoDaysAgo = 0
	let emContainedTwoDaysAgo = 0
	let emMissedTwoDaysAgo = 0
	let emPassedOneDaysAgo = 0
	let emFailedOneDaysAgo = 0
	let emContainedOneDaysAgo = 0
	let emMissedOneDaysAgo = 0
	//hbu
	let hbuPassedSevenDaysAgo = 0
	let hbuFailedSevenDaysAgo = 0
	let hbuContainedSevenDaysAgo = 0
	let hbuMissedSevenDaysAgo = 0
	let hbuPassedSixDaysAgo = 0
	let hbuFailedSixDaysAgo = 0
	let hbuContainedSixDaysAgo = 0
	let hbuMissedSixDaysAgo = 0
	let hbuPassedFiveDaysAgo = 0
	let hbuFailedFiveDaysAgo = 0
	let hbuContainedFiveDaysAgo = 0
	let hbuMissedFiveDaysAgo = 0
	let hbuPassedFourDaysAgo = 0
	let hbuFailedFourDaysAgo = 0
	let hbuContainedFourDaysAgo = 0
	let hbuMissedFourDaysAgo = 0
	let hbuPassedThreeDaysAgo = 0
	let hbuFailedThreeDaysAgo = 0
	let hbuContainedThreeDaysAgo = 0
	let hbuMissedThreeDaysAgo = 0
	let hbuPassedTwoDaysAgo = 0
	let hbuFailedTwoDaysAgo = 0
	let hbuContainedTwoDaysAgo = 0
	let hbuMissedTwoDaysAgo = 0
	let hbuPassedOneDaysAgo = 0
	let hbuFailedOneDaysAgo = 0
	let hbuContainedOneDaysAgo = 0
	let hbuMissedOneDaysAgo = 0
	//hp
	let hpPassedSevenDaysAgo = 0
	let hpFailedSevenDaysAgo = 0
	let hpContainedSevenDaysAgo = 0
	let hpMissedSevenDaysAgo = 0
	let hpPassedSixDaysAgo = 0
	let hpFailedSixDaysAgo = 0
	let hpContainedSixDaysAgo = 0
	let hpMissedSixDaysAgo = 0
	let hpPassedFiveDaysAgo = 0
	let hpFailedFiveDaysAgo = 0
	let hpContainedFiveDaysAgo = 0
	let hpMissedFiveDaysAgo = 0
	let hpPassedFourDaysAgo = 0
	let hpFailedFourDaysAgo = 0
	let hpContainedFourDaysAgo = 0
	let hpMissedFourDaysAgo = 0
	let hpPassedThreeDaysAgo = 0
	let hpFailedThreeDaysAgo = 0
	let hpContainedThreeDaysAgo = 0
	let hpMissedThreeDaysAgo = 0
	let hpPassedTwoDaysAgo = 0
	let hpFailedTwoDaysAgo = 0
	let hpContainedTwoDaysAgo = 0
	let hpMissedTwoDaysAgo = 0
	let hpPassedOneDaysAgo = 0
	let hpFailedOneDaysAgo = 0
	let hpContainedOneDaysAgo = 0
	let hpMissedOneDaysAgo = 0
	//ldl
	let ldlPassedSevenDaysAgo = 0
	let ldlFailedSevenDaysAgo = 0
	let ldlContainedSevenDaysAgo = 0
	let ldlMissedSevenDaysAgo = 0
	let ldlPassedSixDaysAgo = 0
	let ldlFailedSixDaysAgo = 0
	let ldlContainedSixDaysAgo = 0
	let ldlMissedSixDaysAgo = 0
	let ldlPassedFiveDaysAgo = 0
	let ldlFailedFiveDaysAgo = 0
	let ldlContainedFiveDaysAgo = 0
	let ldlMissedFiveDaysAgo = 0
	let ldlPassedFourDaysAgo = 0
	let ldlFailedFourDaysAgo = 0
	let ldlContainedFourDaysAgo = 0
	let ldlMissedFourDaysAgo = 0
	let ldlPassedThreeDaysAgo = 0
	let ldlFailedThreeDaysAgo = 0
	let ldlContainedThreeDaysAgo = 0
	let ldlMissedThreeDaysAgo = 0
	let ldlPassedTwoDaysAgo = 0
	let ldlFailedTwoDaysAgo = 0
	let ldlContainedTwoDaysAgo = 0
	let ldlMissedTwoDaysAgo = 0
	let ldlPassedOneDaysAgo = 0
	let ldlFailedOneDaysAgo = 0
	let ldlContainedOneDaysAgo = 0
	let ldlMissedOneDaysAgo = 0

	for (let c of sevenDaysChecks) {
		if (c._id._id === 'BHL' && c._id.day === +sevenDaysAgoDayHelp) {
			bhlPassedSevenDaysAgo = countOccurrences(c.result, 'Passed')
			bhlFailedSevenDaysAgo = countOccurrences(c.result, 'Failed')
			bhlContainedSevenDaysAgo = countOccurrences(c.result, 'Contained')
			bhlMissedSevenDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'BHL' && c._id.day === +sixDaysAgoDayHelp) {
			bhlPassedSixDaysAgo = countOccurrences(c.result, 'Passed')
			bhlFailedSixDaysAgo = countOccurrences(c.result, 'Failed')
			bhlContainedSixDaysAgo = countOccurrences(c.result, 'Contained')
			bhlMissedSixDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'BHL' && c._id.day === +fiveDaysAgoDayHelp) {
			bhlPassedFiveDaysAgo = countOccurrences(c.result, 'Passed')
			bhlFailedFiveDaysAgo = countOccurrences(c.result, 'Failed')
			bhlContainedFiveDaysAgo = countOccurrences(c.result, 'Contained')
			bhlMissedFiveDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'BHL' && c._id.day === +fourDaysAgoDayHelp) {
			bhlPassedFourDaysAgo = countOccurrences(c.result, 'Passed')
			bhlFailedFourDaysAgo = countOccurrences(c.result, 'Failed')
			bhlContainedFourDaysAgo = countOccurrences(c.result, 'Contained')
			bhlMissedFourDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'BHL' && c._id.day === +threeDaysAgoDayHelp) {
			bhlPassedThreeDaysAgo = countOccurrences(c.result, 'Passed')
			bhlFailedThreeDaysAgo = countOccurrences(c.result, 'Failed')
			bhlContainedThreeDaysAgo = countOccurrences(c.result, 'Contained')
			bhlMissedThreeDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'BHL' && c._id.day === +twoDaysAgoDayHelp) {
			bhlPassedTwoDaysAgo = countOccurrences(c.result, 'Passed')
			bhlFailedTwoDaysAgo = countOccurrences(c.result, 'Failed')
			bhlContainedTwoDaysAgo = countOccurrences(c.result, 'Contained')
			bhlMissedTwoDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'BHL' && c._id.day === +oneDaysAgoDayHelp) {
			bhlPassedOneDaysAgo = countOccurrences(c.result, 'Passed')
			bhlFailedOneDaysAgo = countOccurrences(c.result, 'Failed')
			bhlContainedOneDaysAgo = countOccurrences(c.result, 'Contained')
			bhlMissedOneDaysAgo = countOccurrences(c.result, 'Missed')
		}

		// cabs
		if (c._id._id === 'CABS' && c._id.day === +sevenDaysAgoDayHelp) {
			cabsPassedSevenDaysAgo = countOccurrences(c.result, 'Passed')
			cabsFailedSevenDaysAgo = countOccurrences(c.result, 'Failed')
			cabsContainedSevenDaysAgo = countOccurrences(c.result, 'Contained')
			cabsMissedSevenDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CABS' && c._id.day === +sixDaysAgoDayHelp) {
			cabsPassedSixDaysAgo = countOccurrences(c.result, 'Passed')
			cabsFailedSixDaysAgo = countOccurrences(c.result, 'Failed')
			cabsContainedSixDaysAgo = countOccurrences(c.result, 'Contained')
			cabsMissedSixDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CABS' && c._id.day === +fiveDaysAgoDayHelp) {
			cabsPassedFiveDaysAgo = countOccurrences(c.result, 'Passed')
			cabsFailedFiveDaysAgo = countOccurrences(c.result, 'Failed')
			cabsContainedFiveDaysAgo = countOccurrences(c.result, 'Contained')
			cabsMissedFiveDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CABS' && c._id.day === +fourDaysAgoDayHelp) {
			cabsPassedFourDaysAgo = countOccurrences(c.result, 'Passed')
			cabsFailedFourDaysAgo = countOccurrences(c.result, 'Failed')
			cabsContainedFourDaysAgo = countOccurrences(c.result, 'Contained')
			cabsMissedFourDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CABS' && c._id.day === +threeDaysAgoDayHelp) {
			cabsPassedThreeDaysAgo = countOccurrences(c.result, 'Passed')
			cabsFailedThreeDaysAgo = countOccurrences(c.result, 'Failed')
			cabsContainedThreeDaysAgo = countOccurrences(c.result, 'Contained')
			cabsMissedThreeDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CABS' && c._id.day === +twoDaysAgoDayHelp) {
			cabsPassedTwoDaysAgo = countOccurrences(c.result, 'Passed')
			cabsFailedTwoDaysAgo = countOccurrences(c.result, 'Failed')
			cabsContainedTwoDaysAgo = countOccurrences(c.result, 'Contained')
			cabsMissedTwoDaysAgo = countOccurrences(c.result, 'Missed')
		}

		if (c._id._id === 'CABS' && c._id.day === +oneDaysAgoDayHelp) {
			cabsPassedOneDaysAgo = countOccurrences(c.result, 'Passed')
			cabsFailedOneDaysAgo = countOccurrences(c.result, 'Failed')
			cabsContainedOneDaysAgo = countOccurrences(c.result, 'Contained')
			cabsMissedOneDaysAgo = countOccurrences(c.result, 'Missed')
		}

		// compact
		if (c._id._id === 'CP' && c._id.day === +sevenDaysAgoDayHelp) {
			cpPassedSevenDaysAgo = countOccurrences(c.result, 'Passed')
			cpFailedSevenDaysAgo = countOccurrences(c.result, 'Failed')
			cpContainedSevenDaysAgo = countOccurrences(c.result, 'Contained')
			cpMissedSevenDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CP' && c._id.day === +sixDaysAgoDayHelp) {
			cpPassedSixDaysAgo = countOccurrences(c.result, 'Passed')
			cpFailedSixDaysAgo = countOccurrences(c.result, 'Failed')
			cpContainedSixDaysAgo = countOccurrences(c.result, 'Contained')
			cpMissedSixDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CP' && c._id.day === +fiveDaysAgoDayHelp) {
			cpPassedFiveDaysAgo = countOccurrences(c.result, 'Passed')
			cpFailedFiveDaysAgo = countOccurrences(c.result, 'Failed')
			cpContainedFiveDaysAgo = countOccurrences(c.result, 'Contained')
			cpMissedFiveDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CP' && c._id.day === +fourDaysAgoDayHelp) {
			cpPassedFourDaysAgo = countOccurrences(c.result, 'Passed')
			cpFailedFourDaysAgo = countOccurrences(c.result, 'Failed')
			cpContainedFourDaysAgo = countOccurrences(c.result, 'Contained')
			cpMissedFourDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CP' && c._id.day === +threeDaysAgoDayHelp) {
			cpPassedThreeDaysAgo = countOccurrences(c.result, 'Passed')
			cpFailedThreeDaysAgo = countOccurrences(c.result, 'Failed')
			cpContainedThreeDaysAgo = countOccurrences(c.result, 'Contained')
			cpMissedThreeDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CP' && c._id.day === +twoDaysAgoDayHelp) {
			cpPassedTwoDaysAgo = countOccurrences(c.result, 'Passed')
			cpFailedTwoDaysAgo = countOccurrences(c.result, 'Failed')
			cpContainedTwoDaysAgo = countOccurrences(c.result, 'Contained')
			cpMissedTwoDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'CP' && c._id.day === +oneDaysAgoDayHelp) {
			cpPassedOneDaysAgo = countOccurrences(c.result, 'Passed')
			cpFailedOneDaysAgo = countOccurrences(c.result, 'Failed')
			cpContainedOneDaysAgo = countOccurrences(c.result, 'Contained')
			cpMissedOneDaysAgo = countOccurrences(c.result, 'Missed')
		}

		// earth movers
		if (c._id._id === 'EM' && c._id.day === +sevenDaysAgoDayHelp) {
			emPassedSevenDaysAgo = countOccurrences(c.result, 'Passed')
			emFailedSevenDaysAgo = countOccurrences(c.result, 'Failed')
			emContainedSevenDaysAgo = countOccurrences(c.result, 'Contained')
			emMissedSevenDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'EM' && c._id.day === +sixDaysAgoDayHelp) {
			emPassedSixDaysAgo = countOccurrences(c.result, 'Passed')
			emFailedSixDaysAgo = countOccurrences(c.result, 'Failed')
			emContainedSixDaysAgo = countOccurrences(c.result, 'Contained')
			emMissedSixDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'EM' && c._id.day === +fiveDaysAgoDayHelp) {
			emPassedFiveDaysAgo = countOccurrences(c.result, 'Passed')
			emFailedFiveDaysAgo = countOccurrences(c.result, 'Failed')
			emContainedFiveDaysAgo = countOccurrences(c.result, 'Contained')
			emMissedFiveDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'EM' && c._id.day === +fourDaysAgoDayHelp) {
			emPassedFourDaysAgo = countOccurrences(c.result, 'Passed')
			emFailedFourDaysAgo = countOccurrences(c.result, 'Failed')
			emContainedFourDaysAgo = countOccurrences(c.result, 'Contained')
			emMissedFourDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'EM' && c._id.day === +threeDaysAgoDayHelp) {
			emPassedThreeDaysAgo = countOccurrences(c.result, 'Passed')
			emFailedThreeDaysAgo = countOccurrences(c.result, 'Failed')
			emContainedThreeDaysAgo = countOccurrences(c.result, 'Contained')
			emMissedThreeDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'EM' && c._id.day === +twoDaysAgoDayHelp) {
			emPassedTwoDaysAgo = countOccurrences(c.result, 'Passed')
			emFailedTwoDaysAgo = countOccurrences(c.result, 'Failed')
			emContainedTwoDaysAgo = countOccurrences(c.result, 'Contained')
			emMissedTwoDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'EM' && c._id.day === +oneDaysAgoDayHelp) {
			emPassedOneDaysAgo = countOccurrences(c.result, 'Passed')
			emFailedOneDaysAgo = countOccurrences(c.result, 'Failed')
			emContainedOneDaysAgo = countOccurrences(c.result, 'Contained')
			emMissedOneDaysAgo = countOccurrences(c.result, 'Missed')
		}

		// hbu
		if (c._id._id === 'HBU' && c._id.day === +sevenDaysAgoDayHelp) {
			hbuPassedSevenDaysAgo = countOccurrences(c.result, 'Passed')
			hbuFailedSevenDaysAgo = countOccurrences(c.result, 'Failed')
			hbuContainedSevenDaysAgo = countOccurrences(c.result, 'Contained')
			hbuMissedSevenDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HBU' && c._id.day === +sixDaysAgoDayHelp) {
			hbuPassedSixDaysAgo = countOccurrences(c.result, 'Passed')
			hbuFailedSixDaysAgo = countOccurrences(c.result, 'Failed')
			hbuContainedSixDaysAgo = countOccurrences(c.result, 'Contained')
			hbuMissedSixDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HBU' && c._id.day === +fiveDaysAgoDayHelp) {
			hbuPassedFiveDaysAgo = countOccurrences(c.result, 'Passed')
			hbuFailedFiveDaysAgo = countOccurrences(c.result, 'Failed')
			hbuContainedFiveDaysAgo = countOccurrences(c.result, 'Contained')
			hbuMissedFiveDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HBU' && c._id.day === +fourDaysAgoDayHelp) {
			hbuPassedFourDaysAgo = countOccurrences(c.result, 'Passed')
			hbuFailedFourDaysAgo = countOccurrences(c.result, 'Failed')
			hbuContainedFourDaysAgo = countOccurrences(c.result, 'Contained')
			hbuMissedFourDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HBU' && c._id.day === +threeDaysAgoDayHelp) {
			hbuPassedThreeDaysAgo = countOccurrences(c.result, 'Passed')
			hbuFailedThreeDaysAgo = countOccurrences(c.result, 'Failed')
			hbuContainedThreeDaysAgo = countOccurrences(c.result, 'Contained')
			hbuMissedThreeDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HBU' && c._id.day === +twoDaysAgoDayHelp) {
			hbuPassedTwoDaysAgo = countOccurrences(c.result, 'Passed')
			hbuFailedTwoDaysAgo = countOccurrences(c.result, 'Failed')
			hbuContainedTwoDaysAgo = countOccurrences(c.result, 'Contained')
			hbuMissedTwoDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HBU' && c._id.day === +oneDaysAgoDayHelp) {
			hbuPassedOneDaysAgo = countOccurrences(c.result, 'Passed')
			hbuFailedOneDaysAgo = countOccurrences(c.result, 'Failed')
			hbuContainedOneDaysAgo = countOccurrences(c.result, 'Contained')
			hbuMissedOneDaysAgo = countOccurrences(c.result, 'Missed')
		}

		// hp
		if (c._id._id === 'HP' && c._id.day === +sevenDaysAgoDayHelp) {
			hpPassedSevenDaysAgo = countOccurrences(c.result, 'Passed')
			hpFailedSevenDaysAgo = countOccurrences(c.result, 'Failed')
			hpContainedSevenDaysAgo = countOccurrences(c.result, 'Contained')
			hpMissedSevenDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HP' && c._id.day === +sixDaysAgoDayHelp) {
			hpPassedSixDaysAgo = countOccurrences(c.result, 'Passed')
			hpFailedSixDaysAgo = countOccurrences(c.result, 'Failed')
			hpContainedSixDaysAgo = countOccurrences(c.result, 'Contained')
			hpMissedSixDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HP' && c._id.day === +fiveDaysAgoDayHelp) {
			hpPassedFiveDaysAgo = countOccurrences(c.result, 'Passed')
			hpFailedFiveDaysAgo = countOccurrences(c.result, 'Failed')
			hpContainedFiveDaysAgo = countOccurrences(c.result, 'Contained')
			hpMissedFiveDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HP' && c._id.day === +fourDaysAgoDayHelp) {
			hpPassedFourDaysAgo = countOccurrences(c.result, 'Passed')
			hpFailedFourDaysAgo = countOccurrences(c.result, 'Failed')
			hpContainedFourDaysAgo = countOccurrences(c.result, 'Contained')
			hpMissedFourDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HP' && c._id.day === +threeDaysAgoDayHelp) {
			hpPassedThreeDaysAgo = countOccurrences(c.result, 'Passed')
			hpFailedThreeDaysAgo = countOccurrences(c.result, 'Failed')
			hpContainedThreeDaysAgo = countOccurrences(c.result, 'Contained')
			hpMissedThreeDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HP' && c._id.day === +twoDaysAgoDayHelp) {
			hpPassedTwoDaysAgo = countOccurrences(c.result, 'Passed')
			hpFailedTwoDaysAgo = countOccurrences(c.result, 'Failed')
			hpContainedTwoDaysAgo = countOccurrences(c.result, 'Contained')
			hpMissedTwoDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'HP' && c._id.day === +oneDaysAgoDayHelp) {
			hpPassedOneDaysAgo = countOccurrences(c.result, 'Passed')
			hpFailedOneDaysAgo = countOccurrences(c.result, 'Failed')
			hpContainedOneDaysAgo = countOccurrences(c.result, 'Contained')
			hpMissedOneDaysAgo = countOccurrences(c.result, 'Missed')
		}

		// ldl
		if (c._id._id === 'LDL' && c._id.day === +sevenDaysAgoDayHelp) {
			ldlPassedSevenDaysAgo = countOccurrences(c.result, 'Passed')
			ldlFailedSevenDaysAgo = countOccurrences(c.result, 'Failed')
			ldlContainedSevenDaysAgo = countOccurrences(c.result, 'Contained')
			ldlMissedSevenDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'LDL' && c._id.day === +sixDaysAgoDayHelp) {
			ldlPassedSixDaysAgo = countOccurrences(c.result, 'Passed')
			ldlFailedSixDaysAgo = countOccurrences(c.result, 'Failed')
			ldlContainedSixDaysAgo = countOccurrences(c.result, 'Contained')
			ldlMissedSixDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'LDL' && c._id.day === +fiveDaysAgoDayHelp) {
			ldlPassedFiveDaysAgo = countOccurrences(c.result, 'Passed')
			ldlFailedFiveDaysAgo = countOccurrences(c.result, 'Failed')
			ldlContainedFiveDaysAgo = countOccurrences(c.result, 'Contained')
			ldlMissedFiveDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'LDL' && c._id.day === +fourDaysAgoDayHelp) {
			ldlPassedFourDaysAgo = countOccurrences(c.result, 'Passed')
			ldlFailedFourDaysAgo = countOccurrences(c.result, 'Failed')
			ldlContainedFourDaysAgo = countOccurrences(c.result, 'Contained')
			ldlMissedFourDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'LDL' && c._id.day === +threeDaysAgoDayHelp) {
			ldlPassedThreeDaysAgo = countOccurrences(c.result, 'Passed')
			ldlFailedThreeDaysAgo = countOccurrences(c.result, 'Failed')
			ldlContainedThreeDaysAgo = countOccurrences(c.result, 'Contained')
			ldlMissedThreeDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'LDL' && c._id.day === +twoDaysAgoDayHelp) {
			ldlPassedTwoDaysAgo = countOccurrences(c.result, 'Passed')
			ldlFailedTwoDaysAgo = countOccurrences(c.result, 'Failed')
			ldlContainedTwoDaysAgo = countOccurrences(c.result, 'Contained')
			ldlMissedTwoDaysAgo = countOccurrences(c.result, 'Missed')
		}
		if (c._id._id === 'LDL' && c._id.day === +oneDaysAgoDayHelp) {
			ldlPassedOneDaysAgo = countOccurrences(c.result, 'Passed')
			ldlFailedOneDaysAgo = countOccurrences(c.result, 'Failed')
			ldlContainedOneDaysAgo = countOccurrences(c.result, 'Contained')
			ldlMissedOneDaysAgo = countOccurrences(c.result, 'Missed')
		}
	}

	// console.log('Passed =>', cabsPassed)
	// console.log('Contained =>', cabsContained)
	// console.log('failed =>', cabsFailed)
	// console.log('Missed =>', cabsOpen)
	// console.log('Total =>', cabsTotal)
	// console.log('Passed percent =>', cabsPassedPercent)
	// console.log('Contained percent =>', cabsContainedPercent)
	// console.log('Failed percent =>', cabsfailedPercent)
	// console.log('Missed percent =>', cabsOpenPercent)

	const area = 'analysis'

	res.render('tCards/analysis', {
		dates,
		area,

		bhlUpdate,
		cabsUpdate,
		compactUpdate,
		earthMoversUpdate,
		hbuUpdate,
		heavyUpdate,
		ldlUpdate,

		bhlPassed,
		bhlContained,
		bhlFailed,
		bhlOpen,
		bhlTotal,
		bhlPassedPercent,
		bhlContainedPercent,
		bhlfailedPercent,
		bhlOpenPercent,
		//history
		bhlPassedSevenDaysAgo,
		bhlFailedSevenDaysAgo,
		bhlContainedSevenDaysAgo,
		bhlMissedSevenDaysAgo,
		bhlPassedSixDaysAgo,
		bhlFailedSixDaysAgo,
		bhlContainedSixDaysAgo,
		bhlMissedSixDaysAgo,
		bhlPassedFiveDaysAgo,
		bhlFailedFiveDaysAgo,
		bhlContainedFiveDaysAgo,
		bhlMissedFiveDaysAgo,
		bhlPassedFourDaysAgo,
		bhlFailedFourDaysAgo,
		bhlContainedFourDaysAgo,
		bhlMissedFourDaysAgo,
		bhlPassedThreeDaysAgo,
		bhlFailedThreeDaysAgo,
		bhlContainedThreeDaysAgo,
		bhlMissedThreeDaysAgo,
		bhlPassedTwoDaysAgo,
		bhlFailedTwoDaysAgo,
		bhlContainedTwoDaysAgo,
		bhlMissedTwoDaysAgo,
		bhlPassedOneDaysAgo,
		bhlFailedOneDaysAgo,
		bhlContainedOneDaysAgo,
		bhlMissedOneDaysAgo,

		cabsPassed,
		cabsContained,
		cabsFailed,
		cabsOpen,
		cabsTotal,
		cabsPassedPercent,
		cabsContainedPercent,
		cabsfailedPercent,
		cabsOpenPercent,
		//history
		cabsPassedSevenDaysAgo,
		cabsFailedSevenDaysAgo,
		cabsContainedSevenDaysAgo,
		cabsMissedSevenDaysAgo,
		cabsPassedSixDaysAgo,
		cabsFailedSixDaysAgo,
		cabsContainedSixDaysAgo,
		cabsMissedSixDaysAgo,
		cabsPassedFiveDaysAgo,
		cabsFailedFiveDaysAgo,
		cabsContainedFiveDaysAgo,
		cabsMissedFiveDaysAgo,
		cabsPassedFourDaysAgo,
		cabsFailedFourDaysAgo,
		cabsContainedFourDaysAgo,
		cabsMissedFourDaysAgo,
		cabsPassedThreeDaysAgo,
		cabsFailedThreeDaysAgo,
		cabsContainedThreeDaysAgo,
		cabsMissedThreeDaysAgo,
		cabsPassedTwoDaysAgo,
		cabsFailedTwoDaysAgo,
		cabsContainedTwoDaysAgo,
		cabsMissedTwoDaysAgo,
		cabsPassedOneDaysAgo,
		cabsFailedOneDaysAgo,
		cabsContainedOneDaysAgo,
		cabsMissedOneDaysAgo,

		cpPassed,
		cpContained,
		cpFailed,
		cpOpen,
		cpTotal,
		cpPassedPercent,
		cpContainedPercent,
		cpfailedPercent,
		cpOpenPercent,
		//history
		cpPassedSevenDaysAgo,
		cpFailedSevenDaysAgo,
		cpContainedSevenDaysAgo,
		cpMissedSevenDaysAgo,
		cpPassedSixDaysAgo,
		cpFailedSixDaysAgo,
		cpContainedSixDaysAgo,
		cpMissedSixDaysAgo,
		cpPassedFiveDaysAgo,
		cpFailedFiveDaysAgo,
		cpContainedFiveDaysAgo,
		cpMissedFiveDaysAgo,
		cpPassedFourDaysAgo,
		cpFailedFourDaysAgo,
		cpContainedFourDaysAgo,
		cpMissedFourDaysAgo,
		cpPassedThreeDaysAgo,
		cpFailedThreeDaysAgo,
		cpContainedThreeDaysAgo,
		cpMissedThreeDaysAgo,
		cpPassedTwoDaysAgo,
		cpFailedTwoDaysAgo,
		cpContainedTwoDaysAgo,
		cpMissedTwoDaysAgo,
		cpPassedOneDaysAgo,
		cpFailedOneDaysAgo,
		cpContainedOneDaysAgo,
		cpMissedOneDaysAgo,

		emPassed,
		emContained,
		emFailed,
		emOpen,
		emTotal,
		emPassedPercent,
		emContainedPercent,
		emfailedPercent,
		emOpenPercent,
		//history
		emPassedSevenDaysAgo,
		emFailedSevenDaysAgo,
		emContainedSevenDaysAgo,
		emMissedSevenDaysAgo,
		emPassedSixDaysAgo,
		emFailedSixDaysAgo,
		emContainedSixDaysAgo,
		emMissedSixDaysAgo,
		emPassedFiveDaysAgo,
		emFailedFiveDaysAgo,
		emContainedFiveDaysAgo,
		emMissedFiveDaysAgo,
		emPassedFourDaysAgo,
		emFailedFourDaysAgo,
		emContainedFourDaysAgo,
		emMissedFourDaysAgo,
		emPassedThreeDaysAgo,
		emFailedThreeDaysAgo,
		emContainedThreeDaysAgo,
		emMissedThreeDaysAgo,
		emPassedTwoDaysAgo,
		emFailedTwoDaysAgo,
		emContainedTwoDaysAgo,
		emMissedTwoDaysAgo,
		emPassedOneDaysAgo,
		emFailedOneDaysAgo,
		emContainedOneDaysAgo,
		emMissedOneDaysAgo,

		hbuPassed,
		hbuContained,
		hbuFailed,
		hbuOpen,
		hbuTotal,
		hbuPassedPercent,
		hbuContainedPercent,
		hbufailedPercent,
		hbuOpenPercent,
		//history
		hbuPassedSevenDaysAgo,
		hbuFailedSevenDaysAgo,
		hbuContainedSevenDaysAgo,
		hbuMissedSevenDaysAgo,
		hbuPassedSixDaysAgo,
		hbuFailedSixDaysAgo,
		hbuContainedSixDaysAgo,
		hbuMissedSixDaysAgo,
		hbuPassedFiveDaysAgo,
		hbuFailedFiveDaysAgo,
		hbuContainedFiveDaysAgo,
		hbuMissedFiveDaysAgo,
		hbuPassedFourDaysAgo,
		hbuFailedFourDaysAgo,
		hbuContainedFourDaysAgo,
		hbuMissedFourDaysAgo,
		hbuPassedThreeDaysAgo,
		hbuFailedThreeDaysAgo,
		hbuContainedThreeDaysAgo,
		hbuMissedThreeDaysAgo,
		hbuPassedTwoDaysAgo,
		hbuFailedTwoDaysAgo,
		hbuContainedTwoDaysAgo,
		hbuMissedTwoDaysAgo,
		hbuPassedOneDaysAgo,
		hbuFailedOneDaysAgo,
		hbuContainedOneDaysAgo,
		hbuMissedOneDaysAgo,

		hpPassed,
		hpContained,
		hpFailed,
		hpOpen,
		hpTotal,
		hpPassedPercent,
		hpContainedPercent,
		hpfailedPercent,
		hpOpenPercent,
		//history
		hpPassedSevenDaysAgo,
		hpFailedSevenDaysAgo,
		hpContainedSevenDaysAgo,
		hpMissedSevenDaysAgo,
		hpPassedSixDaysAgo,
		hpFailedSixDaysAgo,
		hpContainedSixDaysAgo,
		hpMissedSixDaysAgo,
		hpPassedFiveDaysAgo,
		hpFailedFiveDaysAgo,
		hpContainedFiveDaysAgo,
		hpMissedFiveDaysAgo,
		hpPassedFourDaysAgo,
		hpFailedFourDaysAgo,
		hpContainedFourDaysAgo,
		hpMissedFourDaysAgo,
		hpPassedThreeDaysAgo,
		hpFailedThreeDaysAgo,
		hpContainedThreeDaysAgo,
		hpMissedThreeDaysAgo,
		hpPassedTwoDaysAgo,
		hpFailedTwoDaysAgo,
		hpContainedTwoDaysAgo,
		hpMissedTwoDaysAgo,
		hpPassedOneDaysAgo,
		hpFailedOneDaysAgo,
		hpContainedOneDaysAgo,
		hpMissedOneDaysAgo,

		ldlPassed,
		ldlContained,
		ldlFailed,
		ldlOpen,
		ldlTotal,
		ldlPassedPercent,
		ldlContainedPercent,
		ldlfailedPercent,
		ldlOpenPercent,
		//history
		ldlPassedSevenDaysAgo,
		ldlFailedSevenDaysAgo,
		ldlContainedSevenDaysAgo,
		ldlMissedSevenDaysAgo,
		ldlPassedSixDaysAgo,
		ldlFailedSixDaysAgo,
		ldlContainedSixDaysAgo,
		ldlMissedSixDaysAgo,
		ldlPassedFiveDaysAgo,
		ldlFailedFiveDaysAgo,
		ldlContainedFiveDaysAgo,
		ldlMissedFiveDaysAgo,
		ldlPassedFourDaysAgo,
		ldlFailedFourDaysAgo,
		ldlContainedFourDaysAgo,
		ldlMissedFourDaysAgo,
		ldlPassedThreeDaysAgo,
		ldlFailedThreeDaysAgo,
		ldlContainedThreeDaysAgo,
		ldlMissedThreeDaysAgo,
		ldlPassedTwoDaysAgo,
		ldlFailedTwoDaysAgo,
		ldlContainedTwoDaysAgo,
		ldlMissedTwoDaysAgo,
		ldlPassedOneDaysAgo,
		ldlFailedOneDaysAgo,
		ldlContainedOneDaysAgo,
		ldlMissedOneDaysAgo,
	})
}

module.exports.divisionViewQCS = async (req, res) => {
	const divsions = ['BHL', 'Cabs', 'CP', 'EM', 'HP', 'LDL', 'PS', 'USA']

	let data = []
	let longDivision

	let dateForDay = new Date()
	let todayNumber = dateForDay.getDay()
	let thisMonth = dateForDay.getMonth() + 1

	const todayDate = new Date()
	todayDate.setHours(0, 0, 0, 0)

	function getLastDayOfMonth(year, month) {
		return new Date(year, month + 1, 0)
	}

	// 👇️ Last Day of CURRENT MONTH
	const date = new Date()
	const lastDayCurrentMonth = getLastDayOfMonth(date.getFullYear(), date.getMonth())

	const dueTodayArr = ['Daily']

	if (todayNumber === 5) {
		dueTodayArr.push('Weekly')
	}
	if (todayDate.getTime() === lastDayCurrentMonth.getTime()) {
		dueTodayArr.push('Monthly')
		if (thisMonth === 3 || thisMonth === 6 || thisMonth === 9 || thisMonth === 12) {
			dueTodayArr.push('Quarterly')
		}
	}

	const allQualityChecks = await TCard.find(
		{
			area: 'quality',
		},
		{ division: 1, status: 1, location: 1, area: 1 }
	)

	//dynamic filter function
	filterItems = (data, filters) => data.filter((item) => !filters.find((x) => x.key.split('.').reduce((keys, key) => keys[key], item) !== x.value))

	for (let division of divsions) {
		if (division === 'BHL') longDivision = 'Backhoe Loader/Site Dumper'
		if (division === 'CP') longDivision = 'Compact Products'
		if (division === 'EM') longDivision = 'Earthmovers/Landpower'
		if (division === 'HP') longDivision = 'Heavy Products'
		if (division === 'LDL') longDivision = 'Loadall'
		if (division === 'Cabs') longDivision = 'Cabs Systems'
		if (division === 'PS') longDivision = 'Power Systems'
		if (division === 'USA') longDivision = 'Savannah'
		if (division === 'Transmissions') longDivision = 'Transmissions'

		const totalChecks = filterItems(allQualityChecks, [{ key: 'division', value: division }]).length

		const dueTodayIds = await TCard.distinct('_id', {
			area: 'quality',
			division: division,
			frequency: { $in: dueTodayArr },
		})

		const totalChecksDueToday = dueTodayIds.length

		// const dueTodayIds = totalChecksDueToday.map((m) => m._id)

		let totalChecksDoneToday = await TCard.countDocuments({
			area: 'quality',
			division: division,
			_id: { $in: dueTodayIds },
			status: { $ne: 'Open' },

			// createdAt: { $gte: todayDate },
		})

		if (totalChecksDoneToday > totalChecksDueToday) totalChecksDoneToday = totalChecksDueToday

		let outcomes = ['Open', 'Contained', 'failed', 'Missed']

		// let outcomes = [
		// 	{ name: 'totalChecksOpen', search: 'Open' },
		// 	{ name: 'totalChecksContined', search: 'Contained' },
		// 	{ name: 'totalChecksfailed', search: 'failed' },
		// 	{ name: 'totalChecksMissed', search: 'Missed' },
		// ]

		let divTotals = []
		for (let o of outcomes) {
			let data = filterItems(allQualityChecks, [
				{ key: 'division', value: division },
				{ key: 'status', value: o },
			]).length

			divTotals.push({ [`totalChecks${o}`]: data })
		}

		const totalChecksOpen = filterItems(allQualityChecks, [
			{ key: 'division', value: division },
			{ key: 'status', value: 'Open' },
		]).length

		const totalChecksContained = filterItems(allQualityChecks, [
			{ key: 'division', value: division },
			{ key: 'status', value: 'Contained' },
		]).length

		const totalChecksFailed = filterItems(allQualityChecks, [
			{ key: 'division', value: division },
			{ key: 'status', value: 'Failed' },
		]).length

		const totalChecksMissed = filterItems(allQualityChecks, [
			{ key: 'division', value: division },
			{ key: 'status', value: 'Missed' },
		]).length

		const totalChecksDone = totalChecks - totalChecksOpen

		// supplied parts

		const totalSuppliedParts = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
		})

		const totalSuppliedPartsOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
			status: 'Open',
		})
		const totalSuppliedPartsContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
			status: 'Contained',
		})
		const totalSuppliedPartsFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
			status: 'Failed',
		})
		const totalSuppliedPartsMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
			status: 'Missed',
		})

		const doneSuppliedParts = totalSuppliedParts - totalSuppliedPartsOpen

		// customer quality

		const totalCustomerQuality = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
		})

		const totalCustomerQualityOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
			status: 'Open',
		})
		const totalCustomerQualityContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
			status: 'Contained',
		})
		const totalCustomerQualityFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
			status: 'Failed',
		})
		const totalCustomerQualityMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
			status: 'Missed',
		})

		const doneCustomerQuality = totalCustomerQuality - totalCustomerQualityOpen

		// delivered quality

		const totalDeliveredQuality = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
		})

		const totalDeliveredQualityOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
			status: 'Open',
		})
		const totalDeliveredQualityContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
			status: 'Contained',
		})
		const totalDeliveredQualityFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
			status: 'Failed',
		})
		const totalDeliveredQualityMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
			status: 'Missed',
		})

		const doneDeliveredQuality = totalDeliveredQuality - totalDeliveredQualityOpen

		// operational quality

		const totalOperationalQuality = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
		})

		const totalOperationalQualityOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
			status: 'Open',
		})
		const totalOperationalQualityContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
			status: 'Contained',
		})
		const totalOperationalQualityFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
			status: 'Failed',
		})
		const totalOperationalQualityMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
			status: 'Missed',
		})

		const doneOperationalQuality = totalOperationalQuality - totalOperationalQualityOpen

		// stabdards & accreditation

		const totalSA = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
		})

		const totalSAOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
			status: 'Open',
		})
		const totalSAContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
			status: 'Contained',
		})
		const totalSAFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
			status: 'Failed',
		})
		const totalSAMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
			status: 'Missed',
		})

		const doneSA = totalSA - totalSAOpen

		const tCards = await TCard.find({
			division,
			area: {
				$in: ['quality'],
			},
		}).populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 1,
		})

		let allChecks = []
		for (let card of tCards) {
			card.checks.forEach(function (check) {
				if (check.checkedBy) {
					allChecks.push(check)
				}
			})
		}

		allChecks.sort((a, b) => b.createdAt - a.createdAt)

		const update = allChecks[0] || []

		// console.log(data[0])

		data.push({
			totalChecksDueToday,
			totalChecksDoneToday,
			divTotals,
			division,
			longDivision,
			totalChecks,
			totalChecksOpen,
			totalChecksContained,
			totalChecksFailed,
			totalChecksMissed,
			totalChecksDone,
			totalSuppliedParts,
			totalSuppliedPartsOpen,
			totalSuppliedPartsContained,
			totalSuppliedPartsFailed,
			totalSuppliedPartsMissed,
			doneSuppliedParts,
			totalCustomerQuality,
			totalCustomerQualityContained,
			totalCustomerQualityFailed,
			totalCustomerQualityMissed,
			doneCustomerQuality,
			totalDeliveredQuality,
			totalDeliveredQualityOpen,
			totalDeliveredQualityContained,
			totalDeliveredQualityFailed,
			totalDeliveredQualityMissed,
			doneDeliveredQuality,
			totalOperationalQuality,
			totalOperationalQualityOpen,
			totalOperationalQualityContained,
			totalOperationalQualityFailed,
			totalOperationalQualityMissed,
			doneOperationalQuality,
			totalSA,
			totalSAOpen,
			totalSAContained,
			totalSAFailed,
			totalSAMissed,
			doneSA,
			update,
		})
	}

	const area = 'quality'

	// console.log(data)

	res.render('tCards/division-viewQCS', {
		area,
		data,
	})
}

module.exports.groupViewQCSDash = async (req, res) => {
	const startOfNames = new Date('2022, 06, 07')

	const justBusinessUnits = ['BHL', 'CP', 'EM', 'HP', 'LDL']
	// const missedChecksFornames = await Check.find({
	// 	// createdAt: { $gt: startOfNames },
	// 	result: 'Missed',
	// 	area: 'quality',
	//   division: {$in: justBusinessUnits}
	// })

	// for (let m of missedChecksFornames) {
	// 	const theTcard = await TCard.findOne({
	// 		name: m.name,
	// 		division: m.division,
	// 		location: m.location,
	// 		description: m.description,
	// 	})
	// 	// console.log(theTcard)
	// 	if (theTcard) {
	// 		let updatedCheck = await Check.findByIdAndUpdate(m._id, {
	// 			missedBy: theTcard.primaryUserName,
	// 		})
	// 	}
	// }

	// console.log(missedChecksFornames)

	const nanToZero = (num) => {
		let formattedNum = num

		if (isNaN(formattedNum)) formattedNum = 0
		return formattedNum
	}
	const getFirstMondayOfWeek = (weekNo) => {
		const thisWeek = moment().subtract(1, 'weeks').isoWeek()

		// if (weekNo > thisWeek) {
		// 	firstMonday = new Date(new Date().getFullYear() - 1, 0, 4, 0, 0, 0, 0)
		// } else {
		// 	firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)
		// }

		let firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)

		while (firstMonday.getDay() != 1) {
			firstMonday.setDate(firstMonday.getDate() - 1)
		}
		if (1 <= weekNo && weekNo <= 52) return firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))

		firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))
		if ((weekNo = 53 && firstMonday.getDate() >= 22 && firstMonday.getDate() <= 28)) return firstMonday
		return null
	}

	//count occurences in array
	const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0)

	// work out percentages of occurences in array
	const percentages = (xs) => xs.reduce((pcts, x) => ({ ...pcts, [x]: (pcts[x] || 0) + 100 / xs.length }), {})
	const area = 'quality'
	const thisYear = moment().format('YYYY')
	const thisWeekNumber = moment().isoWeek()
	const lastWeekNumber = moment().subtract(1, 'weeks').isoWeek()
	const twoWeeksAgoNumber = moment().subtract(2, 'weeks').isoWeek()
	const threeWeeksAgoNumber = moment().subtract(3, 'weeks').isoWeek()
	const fourWeeksAgoNumber = moment().subtract(4, 'weeks').isoWeek()
	const fiveWeeksAgoNumber = moment().subtract(5, 'weeks').isoWeek()
	const sixWeeksAgoNumber = moment().subtract(6, 'weeks').isoWeek()
	const sevenWeeksAgoNumber = moment().subtract(7, 'weeks').isoWeek()
	const eightWeeksAgoNumber = moment().subtract(8, 'weeks').isoWeek()

	const startDate = new Date(getFirstMondayOfWeek(eightWeeksAgoNumber))

	// const currentWeek = `Week ${thisWeekNumber}`
	const currentWeek = `wc ${moment(new Date(getFirstMondayOfWeek(thisWeekNumber))).format('DD-MM')}`
	const lastWeek = `wc ${moment(new Date(getFirstMondayOfWeek(lastWeekNumber))).format('DD-MM')}`
	const twoWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(twoWeeksAgoNumber))).format('DD-MM')}`
	const threeWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(threeWeeksAgoNumber))).format('DD-MM')}`
	const fourWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(fourWeeksAgoNumber))).format('DD-MM')}`
	const fiveWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(fiveWeeksAgoNumber))).format('DD-MM')}`
	const sixWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(sixWeeksAgoNumber))).format('DD-MM')}`
	const sevenWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(sevenWeeksAgoNumber))).format('DD-MM')}`
	const eightWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(eightWeeksAgoNumber))).format('DD-MM')}`

	const startOfYear = new Date(`${thisYear}, 01, 01`)

	const startOfThisWeek = new Date(getFirstMondayOfWeek(thisWeekNumber))

	const top3FailedLastWeekCTQ = await Check.aggregate([
		{
			$match: {
				createdAt: { $gt: startOfThisWeek },
				result: 'Failed',
				area: 'quality',
				level: 'CTQ',
				division: { $in: justBusinessUnits },
			},
		},
		{
			$group: {
				_id: '$name',
				count: {
					$sum: 1,
				},
			},
		},
		// {
		// 	$match: {
		// 		count: { $gt: 1 },
		// 	},
		// },
		{ $sort: { count: -1 } },
	]).limit(3)
	const top3FailedLastWeekQC = await Check.aggregate([
		{
			$match: {
				createdAt: { $gt: startOfThisWeek },
				result: 'Failed',
				area: 'quality',
				level: 'QC',
				division: { $in: justBusinessUnits },
			},
		},
		{
			$group: {
				_id: '$name',
				count: {
					$sum: 1,
				},
			},
		},
		// {
		// 	$match: {
		// 		count: { $gt: 1 },
		// 	},
		// },
		{ $sort: { count: -1 } },
	]).limit(3)

	const graphLabels = [
		// eightWeeksAgo,
		// sevenWeeksAgo,
		sixWeeksAgo,
		fiveWeeksAgo,
		// fourWeeksAgo,
		threeWeeksAgo,
		twoWeeksAgo,
		lastWeek,
		currentWeek,
	]

	const levels = ['CTQ', 'QC']

	ignored = ['Not Required']

	const doneChecksByWeek = await Check.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate },
				result: { $nin: ignored },
				area: 'quality',
				level: { $in: levels },
				division: { $in: justBusinessUnits },
			},
		},
		{
			$addFields: {
				week: {
					$isoWeek: {
						date: '$createdAt',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$group: {
				_id: {
					week: '$week',
					division: '$division',
					level: '$level',
				},
				result: { $push: '$result' },
				details: {
					$push: {
						tCardId: '$tCardId',
						check: '$name',
						missedBy: '$missedBy',
						level: '$level',
						result: '$result',
						division: '$division',
						location: '$location',
						description: '$description',
						checkedBy: '$checkedBy',
						createdAt: '$createdAt',
						value: '$value',
						unit: '$unit',
						target: '$target',
						reson: '',
						action: '',
						containedBy: '',
						containedAt: null,
					},
				},
			},
		},
	])

	const doneChecksYTD = await Check.aggregate([
		{
			$match: {
				createdAt: { $gte: startOfYear },
				result: { $nin: ignored },
				area: 'quality',
				level: { $in: levels },
				division: { $in: justBusinessUnits },
			},
		},
		// {
		// 	$addFields: {
		// 		week: {
		// 			$isoWeek: {
		// 				date: '$createdAt',
		// 				timezone: 'Europe/London',
		// 			},
		// 		},
		// 	},
		// },
		{
			$group: {
				_id: {
					division: '$division',
					level: '$level',
				},
				result: { $push: '$result' },
			},
		},
	])

	// console.log(doneChecksYTD)

	let divisions = ['BHL', 'CP', 'EM', 'HP', 'LDL']
	const dataYTD = []

	for (let division of divisions) {
		let totalChecks = 0
		let totalPassed = 0
		let totalFailed = 0
		let totalMissed = 0
		let totalMissedPercent = 0
		let totalCompletedPercent = 0

		let totalChecksQC = 0
		let totalPassedQC = 0
		let totalFailedQC = 0
		let totalPassedPercentQC = 0

		let totalChecksCTQ = 0
		let totalPassedCTQ = 0
		let totalFailedCTQ = 0
		let totalPassedPercentCTQ = 0

		for (let c of doneChecksYTD) {
			if (c._id.division === division) {
				totalPassed += countOccurrences(c.result, 'Passed')
				totalFailed += countOccurrences(c.result, 'Failed')
				totalMissed += countOccurrences(c.result, 'Missed')
				totalChecks = totalPassed + totalFailed + totalMissed
				totalMissedPercent = nanToZero(Math.round((totalMissed / totalChecks) * 100))
				TotalCompletedPercent = 100 - totalMissedPercent

				if (c._id.level === 'QC') {
					totalPassedQC += countOccurrences(c.result, 'Passed')
					totalFailedQC += countOccurrences(c.result, 'Failed')
					totalChecksQC = totalPassedQC + totalFailedQC
					totalPassedPercentQC = nanToZero(Math.round((totalPassedQC / totalChecksQC) * 100))
				}
				if (c._id.level === 'CTQ') {
					totalPassedCTQ += countOccurrences(c.result, 'Passed')
					totalFailedCTQ += countOccurrences(c.result, 'Failed')
					totalChecksCTQ = totalPassedCTQ + totalFailedCTQ
					totalPassedPercentCTQ = nanToZero(Math.round((totalPassedCTQ / totalChecksCTQ) * 100))
				}
			}
		}
		dataYTD.push({
			division,
			TotalCompletedPercent,
			totalPassedPercentCTQ,
			totalPassedPercentQC,
		})
	}

	// console.log(dataYTD)
	// console.log(doneChecksYTD)

	const data = []

	let weeks = [
		// eightWeeksAgoNumber,
		// sevenWeeksAgoNumber,
		sixWeeksAgoNumber,
		fiveWeeksAgoNumber,
		// fourWeeksAgoNumber,
		threeWeeksAgoNumber,
		twoWeeksAgoNumber,
		lastWeekNumber,
		thisWeekNumber,
	]

	for (let week of weeks) {
		let theWeekNumber = week
		// let date = `Week ${theWeekNumber}`
		let date = `wc ${moment(new Date(getFirstMondayOfWeek(theWeekNumber))).format('DD-MM')}`
		let shortDate = date.replace(/ +/g, '')
		let totalChecks = 0
		let completedChecks = 0
		let missedCount = 0
		let missedPercent = 0
		let completedPercent = 0
		let failCount = 0
		let failPercent = 0
		let passCount = 0
		let passPercent = 0
		let failCountQC = 0
		let failCountCTQ = 0
		let passCountQCBHL = 0
		let failCountQCBHL = 0
		let totalChecksQCBHL = 0
		let passedPercentQCBHL = 0
		let passCountQCCP = 0
		let failCountQCCP = 0
		let totalChecksQCCP = 0
		let passedPercentQCCP = 0
		let passCountQCEM = 0
		let failCountQCEM = 0
		let totalChecksQCEM = 0
		let passedPercentQCEM = 0
		let passCountQCHP = 0
		let failCountQCHP = 0
		let totalChecksQCHP = 0
		let passedPercentQCHP = 0
		let passCountQCLDL = 0
		let failCountQCLDL = 0
		let totalChecksQCLDL = 0
		let passedPercentQCLDL = 0
		let passCountCTQBHL = 0
		let failCountCTQBHL = 0
		let totalChecksCTQBHL = 0
		let passedPercentCTQBHL = 0
		let passCountCTQCP = 0
		let failCountCTQCP = 0
		let totalChecksCTQCP = 0
		let passedPercentCTQCP = 0
		let passCountCTQEM = 0
		let failCountCTQEM = 0
		let totalChecksCTQEM = 0
		let passedPercentCTQEM = 0
		let passCountCTQHP = 0
		let failCountCTQHP = 0
		let totalChecksCTQHP = 0
		let passedPercentCTQHP = 0
		let passCountCTQLDL = 0
		let failCountCTQLDL = 0
		let totalChecksCTQLDL = 0
		let passedPercentCTQLDL = 0
		let completedCountBHL = 0
		let completedPercentBHL = 0
		let missedCountBHL = 0
		let completedCountCP = 0
		let completedPercentCP = 0
		let missedCountCP = 0
		let completedCountEM = 0
		let completedPercentEM = 0
		let missedCountEM = 0
		let completedCountHP = 0
		let completedPercentHP = 0
		let missedCountHP = 0
		let completedCountLDL = 0
		let completedPercentLDL = 0
		let missedCountLDL = 0
		let failedChecksQC = []
		let failedChecksCTQ = []
		let missedChecksArr = []

		for (let c of doneChecksByWeek) {
			if (c._id.week === week) {
				missedCount += countOccurrences(c.result, 'Missed')
				passCount += countOccurrences(c.result, 'Passed')
				failCount += countOccurrences(c.result, 'Failed')
				totalChecks = missedCount + passCount + failCount
				completedChecks = passCount + failCount
				missedPercent = nanToZero(Math.round((missedCount / totalChecks) * 100))
				passPercent = nanToZero(Math.round((passCount / completedChecks) * 100))
				failPercent = 100 - passPercent
				completedPercent = 100 - missedPercent

				if (c._id.level === 'QC') {
					failCountQC += countOccurrences(c.result, 'Failed')

					for (let d of c.details) {
						if (d.result === 'Failed') {
							let containedData = await Check.findOne({ tCardId: d.tCardId, createdAt: { $gt: d.createdAt } })

							if (containedData && containedData.result === 'Contained') {
								d.reason = containedData.reason
								d.action = containedData.action
								d.containedBy = containedData.checkedBy
								d.containedAt = containedData.createdAt
							}
							failedChecksQC.push(d)
						}
						if (d.result === 'Missed') {
							missedChecksArr.push(d)
						}
					}

					if (week === thisWeekNumber) {
						if (c._id.division === 'BHL') {
							passCountQCBHL += countOccurrences(c.result, 'Passed')
							failCountQCBHL += countOccurrences(c.result, 'Failed')

							totalChecksQCBHL = passCountQCBHL + failCountQCBHL
							passedPercentQCBHL = nanToZero(Math.round((passCountQCBHL / totalChecksQCBHL) * 100))
							completedCountBHL += totalChecksQCBHL
							missedCountBHL += countOccurrences(c.result, 'Missed')
						}
						if (c._id.division === 'CP') {
							passCountQCCP += countOccurrences(c.result, 'Passed')
							failCountQCCP += countOccurrences(c.result, 'Failed')
							totalChecksQCCP = passCountQCCP + failCountQCCP
							passedPercentQCCP = nanToZero(Math.round((passCountQCCP / totalChecksQCCP) * 100))
							completedCountCP += totalChecksQCCP
							missedCountCP += countOccurrences(c.result, 'Missed')
						}
						if (c._id.division === 'EM') {
							passCountQCEM += countOccurrences(c.result, 'Passed')
							failCountQCEM += countOccurrences(c.result, 'Failed')
							totalChecksQCEM = passCountQCEM + failCountQCEM
							passedPercentQCEM = nanToZero(Math.round((passCountQCEM / totalChecksQCEM) * 100))
							completedCountEM += totalChecksQCEM
							missedCountEM += countOccurrences(c.result, 'Missed')
						}
						if (c._id.division === 'HP') {
							passCountQCHP += countOccurrences(c.result, 'Passed')
							failCountQCHP += countOccurrences(c.result, 'Failed')
							totalChecksQCHP = passCountQCHP + failCountQCHP
							passedPercentQCHP = nanToZero(Math.round((passCountQCHP / totalChecksQCHP) * 100))
							completedCountHP += totalChecksQCHP
							missedCountHP += countOccurrences(c.result, 'Missed')
						}
						if (c._id.division === 'LDL') {
							passCountQCLDL += countOccurrences(c.result, 'Passed')
							failCountQCLDL += countOccurrences(c.result, 'Failed')
							totalChecksQCLDL = passCountQCLDL + failCountQCLDL
							passedPercentQCLDL = nanToZero(Math.round((passCountQCLDL / totalChecksQCLDL) * 100))
							completedCountLDL += totalChecksQCLDL
							missedCountLDL += countOccurrences(c.result, 'Missed')
						}
					}
				}
				if (c._id.level === 'CTQ') {
					failCountCTQ += countOccurrences(c.result, 'Failed')

					for (let d of c.details) {
						if (d.result === 'Failed') {
							let containedData = await Check.findOne({ tCardId: d.tCardId, createdAt: { $gt: d.createdAt } })

							if (containedData && containedData.result === 'Contained') {
								d.reason = containedData.reason
								d.action = containedData.action
								d.containedBy = containedData.checkedBy
								d.containedAt = containedData.createdAt
							}
							failedChecksCTQ.push(d)
						}
						if (d.result === 'Missed') {
							missedChecksArr.push(d)
						}
					}

					if (week === thisWeekNumber) {
						if (c._id.division === 'BHL') {
							passCountCTQBHL += countOccurrences(c.result, 'Passed')
							failCountCTQBHL += countOccurrences(c.result, 'Failed')
							totalChecksCTQBHL = passCountCTQBHL + failCountCTQBHL
							passedPercentCTQBHL = nanToZero(Math.round((passCountCTQBHL / totalChecksCTQBHL) * 100))
							completedCountBHL += totalChecksCTQBHL
							missedCountBHL += countOccurrences(c.result, 'Missed')
						}
						if (c._id.division === 'CP') {
							passCountCTQCP += countOccurrences(c.result, 'Passed')
							failCountCTQCP += countOccurrences(c.result, 'Failed')
							totalChecksCTQCP = passCountCTQCP + failCountCTQCP
							passedPercentCTQCP = nanToZero(Math.round((passCountCTQCP / totalChecksCTQCP) * 100))
							completedCountCP += totalChecksCTQCP
							missedCountCP += countOccurrences(c.result, 'Missed')
						}
						if (c._id.division === 'EM') {
							passCountCTQEM += countOccurrences(c.result, 'Passed')
							failCountCTQEM += countOccurrences(c.result, 'Failed')
							totalChecksCTQEM = passCountCTQEM + failCountCTQEM
							passedPercentCTQEM = nanToZero(Math.round((passCountCTQEM / totalChecksCTQEM) * 100))
							completedCountEM += totalChecksCTQEM
							missedCountEM += countOccurrences(c.result, 'Missed')
						}
						if (c._id.division === 'HP') {
							passCountCTQHP += countOccurrences(c.result, 'Passed')
							failCountCTQHP += countOccurrences(c.result, 'Failed')
							totalChecksCTQHP = passCountCTQHP + failCountCTQHP
							passedPercentCTQHP = nanToZero(Math.round((passCountCTQHP / totalChecksCTQHP) * 100))
							completedCountHP += totalChecksCTQHP
							missedCountHP += countOccurrences(c.result, 'Missed')
						}
						if (c._id.division === 'LDL') {
							passCountCTQLDL += countOccurrences(c.result, 'Passed')
							failCountCTQLDL += countOccurrences(c.result, 'Failed')
							totalChecksCTQLDL = passCountCTQLDL + failCountCTQLDL
							passedPercentCTQLDL = nanToZero(Math.round((passCountCTQLDL / totalChecksCTQLDL) * 100))
							completedCountLDL += totalChecksCTQLDL
							missedCountLDL += countOccurrences(c.result, 'Missed')
						}
					}
				}
				completedPercentLDL = nanToZero(Math.round((completedCountLDL / (completedCountLDL + missedCountLDL)) * 100))
				completedPercentHP = nanToZero(Math.round((completedCountHP / (completedCountHP + missedCountHP)) * 100))
				completedPercentEM = nanToZero(Math.round((completedCountEM / (completedCountEM + missedCountEM)) * 100))
				completedPercentBHL = nanToZero(Math.round((completedCountBHL / (completedCountBHL + missedCountBHL)) * 100))
				completedPercentCP = nanToZero(Math.round((completedCountCP / (completedCountCP + missedCountCP)) * 100))
				missedChecksArr.sort((a, b) => b.createdAt - a.createdAt)
			}
		}
		// console.log(missedChecksArr)

		data.push({
			date,
			shortDate,
			missedCount,
			passCount,
			failCount,
			totalChecks,
			completedChecks,
			missedPercent,
			completedPercent,
			failCountQC,
			failCountCTQ,
			passCountQCBHL,
			passedPercentQCBHL,
			passCountQCCP,
			passedPercentQCCP,
			passCountQCEM,
			passedPercentQCEM,
			passCountQCHP,
			passedPercentQCHP,
			passCountQCLDL,
			passedPercentQCLDL,
			passCountCTQBHL,
			passedPercentCTQBHL,
			passCountCTQCP,
			passedPercentCTQCP,
			passCountCTQEM,
			passedPercentCTQEM,
			passCountCTQHP,
			passedPercentCTQHP,
			passCountCTQLDL,
			passedPercentCTQLDL,
			completedCountBHL,
			completedPercentBHL,
			missedCountBHL,
			completedCountCP,
			completedPercentCP,
			missedCountCP,
			completedCountEM,
			completedPercentEM,
			missedCountEM,
			completedCountHP,
			completedPercentHP,
			missedCountHP,
			completedCountLDL,
			completedPercentLDL,
			missedCountLDL,
			failedChecksQC,
			failedChecksCTQ,
			passPercent,
			failPercent,
			missedChecksArr,
		})
	}
	const redOrGreen = (num1, num2) => {
		let color = 'red'
		if (num1 >= num2) {
			color = 'green'
		}
		return color
	}

	// const completedTableData = [
	// 	{
	// 		businessUnit: 'Backhoe Loader',
	// 		completed: data[5].completedCountBHL,
	// 		missed: data[5].missedCountBHL,
	// 		color: redOrGreen(data[5].completedPercentBHL, dataYTD[0].TotalCompletedPercent),
	// 		completedPercent: data[5].completedPercentBHL,
	// 	},
	// 	{
	// 		businessUnit: 'Compact Products',
	// 		completed: data[5].completedCountBHL,
	// 		missed: data[5].missedCountBHL,
	// 		color: redOrGreen(data[5].completedPercentBHL, dataYTD[0].TotalCompletedPercent),
	// 		completedPercent: data[5].completedPercentBHL,
	// 	},
	// ]

	// console.log(doneChecksByWeek)
	// console.log(data)
	// console.log(checks)
	// console.log(dataYTD)

	/////////////update checks

	// const checksWithoutLevel = await Check.find({
	// 	level: null,
	// 	area: 'quality',
	// })

	// for (let x of checksWithoutLevel) {
	// 	let id = x._id

	// 	const card = await TCard.findOne({
	// 		// division: x.division,
	// 		name: x.name,
	// 		area: 'quality',
	// 		// description: x.description,
	// 	})

	// 	if (card) {
	// 		await Check.findByIdAndUpdate(id, {
	// 			level: card.level,
	// 		})
	// 	}
	// }

	res.render('tCards/group-viewQCSDash', {
		area,
		data,
		dataYTD,
		lastWeek,
		graphLabels,
		top3FailedLastWeekCTQ,
		top3FailedLastWeekQC,
		currentWeek,
	})
}

module.exports.divisionViewQCSDash = async (req, res) => {
	// const checksToUpdate = await Check.find({ area: 'quality' })

	// for (let c of checksToUpdate) {
	// 	// let tCard = await TCard.findById(c.tCardId)
	// 	let tCard = await TCard.findOne({
	// 		division: c.division,
	// 		name: c.name,
	// 	})

	// 	if (tCard) {
	// 		c.section = tCard.section
	// 		c.tCardId = tCard._id
	// 		await c.save()
	// 	}
	// }

	const { bu } = req.params
	let formattedBu = ''

	if (bu === 'Cabs') formattedBu = 'Cabs Systems'
	if (bu === 'CP') formattedBu = 'Compact Proucts'
	if (bu === 'BHL') formattedBu = 'Backhoe Loader/Site Dumper'
	if (bu === 'EM') formattedBu = 'Earthmovers/Landpower'
	if (bu === 'HP') formattedBu = 'Heavy Products'
	if (bu === 'LDL') formattedBu = 'Loadall'
	if (bu === 'USA') formattedBu = 'Savannah'
	if (bu === 'PS') formattedBu = 'Power Systems'
	if (bu === 'TMS') formattedBu = 'Transmissions'

	const nanToZero = (num) => {
		let formattedNum = num

		if (isNaN(formattedNum)) formattedNum = 0
		return formattedNum
	}
	const getFirstMondayOfWeek = (weekNo) => {
		// if (weekNo > thisWeek) {
		// 	firstMonday = new Date(new Date().getFullYear() - 1, 0, 4, 0, 0, 0, 0)
		// } else {
		// 	firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)
		// }

		let firstMonday = new Date(new Date().getFullYear(), 0, 4, 0, 0, 0, 0)

		while (firstMonday.getDay() != 1) {
			firstMonday.setDate(firstMonday.getDate() - 1)
		}
		if (1 <= weekNo && weekNo <= 52) return firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))

		firstMonday.setDate(firstMonday.getDate() + 7 * (weekNo - 1))
		if ((weekNo = 53 && firstMonday.getDate() >= 22 && firstMonday.getDate() <= 28)) return firstMonday
		return null
	}

	//////////////////

	// add hours to timestamp
	Date.prototype.addHours = function (h) {
		this.setMinutes(this.getMinutes() + h)
		return this
	}

	// ///////////////////

	//count occurences in array
	const countOccurrences = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0)

	// work out percentages of occurences in array
	const percentages = (xs) => xs.reduce((pcts, x) => ({ ...pcts, [x]: (pcts[x] || 0) + 100 / xs.length }), {})
	const area = 'quality'
	const thisYear = moment().format('YYYY')
	const thisWeekNumber = moment().isoWeek()
	const lastWeekNumber = moment().subtract(1, 'weeks').isoWeek()
	const twoWeeksAgoNumber = moment().subtract(2, 'weeks').isoWeek()
	const threeWeeksAgoNumber = moment().subtract(3, 'weeks').isoWeek()
	const fourWeeksAgoNumber = moment().subtract(4, 'weeks').isoWeek()
	const fiveWeeksAgoNumber = moment().subtract(5, 'weeks').isoWeek()
	const sixWeeksAgoNumber = moment().subtract(6, 'weeks').isoWeek()
	const sevenWeeksAgoNumber = moment().subtract(7, 'weeks').isoWeek()
	const eightWeeksAgoNumber = moment().subtract(8, 'weeks').isoWeek()

	const startDate = new Date(getFirstMondayOfWeek(eightWeeksAgoNumber))

	// const currentWeek = `Week ${thisWeekNumber}`
	const currentWeek = `wc ${moment(new Date(getFirstMondayOfWeek(thisWeekNumber))).format('DD-MM')}`
	const lastWeek = `wc ${moment(new Date(getFirstMondayOfWeek(lastWeekNumber))).format('DD-MM')}`
	const twoWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(twoWeeksAgoNumber))).format('DD-MM')}`
	const threeWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(threeWeeksAgoNumber))).format('DD-MM')}`
	const fourWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(fourWeeksAgoNumber))).format('DD-MM')}`
	const fiveWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(fiveWeeksAgoNumber))).format('DD-MM')}`
	const sixWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(sixWeeksAgoNumber))).format('DD-MM')}`
	const sevenWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(sevenWeeksAgoNumber))).format('DD-MM')}`
	const eightWeeksAgo = `wc ${moment(new Date(getFirstMondayOfWeek(eightWeeksAgoNumber))).format('DD-MM')}`

	const startOfYear = new Date(`${thisYear}, 01, 01`)

	const startOfThisWeek = new Date(getFirstMondayOfWeek(thisWeekNumber))

	const top3FailedLastWeekCTQ = await Check.aggregate([
		{
			$match: {
				createdAt: { $gt: startOfThisWeek },
				result: 'Failed',
				area: 'quality',
				level: 'CTQ',
				division: bu,
			},
		},
		{
			$group: {
				_id: '$name',
				count: {
					$sum: 1,
				},
			},
		},
		// {
		// 	$match: {
		// 		count: { $gt: 1 },
		// 	},
		// },
		{ $sort: { count: -1 } },
	]).limit(3)
	const top3FailedLastWeekQC = await Check.aggregate([
		{
			$match: {
				createdAt: { $gt: startOfThisWeek },
				result: 'Failed',
				area: 'quality',
				level: 'QC',
				division: bu,
			},
		},
		{
			$group: {
				_id: '$name',
				count: {
					$sum: 1,
				},
			},
		},
		// {
		// 	$match: {
		// 		count: { $gt: 1 },
		// 	},
		// },
		{ $sort: { count: -1 } },
	]).limit(3)

	const graphLabels = [
		// eightWeeksAgo,
		// sevenWeeksAgo,
		sixWeeksAgo,
		fiveWeeksAgo,
		// fourWeeksAgo,
		threeWeeksAgo,
		twoWeeksAgo,
		lastWeek,
		currentWeek,
	]

	const levels = ['CTQ', 'QC']

	ignored = ['Not Required']

	const doneChecksByWeek = await Check.aggregate([
		{
			$match: {
				createdAt: { $gte: startDate },
				result: { $nin: ignored },
				area: 'quality',
				level: { $in: levels },
				division: bu,
			},
		},
		{
			$addFields: {
				week: {
					$isoWeek: {
						date: '$createdAt',
						timezone: 'Europe/London',
					},
				},
			},
		},
		{
			$group: {
				_id: {
					week: '$week',
					section: '$section',
					level: '$level',
				},
				result: { $push: '$result' },
				details: {
					$push: {
						tCardId: '$tCardId',
						check: '$name',
						missedBy: '$missedBy',
						frequency: '$frequency',
						level: '$level',
						result: '$result',
						division: '$division',
						location: '$location',
						section: '$section',
						description: '$description',
						checkedBy: '$checkedBy',
						createdAt: '$createdAt',
						value: '$value',
						unit: '$unit',
						target: '$target',
						reson: '',
						action: '',
						containedBy: '',
						containedAt: null,
					},
				},
			},
		},
	])

	const doneChecksYTD = await Check.aggregate([
		{
			$match: {
				createdAt: { $gte: startOfYear },
				result: { $nin: ignored },
				area: 'quality',
				level: { $in: levels },
				division: bu,
			},
		},
		// {
		// 	$addFields: {
		// 		week: {
		// 			$isoWeek: {
		// 				date: '$createdAt',
		// 				timezone: 'Europe/London',
		// 			},
		// 		},
		// 	},
		// },
		{
			$group: {
				_id: {
					section: '$section',
					level: '$level',
				},
				result: { $push: '$result' },
			},
		},
	])

	// let divisions = ['BHL', 'CP', 'EM', 'HP', 'LDL']

	let divisions = ['Plant Quality', 'Assembly', 'Manufacturing', 'Paint']
	const dataYTD = []

	for (let division of divisions) {
		let totalChecks = 0
		let totalPassed = 0
		let totalFailed = 0
		let totalMissed = 0
		let totalMissedPercent = 0
		let TotalCompletedPercent = 0

		let totalChecksQC = 0
		let totalPassedQC = 0
		let totalFailedQC = 0
		let totalPassedPercentQC = 0

		let totalChecksCTQ = 0
		let totalPassedCTQ = 0
		let totalFailedCTQ = 0
		let totalPassedPercentCTQ = 0

		for (let c of doneChecksYTD) {
			if (c._id.section === division) {
				totalPassed += countOccurrences(c.result, 'Passed')
				totalFailed += countOccurrences(c.result, 'Failed')
				totalMissed += countOccurrences(c.result, 'Missed')
				totalChecks = totalPassed + totalFailed + totalMissed

				totalMissedPercent = nanToZero(Math.round((totalMissed / totalChecks) * 100))

				TotalCompletedPercent = 100 - totalMissedPercent

				if (c._id.level === 'QC') {
					totalPassedQC += countOccurrences(c.result, 'Passed')
					totalFailedQC += countOccurrences(c.result, 'Failed')
					totalChecksQC = totalPassedQC + totalFailedQC
					totalPassedPercentQC = nanToZero(Math.round((totalPassedQC / totalChecksQC) * 100))
				}
				if (c._id.level === 'CTQ') {
					totalPassedCTQ += countOccurrences(c.result, 'Passed')
					totalFailedCTQ += countOccurrences(c.result, 'Failed')
					totalChecksCTQ = totalPassedCTQ + totalFailedCTQ
					totalPassedPercentCTQ = nanToZero(Math.round((totalPassedCTQ / totalChecksCTQ) * 100))
				}
			}
		}
		dataYTD.push({
			division,
			TotalCompletedPercent,
			totalPassedPercentCTQ,
			totalPassedPercentQC,
		})
	}

	// console.log(dataYTD)
	// console.log(doneChecksYTD[0])

	const data = []

	let weeks = [
		// eightWeeksAgoNumber,
		// sevenWeeksAgoNumber,
		sixWeeksAgoNumber,
		fiveWeeksAgoNumber,
		// fourWeeksAgoNumber,
		threeWeeksAgoNumber,
		twoWeeksAgoNumber,
		lastWeekNumber,
		thisWeekNumber,
	]

	for (let week of weeks) {
		let theWeekNumber = week
		// let date = `Week ${theWeekNumber}`
		let date = `wc ${moment(new Date(getFirstMondayOfWeek(theWeekNumber))).format('DD-MM')}`
		let shortDate = date.replace(/ +/g, '')
		let totalChecks = 0
		let completedChecks = 0
		let missedCount = 0
		let missedPercent = 0
		let completedPercent = 0
		let failCount = 0
		let failPercent = 0
		let passCount = 0
		let passPercent = 0
		let failCountQC = 0
		let failCountCTQ = 0
		let passCountQCBHL = 0
		let failCountQCBHL = 0
		let totalChecksQCBHL = 0
		let passedPercentQCBHL = 0
		let passCountQCCP = 0
		let failCountQCCP = 0
		let totalChecksQCCP = 0
		let passedPercentQCCP = 0
		let passCountQCEM = 0
		let failCountQCEM = 0
		let totalChecksQCEM = 0
		let passedPercentQCEM = 0
		let passCountQCHP = 0
		let failCountQCHP = 0
		let totalChecksQCHP = 0
		let passedPercentQCHP = 0
		let passCountQCLDL = 0
		let failCountQCLDL = 0
		let totalChecksQCLDL = 0
		let passedPercentQCLDL = 0
		let passCountCTQBHL = 0
		let failCountCTQBHL = 0
		let totalChecksCTQBHL = 0
		let passedPercentCTQBHL = 0
		let passCountCTQCP = 0
		let failCountCTQCP = 0
		let totalChecksCTQCP = 0
		let passedPercentCTQCP = 0
		let passCountCTQEM = 0
		let failCountCTQEM = 0
		let totalChecksCTQEM = 0
		let passedPercentCTQEM = 0
		let passCountCTQHP = 0
		let failCountCTQHP = 0
		let totalChecksCTQHP = 0
		let passedPercentCTQHP = 0
		let passCountCTQLDL = 0
		let failCountCTQLDL = 0
		let totalChecksCTQLDL = 0
		let passedPercentCTQLDL = 0
		let completedCountBHL = 0
		let completedPercentBHL = 0
		let missedCountBHL = 0
		let completedCountCP = 0
		let completedPercentCP = 0
		let missedCountCP = 0
		let completedCountEM = 0
		let completedPercentEM = 0
		let missedCountEM = 0
		let completedCountHP = 0
		let completedPercentHP = 0
		let missedCountHP = 0
		let completedCountLDL = 0
		let completedPercentLDL = 0
		let missedCountLDL = 0
		let failedChecksQC = []
		let failedChecksCTQ = []
		let missedChecksArr = []

		for (let c of doneChecksByWeek) {
			if (c._id.week === week) {
				missedCount += countOccurrences(c.result, 'Missed')
				passCount += countOccurrences(c.result, 'Passed')
				failCount += countOccurrences(c.result, 'Failed')
				totalChecks = missedCount + passCount + failCount
				completedChecks = passCount + failCount
				missedPercent = nanToZero(Math.round((missedCount / totalChecks) * 100))
				passPercent = nanToZero(Math.round((passCount / completedChecks) * 100))
				failPercent = 100 - passPercent
				completedPercent = 100 - missedPercent

				if (c._id.level === 'QC') {
					failCountQC += countOccurrences(c.result, 'Failed')

					for (let d of c.details) {
						if (d.result === 'Failed') {
							let containedData = await Check.findOne({ tCardId: d.tCardId, createdAt: { $gt: d.createdAt } })

							if (containedData && containedData.result === 'Contained') {
								d.reason = containedData.reason
								d.action = containedData.action
								d.containedBy = containedData.checkedBy
								d.containedAt = containedData.createdAt
							}
							failedChecksQC.push(d)
						}
						if (d.result === 'Missed') {
							missedChecksArr.push(d)
						}
					}

					// console.log(failedChecksQC)

					if (week === thisWeekNumber) {
						if (c._id.section === 'Plant Quality') {
							passCountQCBHL += countOccurrences(c.result, 'Passed')
							failCountQCBHL += countOccurrences(c.result, 'Failed')

							totalChecksQCBHL = passCountQCBHL + failCountQCBHL
							passedPercentQCBHL = nanToZero(Math.round((passCountQCBHL / totalChecksQCBHL) * 100))
							completedCountBHL += totalChecksQCBHL
							missedCountBHL += countOccurrences(c.result, 'Missed')
						}
						if (c._id.section === 'Assembly') {
							passCountQCCP += countOccurrences(c.result, 'Passed')
							failCountQCCP += countOccurrences(c.result, 'Failed')
							totalChecksQCCP = passCountQCCP + failCountQCCP
							passedPercentQCCP = nanToZero(Math.round((passCountQCCP / totalChecksQCCP) * 100))
							completedCountCP += totalChecksQCCP
							missedCountCP += countOccurrences(c.result, 'Missed')
						}
						if (c._id.section === 'Manufacturing') {
							passCountQCEM += countOccurrences(c.result, 'Passed')
							failCountQCEM += countOccurrences(c.result, 'Failed')
							totalChecksQCEM = passCountQCEM + failCountQCEM
							passedPercentQCEM = nanToZero(Math.round((passCountQCEM / totalChecksQCEM) * 100))
							completedCountEM += totalChecksQCEM
							missedCountEM += countOccurrences(c.result, 'Missed')
						}
						if (c._id.section === 'Paint') {
							passCountQCHP += countOccurrences(c.result, 'Passed')
							failCountQCHP += countOccurrences(c.result, 'Failed')
							totalChecksQCHP = passCountQCHP + failCountQCHP
							passedPercentQCHP = nanToZero(Math.round((passCountQCHP / totalChecksQCHP) * 100))
							completedCountHP += totalChecksQCHP
							missedCountHP += countOccurrences(c.result, 'Missed')
						}
						// if (c._id.location === 'Standards & Accreditation') {
						// 	passCountQCLDL += countOccurrences(c.result, 'Passed')
						// 	failCountQCLDL += countOccurrences(c.result, 'Failed')
						// 	totalChecksQCLDL = passCountQCLDL + failCountQCLDL
						// 	passedPercentQCLDL = nanToZero(Math.round((passCountQCLDL / totalChecksQCLDL) * 100))
						// 	completedCountLDL += totalChecksQCLDL
						// 	missedCountLDL += countOccurrences(c.result, 'Missed')
						// }
					}
				}
				if (c._id.level === 'CTQ') {
					failCountCTQ += countOccurrences(c.result, 'Failed')

					for (let d of c.details) {
						if (d.result === 'Failed') {
							let containedData = await Check.findOne({ tCardId: d.tCardId, createdAt: { $gt: d.createdAt } })

							if (containedData && containedData.result === 'Contained') {
								d.reason = containedData.reason
								d.action = containedData.action
								d.containedBy = containedData.checkedBy
								d.containedAt = containedData.createdAt
							}
							failedChecksCTQ.push(d)
						}
						if (d.result === 'Missed') {
							missedChecksArr.push(d)
						}
					}

					if (week === thisWeekNumber) {
						if (c._id.section === 'Plant Quality') {
							passCountCTQBHL += countOccurrences(c.result, 'Passed')
							failCountCTQBHL += countOccurrences(c.result, 'Failed')
							totalChecksCTQBHL = passCountCTQBHL + failCountCTQBHL
							passedPercentCTQBHL = nanToZero(Math.round((passCountCTQBHL / totalChecksCTQBHL) * 100))
							completedCountBHL += totalChecksCTQBHL
							missedCountBHL += countOccurrences(c.result, 'Missed')
						}
						if (c._id.section === 'Assembly') {
							passCountCTQCP += countOccurrences(c.result, 'Passed')
							failCountCTQCP += countOccurrences(c.result, 'Failed')
							totalChecksCTQCP = passCountCTQCP + failCountCTQCP
							passedPercentCTQCP = nanToZero(Math.round((passCountCTQCP / totalChecksCTQCP) * 100))
							completedCountCP += totalChecksCTQCP
							missedCountCP += countOccurrences(c.result, 'Missed')
						}
						if (c._id.section === 'Manufacturing') {
							passCountCTQEM += countOccurrences(c.result, 'Passed')
							failCountCTQEM += countOccurrences(c.result, 'Failed')
							totalChecksCTQEM = passCountCTQEM + failCountCTQEM
							passedPercentCTQEM = nanToZero(Math.round((passCountCTQEM / totalChecksCTQEM) * 100))
							completedCountEM += totalChecksCTQEM
							missedCountEM += countOccurrences(c.result, 'Missed')
						}
						if (c._id.section === 'Paint') {
							passCountCTQHP += countOccurrences(c.result, 'Passed')
							failCountCTQHP += countOccurrences(c.result, 'Failed')
							totalChecksCTQHP = passCountCTQHP + failCountCTQHP
							passedPercentCTQHP = nanToZero(Math.round((passCountCTQHP / totalChecksCTQHP) * 100))
							completedCountHP += totalChecksCTQHP
							missedCountHP += countOccurrences(c.result, 'Missed')
						}
						// if (c._id.location === 'Standards & Accreditation') {
						// 	passCountCTQLDL += countOccurrences(c.result, 'Passed')
						// 	failCountCTQLDL += countOccurrences(c.result, 'Failed')
						// 	totalChecksCTQLDL = passCountCTQLDL + failCountCTQLDL
						// 	passedPercentCTQLDL = nanToZero(Math.round((passCountCTQLDL / totalChecksCTQLDL) * 100))
						// 	completedCountLDL += totalChecksCTQLDL
						// 	missedCountLDL += countOccurrences(c.result, 'Missed')
						// }
					}
				}
				completedPercentBHL = nanToZero(Math.round((completedCountBHL / (completedCountBHL + missedCountBHL)) * 100))
				completedPercentCP = nanToZero(Math.round((completedCountCP / (completedCountCP + missedCountCP)) * 100))
				completedPercentEM = nanToZero(Math.round((completedCountEM / (completedCountEM + missedCountEM)) * 100))
				completedPercentHP = nanToZero(Math.round((completedCountHP / (completedCountHP + missedCountHP)) * 100))
				// completedPercentLDL = nanToZero(Math.round((completedCountLDL / (completedCountLDL + missedCountLDL)) * 100))
				missedChecksArr.sort((a, b) => a.createdAt - b.createdAt)
			}
		}

		data.push({
			date,
			shortDate,
			missedCount,
			passCount,
			failCount,
			totalChecks,
			completedChecks,
			missedPercent,
			completedPercent,
			failCountQC,
			failCountCTQ,
			passCountQCBHL,
			passedPercentQCBHL,
			passCountQCCP,
			passedPercentQCCP,
			passCountQCEM,
			passedPercentQCEM,
			passCountQCHP,
			passedPercentQCHP,
			passCountQCLDL,
			passedPercentQCLDL,
			passCountCTQBHL,
			passedPercentCTQBHL,
			passCountCTQCP,
			passedPercentCTQCP,
			passCountCTQEM,
			passedPercentCTQEM,
			passCountCTQHP,
			passedPercentCTQHP,
			passCountCTQLDL,
			passedPercentCTQLDL,
			completedCountBHL,
			completedPercentBHL,
			missedCountBHL,
			completedCountCP,
			completedPercentCP,
			missedCountCP,
			completedCountEM,
			completedPercentEM,
			missedCountEM,
			completedCountHP,
			completedPercentHP,
			missedCountHP,
			completedCountLDL,
			completedPercentLDL,
			missedCountLDL,
			failedChecksQC,
			failedChecksCTQ,
			passPercent,
			failPercent,
			missedChecksArr,
		})
	}

	res.render('tCards/division-viewQCSDash', {
		area,
		data,
		dataYTD,
		lastWeek,
		graphLabels,
		top3FailedLastWeekCTQ,
		top3FailedLastWeekQC,
		currentWeek,
		formattedBu,
	})
}

const capitalizeFirstLetterOfAllWords = (string) => {
	// first convert to all lowercase
	let lowerString = string.toLowerCase()

	return lowerString.replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase())
}

module.exports.assignCardUsers = async (req, res) => {
	const { bu } = req.params
	let formattedBu = ''
	let area = 'quality'

	const tCards = await TCard.find(
		{
			division: bu,
			area: area,
		},
		{
			_id: 1,
			name: 1,
			location: 1,
			frequency: 1,
			primaryUserName: 1,
			secondUserName: 1,
			category: 1,
			section: 1,
			description: 1,
			method: 1,
			type: 1,
			level: 1,
			manual: 1,
			min: 1,
			max: 1,
			unit: 1,
			shiftP: 1,
		}
	)
		.populate({
			path: 'users',
		})
		.lean()

	let allQualityChecks = tCards.map((item) => {
		item.description = item.description.trim()

		return { ...item }
	})

	const users = await User.aggregate([
		{
			$match: {
				firstName: { $nin: [' ', 'Cabs'] },
				lastName: { $ne: ' ' },
			},
		},
		{
			$project: {
				firstName: 1,
				lastName: 1,
			},
		},
	])

	// .sort({ firstName: 1 })

	for (let t of tCards) {
		if (!t.users) {
			t.users = []
		}
		for (let u of t.users) {
			u.firstName = capitalizeFirstLetterOfAllWords(u.firstName)
			u.lastName = capitalizeFirstLetterOfAllWords(u.lastName)
			u.fullName = u.firstName.trim() + ' ' + u.lastName.trim()
		}
	}

	for (let u of users) {
		u.firstName = capitalizeFirstLetterOfAllWords(u.firstName)
		u.lastName = capitalizeFirstLetterOfAllWords(u.lastName)
		u.fullName = u.firstName.trim() + ' ' + u.lastName.trim()
	}

	// console.log(tCards)

	const dailyChecks = allQualityChecks.filter((item) => item.frequency === 'Daily')
	const weeklyChecks = allQualityChecks.filter((item) => item.frequency === 'Weekly')
	const monthlyChecks = allQualityChecks.filter((item) => item.frequency === 'Monthly')
	const quarterlyChecks = allQualityChecks.filter((item) => item.frequency === 'Quarterly')

	if (bu === 'CP') formattedBu = 'Compact Proucts'
	if (bu === 'BHL') formattedBu = 'Backhoe Loader/Site Dumper'
	if (bu === 'EM') formattedBu = 'Earthmovers/Landpower'
	if (bu === 'HP') formattedBu = 'Heavy Products'
	if (bu === 'LDL') formattedBu = 'Loadall'
	if (bu === 'CABS') formattedBu = 'Cab Systems'
	if (bu === 'PS') formattedBu = 'Power Systems'
	if (bu === 'Transmissions') formattedBu = 'Transmissions'

	const allChecks = [...dailyChecks, ...weeklyChecks, ...monthlyChecks, ...quarterlyChecks]

	const getUniqueBy = (arr, prop) => {
		const set = new Set()
		return arr.filter((o) => !set.has(o[prop]) && set.add(o[prop]))
	}
	let uniqueUsers = getUniqueBy(users, 'fullName')
	// uniqueUsers.sort()

	// sort by name
	uniqueUsers.sort(function (a, b) {
		return a.fullName.localeCompare(b.fullName)
	})

	let division = bu

	res.render('tCards/assign-card-users', {
		formattedBu,
		bu,
		division,
		area,
		users,
		dailyChecks,
		weeklyChecks,
		monthlyChecks,
		quarterlyChecks,
		allChecks,
		uniqueUsers,
		allQualityChecks,
	})
}

module.exports.saveNewCardUsers = async (req, res) => {
	const { bu, id } = req.params

	// const { primaryUserId, secondUserId } = req.body

	// // if (!id || !bu || !primaryUserId || !secondUserId) {
	// // 	req.flash('error', 'Sorry something went wrong')
	// // 	return res.redirect('/tCard/qcs')
	// // }

	if (bu === 'CP') formattedBu = 'Compact Proucts'
	if (bu === 'BHL') formattedBu = 'Backhoe Loader/Site Dumper'
	if (bu === 'EM') formattedBu = 'Earthmovers/Landpower'
	if (bu === 'HP') formattedBu = 'Heavy Products'
	if (bu === 'LDL') formattedBu = 'Loadall'
	if (bu === 'CABS') formattedBu = 'Cab Systems'
	if (bu === 'PS') formattedBu = 'Power Systems'
	if (bu === 'TMS') formattedBu = 'Transmissions'

	const tCard = await TCard.findById(id)

	if (!tCard) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect(`/tCard/qcs-assign-card-users/${bu}`)
	}

	let arr = []
	if (req.body.firstUserId !== '') {
		arr.push(req.body.firstUserId)
	}
	if (req.body.secondUserId !== '') {
		arr.push(req.body.secondUserId)
	}
	if (req.body.thirdUserId !== '') {
		arr.push(req.body.thirdUserId)
	}
	if (req.body.fourthUserId !== '') {
		arr.push(req.body.fourthUserId)
	}
	if (req.body.fifthUserId !== '') {
		arr.push(req.body.fifthUserId)
	}

	let updatedCard = await TCard.findByIdAndUpdate(
		id,
		{
			users: arr,
		},
		{ new: true }
	)

	if (arr && arr[0]) {
		let foundUser = await User.findById(arr[0])

		if (foundUser) {
			let userName = capitalizeFirstLetterOfAllWords(foundUser.firstName.trim() + ' ' + foundUser.lastName.trim())
			await TCard.findByIdAndUpdate(
				id,
				{
					primaryUserId: arr[0],
					primaryUserName: userName,
				},
				{ new: true }
			)
		}
	}
	if (arr && arr[1]) {
		let foundUser1 = await User.findById(arr[1])

		if (foundUser1) {
			let userName1 = capitalizeFirstLetterOfAllWords(foundUser1.firstName.trim() + ' ' + foundUser1.lastName.trim())
			await TCard.findByIdAndUpdate(
				id,
				{
					secondUserId: arr[1],
					secondUserName: userName1,
				},
				{ new: true }
			)
		}
	}

	console.log(updatedCard.users)

	res.redirect(`/tCard/qcs-assign-card-users/${bu}`)
}

// module.exports.myChecks = async (req, res) => {
// 	const { id } = req.params

// 	let area = 'quality'

// 	const tCards = await TCard.find(
// 		{
// 			$or: [{ primaryUserId: id }, { secondUserId: id }],
// 		},
// 		{ name: 1, location: 1, frequency: 1, status: 1, primaryUserName: 1, secondUserName: 1 }
// 	)
// 		.populate({
// 			path: 'checks',
// 			options: { sort: { _id: -1 } },
// 			perDocumentLimit: 1,
// 		})
// 		.sort({
// 			location: 1,
// 			frequency: 1,
// 			name: 1,
// 		})

// 	const dailyChecks = tCards.filter((item) => item.frequency === 'Daily')
// 	const weeklyChecks = tCards.filter((item) => item.frequency === 'Weekly')
// 	const monthlyChecks = tCards.filter((item) => item.frequency === 'Monthly')
// 	const quarterlyChecks = tCards.filter((item) => item.frequency === 'Quarterly')

// 	const allChecks = [...dailyChecks, ...weeklyChecks, ...monthlyChecks, ...quarterlyChecks]

// 	res.render('tCards/my-checks', {
// 		area,
// 		dailyChecks,
// 		weeklyChecks,
// 		monthlyChecks,
// 		quarterlyChecks,
// 		allChecks,
// 	})
// }

module.exports.divisionViewQCS = async (req, res) => {
	const divsions = ['BHL', 'CABS', 'CP', 'EM', 'HP', 'LDL', 'PS', 'USA']

	let data = []
	let longDivision

	let dateForDay = new Date()
	let todayNumber = dateForDay.getDay()
	let thisMonth = dateForDay.getMonth() + 1

	const todayDate = new Date()
	todayDate.setHours(0, 0, 0, 0)

	function getLastDayOfMonth(year, month) {
		return new Date(year, month + 1, 0)
	}

	// 👇️ Last Day of CURRENT MONTH
	const date = new Date()
	const lastDayCurrentMonth = getLastDayOfMonth(date.getFullYear(), date.getMonth())

	const dueTodayArr = ['Daily']

	if (todayNumber === 5) {
		dueTodayArr.push('Weekly')
	}
	if (todayDate.getTime() === lastDayCurrentMonth.getTime()) {
		dueTodayArr.push('Monthly')
		if (thisMonth === 3 || thisMonth === 6 || thisMonth === 9 || thisMonth === 12) {
			dueTodayArr.push('Quarterly')
		}
	}

	const allQualityChecks = await TCard.find(
		{
			area: 'quality',
		},
		{ division: 1, status: 1, location: 1, area: 1 }
	)

	//dynamic filter function
	filterItems = (data, filters) => data.filter((item) => !filters.find((x) => x.key.split('.').reduce((keys, key) => keys[key], item) !== x.value))

	for (let division of divsions) {
		if (division === 'BHL') longDivision = 'Backhoe Loader/Site Dumper'
		if (division === 'CP') longDivision = 'Compact Products'
		if (division === 'EM') longDivision = 'Earthmovers/Landpower'
		if (division === 'HP') longDivision = 'Heavy Products'
		if (division === 'LDL') longDivision = 'Loadall'
		if (division === 'Cabs') longDivision = 'Cabs Systems'
		if (division === 'PS') longDivision = 'Power Systems'
		if (division === 'USA') longDivision = 'Savannah'
		if (division === 'Transmissions') longDivision = 'Transmissions'

		const totalChecks = filterItems(allQualityChecks, [{ key: 'division', value: division }]).length

		const dueTodayIds = await TCard.distinct('_id', {
			area: 'quality',
			division: division,
			frequency: { $in: dueTodayArr },
		})

		const totalChecksDueToday = dueTodayIds.length

		// const dueTodayIds = totalChecksDueToday.map((m) => m._id)

		let totalChecksDoneToday = await TCard.countDocuments({
			area: 'quality',
			division: division,
			_id: { $in: dueTodayIds },
			status: { $ne: 'Open' },

			// createdAt: { $gte: todayDate },
		})

		if (totalChecksDoneToday > totalChecksDueToday) totalChecksDoneToday = totalChecksDueToday

		let outcomes = ['Open', 'Contained', 'failed', 'Missed']

		// let outcomes = [
		// 	{ name: 'totalChecksOpen', search: 'Open' },
		// 	{ name: 'totalChecksContined', search: 'Contained' },
		// 	{ name: 'totalChecksfailed', search: 'failed' },
		// 	{ name: 'totalChecksMissed', search: 'Missed' },
		// ]

		let divTotals = []
		for (let o of outcomes) {
			let data = filterItems(allQualityChecks, [
				{ key: 'division', value: division },
				{ key: 'status', value: o },
			]).length

			divTotals.push({ [`totalChecks${o}`]: data })
		}

		const totalChecksOpen = filterItems(allQualityChecks, [
			{ key: 'division', value: division },
			{ key: 'status', value: 'Open' },
		]).length

		const totalChecksContained = filterItems(allQualityChecks, [
			{ key: 'division', value: division },
			{ key: 'status', value: 'Contained' },
		]).length

		const totalChecksFailed = filterItems(allQualityChecks, [
			{ key: 'division', value: division },
			{ key: 'status', value: 'Failed' },
		]).length

		const totalChecksMissed = filterItems(allQualityChecks, [
			{ key: 'division', value: division },
			{ key: 'status', value: 'Missed' },
		]).length

		const totalChecksDone = totalChecks - totalChecksOpen

		// supplied parts

		const totalSuppliedParts = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
		})

		const totalSuppliedPartsOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
			status: 'Open',
		})
		const totalSuppliedPartsContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
			status: 'Contained',
		})
		const totalSuppliedPartsFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
			status: 'Failed',
		})
		const totalSuppliedPartsMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Supplier Quality',
			status: 'Missed',
		})

		const doneSuppliedParts = totalSuppliedParts - totalSuppliedPartsOpen

		// customer quality

		const totalCustomerQuality = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
		})

		const totalCustomerQualityOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
			status: 'Open',
		})
		const totalCustomerQualityContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
			status: 'Contained',
		})
		const totalCustomerQualityFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
			status: 'Failed',
		})
		const totalCustomerQualityMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Customer Quality',
			status: 'Missed',
		})

		const doneCustomerQuality = totalCustomerQuality - totalCustomerQualityOpen

		// delivered quality

		const totalDeliveredQuality = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
		})

		const totalDeliveredQualityOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
			status: 'Open',
		})
		const totalDeliveredQualityContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
			status: 'Contained',
		})
		const totalDeliveredQualityFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
			status: 'Failed',
		})
		const totalDeliveredQualityMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Delivered Quality',
			status: 'Missed',
		})

		const doneDeliveredQuality = totalDeliveredQuality - totalDeliveredQualityOpen

		// operational quality

		const totalOperationalQuality = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
		})

		const totalOperationalQualityOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
			status: 'Open',
		})
		const totalOperationalQualityContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
			status: 'Contained',
		})
		const totalOperationalQualityFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
			status: 'Failed',
		})
		const totalOperationalQualityMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Operational Quality',
			status: 'Missed',
		})

		const doneOperationalQuality = totalOperationalQuality - totalOperationalQualityOpen

		// stabdards & accreditation

		const totalSA = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
		})

		const totalSAOpen = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
			status: 'Open',
		})
		const totalSAContained = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
			status: 'Contained',
		})
		const totalSAFailed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
			status: 'Failed',
		})
		const totalSAMissed = await TCard.countDocuments({
			division,
			area: 'quality',
			location: 'Standards & Accreditation',
			status: 'Missed',
		})

		const doneSA = totalSA - totalSAOpen

		const tCards = await TCard.find({
			division,
			area: {
				$in: ['quality'],
			},
		}).populate({
			path: 'checks',
			options: { sort: { _id: -1 } },
			perDocumentLimit: 1,
		})

		let allChecks = []
		for (let card of tCards) {
			card.checks.forEach(function (check) {
				if (check.checkedBy) {
					allChecks.push(check)
				}
			})
		}

		allChecks.sort((a, b) => b.createdAt - a.createdAt)

		const update = allChecks[0] || []

		// console.log(data[0])

		data.push({
			totalChecksDueToday,
			totalChecksDoneToday,
			divTotals,
			division,
			longDivision,
			totalChecks,
			totalChecksOpen,
			totalChecksContained,
			totalChecksFailed,
			totalChecksMissed,
			totalChecksDone,
			totalSuppliedParts,
			totalSuppliedPartsOpen,
			totalSuppliedPartsContained,
			totalSuppliedPartsFailed,
			totalSuppliedPartsMissed,
			doneSuppliedParts,
			totalCustomerQuality,
			totalCustomerQualityContained,
			totalCustomerQualityFailed,
			totalCustomerQualityMissed,
			doneCustomerQuality,
			totalDeliveredQuality,
			totalDeliveredQualityOpen,
			totalDeliveredQualityContained,
			totalDeliveredQualityFailed,
			totalDeliveredQualityMissed,
			doneDeliveredQuality,
			totalOperationalQuality,
			totalOperationalQualityOpen,
			totalOperationalQualityContained,
			totalOperationalQualityFailed,
			totalOperationalQualityMissed,
			doneOperationalQuality,
			totalSA,
			totalSAOpen,
			totalSAContained,
			totalSAFailed,
			totalSAMissed,
			doneSA,
			update,
		})
	}

	const area = 'quality'

	// console.log(data)

	res.render('tCards/division-viewQCS', {
		area,
		data,
	})
}

module.exports.allDivisionChecksQCS = async (req, res) => {
	let { division } = req.params

	if (division === 'LP') division = 'EM'
	if (division === 'SD') division = 'BHL'

	let longDivision

	if (division === 'BHL') longDivision = 'Backhoe Loader/Site Dumper'
	if (division === 'CP') longDivision = 'Compact Products'
	if (division === 'EM') longDivision = 'Earthmovers/Landpower'
	if (division === 'HP') longDivision = 'Heavy Products'
	if (division === 'LDL') longDivision = 'Loadall'
	if (division === 'Cabs') longDivision = 'Cabs Systems'
	if (division === 'PS') longDivision = 'Power Systems'
	if (division === 'USA') longDivision = 'Savannah'
	if (division === 'TMS') longDivision = 'Transmissions'

	// const monthlyChecks = await TCard.find({ frequency: 'Monthly' })

	// const checkedLastonth = monthlyChecks.filter((check) => check.updatedAt < new Date('2022, 09, 01'))

	// console.log(checkedLastonth.length)

	// for (let card of checkedLastonth) {
	// 	let idNumber = card._id
	// 	const check = new Check()
	// 	check.result = 'Missed'
	// 	check.type = 'Missed'
	// 	check.missedBy = card.primaryUserName
	// 	check.division = card.division
	// 	check.area = card.area
	// 	check.location = card.location
	// 	check.shiftP = card.shiftP
	// 	check.description = card.description
	// 	check.unit = card.unit
	// 	check.name = card.name
	// 	check.level = card.level
	// 	check.frequency = card.frequency

	// 	await TCard.findByIdAndUpdate(idNumber, { $push: { checks: check } })
	// 	await check.save()
	// }

	// const allQualityChecks = await TCard.find(
	// 	{
	// 		area: 'quality',
	// 		division,
	// 	},
	// 	{ status: 1, name: 1, level: 1, primaryUserName: 1, secondUserName: 1, value: 1, category: 1, frequency: 1 }
	// )

	const allQualityChecks = await TCard.aggregate([
		{
			$match: {
				area: 'quality',
				division,
			},
		},
		{
			$addFields: {
				boxColor: {
					$switch: {
						branches: [
							{
								// status is open
								case: {
									$eq: ['$status', 'Passed'],
								},
								//time since start of shift until now
								then: 'green',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Contained'],
								},
								//time since start of shift until now
								then: 'orange',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Failed'],
								},
								//time since start of shift until now
								then: 'red',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Not Required'],
								},
								//time since start of shift until now
								then: 'blue',
							},
						],
						// default if none of the above
						default: 'grey',
					},
				},
				modal: {
					$switch: {
						branches: [
							{
								// status is open
								case: {
									$eq: ['$status', 'Passed'],
								},
								//time since start of shift until now
								then: 'do_check',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Contained'],
								},
								//time since start of shift until now
								then: 'do_check',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Failed'],
								},
								//time since start of shift until now
								then: 'contain_check',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Not Required'],
								},
								//time since start of shift until now
								then: 'do_check',
							},
						],
						// default if none of the above
						default: 'do_check',
					},
				},
			},
		},
		{
			$project: {
				status: 1,
				name: 1,
				level: 1,
				primaryUserName: 1,
				secondUserName: 1,
				checkedBy: 1,
				value: 1,
				category: 1,
				section: 1,
				frequency: 1,
				boxColor: 1,
				textColor: {
					$cond: [{ $eq: ['$status', 'Open'] }, 'black', 'white'],
				},
				modal: {
					$cond: [{ $eq: ['$status', 'Failed'] }, 'contain_check', 'do_check'],
				},
				result: {
					$cond: [{ $eq: ['$type', 'Value'] }, '$value', '$agreed'],
				},
				description: { $trim: { input: '$description' } },
				type: 1,
				method: 1,
				manual: 1,
				failedAt: 1,
				unit: 1,
				comments: 1,
			},
		},
	])

	const allQualityChecksEquipmentPlant = allQualityChecks.filter((c) => c.category === 'Equipment' && c.section === 'Plant Quality')
	const allQualityChecksProcessPlant = allQualityChecks.filter((c) => c.category === 'Process' && c.section === 'Plant Quality')
	const allQualityChecksPeoplePlant = allQualityChecks.filter((c) => c.category === 'People' && c.section === 'Plant Quality')
	const allQualityChecksStandardsPlant = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.section === 'Plant Quality')

	const allQualityChecksEquipmentAsembly = allQualityChecks.filter((c) => c.category === 'Equipment' && c.section === 'Assembly')
	const allQualityChecksProcessAsembly = allQualityChecks.filter((c) => c.category === 'Process' && c.section === 'Assembly')
	const allQualityChecksPeopleAsembly = allQualityChecks.filter((c) => c.category === 'People' && c.section === 'Assembly')
	const allQualityChecksStandardsAsembly = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.section === 'Assembly')

	const allQualityChecksEquipmentManufacturing = allQualityChecks.filter((c) => c.category === 'Equipment' && c.section === 'Manufacturing')
	const allQualityChecksProcessManufacturing = allQualityChecks.filter((c) => c.category === 'Process' && c.section === 'Manufacturing')
	const allQualityChecksPeopleManufacturing = allQualityChecks.filter((c) => c.category === 'People' && c.section === 'Manufacturing')
	const allQualityChecksStandardsManufacturing = allQualityChecks.filter(
		(c) => c.category === 'Adherence to Standards' && c.section === 'Manufacturing'
	)

	const allQualityChecksEquipmentPaint = allQualityChecks.filter((c) => c.category === 'Equipment' && c.section === 'Paint')
	const allQualityChecksProcessPaint = allQualityChecks.filter((c) => c.category === 'Process' && c.section === 'Paint')
	const allQualityChecksPeoplePaint = allQualityChecks.filter((c) => c.category === 'People' && c.section === 'Paint')
	const allQualityChecksStandardsPaint = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.section === 'Paint')

	let dateForDay = new Date()
	let todayNumber = dateForDay.getDay()
	let thisMonth = dateForDay.getMonth() + 1

	const todayDate = new Date()
	todayDate.setHours(0, 0, 0, 0)

	function getLastDayOfMonth(year, month) {
		return new Date(year, month + 1, 0)
	}

	// 👇️ Last Day of CURRENT MONTH
	const date = new Date()
	const lastDayCurrentMonth = getLastDayOfMonth(date.getFullYear(), date.getMonth())

	const dueTodayArr = ['Daily']

	if (todayNumber === 5) {
		dueTodayArr.push('Weekly')
	}
	if (todayDate.getTime() === lastDayCurrentMonth.getTime()) {
		dueTodayArr.push('Monthly')
		if (thisMonth === 3 || thisMonth === 6 || thisMonth === 9 || thisMonth === 12) {
			dueTodayArr.push('Quarterly')
		}
	}

	const dueTodayIdsEq = await TCard.distinct('_id', {
		area: 'quality',
		division: division,
		frequency: { $in: dueTodayArr },
		category: 'Equipment',
		status: 'Open',
	})

	const dueTodayIdsProcess = await TCard.distinct('_id', {
		area: 'quality',
		division: division,
		frequency: { $in: dueTodayArr },
		category: 'Process',
		status: 'Open',
	})
	const dueTodayIdsPeople = await TCard.distinct('_id', {
		area: 'quality',
		division: division,
		frequency: { $in: dueTodayArr },
		category: 'People',
		status: 'Open',
	})
	const dueTodayIdsStandards = await TCard.distinct('_id', {
		area: 'quality',
		division: division,
		frequency: { $in: dueTodayArr },
		category: 'Adherence to Standards',
		status: 'Open',
	})

	const totalChecksDueTodayEq = dueTodayIdsEq.length
	const totalChecksDueTodayProcess = dueTodayIdsProcess.length
	const totalChecksDueTodayPeople = dueTodayIdsPeople.length
	const totalChecksDueTodayStandards = dueTodayIdsStandards.length

	const area = 'quality'

	// console.log(data)

	res.render('tCards/all-division-checksQCS', {
		area,
		division,
		longDivision,
		allQualityChecks,
		allQualityChecksEquipmentPlant,
		allQualityChecksProcessPlant,
		allQualityChecksPeoplePlant,
		allQualityChecksStandardsPlant,

		allQualityChecksEquipmentAsembly,
		allQualityChecksProcessAsembly,
		allQualityChecksPeopleAsembly,
		allQualityChecksStandardsAsembly,

		allQualityChecksEquipmentManufacturing,
		allQualityChecksProcessManufacturing,
		allQualityChecksPeopleManufacturing,
		allQualityChecksStandardsManufacturing,

		allQualityChecksEquipmentPaint,
		allQualityChecksProcessPaint,
		allQualityChecksPeoplePaint,
		allQualityChecksStandardsPaint,

		totalChecksDueTodayEq,
		totalChecksDueTodayProcess,
		totalChecksDueTodayPeople,
		totalChecksDueTodayStandards,
	})
}

module.exports.allDivisionChecksQCSByCategory = async (req, res) => {
	let { division, section } = req.params

	if (division === 'LP') division = 'EM'
	if (division === 'SD') division = 'BHL'

	let data = []
	let longDivision

	if (division === 'BHL') longDivision = 'Backhoe Loader/Site Dumper'
	if (division === 'CP') longDivision = 'Compact Products'
	if (division === 'EM') longDivision = 'Earthmovers/Landpower'
	if (division === 'HP') longDivision = 'Heavy Products'
	if (division === 'LDL') longDivision = 'Loadall'
	if (division === 'Cabs') longDivision = 'Cabs Systems'
	if (division === 'PS') longDivision = 'Power Systems'
	if (division === 'USA') longDivision = 'Savannah'
	if (division === 'TMS') longDivision = 'Transmissions'

	const allQualityChecks = await TCard.aggregate([
		{
			$match: {
				area: 'quality',
				division,
				section,
			},
		},
		{
			$addFields: {
				boxColor: {
					$switch: {
						branches: [
							{
								// status is open
								case: {
									$eq: ['$status', 'Passed'],
								},
								//time since start of shift until now
								then: 'green',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Contained'],
								},
								//time since start of shift until now
								then: 'orange',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Failed'],
								},
								//time since start of shift until now
								then: 'red',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Not Required'],
								},
								//time since start of shift until now
								then: 'blue',
							},
						],
						// default if none of the above
						default: 'grey',
					},
				},
				modal: {
					$switch: {
						branches: [
							{
								// status is open
								case: {
									$eq: ['$status', 'Passed'],
								},
								//time since start of shift until now
								then: 'do_check',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Contained'],
								},
								//time since start of shift until now
								then: 'do_check',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Failed'],
								},
								//time since start of shift until now
								then: 'contain_check',
							},
							{
								// status is contained
								case: {
									$eq: ['$status', 'Not Required'],
								},
								//time since start of shift until now
								then: 'do_check',
							},
						],
						// default if none of the above
						default: 'do_check',
					},
				},
			},
		},
		{
			$project: {
				status: 1,
				name: 1,
				level: 1,
				frequency: 1,
				primaryUserName: 1,
				secondUserName: 1,
				checkedBy: 1,
				value: 1,
				category: 1,
				section: 1,
				frequency: 1,
				boxColor: 1,
				textColor: {
					$cond: [{ $eq: ['$status', 'Open'] }, 'black', 'white'],
				},
				result: {
					$cond: [{ $eq: ['$type', 'Value'] }, '$value', '$agreed'],
				},
				description: { $trim: { input: '$description' } },
				type: 1,
				method: 1,
				manual: 1,
				failedAt: 1,
				unit: 1,
				comments: 1,
				modal: 1,
			},
		},
	])

	const allQualityChecksEquipmentPlant = allQualityChecks.filter((c) => c.category === 'Equipment' && c.frequency === 'Daily')
	const allQualityChecksProcessPlant = allQualityChecks.filter((c) => c.category === 'Process' && c.frequency === 'Daily')
	const allQualityChecksPeoplePlant = allQualityChecks.filter((c) => c.category === 'People' && c.frequency === 'Daily')
	const allQualityChecksStandardsPlant = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.frequency === 'Daily')

	const allQualityChecksEquipmentAsembly = allQualityChecks.filter((c) => c.category === 'Equipment' && c.frequency === 'Weekly')
	const allQualityChecksProcessAsembly = allQualityChecks.filter((c) => c.category === 'Process' && c.frequency === 'Weekly')
	const allQualityChecksPeopleAsembly = allQualityChecks.filter((c) => c.category === 'People' && c.frequency === 'Weekly')
	const allQualityChecksStandardsAsembly = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.frequency === 'Weekly')

	const allQualityChecksEquipmentManufacturing = allQualityChecks.filter((c) => c.category === 'Equipment' && c.frequency === 'Monthly')
	const allQualityChecksProcessManufacturing = allQualityChecks.filter((c) => c.category === 'Process' && c.frequency === 'Monthly')
	const allQualityChecksPeopleManufacturing = allQualityChecks.filter((c) => c.category === 'People' && c.frequency === 'Monthly')
	const allQualityChecksStandardsManufacturing = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.frequency === 'Monthly')

	const allQualityChecksEquipmentQuarterly = allQualityChecks.filter((c) => c.category === 'Equipment' && c.frequency === 'Quarterly')
	const allQualityChecksProcessQuarterly = allQualityChecks.filter((c) => c.category === 'Process' && c.frequency === 'Quarterly')
	const allQualityChecksPeopleQuarterly = allQualityChecks.filter((c) => c.category === 'People' && c.frequency === 'Quarterly')
	const allQualityChecksStandardsQuarterly = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.frequency === 'Quarterly')

	let dateForDay = new Date()
	let todayNumber = dateForDay.getDay()
	let thisMonth = dateForDay.getMonth() + 1

	const todayDate = new Date()
	todayDate.setHours(0, 0, 0, 0)

	function getLastDayOfMonth(year, month) {
		return new Date(year, month + 1, 0)
	}

	// 👇️ Last Day of CURRENT MONTH
	const date = new Date()
	const lastDayCurrentMonth = getLastDayOfMonth(date.getFullYear(), date.getMonth())

	const dueTodayArr = ['Daily']

	if (todayNumber === 5) {
		dueTodayArr.push('Weekly')
	}
	if (todayDate.getTime() === lastDayCurrentMonth.getTime()) {
		dueTodayArr.push('Monthly')
		if (thisMonth === 3 || thisMonth === 6 || thisMonth === 9 || thisMonth === 12) {
			dueTodayArr.push('Quarterly')
		}
	}

	const dueTodayIdsEq = await TCard.distinct('_id', {
		area: 'quality',
		division: division,
		frequency: { $in: dueTodayArr },
		category: 'Equipment',
		section,
		status: 'Open',
	})

	const dueTodayIdsProcess = await TCard.distinct('_id', {
		area: 'quality',
		division: division,
		frequency: { $in: dueTodayArr },
		category: 'Process',
		section,
		status: 'Open',
	})
	const dueTodayIdsPeople = await TCard.distinct('_id', {
		area: 'quality',
		division: division,
		frequency: { $in: dueTodayArr },
		category: 'People',
		section,
		status: 'Open',
	})
	const dueTodayIdsStandards = await TCard.distinct('_id', {
		area: 'quality',
		division: division,
		frequency: { $in: dueTodayArr },
		category: 'Adherence to Standards',
		section,
		status: 'Open',
	})

	const totalChecksDueTodayEq = dueTodayIdsEq.length
	const totalChecksDueTodayProcess = dueTodayIdsProcess.length
	const totalChecksDueTodayPeople = dueTodayIdsPeople.length
	const totalChecksDueTodayStandards = dueTodayIdsStandards.length

	//dynamic filter function
	// filterItems = (data, filters) => data.filter((item) => !filters.find((x) => x.key.split('.').reduce((keys, key) => keys[key], item) !== x.value))
	//  use dynamic filter
	// const totalChecks = filterItems(allQualityChecks, [{ key: 'division', value: division }]).length

	// let totalChecksDoneToday = await TCard.countDocuments({
	// 	area: 'quality',
	// 	division: division,
	// 	_id: { $in: dueTodayIds },
	// 	status: { $ne: 'Open' },

	// 	// createdAt: { $gte: todayDate },
	// })

	// if (totalChecksDoneToday > totalChecksDueToday) totalChecksDoneToday = totalChecksDueToday

	const area = 'quality'

	// console.log(data)

	res.render('tCards/section-division-checksQCS', {
		area,
		section,
		division,
		longDivision,
		allQualityChecks,
		allQualityChecksEquipmentPlant,
		allQualityChecksProcessPlant,
		allQualityChecksPeoplePlant,
		allQualityChecksStandardsPlant,

		allQualityChecksEquipmentAsembly,
		allQualityChecksProcessAsembly,
		allQualityChecksPeopleAsembly,
		allQualityChecksStandardsAsembly,

		allQualityChecksEquipmentManufacturing,
		allQualityChecksProcessManufacturing,
		allQualityChecksPeopleManufacturing,
		allQualityChecksStandardsManufacturing,

		allQualityChecksEquipmentQuarterly,
		allQualityChecksProcessQuarterly,
		allQualityChecksPeopleQuarterly,
		allQualityChecksStandardsQuarterly,

		totalChecksDueTodayEq,
		totalChecksDueTodayProcess,
		totalChecksDueTodayPeople,
		totalChecksDueTodayStandards,
	})
}

module.exports.myChecks = async (req, res) => {
	let { division, id } = req.params

	const idsToUpdate = [
		{
			_id: '607edd42f0b39f2c740dc35d',
			area: 'Attachments',
		},
		{
			_id: '607eddd5f0b39f2c740dc35f',
			area: 'Attachments',
		},
		{
			_id: '607ede34f0b39f2c740dc360',
			area: 'Attachments',
		},
		{
			_id: '607edeaaf0b39f2c740dc362',
			area: 'Attachments',
		},
		{
			_id: '607edff3f0b39f2c740dc363',
			area: 'Attachments',
		},
		{
			_id: '607ee2f5f0b39f2c740dc371',
			area: 'Attachments',
		},
		{
			_id: '607ee60df0b39f2c740dc374',
			area: 'Revolver',
		},
		{
			_id: '607ee63ff0b39f2c740dc375',
			area: 'Revolver',
		},
		{
			_id: '607eea0df0b39f2c740dc37b',
			area: 'Revolver',
		},
		{
			_id: '607eed47f0b39f2c740dc382',
			area: 'Revolver',
		},
		{
			_id: '607eed63f0b39f2c740dc383',
			area: 'Revolver',
		},
		{
			_id: '607ef3bdf0b39f2c740dc398',
			area: 'Revolver',
		},
		{
			_id: '6082da7526ac362070d531cb',
			area: 'Attachments',
		},
		{
			_id: '6082db1526ac362070d531d8',
			area: 'Attachments',
		},
		{
			_id: '6082dbd626ac362070d531e0',
			area: 'Attachments',
		},
		{
			_id: '6082dc8426ac362070d531e7',
			area: 'Attachments',
		},
		{
			_id: '60866f35526e7d0d6c0ab6ba',
			area: 'Small Parts',
		},
		{
			_id: '60866faa526e7d0d6c0ab6c1',
			area: 'Small Parts',
		},
		{
			_id: '60867011526e7d0d6c0ab6c8',
			area: 'Small Parts',
		},
		{
			_id: '60867052526e7d0d6c0ab6c9',
			area: 'Small Parts',
		},
		{
			_id: '6086717a526e7d0d6c0ab6d8',
			area: 'Small Parts',
		},
		{
			_id: '6086721c526e7d0d6c0ab6df',
			area: 'Small Parts',
		},
		{
			_id: '608672c0526e7d0d6c0ab6ea',
			area: 'Small Parts',
		},
		{
			_id: '60867378526e7d0d6c0ab6f2',
			area: 'Small Parts',
		},
		{
			_id: '608673c0526e7d0d6c0ab6f9',
			area: 'Small Parts',
		},
		{
			_id: '60867415526e7d0d6c0ab700',
			area: 'Small Parts',
		},
		{
			_id: '60867466526e7d0d6c0ab70a',
			area: 'Small Parts',
		},
		{
			_id: '60867ce3526e7d0d6c0ab722',
			area: 'Revolver',
		},
		{
			_id: '60867d43526e7d0d6c0ab72a',
			area: 'Revolver',
		},
		{
			_id: '6086801e526e7d0d6c0ab73a',
			area: 'Revolver',
		},
		{
			_id: '6086805d526e7d0d6c0ab741',
			area: 'Revolver',
		},
		{
			_id: '60895fa2757592215c117274',
			area: 'Attachments',
		},
		{
			_id: '60895fc5757592215c117275',
			area: 'Revolver',
		},
		{
			_id: '60915358e6fc5421445675d4',
			area: 'Revolver',
		},
		{
			_id: '6091537ee6fc5421445675d5',
			area: 'Revolver',
		},
		{
			_id: '6094ff696666e51a641d9f23',
			area: 'Revolver',
		},
		{
			_id: '6094ffe86666e51a641d9f2d',
			area: 'Revolver',
		},
		{
			_id: '60950b6d6666e51a641d9f4e',
			area: 'Small Parts',
		},
		{
			_id: '60950c1d6666e51a641d9f55',
			area: 'Small Parts',
		},
	]

	for (let i of idsToUpdate) {
		let id = i._id
		let found = await TCard.findById(id)

		if (found) {
			await TCard.findByIdAndUpdate(id, {
				name: `${i.area} ${found.name}`,
			})
		}
	}

	// let usersArr = [
	// 	'636a4126ecb9411248bb91db',
	// 	'636a4160ecb9411248bb9594',
	// 	'636a418decb9411248bbf2f4',
	// 	'636a41e1ecb9411248bc07db',
	// 	'636a559be025141afc4349d4',
	// ]

	// const allQualityChecksToUpdate = await TCard.updateMany(
	// 	{ area: 'quality', division: 'EM', section: 'Pant' },
	// 	{
	// 		users: usersArr,
	// 		primaryUserId: '636a4126ecb9411248bb91db',
	// 		primaryUserName: 'Thomas Johnson',
	// 		secondUserId: '636a4160ecb9411248bb9594',
	// 		secondUserName: 'Dan Woodcock',
	// 	}
	// )

	if (division === 'LP') division = 'EM'
	if (division === 'SD') division = 'BHL'

	let longDivision

	if (division === 'BHL') longDivision = 'Backhoe Loader/Site Dumper'
	if (division === 'CP') longDivision = 'Compact Products'
	if (division === 'EM') longDivision = 'Earthmovers/Landpower'
	if (division === 'HP') longDivision = 'Heavy Products'
	if (division === 'LDL') longDivision = 'Loadall'
	if (division === 'Cabs') longDivision = 'Cabs Systems'
	if (division === 'PS') longDivision = 'Power Systems'
	if (division === 'USA') longDivision = 'Savannah'
	if (division === 'TMS') longDivision = 'Transmissions'

	const tCards = await TCard.find(
		{
			users: id,
		},
		{
			status: 1,
			name: 1,
			level: 1,
			frequency: 1,
			primaryUserName: 1,
			secondUserName: 1,
			checkedBy: 1,
			value: 1,
			agreed: 1,
			category: 1,
			section: 1,
			frequency: 1,
			type: 1,
			method: 1,
			manual: 1,
			failedAt: 1,
			unit: 1,
			comments: 1,
			description: 1,
		}
	)
		.populate({
			path: 'users',
		})
		.lean()

	let allQualityChecks = tCards.map((item) => {
		let boxColor = 'grey'
		let modal = 'do_check'

		if (item.status === 'Passed') boxColor = 'green'

		if (item.status === 'Contained') {
			boxColor = 'orange'
			modal = 'contain_check'
		}
		if (item.status === 'Failed') {
			boxColor = 'red'
			modal = 'contain_check'
		}

		textColor = item.status === 'Open' ? 'black' : 'white'

		result = item.status === 'Value' ? item.value : item.agreed
		item.description = item.description.trim()

		return { ...item, boxColor, textColor, result, modal }
	})

	const allQualityChecksEquipmentPlant = allQualityChecks.filter((c) => c.category === 'Equipment' && c.frequency === 'Daily')
	const allQualityChecksProcessPlant = allQualityChecks.filter((c) => c.category === 'Process' && c.frequency === 'Daily')
	const allQualityChecksPeoplePlant = allQualityChecks.filter((c) => c.category === 'People' && c.frequency === 'Daily')
	const allQualityChecksStandardsPlant = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.frequency === 'Daily')

	const allQualityChecksEquipmentAsembly = allQualityChecks.filter((c) => c.category === 'Equipment' && c.frequency === 'Weekly')
	const allQualityChecksProcessAsembly = allQualityChecks.filter((c) => c.category === 'Process' && c.frequency === 'Weekly')
	const allQualityChecksPeopleAsembly = allQualityChecks.filter((c) => c.category === 'People' && c.frequency === 'Weekly')
	const allQualityChecksStandardsAsembly = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.frequency === 'Weekly')

	const allQualityChecksEquipmentManufacturing = allQualityChecks.filter((c) => c.category === 'Equipment' && c.frequency === 'Monthly')
	const allQualityChecksProcessManufacturing = allQualityChecks.filter((c) => c.category === 'Process' && c.frequency === 'Monthly')
	const allQualityChecksPeopleManufacturing = allQualityChecks.filter((c) => c.category === 'People' && c.frequency === 'Monthly')
	const allQualityChecksStandardsManufacturing = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.frequency === 'Monthly')

	const allQualityChecksEquipmentQuarterly = allQualityChecks.filter((c) => c.category === 'Equipment' && c.frequency === 'Quarterly')
	const allQualityChecksProcessQuarterly = allQualityChecks.filter((c) => c.category === 'Process' && c.frequency === 'Quarterly')
	const allQualityChecksPeopleQuarterly = allQualityChecks.filter((c) => c.category === 'People' && c.frequency === 'Quarterly')
	const allQualityChecksStandardsQuarterly = allQualityChecks.filter((c) => c.category === 'Adherence to Standards' && c.frequency === 'Quarterly')

	let dateForDay = new Date()
	let todayNumber = dateForDay.getDay()
	let thisMonth = dateForDay.getMonth() + 1

	const todayDate = new Date()
	todayDate.setHours(0, 0, 0, 0)

	function getLastDayOfMonth(year, month) {
		return new Date(year, month + 1, 0)
	}

	// 👇️ Last Day of CURRENT MONTH
	const date = new Date()
	const lastDayCurrentMonth = getLastDayOfMonth(date.getFullYear(), date.getMonth())

	const dueTodayArr = ['Daily']

	if (todayNumber === 5) {
		dueTodayArr.push('Weekly')
	}
	if (todayDate.getTime() === lastDayCurrentMonth.getTime()) {
		dueTodayArr.push('Monthly')
		if (thisMonth === 3 || thisMonth === 6 || thisMonth === 9 || thisMonth === 12) {
			dueTodayArr.push('Quarterly')
		}
	}

	const dueTodayIdsEq = await TCard.distinct('_id', {
		area: 'quality',
		$or: [{ primaryUserId: id }, { secondUserId: id }],
		frequency: { $in: dueTodayArr },
		category: 'Equipment',
		status: 'Open',
	})

	const dueTodayIdsProcess = await TCard.distinct('_id', {
		area: 'quality',
		$or: [{ primaryUserId: id }, { secondUserId: id }],
		frequency: { $in: dueTodayArr },
		category: 'Process',
		status: 'Open',
	})
	const dueTodayIdsPeople = await TCard.distinct('_id', {
		area: 'quality',
		$or: [{ primaryUserId: id }, { secondUserId: id }],
		frequency: { $in: dueTodayArr },
		category: 'People',
		status: 'Open',
	})
	const dueTodayIdsStandards = await TCard.distinct('_id', {
		area: 'quality',
		$or: [{ primaryUserId: id }, { secondUserId: id }],
		frequency: { $in: dueTodayArr },
		category: 'Adherence to Standards',
		status: 'Open',
	})

	const totalChecksDueTodayEq = dueTodayIdsEq.length
	const totalChecksDueTodayProcess = dueTodayIdsProcess.length
	const totalChecksDueTodayPeople = dueTodayIdsPeople.length
	const totalChecksDueTodayStandards = dueTodayIdsStandards.length

	const totalDueToday = totalChecksDueTodayEq + totalChecksDueTodayProcess + totalChecksDueTodayPeople + totalChecksDueTodayStandards
	const area = 'quality'

	res.render('tCards/my-checks', {
		area,
		division,

		longDivision,
		allQualityChecks,
		allQualityChecksEquipmentPlant,
		allQualityChecksProcessPlant,
		allQualityChecksPeoplePlant,
		allQualityChecksStandardsPlant,

		allQualityChecksEquipmentAsembly,
		allQualityChecksProcessAsembly,
		allQualityChecksPeopleAsembly,
		allQualityChecksStandardsAsembly,

		allQualityChecksEquipmentManufacturing,
		allQualityChecksProcessManufacturing,
		allQualityChecksPeopleManufacturing,
		allQualityChecksStandardsManufacturing,

		allQualityChecksEquipmentQuarterly,
		allQualityChecksProcessQuarterly,
		allQualityChecksPeopleQuarterly,
		allQualityChecksStandardsQuarterly,

		totalChecksDueTodayEq,
		totalChecksDueTodayProcess,
		totalChecksDueTodayPeople,
		totalChecksDueTodayStandards,
		totalDueToday,
	})
}

let div_order = {
	BHL: 0,
	CP: 1,
	EM: 2,
	HP: 3,
	LDL: 4,
	PS: 5,
	USA: 6,
	Cabs: 7,
	Transmissions: 8,
}

function compare(a, b) {
	if (a === b) {
		return 0
	}
	return a < b ? -1 : 1
}

module.exports.divisionViewQCSNew = async (req, res) => {
	const area = 'quality'

	let dateForDay = new Date()
	let todayNumber = dateForDay.getDay()
	let thisMonth = dateForDay.getMonth() + 1

	const todayDate = new Date()
	todayDate.setHours(0, 0, 0, 0)

	function getLastDayOfMonth(year, month) {
		return new Date(year, month + 1, 0)
	}

	// 👇️ Last Day of CURRENT MONTH
	const date = new Date()
	const lastDayCurrentMonth = getLastDayOfMonth(date.getFullYear(), date.getMonth())

	const dueTodayArr = ['Daily', 'Weekly']

	if (todayNumber === 5) {
		dueTodayArr.push('Weekly')
	}
	if (todayDate.getTime() === lastDayCurrentMonth.getTime()) {
		dueTodayArr.push('Monthly')
		if (thisMonth === 3 || thisMonth === 6 || thisMonth === 9 || thisMonth === 12) {
			dueTodayArr.push('Quarterly')
		}
	}

	const totalCards = await TCard.find({
		area: 'quality',
	}).lean()
	const totalCardsDueToday = await TCard.find({
		area: 'quality',
		frequency: { $in: dueTodayArr },
	})
	const locations = await TCard.aggregate([
		{
			$match: {
				area: 'quality',
			},
		},
		{
			$group: {
				_id: '$division',
				count: {
					$sum: 1,
				},
			},
		},
	]).sort({ _id: 1 })

	// sort locations machine div first

	// let div_order = {
	// 	BHL: 0,
	// 	CP: 1,
	// 	EM: 2,
	// 	HP: 3,
	// 	LDL: 4,
	// 	PS: 5,
	// 	USA: 5,
	// 	Cabs: 5,
	// 	Transmissions: 5,
	// }

	// function compare(a, b) {
	// 	if (a === b) {
	// 		return 0
	// 	}
	// 	return a < b ? -1 : 1
	// }

	let sortedLocationArr = locations.sort(function (a, b) {
		// First compare corresponding values of `cod_nivel` from `cod_nivel_order`
		let index_result = compare(div_order[a._id], div_order[b._id])

		return index_result
	})

	const totalChecks = await Check.find({
		area: 'quality',
		result: { $in: ['Passed', 'Failed'] },
	})

	// get unique array of checks based on name

	let resArr = []
	totalCards.filter(function (item) {
		let i = resArr.findIndex((x) => x.name == item.name)
		if (i <= -1) {
			resArr.push(item)
		}
		return null
	})

	const totalCardsNumber = resArr.length
	const totalCardsNumberForPrec = totalCardsDueToday.length
	const totalChecksNumber = totalChecks.length

	const totalCardsNumberCTQ = resArr.filter((c) => c.level === 'CTQ').length
	const totalCardsNumberQC = resArr.filter((c) => c.level === 'QC').length

	const totalCardsPassedNumber = totalCards.filter((c) => c.status === 'Passed').length
	const totalCardsContainedNumber = totalCards.filter((c) => c.status === 'Contained').length
	const totalCardsFailedNumber = totalCards.filter((c) => c.status === 'Failed').length
	const totalCardsOpenNumber = totalCards.filter((c) => c.status === 'Open').length

	const allPrimaryUserIds = totalCards.map((c) => c.primaryUserName)
	const allSecondUserIds = totalCards.map((c) => c.secondUserName)

	const allUserIds = [...allPrimaryUserIds, ...allSecondUserIds]

	const uniqueUserIds = [...new Set(allUserIds)]

	const usersNumber = uniqueUserIds.length

	const locationsNumber = locations.length

	// console.log('PRIMARY => ', allPrimaryUserIds.length)
	// console.log('SECOND => ', allSecondUserIds.length)
	// console.log('ALL => ', allUserIds.length)
	// console.log('UNIQUE => ', uniqueUserIds.length)

	const totalPercenatages = await TCard.aggregate([
		{
			$match: {
				area: 'quality',
				status: { $ne: 'Not Required' },
				frequency: { $in: dueTodayArr },
			},
		},
		{
			$group: {
				_id: '$status',
				count: {
					$sum: 1,
				},
			},
		},
		{
			$project: {
				count: 1,
				percentage: { $multiply: [{ $divide: [100, totalCardsNumberForPrec] }, '$count'] },
				roundPercentage: { $round: ['$percentage'] },
			},
		},
		{
			$addFields: {
				roundPercentage: { $round: ['$percentage'] },
			},
		},
		{
			$addFields: {
				color: {
					$switch: {
						branches: [
							{
								// status is passed
								case: {
									$eq: ['$_id', 'Passed'],
								},
								//time since start of shift until now
								then: 'green',
							},
							{
								// status is contained
								case: {
									$eq: ['$_id', 'Contained'],
								},
								//time since start of shift until now
								then: 'orange',
							},
							{
								// status is failed
								case: {
									$eq: ['$_id', 'Failed'],
								},
								//time since start of shift until now
								then: 'red',
							},
						],
						// default if none of the above
						default: 'grey',
					},
				},
			},
		},
	]).sort({ _id: -1 })

	const totalLabels = totalPercenatages.map((t) => t._id)
	const totaldata = totalPercenatages.map((t) => t.roundPercentage)
	const totalcolors = totalPercenatages.map((t) => t.color)

	let locationList = []

	// async function promises() {
	// 	const newLocations = locations.map(async (location) => {
	// 		return location
	// 	})

	// 	const resolved = await Promise.all(newLocations)

	// 	// console.log(resolved)
	// }

	// promises()

	for (let location of sortedLocationArr) {
		let longDivision
		if (location._id === 'BHL') longDivision = 'Backhoe Loader/Site Dumper'
		if (location._id === 'CP') longDivision = 'Compact Products'
		if (location._id === 'EM') longDivision = 'Earthmovers/Landpower'
		if (location._id === 'HP') longDivision = 'Heavy Products'
		if (location._id === 'LDL') longDivision = 'Loadall'
		if (location._id === 'Cabs') longDivision = 'Cabs Systems'
		if (location._id === 'PS') longDivision = 'Power Systems'
		if (location._id === 'USA') longDivision = 'Savannah'
		if (location._id === 'TMS') longDivision = 'Transmissions'

		let totalChecks = await TCard.countDocuments({
			division: location._id,
			area: 'quality',
			status: { $ne: 'Not Required' },
			frequency: { $in: dueTodayArr },
		})

		const divPercenatages = await TCard.aggregate([
			{
				$match: {
					area: 'quality',
					division: location._id,
					status: { $ne: 'Not Required' },
					frequency: { $in: dueTodayArr },
				},
			},
			{
				$group: {
					_id: '$status',
					count: {
						$sum: 1,
					},
				},
			},
			{
				$project: {
					count: 1,
					percentage: { $multiply: [{ $divide: [100, totalChecks] }, '$count'] },
					roundPercentage: { $round: ['$percentage'] },
				},
			},
			{
				$addFields: {
					roundPercentage: { $round: ['$percentage'] },
				},
			},
			{
				$addFields: {
					color: {
						$switch: {
							branches: [
								{
									// status is passed
									case: {
										$eq: ['$_id', 'Passed'],
									},
									//time since start of shift until now
									then: 'green',
								},
								{
									// status is contained
									case: {
										$eq: ['$_id', 'Contained'],
									},
									//time since start of shift until now
									then: 'orange',
								},
								{
									// status is failed
									case: {
										$eq: ['$_id', 'Failed'],
									},
									//time since start of shift until now
									then: 'red',
								},
							],
							// default if none of the above
							default: 'grey',
						},
					},
				},
			},
		]).sort({ _id: -1 })

		const lastCheckArr = await Check.find({
			division: location._id,
			area: 'quality',
			result: { $in: ['Passed', 'failed'] },
		})
			.sort({ _id: -1 })
			.limit(1)

		let lastChecked

		if (lastCheckArr.length > 0) {
			lastChecked = `${capitalizeFirstLetterOfAllWords(lastCheckArr[0].checkedBy)} - ${moment(lastCheckArr[0].createdAt).format(
				'DD/MM/YYYY - HH:mm'
			)}`
		}

		locationList.push({
			longDivision,
			lastChecked,
			divPercenatages,
			division: location._id,
		})
	}

	const updates = await TCardUpdate.find({})

	res.render('tCards/division-viewQCSNew', {
		area,
		totalCardsNumber,
		totalCardsNumberCTQ,
		totalCardsNumberQC,
		usersNumber,
		locationsNumber,
		totalChecksNumber,
		locationList,
		totalCardsPassedNumber,
		totalCardsContainedNumber,
		totalCardsFailedNumber,
		totalCardsOpenNumber,
		totalLabels,
		totaldata,
		totalcolors,
		updates,
		totalPercenatages,
	})
}

module.exports.createNewUpdate = async (req, res) => {
	if (!req.body.update) {
		req.flash('error', 'Something went wrong')

		return res.redirect('/tCard/qcs-new')
	}

	const update = new TCardUpdate(req.body.update)

	update.createdBy = req.user._id

	await update.save()

	res.redirect('/tCard/qcs-new')
}

module.exports.editUpdate = async (req, res) => {
	const { id } = req.params

	if (!req.body.update) {
		req.flash('error', 'Something went wrong')

		return res.redirect('/tCard/qcs-new')
	}

	await TCardUpdate.findByIdAndUpdate(id, {
		...req.body.update,
		updatedBy: req.user._id,
	})

	res.redirect('/tCard/qcs-new')
}

module.exports.deleteUpdate = async (req, res) => {
	const { id } = req.params
	await TCardUpdate.findByIdAndDelete(id)

	req.flash('success', 'Successfully deleted update')
	res.redirect('/tCard/qcs-new')
}

module.exports.criticalToQualityDash = async (req, res) => {
	let { id } = req.params
	const area = 'quality'

	const locations = await TCard.aggregate([
		{
			$match: {
				area: 'quality',
			},
		},
		{
			$group: {
				_id: '$division',
				count: {
					$sum: 1,
				},
			},
		},
	]).sort({ _id: 1 })

	let sortedLocationArr = locations.sort(function (a, b) {
		// First compare corresponding values of `cod_nivel` from `cod_nivel_order`
		let index_result = compare(div_order[a._id], div_order[b._id])

		return index_result
	})

	let locationsArr = []

	for (let location of sortedLocationArr) {
		let longDivision
		if (location._id === 'BHL') longDivision = 'Backhoe Loader/Site Dumper'
		if (location._id === 'CP') longDivision = 'Compact Products'
		if (location._id === 'EM') longDivision = 'Earthmovers/Landpower'
		if (location._id === 'HP') longDivision = 'Heavy Products'
		if (location._id === 'LDL') longDivision = 'Loadall'
		if (location._id === 'Cabs') longDivision = 'Cabs Systems'
		if (location._id === 'PS') longDivision = 'Power Systems'
		if (location._id === 'USA') longDivision = 'Savannah'
		if (location._id === 'TMS') longDivision = 'Transmissions'

		let tCards = await TCard.aggregate([
			{
				$match: {
					area: 'quality',
					division: location._id,
					level: 'CTQ',
				},
			},
			{
				$project: {
					_id: 1,
					name: 1,
					frequency: 1,
					division: 1,
				},
			},
			{
				$addFields: {
					days: '--',
					lastfailed: '',
					division: longDivision,
				},
			},
		])

		// console.log('START => ', new Date())

		////////////////////////// start here //////////////////////////

		const data = tCards.map(async (card) => {
			let lastfailed
			let days
			let color
			let failedCheckArr = await Check.find({
				tCardId: card._id,
				result: 'Failed',
			})
				.sort({ _id: -1 })
				.limit(1)

			if (failedCheckArr.length > 0) {
				lastfailed = failedCheckArr[0].createdAt
				// console.log(lastfaield)

				//define two date object variables with dates inside it
				today = new Date()
				let lastFailedDay = lastfailed

				//calculate time difference
				let time_difference = today.getTime() - lastFailedDay.getTime()

				//calculate days difference by dividing total milliseconds in a day
				days = Math.ceil(time_difference / (1000 * 60 * 60 * 24))
			}

			if (days > 9) color = 'green'
			if (days < 9 && days > 0) color = 'orange'
			if (days === 0) color = 'red'

			if (!days) {
				days = 50000000
			}

			return { ...card, lastfailed, days, color }
		})

		const AllResults = await Promise.all(data)

		const results = AllResults.sort((a, b) => {
			return a.days - b.days
		})

		// results.sort((a, b) => {
		// 	return a.days - b.days
		// })

		if (results.length > 0) {
			locationsArr.push({
				longDivision,
				// tCards,
				results,
				// failedResults,
			})
		}
	}

	let over9DaysNumber = 0
	let under9DaysNumber = 0
	let todayNumber = 0

	for (let l of locationsArr) {
		for (let r of l.results) {
			if (r.days > 9) over9DaysNumber++
			if (r.days < 9 && r.days > 0) under9DaysNumber++
			if (r.days === 0) todayNumber++
		}
	}

	if (id === 'all') {
		id = locationsArr[0].results[0]._id
	}

	const theTCard = await TCard.findById(id)
		.populate({
			path: 'checks',
			options: {
				match: {
					result: { $ne: 'Not Required' },
				},
				sort: { _id: -1 },
			},
			// perDocumentLimit: 250,
		})
		.lean()

	// console.log(theTCard)

	const tCardName = theTCard.name

	// console.log(theTCard.checks)

	let theTCardPassed = theTCard.checks.filter(function (item) {
		return item.result === 'Passed'
	}).length

	let theTCardFailed = theTCard.checks.filter(function (item) {
		return item.result === 'Failed'
	}).length

	let theTCardContained = theTCard.checks.filter(function (item) {
		return item.result === 'Contained'
	}).length

	let theTCardMissed = theTCard.checks.filter(function (item) {
		return item.result === 'Missed'
	}).length

	const theTCardTotalChecks = theTCardPassed + theTCardFailed + theTCardContained + theTCardMissed

	const failedPercent = Math.round((theTCardFailed / theTCardTotalChecks) * 100)
	const containedPercent = Math.round((theTCardContained / theTCardTotalChecks) * 100)
	const missedPercent = Math.round((theTCardMissed / theTCardTotalChecks) * 100)

	const passedPercent = 100 - failedPercent - containedPercent - missedPercent

	const theTCardGraph2 = await TCard.findById(id)
		.populate({
			path: 'checks',
			match: {
				result: { $in: ['Passed', 'Failed'] },
			},
			options: {
				sort: { _id: -1 },
			},
			perDocumentLimit: 10,
		})
		.lean()

	for (let t of theTCardGraph2.checks) {
		if (t.result === 'Passed' && !t.value) {
			t.value = 1
		}
		if (t.result === 'Failed' && !t.value) {
			t.value = 0
		}
	}

	const theChecks = theTCardGraph2.checks.sort((objA, objB) => Number(objA.createdAt) - Number(objB.createdAt))

	const lineLabels = theChecks.map((c) => {
		return moment(c.createdAt).format('DD/MM')
	})
	const lineUpper = theChecks.map((c) => {
		return Math.round(+c.target * 1.1)
	})
	const lineLower = theChecks.map((c) => {
		return Math.round(+c.target * 0.9)
	})
	const lineTarget = theChecks.map((c) => {
		return +c.target
	})
	const lineResult = theChecks.map((c) => {
		return +c.value
	})

	console.log(theChecks)

	// const sortedChecksAsc = arr1.sort((objA, objB) => Number(objA.createdAt) - Number(objB.createdAt))

	res.render('tCards/critical-to-quality-dash', {
		area,
		// tCards,
		locationsArr,
		// results,
		over9DaysNumber,
		under9DaysNumber,
		todayNumber,
		theTCardPassed,
		theTCardFailed,
		theTCardContained,
		theTCardMissed,
		tCardName,
		passedPercent,
		failedPercent,
		containedPercent,
		missedPercent,
		lineLabels,
		lineUpper,
		lineLower,
		lineTarget,
		lineResult,
	})
}
