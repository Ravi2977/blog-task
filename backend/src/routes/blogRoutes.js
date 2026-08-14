const express = require("express");

const {
  createBlog,
  getBlogs,
  getBlogBySlug,
} = require("../controllers/blogController");

const {
  likeBlog,
  getBlogComments,
  createComment,
} = require("../controllers/blogInteractionController");

const router = express.Router();

router.post("/", createBlog);

router.get("/", getBlogs);

router.get("/:slug", getBlogBySlug);

// Blog Like
router.post("/:blogId/like", likeBlog);


// Comments
router.get("/:blogId/comments", getBlogComments);

router.post("/:blogId/comments", createComment);


module.exports = router;