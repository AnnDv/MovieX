const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const { Index, Document } = require("flexsearch");
const fs = require("fs");
const index = new Index();

// Folder path
const folderPath = "Scripts/"; // Replace with the actual folder path

async function readFilesFromFolder(folderPath) {
  try {
    const files = await fs.promises.readdir(folderPath);
    const fileData = {};

    await Promise.all(
      files.map(async (file) => {
        const filePath = `${folderPath}/${file}`;
        const fileContent = await fs.promises.readFile(filePath, "utf-8");
        fileData[file] = fileContent;
      })
    );

    console.log("Files read successfully");
    return fileData;
  } catch (err) {
    console.error("Error reading files:", err);
    throw err; // Rethrow the error to handle it at the caller's level
  }
}

// Function to perform the search
async function performSearch(phrase) {
  // Read files and store them in an object

  const searchResults = Array.from(index.search(phrase)); // Convert to array
  return searchResults;
}

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
  userId: { type: String },
});
const User = mongoose.model("User", userSchema);

readFilesFromFolder("Scripts/").then((filesData) => {
  // Add documents to the index
  for (const file in filesData) {
    const movieName = file.replace(".html", "").replace(/[-_]/g, " ").trim();
    index.add(movieName, filesData[file]);
    // console.log(movieName)
  }
});

// create express app
const app = express();
app.use(bodyParser.json());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "movie-app-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.post("/newuser", async (req, res) => {
  const { username, password } = req.body;
  const user = new User({ username, password });

  try {
    await user.save();
    res.json({ userId: user._id }); // Send userId as JSON response
  } catch (err) {
    console.error(err);
    res.status(500).send("Error registering user");
  }
});

// login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid credentials" });
    } else {
      req.session.user = user;
      res.json({ userId: user._id }); // Send the user ID as a JSON response
      console.log("Login successful");
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error during login" });
    console.log("Error during login");
  }
});

// logout endpoint
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.send("Logout successful");
});

const addToHistory = async (username, movie) => {
  try {
    const user = await User.findOne({ username });
    if (user) {
      const title = movie.title;
      if (!user.searchHistory.includes(title)) {
        user.searchHistory.push(title);
        await user.save();
        console.log(
          `Added movie "${title}" to search history of user "${username}"`
        );
      } else {
        console.log(
          `Movie "${title}" already exists in search history of user "${username}"`
        );
      }
    }
  } catch (err) {
    console.error(
      `Error adding movie "${movie.title}" to search history of user "${username}": ${err}`
    );
  }
};

app.post("/reco", async (req, res) => {
  const { phrase, userId } = req.body;

  console.log(req.body);

  try {
    const searchResults = await performSearch(phrase);

    console.log("Search Results:", searchResults);

    for (const movie of searchResults) {
      await addToHistory(userId, { title: movie });
    }

    res.json(searchResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error performing search" });
  }
});

app.get("/history", async (req, res) => {
  const { userId } = req.query;

  console.log(req.query);

  try {
    const user = await User.findById(userId);
    if (user) {
      const history = user.searchHistory;
      res.json({ history });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error retrieving user history" });
  }
});

const PORT = 4040;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
