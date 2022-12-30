require('dotenv').config()

const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const moment = require('moment')
const ejsMate = require('ejs-mate')
const session = require('express-session')
const flash = require('connect-flash')
const ExpressError = require('./utils/ExpressError')
const methodOverride = require('method-override')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/user')
const machineUser = require('./models/machineUser')
const helmet = require('helmet')
const cors = require('cors')

const userRoutes = require('./routes/users')
const partRoutes = require('./routes/part')
const emailRoutes = require('./routes/email')
const machinePasswordRoutes = require('./routes/machinePassword')
const areaRoutes = require('./routes/area')
const claimRoutes = require('./routes/claims')
const zoneRoutes = require('./routes/zone')
const cfcTopFiveRoutes = require('./routes/cfc-top-five')
const dashRoutes = require('./routes/dash')
const dayRoutes = require('./routes/day')
const yardRoutes = require('./routes/yard')
const doa25ptRoutes = require('./routes/doa25pt')
const graveyardRoutes = require('./routes/graveyard')
const stoppageRoutes = require('./routes/stoppage')
const top50Routes = require('./routes/top50')
const stageRoutes = require('./routes/stage')
const tCardRoutes = require('./routes/tCard')
const reviewRoutes = require('./routes/reviews')
const reasonRoutes = require('./routes/reason')
const actionRoutes = require('./routes/action')
const checkRoutes = require('./routes/check')
const shiftRoutes = require('./routes/shift')
const trackerRoutes = require('./routes/tracker')
const throughputRoutes = require('./routes/throughput')
const reallocationRoutes = require('./routes/reallocation')
const modelRoutes = require('./routes/model')
const detectionRoutes = require('./routes/detection')
const inspectorRoutes = require('./routes/inspector')
const figureRoutes = require('./routes/figure')
const machineRoutes = require('./routes/machine')
const downloadRoutes = require('./routes/download')
const championRoutes = require('./routes/champion')
const passwordRoute = require('./routes/password')
const mongoSanitize = require('express-mongo-sanitize')

const MongoStore = require('connect-mongo')(session)

const dbUrl = process.env.DB_URL

mongoose.connect(dbUrl, {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
})

// const MongoClient = require('mongodb').MongoClient
// const now = { date: Date.now() }

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => {
	console.log('Database connected')
})

const app = express()

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')))
app.locals.moment = moment

app.use(cors())

const secret = process.env.SECRET

const store = new MongoStore({
	url: dbUrl,
	secret,
	touchAfter: 24 * 60 * 60,
})
store.on('error', function (e) {
	console.log('SESSION STORE ERROR', e)
})

const sessionConfig = {
	store,
	name: 'Session',
	secret,
	resave: false,
	saveUninitialized: true,
	cookie: {
		httpOnly: true,
		// secure: true,
		expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
		maxAge: 1000 * 60 * 60 * 24 * 30,
	},
}

app.use(session(sessionConfig))
app.use(flash())
// app.use(helmet());

app.use(helmet({ contentSecurityPolicy: false }))

app.use(passport.initialize())
app.use(passport.session())

// passport.use(new LocalStrategy(User.authenticate(), machineUser.authenticate()))
// passport.use(new LocalStrategy(machineUser.authenticate()))

passport.use('userLocal', new LocalStrategy(User.authenticate()))
passport.use('machineLocal', new LocalStrategy(machineUser.authenticate()))

passport.serializeUser(function (user, done) {
	done(null, user)
})

passport.deserializeUser(function (user, done) {
	if (user != null) done(null, user)
})

// passport.serializeUser(User.serializeUser(), machineUser.serializeUser())
// passport.deserializeUser(User.deserializeUser(), machineUser.deserializeUser())
// passport.serializeUser(machineUser.serializeUser())
// passport.deserializeUser(machineUser.deserializeUser())

app.use((req, res, next) => {
	app.use(
		mongoSanitize({
			replaceWith: '_',
		})
	)
	res.locals.currentUser = req.user
	res.locals.division = req.body.division
	res.locals.success = req.flash('success')
	res.locals.error = req.flash('error')
	next()
})

// // Create the rate limit rule
// const apiRequestLimiter = rateLimit({
// 	windowMs : 1 * 500, // half second
// 	max      : 1, // limit each IP to 2 requests per windowMs
// })

// Use the limit rule as an application middleware
// app.use(apiRequestLimiter)

app.use('/', userRoutes)
app.use('/claims', claimRoutes)
app.use('/claims/:id/reviews', reviewRoutes)
app.use('/tCard/:id/reason', reasonRoutes)
app.use('/tCard/:id/action', actionRoutes)
app.use('/area/:id/email', emailRoutes)
app.use('/throughput', throughputRoutes)
app.use('/stage', stageRoutes)
app.use('/materials', partRoutes)
app.use('/dash', dashRoutes)
app.use('/zone', zoneRoutes)
app.use('/day', dayRoutes)
app.use('/tracker', trackerRoutes)
app.use('/doa25pt', doa25ptRoutes)
app.use('/top50', top50Routes)
app.use('/champion', championRoutes)
app.use('/area', areaRoutes)
app.use('/yard', yardRoutes)
app.use('/shift', shiftRoutes)
app.use('/tCard', tCardRoutes)
app.use('/tCard/:id/check', checkRoutes)
app.use('/graveyard', graveyardRoutes)
app.use('/stoppage', stoppageRoutes)
app.use('/reallocation', reallocationRoutes)
app.use('/model', modelRoutes)
app.use('/equipment-monitoring', machineRoutes)
app.use('/detection', detectionRoutes)
app.use('/inspector', inspectorRoutes)
app.use('/figure', figureRoutes)
app.use('/cfc-top-five', cfcTopFiveRoutes)
app.use('/download', downloadRoutes)
app.use('/machinePassword', machinePasswordRoutes)
app.use('/', passwordRoute)

app.get('/', (req, res) => {
	res.render('home')
})

app.all('*', (req, res, next) => {
	next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
	const { statusCode = 500 } = err
	if (!err.message) err.message = 'Something Went Wrong'
	res.status(statusCode).render('error', { err })
})

let timeNowStamp = moment().format('DD/MM/YYYY - HH:mm:ss')

app.listen(3000, () => {
	console.log('Server is running - ' + timeNowStamp)
})
