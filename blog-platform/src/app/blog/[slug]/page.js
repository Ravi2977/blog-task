"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CommentsDrawer from "@/app/compoenents/blog/CommentsDrawer";

const API_URL = "http://localhost:5001/api/blogs";

export default function ReadBlogPage({ params }) {
  const [blog, setBlog] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [commentsOpen, setCommentsOpen] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [likeError, setLikeError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Fetch Blog
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        setError("");

        const { slug } = await params;

        const response = await fetch(
          `${API_URL}/${encodeURIComponent(slug)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        let result = null;

        try {
          result = await response.json();
        } catch {
          throw new Error("Invalid server response");
        }

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message || "Failed to load blog"
          );
        }

        if (!result.data) {
          throw new Error("Blog data not found");
        }

        setBlog(result.data);
        setLikeCount(
          Number(result.data.like_count) || 0
        );

      } catch (error) {
        console.error("Failed to fetch blog:", error);

        setError(
          error.message ||
            "Unable to load this blog. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [params]);


  /*
  |--------------------------------------------------------------------------
  | Blog Like / Unlike
  |--------------------------------------------------------------------------
  */

  const handleLike = async () => {
    if (!blog || likeLoading) {
      return;
    }

    try {
      setLikeLoading(true);
      setLikeError("");

      const visitorId =
        localStorage.getItem("blog_visitor_id");

      const response = await fetch(
        `${API_URL}/${blog.id}/like`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            visitorId
              ? { visitorId }
              : {}
          ),
        }
      );

      let result = null;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "Invalid server response"
        );
      }

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            "Failed to update like"
        );
      }

      /*
       * Backend generates visitorId
       * on first interaction.
       */
      if (result.data?.visitorId) {
        localStorage.setItem(
          "blog_visitor_id",
          result.data.visitorId
        );
      }

      setLiked(
        Boolean(result.data?.liked)
      );

      setLikeCount(
        Number(result.data?.likeCount) || 0
      );

    } catch (error) {
      console.error(
        "Blog like error:",
        error
      );

      setLikeError(
        error.message ||
          "Unable to update like."
      );

    } finally {
      setLikeLoading(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return <BlogLoading />;
  }


  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (error || !blog) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-5">

        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl">
            !
          </div>

          <h1 className="mt-5 text-2xl font-bold text-zinc-900">
            Unable to load blog
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {error ||
              "The blog you're looking for doesn't exist."}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Back to blogs
          </Link>

        </div>

      </main>
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Parse Blocks
  |--------------------------------------------------------------------------
  */

  let blocks = [];

  try {
    blocks =
      typeof blog.blocks === "string"
        ? JSON.parse(blog.blocks)
        : blog.blocks;

    if (!Array.isArray(blocks)) {
      blocks = [];
    }
  } catch (error) {
    console.error(
      "Failed to parse blog blocks:",
      error
    );

    blocks = [];
  }


  return (
    <main className="min-h-screen bg-zinc-50">

      {/* Header */}

      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">

        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">

          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-zinc-900"
          >
            BlogSpace
          </Link>

          <button
            onClick={() =>
              setCommentsOpen(true)
            }
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            <span>💬</span>
            Comments
          </button>

        </div>

      </header>


      {/* Blog */}

      <article className="mx-auto max-w-4xl px-5 py-10 lg:px-8">

        {/* Cover */}

        {blog.cover_image && (
          <div className="relative mb-10 h-[280px] overflow-hidden rounded-3xl bg-zinc-200 sm:h-[400px]">

            <Image
              src={blog.cover_image}
              alt={blog.title}
              fill
              unoptimized
              priority
              className="object-cover"
            />

          </div>
        )}


        {/* Blog Header */}

        <div className="mb-10">

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500">

            {blog.category && (
              <>
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
                  {blog.category}
                </span>

                <span>•</span>
              </>
            )}

            <span>
              {formatDate(blog.created_at)}
            </span>

            <span>•</span>

            <span>
              {blog.read_minutes || 1} min read
            </span>

          </div>


          <h1 className="text-4xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
            {blog.title}
          </h1>


          {/* Author */}

          <div className="mt-6 flex items-center border-b border-zinc-200 pb-6">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {blog.author
                  ?.charAt(0)
                  ?.toUpperCase() || "A"}
              </div>

              <div>

                <p className="text-sm font-semibold text-zinc-900">
                  {blog.author}
                </p>

                <p className="text-xs text-zinc-500">
                  Author
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* Blog Content */}

        <div className="blog-content">

          {blocks.length > 0 ? (
            blocks.map((block, index) => (
              <BlogBlock
                key={index}
                block={block}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-sm text-zinc-500">
                This blog has no readable content.
              </p>
            </div>
          )}

        </div>


        {/* Interaction */}

        <div className="mt-12 border-y border-zinc-200 py-5">

          <div className="flex items-center justify-between">

            <button
              onClick={handleLike}
              disabled={likeLoading}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <span
                className={`text-2xl transition ${
                  liked
                    ? "text-red-500"
                    : "text-zinc-500"
                }`}
              >
                {liked ? "♥" : "♡"}
              </span>

              <span className="text-zinc-700">
                {likeCount}
              </span>

              {likeLoading && (
                <span className="text-xs text-zinc-400">
                  Updating...
                </span>
              )}

            </button>


            <button
              onClick={() =>
                setCommentsOpen(true)
              }
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              <span className="text-xl">
                💬
              </span>

              Comments
            </button>

          </div>


          {/* Like Error */}

          {likeError && (
            <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {likeError}
            </div>
          )}

        </div>

      </article>


      {/* Comments */}

      <CommentsDrawer
        open={commentsOpen}
        onClose={() =>
          setCommentsOpen(false)
        }
        blogId={blog.id}
      />

    </main>
  );
}


/* ========================================================================= */
/* Blog Block */
/* ========================================================================= */

function BlogBlock({ block }) {

  if (!block) {
    return null;
  }


  /* Paragraph */

  if (block.type === "paragraph") {
    return (
      <p className="mb-6 text-lg leading-8 text-zinc-700">
        {block.text}
      </p>
    );
  }


  /* Heading */

  if (block.type === "heading") {
    return (
      <h2 className="mb-5 mt-10 text-3xl font-bold leading-tight text-zinc-950">
        {block.text}
      </h2>
    );
  }


  /* Image */

  if (
    block.type === "image" &&
    block.imageUrl
  ) {
    return (
      <figure
        className="my-10"
        style={{
          width: `${block.width || 100}%`,
          marginLeft:
            block.align === "right"
              ? "auto"
              : "0",
          marginRight:
            block.align === "center"
              ? "auto"
              : "0",
        }}
      >

        <img
          src={block.imageUrl}
          alt={block.alt || ""}
          className="w-full rounded-2xl"
        />

        {block.alt && (
          <figcaption className="mt-2 text-center text-xs text-zinc-400">
            {block.alt}
          </figcaption>
        )}

      </figure>
    );
  }


  /* Image + Text */

  if (
    block.type === "image-text" &&
    block.imageUrl
  ) {

    const imageLeft =
      block.imagePosition !== "right";

    return (
      <div
        className={`my-10 flex flex-col items-center gap-8 md:flex-row ${
          imageLeft
            ? ""
            : "md:flex-row-reverse"
        }`}
      >

        <div
          className="w-full md:w-[45%]"
          style={{
            flexBasis: `${
              block.width || 45
            }%`,
          }}
        >

          <img
            src={block.imageUrl}
            alt={block.alt || ""}
            className="w-full rounded-2xl"
          />

        </div>

        <div className="flex-1">

          <p className="text-lg leading-8 text-zinc-700">
            {block.text}
          </p>

        </div>

      </div>
    );
  }


  return null;
}


/* ========================================================================= */
/* Date */
/* ========================================================================= */

function formatDate(date) {

  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
}


/* ========================================================================= */
/* Loading */
/* ========================================================================= */

function BlogLoading() {

  return (
    <main className="min-h-screen bg-zinc-50">

      <header className="border-b border-zinc-200 bg-white">

        <div className="mx-auto h-16 max-w-7xl px-5" />

      </header>


      <div className="mx-auto max-w-4xl px-5 py-10">

        <div className="h-[400px] animate-pulse rounded-3xl bg-zinc-200" />

        <div className="mt-8 space-y-4">

          <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />

          <div className="h-12 w-4/5 animate-pulse rounded bg-zinc-200" />

          <div className="h-4 w-32 animate-pulse rounded bg-zinc-200" />

        </div>

      </div>

    </main>
  );
}