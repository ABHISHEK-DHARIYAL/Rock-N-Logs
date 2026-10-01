/**
 * Admin PDF Menu Page (/admin/menu-pdf)
 *
 * UI responsibility: lets staff upload the PDF version of the menu shown
 * on the public site (see PdfMenuSection). Deliberately separate from
 * /admin/menu (the structured digital menu) and /admin/images (general
 * image library) — this manages one specific, singleton document.
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

interface MenuDocument {
  url: string | null;
  originalFilename: string | null;
  fileSizeBytes: number | null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function AdminMenuPdfPage() {
  const [document, setDocument] = useState<MenuDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocument = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/menu-pdf");
    const data = await response.json();
    setDocument(data.document);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: this effect's job IS fetching data on mount, which
    // necessarily calls setState once the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocument();
  }, [loadDocument]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/menu-pdf", { method: "POST", body: formData });
    const data = await response.json();

    setUploading(false);
    if (!response.ok) {
      setError(data.error ?? "Upload failed.");
      return;
    }
    setDocument(data.document);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemove() {
    setRemoving(true);
    await fetch("/api/admin/menu-pdf", { method: "DELETE" });
    setRemoving(false);
    setConfirmingRemove(false);
    loadDocument();
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">PDF Menu</h1>
      <p className="mt-1 text-ink/60">
        Upload a PDF version of the menu. It appears as a download/view section on the
        public site alongside the structured menu — useful for a printable version or a
        menu with a layout the digital page can&apos;t reproduce exactly.
      </p>

      {loading ? (
        <p className="mt-8 text-ink/60">Loading…</p>
      ) : (
        <div className="mt-8 max-w-lg space-y-6">
          {document?.url ? (
            <div className="border border-line bg-white/40 px-5 py-4">
              <p className="text-sm uppercase tracking-wide text-ink/50">Current PDF</p>
              <p className="mt-1 font-medium text-ink">{document.originalFilename}</p>
              <p className="text-sm text-ink/50">{formatBytes(document.fileSizeBytes)}</p>
              <div className="mt-4 flex gap-3">
                <a
                  href={document.url}
                  {...(document.url.startsWith("data:")
                    ? { download: document.originalFilename ?? "menu.pdf" }
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  className="rounded-sm border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-parchment"
                >
                  View PDF
                </a>
                <Button variant="ghost" onClick={() => setConfirmingRemove(true)}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-ink/60">No PDF menu uploaded yet.</p>
          )}

          <div>
            <label className="inline-flex cursor-pointer items-center rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-parchment hover:bg-moss">
              {uploading ? "Uploading…" : document?.url ? "Replace PDF" : "Upload PDF"}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            <p className="mt-2 text-xs text-ink/50">PDF only, up to 15MB.</p>
            {error && (
              <p role="alert" className="mt-2 text-sm text-rust">
                {error}
              </p>
            )}
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={confirmingRemove}
        title="Remove PDF menu"
        message="The public site will no longer show a PDF menu section until you upload a new one."
        onConfirm={handleRemove}
        onCancel={() => setConfirmingRemove(false)}
        isConfirming={removing}
      />
    </div>
  );
}
