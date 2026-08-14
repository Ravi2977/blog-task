"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";

/* ---------- helpers ---------- */

const DRAFT_KEY = "blog_editor_draft_v1";
const AUTOSAVE_DELAY_MS = 600;
const CREATE_BLOG_API_URL = "https://fed0-103-173-124-149.ngrok-free.app/api/blogs"; // change to your full backend URL if it's on a different origin

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

let idCounter = 0;
const newId = () => `blk_${Date.now()}_${idCounter++}`;

const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const WIDTH_PRESETS = [25, 50, 75, 100];

const slugify = (text) =>
    text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 75);

const wordsIn = (text) => (text?.trim() ? text.trim().split(/\s+/).length : 0);

function countLabel(len, ideal, max) {
    if (len === 0) return "text-zinc-300";
    if (len > max) return "text-red-500";
    if (len < ideal) return "text-amber-500";
    return "text-emerald-600";
}

function AutoTextarea({ value, onChange, placeholder, className }) {
    const ref = useRef(null);

    const resize = (el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    };

    return (
        <textarea
            ref={(el) => {
                ref.current = el;
                if (el) resize(el);
            }}
            value={value}
            onChange={(e) => {
                onChange(e.target.value);
                resize(e.target);
            }}
            placeholder={placeholder}
            rows={1}
            className={className}
        />
    );
}

/* small width + align control shown under a standalone image */
function ImageSizeControl({ width, align, onWidthChange, onAlignChange }) {
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-400">Width</span>
            <div className="flex gap-1">
                {WIDTH_PRESETS.map((w) => (
                    <button
                        key={w}
                        onClick={() => onWidthChange(w)}
                        className={`rounded-full px-2.5 py-1 font-medium transition ${width === w
                                ? "bg-zinc-900 text-white"
                                : "bg-white text-zinc-500 hover:bg-zinc-100"
                            }`}
                    >
                        {w}%
                    </button>
                ))}
            </div>
            <input
                type="range"
                min="15"
                max="100"
                value={width}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className="h-1 w-24 accent-zinc-900"
            />

            {width < 100 && (
                <>
                    <span className="ml-2 font-medium text-zinc-400">Align</span>
                    <div className="flex gap-1">
                        {["left", "center", "right"].map((a) => (
                            <button
                                key={a}
                                onClick={() => onAlignChange(a)}
                                className={`rounded-full px-2.5 py-1 capitalize font-medium transition ${align === a
                                        ? "bg-zinc-900 text-white"
                                        : "bg-white text-zinc-500 hover:bg-zinc-100"
                                    }`}
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

/* ---------- block editor row ---------- */

function BlockEditor({
    block,
    isDragging,
    isDragOver,
    onChange,
    onRemove,
    onImagePick,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}) {
    const fileInputRef = useRef(null);
    const alignClass =
        block.align === "left"
            ? "mr-auto"
            : block.align === "right"
                ? "ml-auto"
                : "mx-auto";

    return (
        <div
            draggable
            onDragStart={() => onDragStart(block.id)}
            onDragOver={(e) => {
                e.preventDefault();
                onDragOver(block.id);
            }}
            onDrop={(e) => {
                e.preventDefault();
                onDrop(block.id);
            }}
            onDragEnd={onDragEnd}
            className={`group relative flex gap-2 rounded-xl border transition ${isDragOver
                    ? "border-zinc-900 bg-zinc-100"
                    : "border-transparent hover:border-zinc-200"
                } ${isDragging ? "opacity-40" : "opacity-100"} p-2`}
        >
            {/* drag handle */}
            <div className="flex flex-col items-center gap-1 pt-2">
                <span className="cursor-grab select-none text-zinc-300 transition group-hover:text-zinc-400 active:cursor-grabbing">
                    ⠿
                </span>
            </div>

            {/* content */}
            <div className="min-w-0 flex-1">
                {block.type === "heading" && (
                    <AutoTextarea
                        value={block.text}
                        onChange={(v) => onChange(block.id, { text: v })}
                        placeholder="Section heading..."
                        className="w-full resize-none overflow-hidden border-none bg-transparent text-2xl font-bold leading-snug text-zinc-900 outline-none placeholder:text-zinc-300"
                    />
                )}

                {block.type === "paragraph" && (
                    <AutoTextarea
                        value={block.text}
                        onChange={(v) => onChange(block.id, { text: v })}
                        placeholder="Write here..."
                        className="w-full resize-none overflow-hidden border-none bg-transparent text-lg leading-8 text-zinc-700 outline-none placeholder:text-zinc-300"
                    />
                )}

                {block.type === "image" && (
                    <div className="space-y-2">
                        {block.imageUrl ? (
                            <>
                                <div
                                    className={`group/img relative overflow-hidden rounded-xl border border-zinc-200 ${alignClass}`}
                                    style={{ width: `${block.width || 100}%` }}
                                >
                                    <img
                                        src={block.imageUrl}
                                        alt={block.alt || ""}
                                        className="max-h-[420px] w-full object-cover"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 opacity-0 shadow-sm backdrop-blur transition group-hover/img:opacity-100 hover:bg-white"
                                    >
                                        Replace
                                    </button>
                                </div>
                                <ImageSizeControl
                                    width={block.width || 100}
                                    align={block.align || "center"}
                                    onWidthChange={(w) => onChange(block.id, { width: w })}
                                    onAlignChange={(a) => onChange(block.id, { align: a })}
                                />
                            </>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-14 text-zinc-400 transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                                <span className="text-2xl">+</span>
                                <span className="text-sm font-medium">Add an image</span>
                            </button>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onImagePick(block.id, file);
                                e.target.value = "";
                            }}
                        />
                        <input
                            type="text"
                            value={block.alt || ""}
                            onChange={(e) => onChange(block.id, { alt: e.target.value })}
                            placeholder="Caption / alt text (helps image SEO too)..."
                            className="w-full border-none bg-transparent text-sm italic text-zinc-500 outline-none placeholder:text-zinc-300"
                        />
                    </div>
                )}

                {block.type === "image-text" && (
                    <div className="space-y-2">
                        <div
                            className={`flex flex-col gap-4 sm:flex-row ${block.imagePosition === "right" ? "sm:flex-row-reverse" : ""
                                }`}
                        >
                            {/* image side */}
                            <div
                                className="shrink-0"
                                style={{ width: "100%", maxWidth: `${block.width || 45}%` }}
                            >
                                {block.imageUrl ? (
                                    <div className="group/img relative overflow-hidden rounded-xl border border-zinc-200">
                                        <img
                                            src={block.imageUrl}
                                            alt={block.alt || ""}
                                            className="h-full max-h-[320px] w-full object-cover"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 opacity-0 shadow-sm backdrop-blur transition group-hover/img:opacity-100 hover:bg-white"
                                        >
                                            Replace
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 text-zinc-400 transition hover:border-zinc-300 hover:bg-zinc-50"
                                    >
                                        <span className="text-2xl">+</span>
                                        <span className="text-sm font-medium">Add an image</span>
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) onImagePick(block.id, file);
                                        e.target.value = "";
                                    }}
                                />
                            </div>

                            {/* text side */}
                            <div className="min-w-0 flex-1">
                                <AutoTextarea
                                    value={block.text}
                                    onChange={(v) => onChange(block.id, { text: v })}
                                    placeholder="Write text next to the image..."
                                    className="w-full resize-none overflow-hidden border-none bg-transparent text-lg leading-8 text-zinc-700 outline-none placeholder:text-zinc-300"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                            <span className="font-medium text-zinc-400">Image width</span>
                            <input
                                type="range"
                                min="25"
                                max="70"
                                value={block.width || 45}
                                onChange={(e) =>
                                    onChange(block.id, { width: Number(e.target.value) })
                                }
                                className="h-1 w-24 accent-zinc-900"
                            />
                            <span>{block.width || 45}%</span>
                            <button
                                onClick={() =>
                                    onChange(block.id, {
                                        imagePosition:
                                            block.imagePosition === "right" ? "left" : "right",
                                    })
                                }
                                className="ml-auto rounded-full bg-white px-3 py-1 font-medium text-zinc-600 shadow-sm hover:bg-zinc-100"
                            >
                                Swap side ⇄
                            </button>
                        </div>

                        <input
                            type="text"
                            value={block.alt || ""}
                            onChange={(e) => onChange(block.id, { alt: e.target.value })}
                            placeholder="Caption / alt text (helps image SEO too)..."
                            className="w-full border-none bg-transparent text-sm italic text-zinc-500 outline-none placeholder:text-zinc-300"
                        />
                    </div>
                )}
            </div>

            {/* remove */}
            <button
                onClick={() => onRemove(block.id)}
                className="h-fit rounded-full p-1.5 text-zinc-300 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100"
                title="Remove block"
            >
                ✕
            </button>
        </div>
    );
}

/* ---------- SEO panel ---------- */

function SeoPanel({
    metaTitle,
    setMetaTitle,
    metaDescription,
    setMetaDescription,
    slug,
    setSlug,
    keywords,
    addKeyword,
    removeKeyword,
    titleFallback,
}) {
    const [keywordInput, setKeywordInput] = useState("");

    const submitKeyword = () => {
        const v = keywordInput.trim();
        if (v && !keywords.includes(v)) addKeyword(v);
        setKeywordInput("");
    };

    const displayTitle = metaTitle || titleFallback || "Your blog title";
    const displaySlug = slug || "your-blog-slug";

    return (
        <div className="space-y-5 rounded-xl border border-zinc-200 bg-zinc-50/60 p-5">
            <div>
                <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <span>SEO title</span>
                    <span className={countLabel(metaTitle.length, 40, 60)}>
                        {metaTitle.length}/60
                    </span>
                </label>
                <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={titleFallback || "Title shown in Google search results..."}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400"
                />
            </div>

            <div>
                <label className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    <span>Meta description</span>
                    <span className={countLabel(metaDescription.length, 120, 160)}>
                        {metaDescription.length}/160
                    </span>
                </label>
                <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="One or two sentences that'll show under the title in search results..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400"
                />
            </div>

            <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    URL slug
                </label>
                <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <span className="text-zinc-400">/blog/</span>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(slugify(e.target.value))}
                        placeholder="your-blog-slug"
                        className="min-w-0 flex-1 border-none bg-transparent text-zinc-800 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Focus keywords
                </label>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                    {keywords.map((k) => (
                        <span
                            key={k}
                            className="flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white"
                        >
                            {k}
                            <button
                                onClick={() => removeKeyword(k)}
                                className="text-zinc-300 hover:text-white"
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault();
                                submitKeyword();
                            }
                        }}
                        onBlur={submitKeyword}
                        placeholder={keywords.length ? "Add another..." : "e.g. physiotherapy in noida, add & press Enter"}
                        className="min-w-[140px] flex-1 border-none bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-300"
                    />
                </div>
            </div>

            {/* Google SERP preview */}
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Search preview
                </p>
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                    <p className="truncate text-xs text-zinc-500">yoursite.com › blog › {displaySlug}</p>
                    <p className="mt-1 truncate text-lg text-blue-700">{displayTitle}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                        {metaDescription || "Add a meta description to control how this blog appears in search results."}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ---------- table of contents (frontend/preview) ---------- */

function TableOfContents({ items, activeId, onNavigate }) {
    if (items.length === 0) return null;
    return (
        <nav className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Contents
            </p>
            <ol className="space-y-2">
                {items.map((item, i) => (
                    <li key={item.id}>
                        <button
                            onClick={() => onNavigate(item.id)}
                            className={`flex w-full items-start gap-2 text-left text-sm leading-6 transition ${activeId === item.id
                                    ? "font-semibold text-zinc-900"
                                    : "text-zinc-500 hover:text-zinc-800"
                                }`}
                        >
                            <span className="text-zinc-300">{String(i + 1).padStart(2, "0")}</span>
                            <span className="truncate">{item.text}</span>
                        </button>
                    </li>
                ))}
            </ol>
        </nav>
    );
}

/* ---------- preview (this is what visitors see) ---------- */

function Preview({ title, author, coverImage, blocks, keywords, readMinutes }) {
    const [activeId, setActiveId] = useState(null);

    const tocItems = blocks
        .filter((b) => b.type === "heading" && b.text.trim())
        .map((b) => ({ id: b.id, text: b.text }));

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            setActiveId(id);
        }
    };

    return (
        <div className="mx-auto max-w-6xl px-5 py-14 lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-12">
            {/* left: content */}
            <article className="min-w-0">
                {coverImage && (
                    <img
                        src={coverImage}
                        alt=""
                        className="mb-10 max-h-[460px] w-full rounded-2xl object-cover"
                    />
                )}
                <h1 className="text-4xl font-bold leading-tight text-zinc-900">
                    {title || "Untitled blog"}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-500">
                    {author && <span>By {author}</span>}
                    {author && readMinutes > 0 && <span className="text-zinc-300">·</span>}
                    {readMinutes > 0 && <span>{readMinutes} min read</span>}
                </div>

                {keywords.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {keywords.map((k) => (
                            <span
                                key={k}
                                className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500"
                            >
                                #{k.replace(/\s+/g, "")}
                            </span>
                        ))}
                    </div>
                )}

                {/* ToC shows above content on mobile, hidden here on desktop (shown in sidebar) */}
                <div className="mt-8 lg:hidden">
                    <TableOfContents
                        items={tocItems}
                        activeId={activeId}
                        onNavigate={scrollToSection}
                    />
                </div>

                <div className="mt-10 space-y-6">
                    {blocks.length === 0 && (
                        <p className="text-zinc-400">Nothing written yet.</p>
                    )}
                    {blocks.map((b) => {
                        if (b.type === "heading")
                            return (
                                <h2
                                    key={b.id}
                                    id={b.id}
                                    className="scroll-mt-24 pt-2 text-2xl font-bold text-zinc-900"
                                >
                                    {b.text || "Untitled section"}
                                </h2>
                            );

                        if (b.type === "paragraph")
                            return (
                                <p
                                    key={b.id}
                                    className="whitespace-pre-wrap text-lg leading-8 text-zinc-700"
                                >
                                    {b.text}
                                </p>
                            );

                        if (b.type === "image" && b.imageUrl) {
                            const alignClass =
                                b.align === "left"
                                    ? "mr-auto"
                                    : b.align === "right"
                                        ? "ml-auto"
                                        : "mx-auto";
                            return (
                                <figure
                                    key={b.id}
                                    className={alignClass}
                                    style={{ width: `${b.width || 100}%` }}
                                >
                                    <img
                                        src={b.imageUrl}
                                        alt={b.alt || ""}
                                        className="w-full rounded-xl object-cover"
                                    />
                                    {b.alt && (
                                        <figcaption className="mt-2 text-center text-sm italic text-zinc-500">
                                            {b.alt}
                                        </figcaption>
                                    )}
                                </figure>
                            );
                        }

                        if (b.type === "image-text")
                            return (
                                <div
                                    key={b.id}
                                    className={`flex flex-col gap-6 sm:flex-row ${b.imagePosition === "right" ? "sm:flex-row-reverse" : ""
                                        }`}
                                >
                                    {b.imageUrl && (
                                        <figure
                                            className="shrink-0"
                                            style={{ width: "100%", maxWidth: `${b.width || 45}%` }}
                                        >
                                            <img
                                                src={b.imageUrl}
                                                alt={b.alt || ""}
                                                className="w-full rounded-xl object-cover"
                                            />
                                            {b.alt && (
                                                <figcaption className="mt-2 text-center text-sm italic text-zinc-500">
                                                    {b.alt}
                                                </figcaption>
                                            )}
                                        </figure>
                                    )}
                                    <p className="min-w-0 flex-1 whitespace-pre-wrap text-lg leading-8 text-zinc-700">
                                        {b.text}
                                    </p>
                                </div>
                            );

                        return null;
                    })}
                </div>
            </article>

            {/* right: sticky table of contents (desktop only) */}
            <aside className="hidden lg:sticky lg:top-24 lg:block">
                <TableOfContents
                    items={tocItems}
                    activeId={activeId}
                    onNavigate={scrollToSection}
                />
            </aside>
        </div>
    );
}

/* ---------- main page ---------- */

export default function CreateBlogPage() {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [category, setCategory] = useState("");
    const [coverImage, setCoverImage] = useState(null);
    const [blocks, setBlocks] = useState([
        { id: newId(), type: "paragraph", text: "" },
    ]);
    const [mode, setMode] = useState("write"); // "write" | "preview"
    const [seoOpen, setSeoOpen] = useState(false);

    // SEO fields
    const [metaTitle, setMetaTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [slug, setSlug] = useState("");
    const [keywords, setKeywords] = useState([]);

    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    const coverInputRef = useRef(null);

    // publish flow state
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishError, setPublishError] = useState(null);
    const [publishSuccess, setPublishSuccess] = useState(false);

    // "idle" | "saving" | "saved" — purely a UI indicator, doesn't affect data
    const [saveStatus, setSaveStatus] = useState("idle");
    // becomes true only after we've attempted to load an existing draft,
    // so the autosave effect never fires (and overwrites the draft) before that
    const hydratedRef = useRef(false);
    const saveTimerRef = useRef(null);

    // ---- 1. On mount: restore draft from localStorage, if any ----
    useEffect(() => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const draft = JSON.parse(raw);
                setTitle(draft.title || "");
                setAuthor(draft.author || "");
                setCategory(draft.category || "");
                setCoverImage(draft.coverImage || null);
                setBlocks(
                    Array.isArray(draft.blocks) && draft.blocks.length > 0
                        ? draft.blocks
                        : [{ id: newId(), type: "paragraph", text: "" }]
                );
                setMetaTitle(draft.metaTitle || "");
                setMetaDescription(draft.metaDescription || "");
                setSlug(draft.slug || "");
                setKeywords(Array.isArray(draft.keywords) ? draft.keywords : []);
            }
        } catch (err) {
            console.error("Could not read saved draft:", err);
        } finally {
            hydratedRef.current = true;
        }
    }, []);

    // ---- 2. On every change: debounce-save the whole draft ----
    useEffect(() => {
        if (!hydratedRef.current) return; // skip until step 1 has run

        setSaveStatus("saving");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(() => {
            try {
                const draft = {
                    title,
                    author,
                    category,
                    coverImage,
                    blocks,
                    metaTitle,
                    metaDescription,
                    slug,
                    keywords,
                    savedAt: Date.now(),
                };
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                setSaveStatus("saved");
            } catch (err) {
                // most likely quota exceeded (large base64 images) — surface it
                console.error("Could not save draft:", err);
                setSaveStatus("idle");
            }
        }, AUTOSAVE_DELAY_MS);

        return () => clearTimeout(saveTimerRef.current);
    }, [title, author, category, coverImage, blocks, metaTitle, metaDescription, slug, keywords]);

    const clearDraft = () => {
        if (!confirm("Discard this draft and start a new blog?")) return;
        localStorage.removeItem(DRAFT_KEY);
        setTitle("");
        setAuthor("");
        setCategory("");
        setCoverImage(null);
        setBlocks([{ id: newId(), type: "paragraph", text: "" }]);
        setMetaTitle("");
        setMetaDescription("");
        setSlug("");
        setKeywords([]);
        setSaveStatus("idle");
        setPublishError(null);
        setPublishSuccess(false);
    };

    const addKeyword = (k) => setKeywords((prev) => [...prev, k]);
    const removeKeyword = (k) =>
        setKeywords((prev) => prev.filter((x) => x !== k));

    const readMinutes = useMemo(() => {
        const total = blocks.reduce((sum, b) => sum + wordsIn(b.text), 0);
        return total === 0 ? 0 : Math.max(1, Math.ceil(total / 200));
    }, [blocks]);

    const addBlock = (type) => {
        let block;
        if (type === "image") {
            block = { id: newId(), type, imageUrl: null, alt: "", width: 100, align: "center" };
        } else if (type === "image-text") {
            block = {
                id: newId(),
                type,
                imageUrl: null,
                alt: "",
                text: "",
                width: 45,
                imagePosition: "left",
            };
        } else {
            block = { id: newId(), type, text: "" };
        }
        setBlocks((prev) => [...prev, block]);
    };

    const updateBlock = useCallback((id, changes) => {
        setBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, ...changes } : b))
        );
    }, []);

    const removeBlock = useCallback((id) => {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
    }, []);

    const handleImagePick = useCallback(
        async (id, file) => {
            const dataUrl = await fileToDataUrl(file);
            updateBlock(id, { imageUrl: dataUrl });
        },
        [updateBlock]
    );

    const handleCoverPick = async (file) => {
        const dataUrl = await fileToDataUrl(file);
        setCoverImage(dataUrl);
    };

    const handleDrop = (targetId) => {
        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }
        setBlocks((prev) => {
            const next = [...prev];
            const fromIndex = next.findIndex((b) => b.id === draggedId);
            const toIndex = next.findIndex((b) => b.id === targetId);
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
        setDraggedId(null);
        setDragOverId(null);
    };

    const handlePublish = async () => {
        setPublishError(null);
        setPublishSuccess(false);

        // client-side validation mirrors the backend so the user gets
        // instant feedback instead of waiting on a round trip to fail
        if (!title.trim()) {
            setPublishError("Blog title is required.");
            return;
        }
        if (!category.trim()) {
            setPublishError("Category is required.");
            return;
        }
        if (!author.trim()) {
            setPublishError("Author is required.");
            return;
        }

        const payload = {
            title: title.trim(),
            author: author.trim(),
            category: category.trim(),
            coverImage: coverImage || null,
            blocks: blocks.map(({ id, ...rest }) => rest),
            seo: {
                metaTitle: metaTitle || title,
                metaDescription: metaDescription || null,
                slug: slug || slugify(title),
                keywords,
            },
            readMinutes: readMinutes || 1,
        };

        setIsPublishing(true);
        try {
            const response = await fetch(CREATE_BLOG_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify(payload),
            });

            let result = null;
            try {
                result = await response.json();
            } catch {
                // response wasn't JSON — fall through to the generic error below
            }

            if (!response.ok || !result?.success) {
                // surfaces validation messages like "Category is required"
                // exactly as the backend sends them
                throw new Error(
                    result?.message || `Failed to publish (status ${response.status})`
                );
            }

            // published successfully — the local draft is no longer needed
            localStorage.removeItem(DRAFT_KEY);
            setPublishSuccess(true);

            // reset the editor for the next blog
            setTitle("");
            setAuthor("");
            setCategory("");
            setCoverImage(null);
            setBlocks([{ id: newId(), type: "paragraph", text: "" }]);
            setMetaTitle("");
            setMetaDescription("");
            setSlug("");
            setKeywords([]);
            setSaveStatus("idle");
        } catch (err) {
            // network failure (server down, no internet) also lands here
            // since fetch() rejects instead of resolving in that case
            console.error("Publish failed:", err);
            setPublishError(
                err.message || "Something went wrong while publishing. Please try again."
            );
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <main className="min-h-screen bg-zinc-50">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-zinc-900">Write a Blog</h1>
                        <span className="hidden text-xs text-zinc-400 sm:inline">
                            {saveStatus === "saving" && "Saving..."}
                            {saveStatus === "saved" && "All changes saved"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearDraft}
                            className="rounded-full px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                        >
                            New blog
                        </button>
                        <div className="flex rounded-full border border-zinc-200 p-1">
                            <button
                                onClick={() => setMode("write")}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${mode === "write"
                                        ? "bg-zinc-900 text-white"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                            >
                                Write
                            </button>
                            <button
                                onClick={() => setMode("preview")}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${mode === "preview"
                                        ? "bg-zinc-900 text-white"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                            >
                                Preview
                            </button>
                        </div>

                        <button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isPublishing ? "Publishing..." : "Publish"}
                        </button>
                    </div>
                </div>
            </header>

            {publishSuccess && (
                <div className="mx-auto mt-4 max-w-4xl px-5">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                        Blog published successfully.
                    </div>
                </div>
            )}
            {publishError && (
                <div className="mx-auto mt-4 max-w-4xl px-5">
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        <span>{publishError}</span>
                        <button
                            onClick={() => setPublishError(null)}
                            className="shrink-0 text-red-400 hover:text-red-600"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {mode === "preview" ? (
                <Preview
                    title={title}
                    author={author}
                    coverImage={coverImage}
                    blocks={blocks}
                    keywords={keywords}
                    readMinutes={readMinutes}
                />
            ) : (
                <section className="mx-auto max-w-4xl px-5 py-12">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        {/* Cover image */}
                        {coverImage ? (
                            <div className="group relative mb-6 overflow-hidden rounded-xl">
                                <img
                                    src={coverImage}
                                    alt=""
                                    className="max-h-[320px] w-full object-cover"
                                />
                                <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition group-hover:opacity-100">
                                    <button
                                        onClick={() => coverInputRef.current?.click()}
                                        className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur hover:bg-white"
                                    >
                                        Replace cover
                                    </button>
                                    <button
                                        onClick={() => setCoverImage(null)}
                                        className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur hover:bg-white"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => coverInputRef.current?.click()}
                                className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-8 text-sm font-medium text-zinc-400 transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                                + Add a cover image
                            </button>
                        )}
                        <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCoverPick(file);
                                e.target.value = "";
                            }}
                        />

                        {/* Title */}
                        <AutoTextarea
                            value={title}
                            onChange={setTitle}
                            placeholder="Blog title..."
                            className="w-full resize-none overflow-hidden border-none bg-transparent text-4xl font-bold leading-tight text-zinc-900 outline-none placeholder:text-zinc-300"
                        />

                        {/* Category + Author + read time */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className={`min-w-[180px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-zinc-400 ${category ? "text-zinc-700" : "text-zinc-400"
                                    }`}
                            >
                                <option value="" disabled>
                                    Select category... *
                                </option>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c} className="text-zinc-700">
                                        {c}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Author name... *"
                                className="min-w-[180px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
                            />
                            {readMinutes > 0 && (
                                <span className="shrink-0 text-xs font-medium text-zinc-400">
                                    {readMinutes} min read
                                </span>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="my-6 h-px bg-zinc-200" />

                        {/* SEO section */}
                        <button
                            onClick={() => setSeoOpen((v) => !v)}
                            className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                            <span>SEO & search settings</span>
                            <span className="text-zinc-400">{seoOpen ? "Hide ▲" : "Show ▼"}</span>
                        </button>
                        {seoOpen && (
                            <div className="mt-3">
                                <SeoPanel
                                    metaTitle={metaTitle}
                                    setMetaTitle={setMetaTitle}
                                    metaDescription={metaDescription}
                                    setMetaDescription={setMetaDescription}
                                    slug={slug}
                                    setSlug={setSlug}
                                    keywords={keywords}
                                    addKeyword={addKeyword}
                                    removeKeyword={removeKeyword}
                                    titleFallback={title}
                                />
                            </div>
                        )}

                        <div className="my-6 h-px bg-zinc-200" />

                        {/* Blocks */}
                        <div className="space-y-1">
                            {blocks.map((block) => (
                                <BlockEditor
                                    key={block.id}
                                    block={block}
                                    isDragging={draggedId === block.id}
                                    isDragOver={dragOverId === block.id && draggedId !== block.id}
                                    onChange={updateBlock}
                                    onRemove={removeBlock}
                                    onImagePick={handleImagePick}
                                    onDragStart={setDraggedId}
                                    onDragOver={setDragOverId}
                                    onDrop={handleDrop}
                                    onDragEnd={() => {
                                        setDraggedId(null);
                                        setDragOverId(null);
                                    }}
                                />
                            ))}
                        </div>

                        {/* Add block toolbar */}
                        <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-6">
                            <button
                                onClick={() => addBlock("paragraph")}
                                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                                + Paragraph
                            </button>
                            <button
                                onClick={() => addBlock("heading")}
                                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                                + Heading
                            </button>
                            <button
                                onClick={() => addBlock("image")}
                                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                                + Image
                            </button>
                            <button
                                onClick={() => addBlock("image-text")}
                                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
                            >
                                + Image beside text
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}