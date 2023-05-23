const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const fetch = require("node-fetch");
// Add this import statement at the top of the file
const { ensureAuthenticated } = require("./auth"); // Replace "./auth" with the correct path to your authentication middleware


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

const movieSchema = new mongoose.Schema({
  username: { type: String, required: true },
  title: { type: String, required: true },
});
const Movie = mongoose.model("Movie", movieSchema);

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
// passport.serializeUser(function (user, done) {
//   done(null, user.id);
// });

// passport.deserializeUser(async function (id, done) {
//   try {
//     const user = await User.findById(id);
//     done(null, user);
//   } catch (err) {
//     done(err);
//   }
// });

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
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

app.post("/login", passport.authenticate("local"), (req, res) => {
  res.status(200).json({ message: "Login successful" });
  console.log("Login successful");
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
      console.log(`Added movie "${title}" to search history of user "${username}"`);
    }
  } catch (err) {
    console.error(`Error adding movie "${movie.title}" to search history of user "${username}": ${err}`);
  }
};


// ...

// Endpoint to check the user session
app.get("/check-session", (req, res) => {
  if (req.user) {
    // User is logged in, return the user information
    res.json({ user: req.user });
  } else {
    // User is not logged in
    res.json({ user: null });
  }
});

// ...





app.post("/reco",ensureAuthenticated, async (req, res) => {
  const { phrase } = req.body;

  if (!req.isAuthenticated() || !req.user || !req.user.username) {
    return res.status(401).send("Unauthorized");
  }

  const username = req.user.username;

  // Retrieve the username from the session
  // const username = req.user.username;

  try {
    // Search for the logged-in user based on the username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send("Invalid username");
    }

    const response = await fetch(
      API_URL +
        `?api_key=${API_KEY}&language=en-US&query=${phrase}&page=1&include_adult=false`
    );
    const data = await response.json();

    const movies = data.results.map((result) => ({
      title: result.title,
    }));

    // Add searched movies to the user's search history
    movies.forEach((movie) => {
      user.searchHistory.push(movie.title);
    });

    await user.save();

    res.send(movies);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching movie data");
  }
});






// app.post("/reco", passport.authenticate("local"), async (req, res) => {
//   const { phrase } = req.body;
//   const user = req.user;

//   try {
//     const response = await fetch(
//       API_URL +
//         `?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(phrase)}&page=1&include_adult=false`
//     );
//     const data = await response.json();

//     const movies = data.results.map((result) => ({
//       title: result.title,
//     }));

//     const username = user.username;
//     console.log("hellooooo", username)

//     res.send(movies);


//     // Save searched movies to the database
//     movies.forEach(async (movie) => {
//       try {
//         await addToHistory(username, movie);
//       } catch (err) {
//         console.error(err);
//       }
//     });

//     console.log(movies);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching movie data");
//   }
// });








// app.post("/reco", passport.authenticate("local"), async (req, res) => {
//   const { phrase } = req.body;
//   const user = req.user;

//   try {
//     const response = await fetch(
//       API_URL +
//         `?api_key=${API_KEY}&language=en-US&query=${phrase}&page=1&include_adult=false`
//     );
//     const data = await response.json();

//     const movies = data.results.map((result) => ({
//       title: result.title,
//     }));

//     const username = user.username;

//     // Save searched movies to the database
//     movies.forEach((movie) => {
//       const newMovie = new Movie({
//         username,
//         title: movie.title,
//       });
//       newMovie.save();
//     });

//     console.log(movies);
//     res.send(movies);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching movie data");
//   }
// });





// app.post("/reco", async (req, res) => {
//   const { phrase } = req.body;
//   const user = req.user;

//   try {
//     const response = await fetch(
//       API_URL +
//         `?api_key=${API_KEY}&language=en-US&query=${phrase}&page=1&include_adult=false`
//     );
//     const data = await response.json();

//     const movies = data.results.map((result) => ({
//       title: result.title,
//     }));

//     const username = user.username;

//     // Save searched movies to the database
//     movies.forEach((movie) => {
//       const newMovie = new Movie({
//         username,
//         title: movie.title,
//       });
//       newMovie.save();
//     });

//     console.log(movies);
//     res.send(movies);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching movie data");
//   }
// });


// app.post("/reco", async (req, res) => {
//   const { phrase } = req.body;
//   const user = req.user;

//   try {
//     const response = await fetch(
//       API_URL +
//         `?api_key=${API_KEY}&language=en-US&query=${phrase}&page=1&include_adult=false`
//     );
//     const data = await response.json();

//     const movies = data.results.map((result) => ({
//       title: result.title,
//     }));

    

//     const username = user.username;
//     console.log("hellooo",username);
//     // Add searched movies to user's search history
//     movies.forEach((movie) => addToHistory(username, movie));
//     console.log(movies);

//     res.send(movies);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error fetching movie data");
//   }
// });





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