/**
 * ImageUploader
 *
 * UI responsibility: lets an admin pick a local image file, uploads it to
 * POST /api/admin/images, and reports the resulting Image record back to
 * the parent via onUploaded. Used by the menu item form and the image
 * library page — kept as one component so upload UX stays consistent.
 */
"use client";

import { useState } from "react";
import Image from "next/image";

interface UploadedImageResult {
  id: string;
  url: string;
}

export function ImageUploader({
  currentImageUrl,
  onUploaded,
}: {
  currentImageUrl?: string | null;
  onUploaded: (image: UploadedImageResult) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/images", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setPreviewUrl(data.image.url);
      onUploaded({ id: data.image.id, url: data.image.url });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {previewUrl && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-parchment-dim">
          <Image src={previewUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      )}
      <div>
        <label className="inline-flex cursor-pointer items-center rounded-sm border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-parchment-dim">
          {uploading ? "Uploading…" : previewUrl ? "Replace image" : "Upload image"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
        {error && <p className="mt-1 text-sm text-rust">{error}</p>}
      </div>
    </div>
  );
}
