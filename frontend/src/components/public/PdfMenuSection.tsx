/**
 * PdfMenuSection
 *
 * UI responsibility: shows a "view/download the PDF menu" callout on the
 * public site, when a PDF has been uploaded via /admin/menu-pdf. Reads
 * directly from MenuDocumentService (server component) — renders
 * nothing if no PDF has been uploaded, rather than a dead link.
 */
import { api } from "@/lib/api";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function PdfMenuSection() {
  const document = await api.menuPdf();
  if (!document.url) return null;

  // Browsers block top-level navigation to data: URLs triggered by a
  // link click (a phishing mitigation) — which is exactly what
  // MockDocumentStorage produces when Cloudinary isn't configured. The
  // `download` attribute sidesteps that restriction by treating it as a
  // file save rather than a navigation, and is a reasonable UX for a
  // real Cloudinary URL too since this is meant to be downloaded.
  const isDataUrl = document.url.startsWith("data:");

  return (
    <div className="flex flex-col items-start justify-between gap-4 border border-line bg-white/40 px-6 py-5 sm:flex-row sm:items-center">
      <div>
        <p className="font-display text-lg text-ink">Prefer a printable menu?</p>
        <p className="mt-1 text-sm text-ink/60">
          Download the full PDF menu{document.fileSizeBytes ? ` (${formatBytes(document.fileSizeBytes)})` : ""}.
        </p>
      </div>
      <a
        href={document.url}
        {...(isDataUrl
          ? { download: document.originalFilename ?? "menu.pdf" }
          : { target: "_blank", rel: "noopener noreferrer" })}
        className="whitespace-nowrap rounded-sm border border-ink px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-parchment"
      >
        View PDF menu
      </a>
    </div>
  );
}
