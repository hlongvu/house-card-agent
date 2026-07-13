"use client";

import { useRef, useState } from "react";

export default function UploadDropzone({
  onUpload,
}: {
  onUpload: (data: { id: string; title: string }) => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^.]+$/, ""));

      const res = await fetch("/api/projects", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const project = await res.json();
      onUpload(project);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const acceptedFormats =
    ".dwg,.dxf,.pdf,.skp,.jpg,.jpeg,.png,.bmp,.glb,.gltf,.obj";

  return (
    <div className="w-full">
      <button
        type="button"
        className={`relative w-full overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
          dragActive
            ? "border-terracotta-500 bg-terracotta-50/80 shadow-lg scale-[1.02]"
            : "border-dashed border-stone-300 bg-white/60 hover:border-stone-400 hover:bg-white/80 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600"
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedFormats}
          onChange={handleChange}
        />

        <div className="relative flex flex-col items-center justify-center px-8 py-14">
          {/* Grid background accent */}
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.06]" />

          {uploading ? (
            <>
              <div className="relative flex h-14 w-14 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-stone-200 dark:border-zinc-700" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-terracotta-500" />
                <svg
                  className="relative h-6 w-6 text-terracotta-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
                  />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-stone-600 dark:text-zinc-300">
                Analyzing your design...
              </p>
              <p className="mt-1 text-xs text-stone-400 dark:text-zinc-500">
                Processing file and extracting design data
              </p>
            </>
          ) : (
            <>
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                  dragActive
                    ? "bg-terracotta-100 text-terracotta-600 shadow-inner"
                    : "bg-stone-100 text-stone-400 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
              >
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16"
                  />
                </svg>
              </div>

              <p className="mt-5 text-base font-semibold text-stone-700 dark:text-zinc-200">
                {dragActive
                  ? "Drop your file here"
                  : "Drop your CAD or blueprint file"}
              </p>
              <p className="mt-1.5 text-sm text-stone-400 dark:text-zinc-500">
                or click to browse your files
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
                {[".dwg", ".dxf", ".pdf", ".skp", ".jpg", ".glb"].map(
                  (fmt) => (
                    <span
                      key={fmt}
                      className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {fmt}
                    </span>
                  )
                )}
              </div>

              <p className="mt-3 text-[11px] text-stone-300 dark:text-zinc-600">
                Up to 25 MB
              </p>
            </>
          )}
        </div>
      </button>

      {error && (
        <div className="mt-3 animate-slide-up rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800/50 dark:bg-red-950/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
