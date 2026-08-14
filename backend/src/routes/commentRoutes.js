const express = require("express");

const router = express.Router();

const {
  likeComment,
  createReply,
} = require("../controllers/commentController");


router.post("/:commentId/like", likeComment);

router.post("/:commentId/reply", createReply);


module.exports = router;