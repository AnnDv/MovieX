const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const fetch = require("node-fetch");

const API_KEY = "8b853ea22b2da094a00861a8d60da1e6";
const API_URL = "https://api.themoviedb.org/3/search/movie";

// connect to MongoDB Compass
mongoose
  .connect("mongodb://localhost/movie-app", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error(err));

// define user schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  searchHistory: [{ type: String }],
});
const User = mongoose.model("User", userSchema);

passport.use(
  new LocalStrategy(async function (username, password, done) {
    try {
      const user = await User.findOne({ username: username });
      if (!user) {
        return done(null, false);
      }
      if (user.password !== password) {
        return done(null, false);
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// create express app
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "movie-app-secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// new user registration endpoint
app.post("/newuser", async (req, res) => {
  const { username, password } = req.body;
  const user = new User({ username, password });
  try {
    await user.save();
    res.send("User registered successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error registering user");
  }
});

// login endpoint
app.post("/login", passport.authenticate("local"), (req, res) => {
  res.send("Login successful");
});

// logout endpoint
app.post("/logout", (req, res) => {
  req.logout();
  res.send("Logout successful");
});

const addToHistory = async (username, movie) => {
  try {
    const user = await User.findOne({ username });
    if (user) {
      const title = movie.title;
      user.searchHistory.push(title);
      await user.save();
      console.log(
        `Added movie "${title}" to search history of user "${username}"`
      );
    }
  } catch (err) {
    console.error(
      `Error adding movie "${movie.title}" to search history of user "${username}": ${err}`
    );
  }
};

app.post("/reco", async (req, res) => {
  const { phrase } = req.body;
  const user = req.user;

  try {
    const response = await fetch(
      API_URL +
        `?api_key=${API_KEY}&language=en-US&query=${phrase}&page=1&include_adult=false`
    );
    const data = await response.json();
    // let title = [];
    const movies = data.results.original_title;

    const title = data.results.map((result) => ({
      title: result.title,
    }));

    const username = req.user.username;
    // Add searched movies to user's search history
    title.forEach((movieTitle) => addToHistory(username, movieTitle));
    res.send(title);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching movie data");
  }
});

app.get("/history", (req, res) => {
  const userId = req.user._id;

  User.findById(userId)
    .then((history) => {
      res.json(history);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Error fetching search history");
    });
});

const PORT = 4040;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
