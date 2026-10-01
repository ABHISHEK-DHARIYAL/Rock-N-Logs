/**
 * Admin (Dashboard) Layout
 *
 * Wraps all authenticated admin pages (dashboard, menu, bookings, images)
 * with AdminSidebar. Scoped to this route group so /admin/login — which
 * has its own full-page layout — is unaffected. Route access itself is
 * already enforced by middleware.ts; this layout is presentation only.
 */
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminSessionGuard } from "@/components/admin/AdminSessionGuard";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-parchment">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto px-10 py-10">
        <AdminSessionGuard />
        {children}
      </main>
    </div>
  );
}
