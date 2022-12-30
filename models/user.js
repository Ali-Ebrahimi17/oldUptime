const mongoose = require('mongoose')
const Schema = mongoose.Schema
const passportLocalMongoose = require('passport-local-mongoose')

const UserSchema = new Schema({
	username: {
		type: String,
		unique: true,
		required: true,
		trim: true,
	},
	password: String,
	firstName: String,
	lastName: String,

	email: {
		type: String,
		unique: true,
		required: true,
		trim: true,
	},

	resetPasswordToken: String,
	resetPasswordExpires: Date,
	isAdmin: { type: Boolean, default: false },
	division: { type: String },
	isGroupAdmin: { type: Boolean, default: false },
	isAdminMachine: { type: Boolean, default: false },
	isService: { type: Boolean, default: false },
	isVetter: { type: Boolean, default: false },
	isCFC: { type: Boolean, default: false },
	isBHL: { type: Boolean, default: false },
	isSD: { type: Boolean, default: false },
	isEM: { type: Boolean, default: false },
	isLP: { type: Boolean, default: false },
	isCP: { type: Boolean, default: false },
	isHP: { type: Boolean, default: false },
	isHBU: { type: Boolean, default: false },
	isCabs: { type: Boolean, default: false },
	isLDL: { type: Boolean, default: false },
	isLeak: { type: Boolean, default: false },
	isCrook: { type: Boolean, default: false },
	isTopYard: { type: Boolean, default: false },
	isTCardAdmin: { type: Boolean, default: false },
	is25ptAdmin: { type: Boolean, default: false },
	isTCard: { type: Boolean, default: false },
	isQSmartOk: { type: Boolean, default: false },
	isQmr: { type: Boolean, default: false },
	isLoadallDPU: { type: Boolean, default: false },
	isCFCTop5: { type: Boolean, default: false },

	isClaimsImport: { type: Boolean, default: false },
	isFourCGraphOk: { type: Boolean, default: false },
	canAssignCardUsers: { type: Boolean, default: false },
	divisions: [],
})

UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('User', UserSchema)
