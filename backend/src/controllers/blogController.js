const db = require("../config/db");

const createBlog = async (req, res) => {
    try {
        const {
            title,
            author,
            coverImage,
            category,
            blocks,
            seo,
            readMinutes,
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Blog title is required",
            });
        }

        if (!category || !category.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category is required",
            });
        }

        if (!author || !author.trim()) {
            return res.status(400).json({
                success: false,
                message: "Author is required",
            });
        }

        if (!Array.isArray(blocks)) {
            return res.status(400).json({
                success: false,
                message: "Blocks must be an array",
            });
        }

        const slug = seo?.slug || createSlug(title);

        const metaTitle = seo?.metaTitle || title;

        const metaDescription = seo?.metaDescription || null;

        const keywords = seo?.keywords || [];

        const [result] = await db.execute(
            `
  INSERT INTO blogs
  (
    title,
    author,
    category,
    slug,
    cover_image,
    blocks,
    meta_title,
    meta_description,
    keywords,
    read_minutes
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
            [
                title.trim(),
                author.trim(),
                category.trim(),
                slug,
                coverImage || null,
                JSON.stringify(blocks),
                metaTitle,
                metaDescription,
                JSON.stringify(keywords),
                readMinutes || 1,
            ]
        );

        const [rows] = await db.execute(
            `
      SELECT *
      FROM blogs
      WHERE id = ?
      `,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            data: rows[0],
        });
    } catch (error) {
        console.error("Create blog error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create blog",
        });
    }
};


const getBlogs = async (req, res) => {
    try {
        const page = Math.max(
            parseInt(req.query.page) || 1,
            1
        );

        const limit = Math.min(
            parseInt(req.query.limit) || 20,
            50
        );

        const offset = (page - 1) * limit;

        // "all" (or no category sent) means no filter at all
        const category = req.query.category?.trim();
        const isAllCategories =
            !category || category.toLowerCase() === "all";

        const whereClause = isAllCategories ? "" : "WHERE category = ?";
        const queryParams = isAllCategories ? [] : [category];

        const [blogs] = await db.query(
            `
  SELECT
    id,
    title,
    author,
    category,
    slug,
    cover_image,
    read_minutes,
    like_count,
    created_at
  FROM blogs
  ${whereClause}
  ORDER BY created_at DESC
  LIMIT ${limit} OFFSET ${offset}
  `,
            queryParams
        );

        const [[countResult]] = await db.query(
            `
      SELECT COUNT(*) AS total
      FROM blogs
      ${whereClause}
      `,
            queryParams
        );

        const total = countResult.total;

        res.status(200).json({
            success: true,
            data: {
                blogs,
                page,
                limit,
                total,
                hasMore: offset + blogs.length < total,
                category: isAllCategories ? "all" : category,
            },
        });
    } catch (error) {
        console.error("Get blogs error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch blogs",
        });
    }
};


const getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const [rows] = await db.execute(
            `
      SELECT *
      FROM blogs
      WHERE slug = ?
      LIMIT 1
      `,
            [slug]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0],
        });
    } catch (error) {
        console.error("Get blog error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch blog",
        });
    }
};


const createSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 75);
};


module.exports = {
    createBlog,
    getBlogs,
    getBlogBySlug,
};