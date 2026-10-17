/**
 * Admin Gallery Page (/admin/gallery)
 *
 * UI responsibility: lets staff curate the public photo gallery — upload
 * a photo (via ImageUploader), give it a caption, and remove photos that
 * no longer belong. Distinct from /admin/images: this page manages
 * *curation* (what's shown, in what order, with what caption), while
 * /admin/images manages the raw asset library.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface GalleryPhoto {
  id: string;
  caption: string | null;
  image: { id: string; url: string };
}

export default function AdminGalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingImageId, setPendingImageId] = useState<string | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/gallery");
    const data = await response.json();
    setPhotos(data.photos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: this effect's job IS fetching data on mount, which
    // necessarily calls setState once the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPhotos();
  }, [loadPhotos]);

  async function handleAddPhoto() {
    if (!pendingImageId) return;
    setAdding(true);
    await fetch("/api/admin/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: pendingImageId, caption: caption || undefined }),
    });
    setAdding(false);
    setPendingImageId(null);
    setPendingImageUrl(null);
    setCaption("");
    loadPhotos();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/gallery/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    loadPhotos();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Gallery</h1>
      <p className="mt-1 text-ink/60">Curate the photos shown on the public /gallery page.</p>

      <div className="mt-6 space-y-4 border border-line bg-white/40 p-5">
        <p className="text-sm font-medium text-ink">Add a photo</p>
        <ImageUploader
          currentImageUrl={pendingImageUrl}
          onUploaded={(image) => {
            setPendingImageId(image.id);
            setPendingImageUrl(image.url);
          }}
        />
        <Input label="Caption (optional)" value={caption} onChange={(event) => setCaption(event.target.value)} />
        <Button onClick={handleAddPhoto} disabled={!pendingImageId || adding}>
          {adding ? "Adding…" : "Add to gallery"}
        </Button>
      </div>

      {loading ? (
        <p className="mt-8 text-ink/60">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="mt-8 text-ink/60">No photos in the gallery yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-sm bg-parchment-dim">
              <Image src={photo.image.url} alt={photo.caption ?? ""} fill className="object-cover" unoptimized />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-1 text-xs text-parchment">
                  {photo.caption}
                </div>
              )}
              <button
                onClick={() => setDeleteTarget(photo)}
                className="absolute right-1 top-1 rounded-sm bg-ink/80 px-2 py-1 text-xs font-medium text-parchment opacity-0 transition-opacity group-hover:opacity-100"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Remove photo"
        message="This removes the photo from the gallery. The uploaded image itself stays in your image library."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isConfirming={deleting}
      />
    </div>
  );
}
