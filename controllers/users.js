const User = require('../models/user')

module.exports.renderRegister = (req, res) => {
	res.render('users/register')
}

module.exports.register = async (req, res, next) => {
	try {
		const { email, username, password, firstName, lastName } = req.body
		const lastPart = email.slice(-8).toLowerCase()
		if (lastPart === '@jcb.com') {
			const user = new User({ email, username, firstName, lastName })
			const registeredUser = await User.register(user, password)
			req.login(registeredUser, (err) => {
				if (err) return next(err)
				req.flash('success', 'Welcome to JCB Uptime')
				res.redirect('/')
			})
		} else {
			req.flash('error', 'Must be a JCB email address')
			res.redirect('register')
		}
	} catch (e) {
		req.flash('error', e.message)
		res.redirect('register')
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
