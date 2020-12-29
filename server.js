if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')


const mongoose = require('mongoose')
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connected to Mongoose'))

const User = require('./models/user')



const initializePassport = require('./passport-config')
initializePassport(
  passport,
  email => User.findOne({email: email}),
  id => User.findOne({id: id})
)

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.use(express.static('public'));


app.get('/', checkAuthenticated, async (req,res) => {
  let users
  try {
    users = await User.find()
  } catch {
    users = []
  }
  res.render('index.ejs', {
    users: users
  })
})

app.get('/login', checkNotAuthenticated, (req,res) => {
    res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req,res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req,res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const users = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    })
    users.save()
    res.redirect('/login')
  } catch {
    res.redirect('/register')
  }
})

function checkAuthenticated(req,res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated (req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next ()
}

app.delete('/logout', (req,res) => {
  req.logOut()
  res.redirect('/login')
})

app.listen(8000)
