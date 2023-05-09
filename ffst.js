const Lsh = require('lsh-node');

const lsh = new Lsh({
  k: 4, // Number of hash functions
  L: 5, // Number of hash tables
  d: 10, // Dimension of the input vectors
});

// Add some vectors to the index
lsh.index([
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
]);

// Perform a nearest neighbor search
const results = lsh.query([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], {
  maxNumMatches: 2, // Maximum number of matches to return
});

console.log(results);
