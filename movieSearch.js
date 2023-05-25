// const FlexSearch = require("flexsearch");
const { Index, Document } = require("flexsearch");

// const FlexSearch = require('flexsearch');
const fs = require("fs");

// Folder path
const folderPath = "Scripts/"; // Replace with the actual folder path

// Function to read files from a folder and store them in an object
async function readFilesFromFolder(folderPath) {
  const files = await fs.promises.readdir(folderPath);
  const fileData = {};

  await Promise.all(
    files.map(async (file) => {
      const filePath = `${folderPath}/${file}`;
      const fileContent = await fs.promises.readFile(filePath, "utf-8");
      fileData[file] = fileContent;
    })
  );

  return fileData;
}

// Function to perform the search
async function performSearch(phrase) {
  // Read files and store them in an object
  const filesData = await readFilesFromFolder(folderPath);

  // Create a new FlexSearch instance
  const index = new Index();

  // Add documents to the index
  for (const file in filesData) {
    const movieName = file
      .replace(".html", "")
      .replace(/[-_]/g, " ")
      .trim();
    index.add(movieName, filesData[file]);
  }
  const searchResults = Array.from(index.search(phrase)); // Convert to array
  return searchResults;
}


module.exports = performSearch;
