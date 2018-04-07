// Dependencies
var express = require("express");
var router = express.Router();
var request = require("request");
var cheerio = require("cheerio");

var Note = require("../models/Note.js");
var Article = require("../models/Article.js");

router.get("/", function (req, res) {
    res.render("index");
});

// Scraping website to get articles
router.get("/scrape", function (req, res) {
    // Grab the body of the html with request
    request("http://www.nytimes.com/", function (error, response, html) {
        // Save the grabbed html into cheerio via $ selector
        var $ = cheerio.load(html);
        // Grab every h2 within an article tag, and do the following:
        $("article h2").each(function (i, element) {

            // Create an empty "result" object
            var result = {};

            // Save each text and href as properties of "result" object
            result.title = $(this).children("a").text();
            result.link = $(this).children("a").attr("href");

            // Create a new ArticleSchema entry
            // This passes the result object to the entry, including the title and link
            var entry = new Article(result);

            // Save that entry to the db
            entry.save(function (err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                // Else log the doc
                else {
                    console.log(doc);
                }
            });
        });
    });
    res.redirect("/articles");
});

// Getting the articles we scraped from the mongoDB
router.get("/articles", function (req, res) {
    // grab every doc in the Articles array
    Article.find({}, function (err, doc) {
        // log any errors
        if (err) {
            console.log(err);
        }
        // or send the doc to the browser as a json object
        else {
            res.render("articles", {
                allArticles: doc
            });
        }
    });
});

// Saving an article
router.post("/save/:id", function (req, res) {
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true }, function (err, doc) {
        // Log any errors
        if (err) {
            console.log(err);
        } else {
            // Or send the user back to the all articles page once saved
            res.redirect("/saved");
        }
    })
});

// Showing saved articles
router.get("/saved", function (req, res) {
    // Grab every saved article in Articles db
    Article.find({ "saved": true }, function (err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.render("saved", {
                allArticles: doc
            });
        }
    });
});

// Delete a saved article
router.post("/delete/:id", function (req, res) {
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false }, function (err, doc) {
        // Log any errors
        if (err) {
            console.log(err);
        } else {
            //basically.. refresh the page
            res.redirect("/saved");
        }
    });
})

// Grab an article by its ObjectId
router.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter,
    // Prepare a query that finds the matching one in our db...
    Article.findOne({ "_id": req.params.id })
        // and populate all of the notes associated with it.
        .populate("notes")
        // now, execute our query
        .exec(function (err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                res.json(doc);
            }
        });
});

// Create a new note or replace an existing note
router.post("/articles/:id", function (req, res) {

    // Create a new note and pass the req.body to the entry
    var newNote = new Note(req.body);
    // And save the new note the db
    newNote.save(function (error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        else {
            // Use the article id to find it and then push note
            Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { notes: doc._id } }, { new: true, upsert: true })
                .populate("notes")
                .exec(function (err, doc) {
                    if (err) {
                        console.log("Cannot find article.");
                    } else {
                        console.log(doc);
                        res.send(doc);
                    }
                });
        }
    });
});

// Delete a note
router.get("/notes/:id", function (req, res) {
    Note.findOneAndRemove({ "_id": req.params.id }, function (err, doc) {
        if (err) {
            console.log("Not able to delete:" + err);
        } else {
            res.send(doc);
        }

    });
});

module.exports = router;