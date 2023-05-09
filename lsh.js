// import { Minhash, LshIndex } from 'minhash';
const { Minhash, LshIndex } = require("minhash");
const path = require('path');
const fs = require('fs');

let index = new LshIndex();

    //joining path of directory 
const directoryPath = path.join(__dirname, 'Scripts/');
// const directoryPath = 
//passsing directoryPath and callback function
let filePaths = fs.readdirSync(directoryPath)
let testPath = filePaths.slice(0, 10)
testPath.forEach(function (file){
    let data = fs.readFileSync(directoryPath + '/' + file).toString()
    let text = data.split(" ");
    let m1 = new Minhash();
    index.getHashbands
    text.map(function(w) { m1.update(w) });
    index.insert(file, m1);
    console.log(file)
    // fs.readFileSync(directoryPath + '/' + file, 'utf8', (err, data) => {
    //     if (err) {
    //       console.error(err);
    //       return;
    //     }
    //     let text = data.split(" ");
    //     let m1 = new Minhash();
    //     text.map(function(w) { m1.update(w) });
    //     index.insert(file, m1);
    //     console.log('gagagagagagagagagagagag')
    //   });
})
// fs.readdirSync(directoryPath, function (err, files) {
//     //handling error
//     if (err) {
//         return console.log('Unable to scan directory: ' + err);
//     } 
//     //listing all files using forEach
//     files.forEach(function (file) {
//         fs.readFile(directoryPath + '/' + file, 'utf8', (err, data) => {
//             if (err) {
//               console.error(err);
//               return;
//             }
//             let text = data.split(" ");
//             let m1 = new Minhash();
//             text.map(function(w) { m1.update(w) });
//             index.insert(file, m1);
//             console.log('gagagagagagagagagagagag')
//           });
//     });
// });


// var s1 = ['cats', 'are', 'tall', 'and', 'have', 'been',
// 'known', 'to', 'sing', 'quite', 'loudly'];
var s2 = [ 'Ten', 'Things', 'I', 'Hate', 'About', 'You'];
// var s3 = ['cats', 'are', 'tall', 'and', 'have', 'been',
//         'known', 'to', 'sing', 'quite', 'loudly'];

// // generate a hash for each list of words
// let m1 = new Minhash();
var m2 = new Minhash();
// var m3 = new Minhash();
 
// update each hash
s2.map(function(w) { m2.update(w) });
// s3.map(function(w) { m3.update(w) });
 
// add each document to a Locality Sensitive Hashing index
// index.insert('m2', m2);
// index.insert('m3', m3);
 
// query for documents that appear similar to a query document
index.bandSize
let matches = index.query(m2);
console.log('Jaccard similarity >= 0.5', matches);