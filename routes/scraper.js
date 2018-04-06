// Dependencies
var express = require("express");
var router = express.Router();
var request = require("request");
var cheerio = require("cheerio");

// Requiring models
var Note = require("../models/Note.js");
var Article = require("../models/Article.js");

// This will get the index.html to show
router.get("/", function (req, res) {
    res.render("index");
});

// This will get the articles scraped and saved in db and show them in list
router.get("/scrape", function (req, res) {
    // First, we grab the body of the html with request
    request("http://www.nytimes.com/", function (error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);

        // Now, we grab every h2 within an article tag, and do the following:
        $("article h2").each(function (i, element) {

            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this).children("a").text();
            result.link = $(this).children("a").attr("href");

            // Create a new ArticleSchema entry
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

// This will get the articles we scraped from the mongoDB
router.get("/articles", function (req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function (err, doc) {
        // Log any errors
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
    // Query that finds the article by id in DB
    Article.findOne({ "_id": req.params.id })
        // Populate all of the notes associated with it
        .populate("note")
        // Execute query
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
router.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry.
    var newNote = new Note(req.body);
    var currentArticleID = req.params.id;
    // and save the new note the db
    newNote.save(function(err, doc) {
      // log any errors
      if (err) {
        console.log(err);
      }
      // otherwise
      else {
        // Query that finds the article by id in DB and update it to make it's lone note the one we just saved
        Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
          // execute the above query
          .exec(function(err, doc) {
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
  router.post("/save/:id", function(req, res) {
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
      // Execute the above query
      .exec(function(err, doc) {
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
  router.get("/saved", function(req, res) {
    // Grab every saved article in Articles db
    Article.find({ "saved": true}, function(err, doc) {
      if (err) {
        console.log(err);
      } else {
        res.render("saved", {
          allArticles: doc
        });
      }
    });
  })
  
  // Deleting the article form the saved list
  router.post("/delete/:id", function(req, res) {
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
            console.log(err);
        } else {
          // refresh the page
          res.redirect("/saved");
        }
      });
  })
  
  module.exports = router;