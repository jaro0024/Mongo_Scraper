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
            // Notice the (result)
            // This effectively passes the result object to the entry, including the title and link
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

// this will get the articles we scraped from the mongoDB
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

// Grab an article by its ObjectId
router.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter,
    // Prepare a query that finds the matching one in our db...
    Article.findOne({ "_id": req.params.id })
        // and populate all of the notes associated with it.
        .populate("note")
        // now, execute our query
        .exec(function (err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            }
            // Otherwise, send the doc to the browser as a json object
            else {
                res.render("notes", {
                    articles: doc
                });
            }
        });
});

// Replace the existing note of an article with a new one
// or if no note exists for an article, make the posted note its note.
router.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry.
    var newNote = new Note(req.body);
    var currentArticleID = req.params.id;
    // and save the new note the db
    newNote.save(function (err, doc) {
        // log any errors
        if (err) {
            console.log(err);
        }
        // otherwise
        else {
            // using the Article id passed in the id parameter of our url,
            // prepare a query that finds the matching Article in our db
            // and update it to make it"s lone note the one we just saved
            Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
                // execute the above query
                .exec(function (err, doc) {
                    // log any errors
                    if (err) {
                        console.log(err);
                    } else {
                        // or send the document to the browser
                        res.redirect("/articles/" + currentArticleID)
                    }
                });
        }
    });
});

// Saving an article
router.post("/save/:id", function (req, res) {
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
        // Execute the above query
        .exec(function (err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            } else {
                // Or send the user back to the all articles page once saved
                res.redirect("/saved");
            }
        });
})

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
})

//deleting the article form the saved list
router.post("/delete/:id", function (req, res) {
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false })
        // Execute the above query
        .exec(function (err, doc) {
            // Log any errors
            if (err) {
                console.log(err);
            } else {
                //basically.. refresh the page
                res.redirect("/saved");
            }
        });
})

module.exports = router;