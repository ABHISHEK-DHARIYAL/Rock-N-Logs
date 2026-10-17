/**
 * Admin Promotions Page (/admin/promotions)
 *
 * UI responsibility: lets staff create and manage marketing promotions
 * shown on the public homepage. Follows the same list+modal pattern as
 * the menu admin page for consistency.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImageUploader } from "@/components/admin/ImageUploader";

interface Promotion {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  image: { id: string; url: string } | null;
}

const EMPTY_FORM = {
  id: null as string | null,
  title: "",
  description: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  imageId: null as string | null,
  imageUrl: null as string | null,
};

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/promotions");
    const data = await response.json();
    setPromotions(data.promotions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: this effect's job IS fetching data on mount, which
    // necessarily calls setState once the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPromotions();
  }, [loadPromotions]);

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(promo: Promotion) {
    setForm({
      id: promo.id,
      title: promo.title,
      description: promo.description,
      isActive: promo.isActive,
      startsAt: promo.startsAt ? promo.startsAt.slice(0, 10) : "",
      endsAt: promo.endsAt ? promo.endsAt.slice(0, 10) : "",
      imageId: promo.image?.id ?? null,
      imageUrl: promo.image?.url ?? null,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      title: form.title,
      description: form.description,
      isActive: form.isActive,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      imageId: form.imageId,
    };

    const url = form.id ? `/api/admin/promotions/${form.id}` : "/api/admin/promotions";
    const method = form.id ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      setFormError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    loadPromotions();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/promotions/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    loadPromotions();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Promotions</h1>
          <p className="mt-1 text-ink/60">Banners shown on the homepage while active.</p>
        </div>
        <Button onClick={openCreateModal}>Add promotion</Button>
      </div>

      {loading ? (
        <p className="mt-10 text-ink/60">Loading…</p>
      ) : promotions.length === 0 ? (
        <p className="mt-10 text-ink/60">No promotions yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border border-line">
          {promotions.map((promo) => (
            <li key={promo.id} className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-ink">{promo.title}</p>
                  <StatusBadge label={promo.isActive ? "Active" : "Inactive"} tone={promo.isActive ? "positive" : "neutral"} />
                </div>
                <p className="mt-1 text-sm text-ink/60">{promo.description}</p>
                {(promo.startsAt || promo.endsAt) && (
                  <p className="mt-1 text-xs text-ink/40">
                    {promo.startsAt ? new Date(promo.startsAt).toLocaleDateString() : "Any time"} —{" "}
                    {promo.endsAt ? new Date(promo.endsAt).toLocaleDateString() : "Ongoing"}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" onClick={() => openEditModal(promo)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setDeleteTarget(promo)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit promotion" : "Add promotion"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Starts (optional)"
              type="date"
              value={form.startsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
            />
            <Input
              label="Ends (optional)"
              type="date"
              value={form.endsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
            />
          </div>

          <ImageUploader
            currentImageUrl={form.imageUrl}
            onUploaded={(image) => setForm((prev) => ({ ...prev, imageId: image.id, imageUrl: image.url }))}
          />

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active
          </label>

          {formError && (
            <p role="alert" className="text-sm text-rust">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save promotion"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete promotion"
        message={`Remove "${deleteTarget?.title}"? This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isConfirming={deleting}
      />
    </div>
  );
}
