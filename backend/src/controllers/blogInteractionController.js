const crypto = require("crypto");
const db = require("../config/db");

const generateVisitorId = () => {
  return crypto.randomUUID();
};

/*
|--------------------------------------------------------------------------
| Like / Unlike Blog
|--------------------------------------------------------------------------
*/

const likeBlog = async (req, res) => {
  try {
    const { blogId } = req.params;

    const visitorId =generateVisitorId();

    // Check blog
    const [blogs] = await db.execute(
      `
      SELECT id, like_count
      FROM blogs
      WHERE id = ?
      LIMIT 1
      `,
      [blogId]
    );

    if (blogs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Check existing like
    const [existingLike] = await db.execute(
      `
      SELECT id
      FROM blog_likes
      WHERE blog_id = ?
      AND visitor_id = ?
      LIMIT 1
      `,
      [blogId, visitorId]
    );

    let liked;

    if (existingLike.length > 0) {
      // Unlike
      await db.execute(
        `
        DELETE FROM blog_likes
        WHERE blog_id = ?
        AND visitor_id = ?
        `,
        [blogId, visitorId]
      );

      await db.execute(
        `
        UPDATE blogs
        SET like_count = GREATEST(like_count - 1, 0)
        WHERE id = ?
        `,
        [blogId]
      );

      liked = false;
    } else {
      // Like
      await db.execute(
        `
        INSERT INTO blog_likes
        (
          blog_id,
          visitor_id
        )
        VALUES (?, ?)
        `,
        [blogId, visitorId]
      );

      await db.execute(
        `
        UPDATE blogs
        SET like_count = like_count + 1
        WHERE id = ?
        `,
        [blogId]
      );

      liked = true;
    }

    const [[updatedBlog]] = await db.execute(
      `
      SELECT like_count
      FROM blogs
      WHERE id = ?
      `,
      [blogId]
    );

    return res.status(200).json({
      success: true,
      message: liked
        ? "Blog liked successfully"
        : "Blog unliked successfully",
      data: {
        visitorId,
        liked,
        likeCount: updatedBlog.like_count,
      },
    });

  } catch (error) {
    console.error("Like blog error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to like blog",
    });
  }
};


/*
|--------------------------------------------------------------------------
| Get Blog Comments
|--------------------------------------------------------------------------
*/

const getBlogComments = async (req, res) => {
  try {
    const { blogId } = req.params;

    const [comments] = await db.execute(
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
      WHERE blog_id = ?
      ORDER BY created_at ASC
      `,
      [blogId]
    );

    const commentMap = new Map();
    const rootComments = [];

    comments.forEach((comment) => {
      comment.replies = [];

      commentMap.set(comment.id, comment);
    });

    comments.forEach((comment) => {

      if (comment.parent_id) {

        const parent = commentMap.get(
          comment.parent_id
        );

        if (parent) {
          parent.replies.push(comment);
        }

      } else {
        rootComments.push(comment);
      }
    });

    return res.status(200).json({
      success: true,
      data: rootComments,
    });

  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
    });
  }
};


/*
|--------------------------------------------------------------------------
| Create Comment
|--------------------------------------------------------------------------
*/

const createComment = async (req, res) => {
  try {
    const { blogId } = req.params;

    const {
      authorName,
      content,
    } = req.body;

    let { visitorId } = req.body;

    // Generate visitor ID
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
        message: "Comment cannot be empty",
      });
    }

    // Check blog
    const [blogs] = await db.execute(
      `
      SELECT id
      FROM blogs
      WHERE id = ?
      LIMIT 1
      `,
      [blogId]
    );

    if (blogs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

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
      VALUES (?, NULL, ?, ?, 0)
      `,
      [
        blogId,
        authorName.trim(),
        content.trim(),
      ]
    );

    const [[comment]] = await db.execute(
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

    comment.replies = [];

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: {
        visitorId,
        comment,
      },
    });

  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add comment",
    });
  }
};


module.exports = {
  likeBlog,
  getBlogComments,
  createComment,
};