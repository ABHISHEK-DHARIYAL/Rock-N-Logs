/**
 * AdminSessionGuard
 *
 * The admin sub-pages fetch their data in the browser, where an expired or
 * invalid session used to fail silently (empty tables). This checks the
 * session once when the panel mounts and sends staff back to the login page
 * if it's no longer valid; if the API is unreachable it shows a notice.
 */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AdminSessionGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { cache: "no-store" })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 401) {
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        } else if (!res.ok) {
          setUnreachable(true);
        }
      })
      .catch(() => !cancelled && setUnreachable(true));
    return () => {
      cancelled = true;
    };
    // Check once per panel mount, not on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!unreachable) return null;
  return (
    <div role="alert" className="mb-6 border border-rust/40 bg-white/40 px-4 py-3 text-sm text-ink/80">
      The server isn&apos;t responding. It may be waking up — wait a moment and reload the page.
    </div>
  );
}
