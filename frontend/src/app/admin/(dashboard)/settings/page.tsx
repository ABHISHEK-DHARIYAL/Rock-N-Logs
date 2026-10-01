/**
 * Admin Settings Page (/admin/settings)
 *
 * UI responsibility: lets staff edit the RestaurantSettings singleton
 * (name, tagline, contact details, hours) that backs the public
 * /restaurant and /contact pages, without needing a code deploy.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

interface Settings {
  name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  openingHours: string | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/settings");
    const data = await response.json();
    setSettings(data.settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: this effect's job IS fetching data on mount, which
    // necessarily calls setState once the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, [loadSettings]);

  function updateField<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);

    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await response.json();

    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setSettings(data.settings);
    setSaved(true);
  }

  if (loading || !settings) {
    return <p className="text-ink/60">Loading…</p>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Settings</h1>
      <p className="mt-1 text-ink/60">
        These details appear on the public Our Story and Contact pages.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-5">
        <Input
          label="Restaurant name"
          value={settings.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
        />
        <Input
          label="Tagline"
          value={settings.tagline ?? ""}
          onChange={(event) => updateField("tagline", event.target.value || null)}
        />
        <Textarea
          label="Story / description"
          value={settings.description ?? ""}
          onChange={(event) => updateField("description", event.target.value || null)}
          rows={4}
        />
        <Input
          label="Address"
          value={settings.address ?? ""}
          onChange={(event) => updateField("address", event.target.value || null)}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Phone"
            value={settings.phone ?? ""}
            onChange={(event) => updateField("phone", event.target.value || null)}
          />
          <Input
            label="Email"
            type="email"
            value={settings.email ?? ""}
            onChange={(event) => updateField("email", event.target.value || null)}
          />
        </div>
        <Input
          label="WhatsApp number for booking alerts"
          value={settings.whatsappPhone ?? ""}
          onChange={(event) => updateField("whatsappPhone", event.target.value || null)}
          placeholder="e.g. +15550192244"
        />
        <Input
          label="Opening hours"
          value={settings.openingHours ?? ""}
          onChange={(event) => updateField("openingHours", event.target.value || null)}
          placeholder="e.g. Tue–Sun, 5pm–11pm"
        />

        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}
        {saved && <p className="text-sm text-moss">Saved.</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
