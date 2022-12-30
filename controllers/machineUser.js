const User = require('../models/machineUser')

module.exports.renderRegister = (req, res) => {
	res.render('machineUser/register')
}

module.exports.register = async (req, res, next) => {
	try {
		const {
			firstName,
			lastName,
			division,
			role,
			email,
			password,
			mobile,
		} = req.body
		const lastPart = email.slice(-8).toLowerCase()
		if (lastPart === '@jcb.com') {
			const user = new User({
				firstName,
				lastName,
				division,
				role,
				email,
				mobile,
			})
			const registeredUser = await User.register(user, password)
			// req.login(registeredUser, (err) => {
			// 	if (err) return next(err)
			req.flash('success', 'User succesfully created')
			res.redirect('/equipment-monitoring/operations')
			//})
		} else {
			req.flash('error', 'Must be a JCB email address')
			res.redirect('register')
		}
	} catch (e) {
		req.flash('error', e.message)
		res.redirect('/equipment-monitoring/register')
	}
}

module.exports.renderLogin = (req, res) => {
	res.render('users/login')
}

module.exports.login = (req, res) => {
	req.flash('success', 'welcome back!')
	const redirectUrl = req.session.returnTo || '/'
	delete req.session.returnTo
	res.redirect(redirectUrl)
}

module.exports.logout = (req, res) => {
	req.logout()
	req.flash('success', 'Goodbye!')
	res.redirect('/')
}
