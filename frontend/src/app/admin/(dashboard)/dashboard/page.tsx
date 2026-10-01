/**
 * Admin Dashboard (/admin/dashboard)
 *
 * At-a-glance overview: pending bookings needing attention and basic
 * menu/booking counts. Server component reading directly from services.
 */
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

/** Backend problems degrade to a notice; anything else (incl. login redirects) still propagates. */
function softFail(error: unknown) {
  if (error instanceof ApiError) return null;
  throw error;
}

export default async function AdminDashboardPage() {
  const [pendingResult, categoriesResult] = await Promise.all([
    api.adminPendingBookings().catch(softFail),
    api.menu().catch(softFail),
  ]);
  const backendProblem = pendingResult === null || categoriesResult === null;
  const pendingBookings = pendingResult ?? [];
  const categories = categoriesResult ?? [];

  const totalItems = categories.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Dashboard</h1>
      <p className="mt-1 text-ink/60">A quick look at what needs attention.</p>

      {backendProblem && (
        <div role="alert" className="mt-6 border border-rust/40 bg-white/40 px-4 py-3 text-sm text-ink/80">
          Couldn&apos;t load all data from the server. If the API was idle it may still be waking
          up — wait a few seconds and <Link href="/admin/dashboard" className="underline">refresh</Link>.
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending bookings" value={pendingBookings.length} />
        <StatCard label="Menu categories" value={categories.length} />
        <StatCard label="Menu items" value={totalItems} />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Needs a response</h2>
          <Link href="/admin/bookings" className="text-sm text-moss hover:underline">
            View all bookings →
          </Link>
        </div>

        {pendingBookings.length === 0 ? (
          <p className="mt-4 text-ink/60">No pending booking requests right now.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line">
            {pendingBookings.slice(0, 6).map((booking) => (
              <li key={booking.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{booking.customerName}</p>
                  <p className="text-sm text-ink/60">
                    Party of {booking.partySize} · {new Date(booking.requestedDate).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm text-ink/50">{booking.customerPhone}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line bg-white/40 px-5 py-4">
      <p className="text-sm uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
    </div>
  );
}
