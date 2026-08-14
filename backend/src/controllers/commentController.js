const crypto = require("crypto");
const db = require("../config/db");

const generateVisitorId = () => {
  return crypto.randomUUID();
};


/*
|--------------------------------------------------------------------------
| Like / Unlike Comment
|--------------------------------------------------------------------------
*/

const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    let visitorId  = generateVisitorId();

    if (!visitorId) {
      visitorId = generateVisitorId();
    }

    // Check comment
    const [comments] = await db.execute(
      `
      SELECT id, like_count
      FROM comments
      WHERE id = ?
      LIMIT 1
      `,
      [commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check existing like
    const [existingLike] = await db.execute(
      `
      SELECT id
      FROM comment_likes
      WHERE comment_id = ?
      AND visitor_id = ?
      LIMIT 1
      `,
      [commentId, visitorId]
    );

    let liked;

    if (existingLike.length > 0) {

      // Unlike
      await db.execute(
        `
        DELETE FROM comment_likes
        WHERE comment_id = ?
        AND visitor_id = ?
        `,
        [commentId, visitorId]
      );

      await db.execute(
        `
        UPDATE comments
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = ?
        `,
        [commentId]
      );

      liked = false;

    } else {

      // Like
      await db.execute(
        `
        INSERT INTO comment_likes
        (
          comment_id,
          visitor_id
        )
        VALUES (?, ?)
        `,
        [commentId, visitorId]
      );

      await db.execute(
        `
        UPDATE comments
        SET like_count = like_count + 1
        WHERE id = ?
        `,
        [commentId]
      );

      liked = true;
    }

    const [[updatedComment]] = await db.execute(
      `
      SELECT like_count
      FROM comments
      WHERE id = ?
      `,
      [commentId]
    );

    return res.status(200).json({
      success: true,
      message: liked
        ? "Comment liked successfully"
        : "Comment unliked successfully",
      data: {
        visitorId,
        liked,
        likeCount: updatedComment.like_count,
      },
    });

  } catch (error) {
    console.error("Like comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to like comment",
    });
  }
};


/*
|--------------------------------------------------------------------------
| Reply To Comment
|--------------------------------------------------------------------------
*/

const createReply = async (req, res) => {
  try {
    const { commentId } = req.params;

    const {
      authorName,
      content,
    } = req.body;

    let visitorId = generateVisitorId();

    if (!visitorId) {
      visitorId = generateVisitorId();
    }

    if (!authorName || !authorName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Author name is required",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot be empty",
      });
    }

    // Find parent comment
    const [parentComments] = await db.execute(
      `
      SELECT
        id,
        blog_id
      FROM comments
      WHERE id = ?
      LIMIT 1
      `,
      [commentId]
    );

    if (parentComments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Parent comment not found",
      });
    }

    const parentComment = parentComments[0];

    // Insert reply
    const [result] = await db.execute(
      `
      INSERT INTO comments
      (
        blog_id,
        parent_id,
        author_name,
        content,
        like_count
      )
      VALUES (?, ?, ?, ?, 0)
      `,
      [
        parentComment.blog_id,
        commentId,
        authorName.trim(),
        content.trim(),
      ]
    );

    const [[reply]] = await db.execute(
      `
      SELECT
        id,
        blog_id,
        parent_id,
        author_name,
        content,
        like_count,
        created_at
      FROM comments
      WHERE id = ?
      `,
      [result.insertId]
    );

    reply.replies = [];

    return res.status(201).json({
      success: true,
      message: "Reply added successfully",
      data: {
        visitorId,
        reply,
      },
    });

  } catch (error) {
    console.error("Create reply error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add reply",
    });
  }
};


module.exports = {
  likeComment,
  createReply,
};