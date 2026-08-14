"use client";

import { useRouter } from "next/navigation";

export default function WriteBlogButton() {
  const router = useRouter();

  const handleWriteBlog = () => {
    router.push("/create");
  };

  return (
    <button
      onClick={handleWriteBlog}
      className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
    >
      Write a Blog
    </button>
  );
}