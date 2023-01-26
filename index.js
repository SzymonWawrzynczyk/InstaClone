const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
var bodyParser = require('body-parser');
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
var passportLocalMongoose = require('passport-local-mongoose');
const nodemailer = require("nodemailer");
var LocalStrategy = require('passport-local').Strategy;


const app = express();

function generateRandomString() {
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomString = "";
    for (let i = 0; i < 10; i++) {
      let randomIndex = Math.floor(Math.random() * characters.length);
      randomString += characters[randomIndex];
    }
    return randomString;
  }

  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
  
    res.redirect('/login')
  }
  
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/')
    }
    next()
  }


app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: "process.env.SESSION_SECRET",
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))



app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())


// Connect to MongoDB
mongoose.connect('mongodb://localhost/mydb', { useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId; 

// Define a simple schema for our data
const userSchema = new Schema({
    ID: {
        type: String,
        required: true,
        unique: true
      },
    picture: {
        type: String,
        required: true
      },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

const postSchema = new Schema({
  ID: {
    type: String,
    required: true
  },
    ownerId: {
      type: String,
      required: true
    },
    image: {
      type: String
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

userSchema.plugin(passportLocalMongoose);
// Compile the schema into a model
const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);

passport.use(new LocalStrategy({ // or whatever you want to use
  usernameField: 'email',    // define the parameter in req.body that passport can use as username and password
  passwordField: 'password'
},
  // function of username, password, done(callback)
  function(username, password, done) {
    // look for the user data
    User.findOne({ email: username }, function (err, user) {
      // if there is an error
      if (err) { return done(err); }
      // if user doesn't exist
      if (!user) { return done(null, false, { message: 'User not found.' }); }
      // if the password isn't correct
      if (user.password != password) { return done(null, false, {   
      message: 'Invalid password.' }); }
      // if the user is properly authenticated
      return done(null, user);
    });
  }
));
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: "aaa@gmail.com", // Email do własnego wstawienia
    pass: "123412341234", // Hasło do własnego wstawienia
  },
});


// PATH!!!

app.get('/', (req,res)=>{
  console.log(req.isAuthenticated())
    res.render("index.ejs",{isLoggedIn: req.isAuthenticated()})
})


app.get('/users', (req, res) => {
    User.find((err, users) => {
        if (err) return console.error(err);
        res.render('users.ejs', { users: users,isLoggedIn: req.isAuthenticated() });
    });
});

app.get('/users/:id', (req, res) => {
    User.findOne({ ID: req.params.id }, (err, user) => {
        if (err) {
          // handle error
          res.send("Nothing found")
        } else {
            Post.find({ ownerId: user.ID }, (err, posts) =>{
                if (err) {
                    // handle error
                    res.send("Nothing found")
                  } else{
          res.render('user.ejs', { user: user, posts:posts,isLoggedIn: req.isAuthenticated() });
                  }
                })
        }
      });
});

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('userform.ejs',{title: "user form",isLoggedIn: req.isAuthenticated()});
});

app.get('/contactform',  (req, res) => {
  res.render('contactform.ejs',{title: "contact form",isLoggedIn: req.isAuthenticated()});
});

app.post('/contactform', (req, res) => {
  let info = transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: "wawrzynczykszymon@gmail.com", // list of receivers
    subject: req.body.subject, // Subject line
    text: "from: "+req.body.name+"\n email: "+req.body.email+"\n message:"+req.body.message, // plain text body
  });

  res.redirect('/')
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs',{title: "login form",isLoggedIn: req.isAuthenticated()});
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.post('/register', checkNotAuthenticated, (req, res) => {

    const user = new User({ ID: generateRandomString(), name: req.body.name, email: req.body.email, description: req.body.description, password: req.body.password,
picture: req.body.picture});
     
    user.save((err, doc) => {
          if (!err){
              res.redirect('/');
          }else{
              console.log('Error during record insertion : ' + err);
          }
    });
 
  }
);


app.get('/posts', checkAuthenticated, (req, res) => {
  Post.find((err, posts) => {
    if (err) return console.error(err);
    res.render('posts.ejs', { posts: posts,isLoggedIn: req.isAuthenticated() });
});
});


app.get('/posts/form', checkAuthenticated, (req, res) => {
    res.render('postform.ejs', { title: "post form",isLoggedIn: req.isAuthenticated() });
});

app.post('/posts/form', checkAuthenticated, (req, res) => {
  console.log(req.user)
  const post = new Post({ ID: "post"+generateRandomString(), ownerId: req.user.ID, title: req.body.title, description: req.body.description,
  image: req.body.image});
       
      post.save((err, doc) => {
            if (!err){
                res.send("Post save successful!")
            }else{
                console.log('Error during record insertion : ' + err);
            }
      });
   
});

app.get('/posts/:id', (req, res) => {
  Post.findOne({ ID: req.params.id }, (err, post) => {
    if (err) {
      // handle error
      res.send("Nothing found")
    } else {
      res.render('post.ejs', {post:post,isLoggedIn: req.isAuthenticated() });
    }
  });    
});


app.get('/search', (req, res) => {
    //res.send("response "+req.query.search)
    User.find({ name: { $regex: req.query.search } }, (err, users) => {
      if (err) {
        // handle error
        res.send("Nothing found")
      } else {
        res.render('users.ejs', {users:users,isLoggedIn: req.isAuthenticated() });
      }
    });
});


app.listen(3004, () => {
    console.log('Example app listening on port 3000!');
});
