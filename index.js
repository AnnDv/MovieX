const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const cors = require("cors");
const { Index, Document } = require("flexsearch");
const fs = require("fs");
const index = new Index();
const jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
require("dotenv").config();
const bcrypt = require("bcryptjs");

const salt = 10;

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
  token: { type: String },
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

app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.jwt || "default_secret_key";

app.post("/newuser", async (req, res) => {
  const { username, password: plainTextPassword } = req.body;
  // res.set("Access-Control-Allow-Origin", "*");
  // res.set("Access-Control-Expose-Headers", "Authorization"); // Expose the Authorization header
  // res.set("Authorization", `Bearer ${token}`); // Set the Authorization header

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const password = await bcrypt.hash(plainTextPassword, salt);

    const user = new User({ username, password });

    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, type: "user" },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      maxAge: 2 * 60 * 60 * 1000,
      httpOnly: true,
    });

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Expose-Headers", "Authorization"); // Expose the Authorization header
    res.set("Authorization", `Bearer ${token}`); // Set the Authorization header

    user.token = token;
    await user.save();

    res.json({ userId: user._id, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error registering user" });
  }
});

const verifyUserLogin = async (username, password) => {
  try {
    const user = await User.findOne({ username }).lean();
    if (!user) {
      return { status: "error", error: "user not found" };
    }
    if (await bcrypt.compare(password, user.password)) {
      // creating a JWT token
      token = jwt.sign(
        { id: user._id, username: user.email, type: "user" },
        JWT_SECRET,
        { expiresIn: "2h" }
      );
      return { status: "ok", data: token };
    }
    return { status: "error", error: "invalid password" };
  } catch (error) {
    console.log(error);
    return { status: "error", error: "timed out" };
  }
};

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const response = await verifyUserLogin(username, password);

    if (response.status === "ok") {
      const token = response.data;

      // Find the user by username and update the token
      await User.findOneAndUpdate({ username }, { token });

      res.cookie("token", token, {
        maxAge: 2 * 60 * 60 * 1000,
        httpOnly: true,
      });

      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Expose-Headers", "Authorization"); // Expose the Authorization header
      res.set("Authorization", `Bearer ${token}`); // Set the Authorization header

      res.json({ success: true, message: "Login successful", token });
      console.log("Login successful");
    } else {
      res.status(401).json({ error: "Invalid credentials" });
      console.log("Login failed");
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
  res.set("Access-Control-Allow-Origin", "*");
  res.send("Logout successful");
});

const addToHistory = async (token, movie) => {
  try {
    const user = await User.findOne({ token: token });

    if (user) {
      const title = movie.title;

      if (!user.searchHistory.includes(title)) {
        user.searchHistory.push(title);
        await user.save();

        console.log(
          `Added movie "${title}" to search history of user with token "${token}"`
        );
      } else {
        console.log(
          `Movie "${title}" already exists in search history of user with token "${token}"`
        );
      }
    } else {
      console.log(`User with token "${token}" not found`);
    }
  } catch (err) {
    console.error(
      `Error adding movie "${movie.title}" to search history of user with token "${token}": ${err}`
    );
  }
};

app.post("/reco", async (req, res) => {
  const { phrase } = req.body;
  res.set("Access-Control-Allow-Origin", "*");
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.substring(14); // Remove the "Bearer " prefix from the token
  console.log(token);

  try {
    const searchResults = await performSearch(phrase);

    console.log("Search Results:", searchResults);

    for (const movie of searchResults) {
      await addToHistory(token, { title: movie });
    }
    res.json(searchResults);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error performing search" });
  }
});

// app.get("/history", async (req, res) => {
//   // const token = req.query.token;
//   res.set("Access-Control-Allow-Origin", "*");
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith("Bearer Bearer ")) {
//     res.status(401).json({ error: "Unauthorized" });
//     return;
//   }

//   // res.set("Access-Control-Allow-Origin", "*");
//   try {
//     const user = await User.findOne({ token: authHeader });
//     if (user) {
//       const history = user.searchHistory;
//       res.json({ history: history });
//     } else {
//       res.status(404).json({ error: "User not found" });
//     }
//   } catch (error) {
//     console.error("Error retrieving user history:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });





app.get("/history", async (req, res) => {
  // const token = req.query.token;
  res.set("Access-Control-Allow-Origin", "*");
  const authHeader = req.headers.authorization;

  console.log(authHeader)

  if (!authHeader || !authHeader.startsWith("Bearer Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // const token = authHeader.substring("Bearer ".length); // Remove the "Bearer " prefix from the token

  const token = authHeader.substring(14); 
  console.log(token)

  try {
    const user = await User.findOne({ token: token });
    if (user) {
      const history = user.searchHistory;
      res.json({ history: history });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error retrieving user history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});





const PORT = 4040;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
