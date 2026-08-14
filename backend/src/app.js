const express = require("express");
const cors = require("cors");

const blogRoutes = require("./routes/blogRoutes");
const commentRoutes = require("./routes/commentRoutes");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Blog backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Blog API is running",
  });
});

app.use("/api/blogs", blogRoutes);

app.use("/api/comments", commentRoutes);

module.exports = app;