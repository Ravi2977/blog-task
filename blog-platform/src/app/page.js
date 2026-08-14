"use client";

import { useEffect, useState, useCallback } from "react";
import WriteBlogButton from "./compoenents/blog/WriteBlogButton";

const API_URL = "http://localhost:5001/api";

const CATEGORIES = [
  "Technology",
  "Programming",
  "AI",
  "Web Development",
  "Database",
  "Design",
  "Business",
  "Lifestyle",
  "Other",
];

// "All" is always first, and matches what the backend treats as no filter
const FILTERS = ["All", ...CATEGORIES];

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function BlogList() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [blogs, setBlogs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true); // first load / category switch
  const [loadingMore, setLoadingMore] = useState(false); // "Load more" click
  const [error, setError] = useState("");

  const fetchBlogs = useCallback(async (category, pageNum, append) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      const params = new URLSearchParams({
        page: pageNum,
        limit: 5,
        category, // backend already treats "All"/"all" as no filter
      });

      const response = await fetch(`${API_URL}/blogs?${params}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to fetch blogs");
      }

      const { blogs: fetchedBlogs, hasMore: more } = result.data;

      setBlogs((current) =>
        append ? [...current, ...fetchedBlogs] : fetchedBlogs
      );
      setHasMore(Boolean(more));
    } catch (err) {
      console.error("Fetch blogs error:", err);
      setError(err.message || "Unable to load blogs.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // refetch from page 1 whenever the category changes
  useEffect(() => {
    setPage(1);
    fetchBlogs(selectedCategory, 1, false);
  }, [selectedCategory, fetchBlogs]);

 const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBlogs(selectedCategory, nextPage, true);
  };

  // auto-load more when user scrolls near bottom
  useEffect(() => {
    const onScroll = () => {
      if (loading || loadingMore || !hasMore) return;

      const scrolledToBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 200; // 200px threshold

      if (scrolledToBottom) {
        handleLoadMore();
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loading, loadingMore, hasMore, page, selectedCategory]);

  return (
    <main className="min-h-screen bg-zinc-50 px-5 ">


        {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">

          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            BlogSpace
          </h1>

          <WriteBlogButton />

        </div>
      </header>
      <div className="mx-auto max-w-6xl py-2">
        <h1 className="text-3xl font-bold text-zinc-900">Blog</h1>
        <p className="mt-2 text-zinc-500">
          Latest posts, guides, and updates.
        </p>

        {/* Category filter buttons */}
        <div className="mt-8 flex flex-wrap gap-2">
          {FILTERS.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Cards */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <BlogCardSkeleton key={i} />
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl">📝</div>
              <p className="mt-4 font-medium text-zinc-800">
                No blogs found
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {selectedCategory === "All"
                  ? "Nothing published yet."
                  : `Nothing in "${selectedCategory}" yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          )}
        </div>

        {/* Load more */}
        {!loading && hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="cursor-pointer rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="cursor-pointer rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}

        {/* End of list message */}
        {!loading && !hasMore && blogs.length > 0 && (
          <div className="mt-10 flex justify-center">
            <p className="text-sm text-zinc-400">You've reached the end </p>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------- blog card ---------- */

function BlogCard({ blog }) {
  return (
    <a
      href={`/blog/${blog.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:shadow-md"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-100">
        {blog.cover_image ? (
          <img
            src={blog.cover_image}
            alt={blog.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-300">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {blog.category && (
          <span className="mb-2 w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
            {blog.category}
          </span>
        )}

        <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-900">
          {blog.title}
        </h2>

        <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-zinc-500">
          <span>{blog.author}</span>
          <span className="text-zinc-300">·</span>
          <span>{formatDate(blog.created_at)}</span>
          {blog.read_minutes ? (
            <>
              <span className="text-zinc-300">·</span>
              <span>{blog.read_minutes} min read</span>
            </>
          ) : null}
        </div>
      </div>
    </a>
  );
}

function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="aspect-[16/9] w-full animate-pulse bg-zinc-200" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-16 animate-pulse rounded-full bg-zinc-200" />
        <div className="h-5 w-full animate-pulse rounded bg-zinc-200" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-200" />
        <div className="h-3 w-32 animate-pulse rounded bg-zinc-200" />
      </div>
    </div>
  );
}