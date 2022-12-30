const { claimSchema, reviewSchema } = require('../schemas')
const ExpressError = require('../utils/ExpressError')
const Claim = require('../models/claim')
const Review = require('../models/review')
const TCard = require('../models/tCard')
const MachineUser = require('../models/machineUser')
const User = require('../models/user')
const Role = require('../models/roles')

module.exports.isLoggedIn = (req, res, next) => {
	if (!req.isAuthenticated()) {
		req.session.returnTo = req.originalUrl
		req.flash('error', 'You must be signed in first')
		return res.redirect('/login')
	}
	next()
}
module.exports.isLoggedInTCard = (req, res, next) => {
	const { division } = req.param
	if (!req.isAuthenticated()) {
		req.session.returnTo = req.originalUrl
		req.flash('error', 'You must be signed in first')
		return res.redirect('/tCard/login')
	}
	next()
}
module.exports.isLoggedInMachine = (req, res, next) => {
	if (!req.isAuthenticated()) {
		req.session.returnTo = req.originalUrl
		req.flash('error', 'You must be signed in first')
		return res.redirect('/equipment-monitoring/operations')
	}
	next()
}

// module.exports.grantAccess = function(...roles) {
// 	console.log(roles)
// 	return async (req, res, next) => {
// 		const id = req.user._id
// 		const foundUser = await MachineUser.findById(id)

// 		if (!foundUser) {
// 			req.flash('error', 'Sorry something went wrong')
// 			return res.redirect('/equipment-monitoring/operations')
// 		}
// 		if (!roles.includes(foundUser.role)) {
// 			req.flash('error', 'You do not have permission to do that')
// 			return res.redirect('/equipment-monitoring/operations')
// 		}
// 		next()
// 	}
// }

module.exports.isAdminMachine = async (req, res, next) => {
	const id = req.user._id
	const foundUser = await MachineUser.findById(id)
	const roles = await Role.distinct('name', {})

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}
	if (req.user.division !== 'Group Operations') {
		if (!roles.includes(foundUser.role)) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/equipment-monitoring/operations')
		}
	}

	next()
}

module.exports.isDivMachine = async (req, res, next) => {
	const { shortBu } = req.params
	const id = req.user._id
	const foundUser = await MachineUser.findById(id)
	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	if (foundUser.division !== 'Group Operations') {
		if (foundUser.division !== shortBu) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/equipment-monitoring/operations')
		}
	}

	next()
}

module.exports.canPUsePrograming = async (req, res, next) => {
	const id = req.user._id
	const foundUser = await MachineUser.findById(id)

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	const grantedAccess = await Role.findOne({
		name: foundUser.role,
		can_use_programing: true,
	})

	if (req.user.division !== 'Group Operations') {
		if (!grantedAccess) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/equipment-monitoring/operations')
		}
	}

	next()
}

module.exports.canEditUsers = async (req, res, next) => {
	const id = req.user._id
	const foundUser = await MachineUser.findById(id)

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	const grantedAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_users: true,
	})

	if (req.user.division !== 'Group Operations') {
		if (!grantedAccess) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/equipment-monitoring/operations')
		}
	}

	next()
}
module.exports.canEditShifts = async (req, res, next) => {
	const id = req.user._id
	const foundUser = await MachineUser.findById(id)

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	const grantedAccess = await Role.findOne({
		name: foundUser.role,
		add_edit_shifts: true,
	})

	if (req.user.division !== 'Group Operations') {
		if (!grantedAccess) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/equipment-monitoring/operations')
		}
	}

	next()
}

module.exports.canDeleteShifts = async (req, res, next) => {
	const id = req.user._id
	const foundUser = await MachineUser.findById(id)

	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/equipment-monitoring/operations')
	}

	if (foundUser.division !== 'Group Operations' || foundUser.division.role === 'Setter') {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/equipment-monitoring/operations')
	}

	next()
}

module.exports.isLoadallDPU = async (req, res, next) => {
	if (!req.user.isLoadallDPU) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isCFCTop5 = async (req, res, next) => {
	if (!req.user.isCFCTop5) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}

module.exports.isAGroupAdmin = async (req, res, next) => {
	if (!req.user.isGroupAdmin) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isQSmartAdmin = async (req, res, next) => {
	if (!req.user.isQSmartAdmin) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isQSmartOk = async (req, res, next) => {
	if (!req.user.isQSmartOk) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/tracker/all/LDL')
	}
	next()
}
module.exports.isAdmin = async (req, res, next) => {
	if (!req.user.isAdmin) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isTCard = async (req, res, next) => {
	if (!req.user.isTCard) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/tCard/Operations')
	}
	next()
}

module.exports.isClaimsImport = async (req, res, next) => {
	if (!req.user.isClaimsImport) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}

module.exports.isTCardAdmin = async (req, res, next) => {
	if (!req.user.isTCardAdmin) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/tCard')
	}
	next()
}

// module.exports.isGroup = async (req, res, next) => {
// 	if (!req.user.isGroup) {
// 		req.flash('error', 'You do not have permission to do that');
// 		return res.redirect('/');
// 	}
// 	next();
// };
module.exports.isLeak = async (req, res, next) => {
	if (!req.user.isLeak) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isCrook = async (req, res, next) => {
	if (!req.user.isCrook) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.is25ptAdmin = async (req, res, next) => {
	if (!req.user.is25ptAdmin) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/doa25pt/dash')
	}
	next()
}

module.exports.isDiv = async (req, res, next) => {
	const { division } = req.params
	// console.log(division);
	// console.log(req.user.isLDL);
	if (division === 'LDL') {
		if (!req.user.isLDL) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'BHL') {
		if (!req.user.isBHL) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'SD') {
		if (!req.user.isSD) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'EM') {
		if (!req.user.isEM) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'LP') {
		if (!req.user.isLP) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'CP') {
		if (!req.user.isCP) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'HP') {
		if (!req.user.isHP) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'HBU') {
		if (!req.user.isHBU) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'Cabs') {
		if (!req.user.isCabs) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	if (division === 'USA') {
		if (!req.user.isUSA) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/')
		}
	}
	next()
}

module.exports.isDivTCard = async (req, res, next) => {
	const { id } = req.params
	const tCard = await TCard.findById(id)

	if (!req.user.isTCardAdmin) {
		const division = tCard.division

		if (division === 'LDL') {
			if (!req.user.isLDL) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'BHL') {
			if (!req.user.isBHL) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'SD') {
			if (!req.user.isSD) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'EM') {
			if (!req.user.isEM) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'LP') {
			if (!req.user.isLP) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'CP') {
			if (!req.user.isCP) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'HP') {
			if (!req.user.isHP) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'HBU') {
			if (!req.user.isHBU) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'CABS') {
			if (!req.user.isCabs) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/operations')
			}
		}
		if (division === 'training') {
			if (!req.user.isTraining) {
				req.flash('error', 'You do not have permission to do that')
				return res.redirect('/tCard/training')
			}
		}
	}

	next()
}

module.exports.isVetter = async (req, res, next) => {
	if (!req.user.isVetter) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isQmr = async (req, res, next) => {
	if (!req.user.isQmr) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isTopYard = async (req, res, next) => {
	if (!req.user.isTopYard) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isService = async (req, res, next) => {
	if (!req.user.isService) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}
module.exports.isCFC = async (req, res, next) => {
	if (!req.user.isCFC) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect('/')
	}
	next()
}

module.exports.validateClaim = (req, res, next) => {
	const { error } = claimSchema.validate(req.body)
	if (error) {
		const msg = error.details.map((el) => el.message).join(',')
		throw new ExpressError(msg, 400)
	} else {
		next()
	}
}

module.exports.isAuthor = async (req, res, next) => {
	const { id } = req.params
	const claim = await Claim.findById(id)
	if (!claim.author.equals(req.user._id)) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect(`/claims/${id}`)
	}
	next()
}

module.exports.isReviewAuthor = async (req, res, next) => {
	const { id, reviewId } = req.params
	const review = await Review.findById(reviewId)
	if (!review.author.equals(req.user._id)) {
		req.flash('error', 'You do not have permission to do that')
		return res.redirect(`/claims/${id}`)
	}
	next()
}

module.exports.validateReview = (req, res, next) => {
	const { error } = reviewSchema.validate(req.body)
	if (error) {
		const msg = error.details.map((el) => el.message).join(',')
		throw new ExpressError(msg, 400)
	} else {
		next()
	}
}

module.exports.canAssignCardUsers = async (req, res, next) => {
	const { bu } = req.params
	const id = req.user._id
	const foundUser = await User.findById(id)
	if (!foundUser) {
		req.flash('error', 'Sorry something went wrong')
		return res.redirect('/tCard/qcs')
	}

	if (foundUser.division !== 'Group Operations') {
		if (!foundUser.canAssignCardUsers) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/tCard/qcs')
		}
		if (!foundUser.divisions.includes(bu)) {
			req.flash('error', 'You do not have permission to do that')
			return res.redirect('/tCard/qcs')
		}
	}

	next()
}
