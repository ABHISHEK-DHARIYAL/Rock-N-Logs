/**
 * Admin Images Page (/admin/images)
 *
 * UI responsibility: a general-purpose image library. Staff upload
 * images here (or inline from the menu item form via the same
 * ImageUploader) and can delete unused ones. Deleting here removes the
 * asset from storage and the database via ImageService — if an image is
 * still referenced by a menu item, that item's imageId is set to null
 * (see schema's onDelete: SetNull on MenuItem.image).
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface ImageRecord {
  id: string;
  url: string;
  altText: string | null;
  createdAt: string;
}

export default function AdminImagesPage() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ImageRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadImages = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/images");
    const data = await response.json();
    setImages(data.images ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: this effect's job IS fetching data on mount, which
    // necessarily calls setState once the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadImages();
  }, [loadImages]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/images/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    loadImages();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Images</h1>
      <p className="mt-1 text-ink/60">
        Upload photos for menu items, promotions, and the gallery. Uploaded images can be
        attached from their respective pages.
      </p>

      <div className="mt-6">
        <ImageUploader onUploaded={() => loadImages()} />
      </div>

      {loading ? (
        <p className="mt-8 text-ink/60">Loading…</p>
      ) : images.length === 0 ? (
        <p className="mt-8 text-ink/60">No images uploaded yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-sm bg-parchment-dim">
              <Image src={image.url} alt={image.altText ?? ""} fill className="object-cover" unoptimized />
              <button
                onClick={() => setDeleteTarget(image)}
                className="absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-xs font-medium text-parchment opacity-0 transition-opacity group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete image"
        message="This removes the image from storage. Any menu item using it will lose its picture."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isConfirming={deleting}
      />
    </div>
  );
}
