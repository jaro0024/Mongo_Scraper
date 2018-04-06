// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoScraper";

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;
// Connect to the Mongo DB
mongoose.connect(MONGODB_URI);

var db = mongoose.connection;

// Port
var PORT = process.env.PORT || 8080;

// Initialize Express
var app = express();

// Configure middleware
// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set Handlebars
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Show any mongoose errors
db.on('error', function (err) {
    console.log('Mongoose Error: ', err);
});

// Once logged in to the db through mongoose, log a success message
db.once('open', function () {
    console.log('Mongoose connection successful.');
});

// Requiring routes
var routes = require("./routes/scraper.js");
// Use home route
app.use('/', routes);

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});