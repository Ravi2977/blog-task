"use client";

import { useEffect, useState } from "react";

const API_URL = "https://fed0-103-173-124-149.ngrok-free.app/api";

export default function CommentsDrawer({
    open,
    onClose,
    blogId,
}) {
    const [comments, setComments] = useState([]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] =
        useState(false);

    const [commentText, setCommentText] =
        useState("");

    const [authorName, setAuthorName] =
        useState("");

    const [replyingTo, setReplyingTo] =
        useState(null);

    const [replyText, setReplyText] =
        useState("");

    const [replyAuthor, setReplyAuthor] =
        useState("");

    const [error, setError] = useState("");


    /*
    |--------------------------------------------------------------------------
    | Fetch Comments
    |--------------------------------------------------------------------------
    */

    const fetchComments = async () => {
        if (!blogId) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_URL}/blogs/${blogId}/comments`,
                {
                    method: "GET",
                    cache: "no-store",
                    headers: {
                        "ngrok-skip-browser-warning": "true",
                    },
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result?.success
            ) {
                throw new Error(
                    result?.message ||
                    "Failed to fetch comments"
                );
            }

            setComments(
                Array.isArray(result.data)
                    ? result.data
                    : []
            );

        } catch (error) {
            console.error(
                "Fetch comments error:",
                error
            );

            setError(
                error.message ||
                "Unable to load comments."
            );

        } finally {
            setLoading(false);
        }
    };


    /*
    |--------------------------------------------------------------------------
    | Fetch when drawer opens
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        if (open && blogId) {
            fetchComments();
        }

    }, [open, blogId]);


    /*
    |--------------------------------------------------------------------------
    | Add Comment
    |--------------------------------------------------------------------------
    */

    const handleAddComment = async () => {

        if (!authorName.trim()) {
            setError("Please enter your name.");
            return;
        }

        if (!commentText.trim()) {
            setError("Please write a comment.");
            return;
        }

        try {

            setSubmitting(true);
            setError("");

            const visitorId =
                localStorage.getItem(
                    "blog_visitor_id"
                );

            const response = await fetch(
                `${API_URL}/blogs/${blogId}/comments`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        ...(visitorId
                            ? { visitorId }
                            : {}),

                        authorName:
                            authorName.trim(),

                        content:
                            commentText.trim(),
                    }),
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result?.success
            ) {
                throw new Error(
                    result?.message ||
                    "Failed to add comment"
                );
            }

            /*
             * Backend generated visitorId
             */
            if (
                result.data?.visitorId
            ) {
                localStorage.setItem(
                    "blog_visitor_id",
                    result.data.visitorId
                );
            }

            /*
             * Add new comment instantly
             */
            if (result.data?.comment) {

                setComments((current) => [
                    ...current,
                    result.data.comment,
                ]);

            } else {
                await fetchComments();
            }

            setCommentText("");

        } catch (error) {

            console.error(
                "Add comment error:",
                error
            );

            setError(
                error.message ||
                "Unable to add comment."
            );

        } finally {
            setSubmitting(false);
        }
    };


    /*
    |--------------------------------------------------------------------------
    | Comment Like
    |--------------------------------------------------------------------------
    */

    const handleCommentLike =
        async (commentId) => {

            try {

                const visitorId =
                    localStorage.getItem(
                        "blog_visitor_id"
                    );

                const response = await fetch(
                    `${API_URL}/comments/${commentId}/like`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(
                            visitorId
                                ? { visitorId }
                                : {}
                        ),
                    }
                );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result?.success
                ) {
                    throw new Error(
                        result?.message ||
                        "Failed to like comment"
                    );
                }

                /*
                 * Save backend generated ID
                 */
                if (
                    result.data?.visitorId
                ) {
                    localStorage.setItem(
                        "blog_visitor_id",
                        result.data.visitorId
                    );
                }

                /*
                 * Update comment tree
                 */
                setComments((current) =>
                    updateCommentTree(
                        current,
                        commentId,
                        (comment) => ({
                            ...comment,

                            liked: Boolean(
                                result.data?.liked
                            ),

                            like_count:
                                Number(
                                    result.data?.likeCount
                                ) || 0,
                        })
                    )
                );

            } catch (error) {

                console.error(
                    "Comment like error:",
                    error
                );

                setError(
                    error.message ||
                    "Unable to like comment."
                );
            }
        };


    /*
    |--------------------------------------------------------------------------
    | Reply
    |--------------------------------------------------------------------------
    */

    const handleReply = async (
        commentId
    ) => {

        if (!replyAuthor.trim()) {
            setError(
                "Please enter your name."
            );
            return;
        }

        if (!replyText.trim()) {
            setError(
                "Please write a reply."
            );
            return;
        }

        try {

            setSubmitting(true);
            setError("");

            const visitorId =
                localStorage.getItem(
                    "blog_visitor_id"
                );

            const response = await fetch(
                `${API_URL}/comments/${commentId}/reply`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        ...(visitorId
                            ? { visitorId }
                            : {}),

                        authorName:
                            replyAuthor.trim(),

                        content:
                            replyText.trim(),
                    }),
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result?.success
            ) {
                throw new Error(
                    result?.message ||
                    "Failed to add reply"
                );
            }

            /*
             * Save backend generated visitorId
             */
            if (
                result.data?.visitorId
            ) {
                localStorage.setItem(
                    "blog_visitor_id",
                    result.data.visitorId
                );
            }

            /*
             * Add reply to tree
             */
            if (result.data?.reply) {

                setComments((current) =>
                    addReplyToComment(
                        current,
                        commentId,
                        result.data.reply
                    )
                );

            } else {
                await fetchComments();
            }

            setReplyText("");
            setReplyingTo(null);

        } catch (error) {

            console.error(
                "Reply error:",
                error
            );

            setError(
                error.message ||
                "Unable to add reply."
            );

        } finally {
            setSubmitting(false);
        }
    };


    if (!open) {
        return null;
    }


    return (
        <>
            {/* Overlay */}

            <div
                onClick={onClose}
                className="fixed inset-0 z-[60] cursor-pointer bg-black/30 backdrop-blur-[2px]"
            />


            {/* Drawer */}

            <aside className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl">

                {/* Header */}

                <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-5">

                    <div>

                        <h2 className="font-semibold text-zinc-900">
                            Comments
                        </h2>

                        <p className="text-xs text-zinc-500">
                            Join the conversation
                        </p>

                    </div>

                    <button
                        onClick={onClose}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xl text-zinc-500 transition hover:bg-zinc-100"
                    >
                        ×
                    </button>

                </div>


                {/* Error */}

                {error && (
                    <div className="mx-4 mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}


                {/* Comments */}

                <div className="flex-1 overflow-y-auto px-5 py-5">

                    {loading ? (

                        <div className="space-y-6">

                            {Array.from({
                                length: 4,
                            }).map((_, index) => (
                                <CommentSkeleton
                                    key={index}
                                />
                            ))}

                        </div>

                    ) : comments.length === 0 ? (

                        <div className="py-20 text-center">

                            <div className="text-4xl">
                                💬
                            </div>

                            <p className="mt-4 font-medium text-zinc-800">
                                No comments yet
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                                Be the first one to comment.
                            </p>

                        </div>

                    ) : (

                        <div className="space-y-7">

                            {comments.map((comment) => (

                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    onLike={
                                        handleCommentLike
                                    }
                                    replyingTo={
                                        replyingTo
                                    }
                                    setReplyingTo={
                                        setReplyingTo
                                    }
                                    replyText={
                                        replyText
                                    }
                                    setReplyText={
                                        setReplyText
                                    }
                                    replyAuthor={
                                        replyAuthor
                                    }
                                    setReplyAuthor={
                                        setReplyAuthor
                                    }
                                    onReply={
                                        handleReply
                                    }
                                    submitting={
                                        submitting
                                    }
                                />

                            ))}

                        </div>

                    )}

                </div>


                {/* Add Comment */}

                <div className="shrink-0 border-t border-zinc-200 bg-white p-4">

                    <input
                        value={authorName}
                        onChange={(e) =>
                            setAuthorName(
                                e.target.value
                            )
                        }
                        placeholder="Your name"
                        className="mb-2 w-full rounded-xl border text-black border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-zinc-400 focus:bg-white"
                    />

                    <textarea
                        value={commentText}
                        onChange={(e) =>
                            setCommentText(
                                e.target.value
                            )
                        }
                        placeholder="Add a comment..."
                        rows={2}
                        className="w-full resize-none rounded-xl text-black border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-zinc-400 focus:bg-white"
                    />

                    <div className="mt-2 flex justify-end">

                        <button
                            onClick={
                                handleAddComment
                            }
                            disabled={
                                submitting ||
                                !commentText.trim() ||
                                !authorName.trim()
                            }
                            className="cursor-pointer rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting
                                ? "Posting..."
                                : "Comment"}
                        </button>

                    </div>

                </div>

            </aside>
        </>
    );
}


/* ========================================================================= */
/* Comment Item */
/* ========================================================================= */

function CommentItem({
    comment,
    onLike,
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    replyAuthor,
    setReplyAuthor,
    onReply,
    submitting,
}) {

    return (
        <div>

            <div className="flex gap-3">

                {/* Avatar */}

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                    {comment.author_name
                        ?.charAt(0)
                        ?.toUpperCase() || "A"}
                </div>


                <div className="min-w-0 flex-1">

                    <p className="text-sm font-semibold text-zinc-900">
                        {comment.author_name}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-zinc-700">
                        {comment.content}
                    </p>


                    {/* Actions */}

                    <div className="mt-2 flex items-center gap-4">

                        <button
                            onClick={() =>
                                onLike(comment.id)
                            }
                            className={`cursor-pointer text-xs font-medium transition ${comment.liked
                                    ? "text-red-500"
                                    : "text-zinc-500 hover:text-zinc-900"
                                }`}
                        >
                            {comment.liked
                                ? "♥"
                                : "♡"}{" "}
                            {comment.like_count || 0}
                        </button>


                        <button
                            onClick={() =>
                                setReplyingTo(
                                    replyingTo ===
                                        comment.id
                                        ? null
                                        : comment.id
                                )
                            }
                            className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-900"
                        >
                            Reply
                        </button>

                    </div>


                    {/* Reply Input */}

                    {replyingTo === comment.id && (

                        <div className="mt-3">

                            <input
                                value={replyAuthor}
                                onChange={(e) =>
                                    setReplyAuthor(
                                        e.target.value
                                    )
                                }
                                placeholder="Your name"
                                className="mb-2 w-full rounded-xl  text-black border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white"
                            />

                            <textarea
                                value={replyText}
                                onChange={(e) =>
                                    setReplyText(
                                        e.target.value
                                    )
                                }
                                placeholder={`Reply to ${comment.author_name}...`}
                                rows={2}
                                className="w-full resize-none  text-black rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:bg-white"
                            />

                            <div className="mt-2 flex justify-end gap-2">

                                <button
                                    onClick={() => {
                                        setReplyingTo(null);
                                        setReplyText("");
                                    }}
                                    className="cursor-pointer rounded-full px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={() =>
                                        onReply(comment.id)
                                    }
                                    disabled={
                                        submitting ||
                                        !replyText.trim() ||
                                        !replyAuthor.trim()
                                    }
                                    className="cursor-pointer rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {submitting
                                        ? "Replying..."
                                        : "Reply"}
                                </button>

                            </div>

                        </div>

                    )}

                </div>

            </div>


            {/* Nested Replies */}

            {comment.replies?.length > 0 && (

                <div className="ml-12 mt-5 space-y-5 border-l border-zinc-200 pl-4">

                    {comment.replies.map(
                        (reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                onLike={onLike}
                                replyingTo={
                                    replyingTo
                                }
                                setReplyingTo={
                                    setReplyingTo
                                }
                                replyText={
                                    replyText
                                }
                                setReplyText={
                                    setReplyText
                                }
                                replyAuthor={
                                    replyAuthor
                                }
                                setReplyAuthor={
                                    setReplyAuthor
                                }
                                onReply={
                                    onReply
                                }
                                submitting={
                                    submitting
                                }
                            />
                        )
                    )}

                </div>

            )}

        </div>
    );
}


/* ========================================================================= */
/* Helpers */
/* ========================================================================= */

function updateCommentTree(
    comments,
    commentId,
    updater
) {
    return comments.map(
        (comment) => {

            if (
                comment.id === commentId
            ) {
                return updater(comment);
            }

            if (
                comment.replies?.length
            ) {
                return {
                    ...comment,
                    replies:
                        updateCommentTree(
                            comment.replies,
                            commentId,
                            updater
                        ),
                };
            }

            return comment;
        }
    );
}


function addReplyToComment(
    comments,
    commentId,
    reply
) {
    return comments.map(
        (comment) => {

            if (
                comment.id === commentId
            ) {
                return {
                    ...comment,
                    replies: [
                        ...(comment.replies || []),
                        reply,
                    ],
                };
            }

            if (
                comment.replies?.length
            ) {
                return {
                    ...comment,
                    replies:
                        addReplyToComment(
                            comment.replies,
                            commentId,
                            reply
                        ),
                };
            }

            return comment;
        }
    );
}


/* ========================================================================= */
/* Skeleton */
/* ========================================================================= */

function CommentSkeleton() {
    return (
        <div className="flex gap-3">

            <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200" />

            <div className="flex-1 space-y-2">

                <div className="h-3 w-24 animate-pulse rounded bg-zinc-200" />

                <div className="h-4 w-full animate-pulse rounded bg-zinc-200" />

                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />

            </div>

        </div>
    );
}
