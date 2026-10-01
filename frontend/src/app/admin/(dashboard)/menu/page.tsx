/**
 * Admin Menu Page (/admin/menu)
 *
 * UI responsibility: lets staff manage menu categories and items. Talks
 * only to the /api/admin/menu* endpoints — all business rules (price
 * validation, category existence) are enforced server-side by
 * MenuService, this page just reflects the result.
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

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string;
  isAvailable: boolean;
  isFeatured: boolean;
  categoryId: string;
  image: { id: string; url: string } | null;
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

const EMPTY_FORM = {
  id: null as string | null,
  name: "",
  description: "",
  price: "",
  categoryId: "",
  isFeatured: false,
  isAvailable: true,
  imageId: null as string | null,
  imageUrl: null as string | null,
};

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const loadMenu = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/menu");
    const data = await response.json();
    setCategories(data.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: this effect's job IS fetching data on mount, which
    // necessarily calls setState once the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMenu();
  }, [loadMenu]);

  function openCreateModal() {
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? "" });
    setFormError(null);
    setItemModalOpen(true);
  }

  function openEditModal(item: MenuItem) {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      categoryId: item.categoryId,
      isFeatured: item.isFeatured,
      isAvailable: item.isAvailable,
      imageId: item.image?.id ?? null,
      imageUrl: item.image?.url ?? null,
    });
    setFormError(null);
    setItemModalOpen(true);
  }

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!newCategoryName.trim()) return;
    await fetch("/api/admin/menu-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    setNewCategoryName("");
    loadMenu();
  }

  async function handleSaveItem(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      categoryId: form.categoryId,
      isFeatured: form.isFeatured,
      isAvailable: form.isAvailable,
      imageId: form.imageId,
    };

    const url = form.id ? `/api/admin/menu/${form.id}` : "/api/admin/menu";
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
    setItemModalOpen(false);
    loadMenu();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/admin/menu/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    loadMenu();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Menu</h1>
          <p className="mt-1 text-ink/60">Manage categories and dishes shown on the public site.</p>
        </div>
        <Button onClick={openCreateModal} disabled={categories.length === 0}>
          Add item
        </Button>
      </div>

      <form onSubmit={handleCreateCategory} className="mt-6 flex max-w-sm items-end gap-3">
        <Input
          label="New category"
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          placeholder="e.g. Desserts"
        />
        <Button type="submit" variant="secondary">
          Add
        </Button>
      </form>

      {loading ? (
        <p className="mt-10 text-ink/60">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="mt-10 text-ink/60">Add a category above to get started.</p>
      ) : (
        <div className="mt-10 space-y-10">
          {categories.map((category) => (
            <div key={category.id}>
              <h2 className="font-display text-xl text-ink">{category.name}</h2>
              {category.items.length === 0 ? (
                <p className="mt-2 text-sm text-ink/50">No items yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line border border-line">
                  {category.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="font-medium text-ink">
                          {item.name} <span className="text-ink/50">— ${Number(item.price).toFixed(2)}</span>
                        </p>
                        <div className="mt-1 flex gap-2">
                          {!item.isAvailable && <StatusBadge label="Unavailable" tone="negative" />}
                          {item.isFeatured && <StatusBadge label="Featured" tone="warning" />}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => openEditModal(item)}>
                          Edit
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleteTarget(item)}>
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={itemModalOpen} onClose={() => setItemModalOpen(false)} title={form.id ? "Edit item" : "Add item"}>
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            required
          />
          <Input
            label="Price"
            type="number"
            step="0.01"
            min={0}
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            required
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-sm font-medium text-ink">
              Category
            </label>
            <select
              id="category"
              value={form.categoryId}
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              className="rounded-sm border border-line bg-parchment px-3.5 py-2.5 text-ink"
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <ImageUploader
            currentImageUrl={form.imageUrl}
            onUploaded={(image) => setForm((prev) => ({ ...prev, imageId: image.id, imageUrl: image.url }))}
          />

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(event) => setForm((prev) => ({ ...prev, isAvailable: event.target.checked }))}
              />
              Available
            </label>
          </div>

          {formError && (
            <p role="alert" className="text-sm text-rust">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save item"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        title="Delete menu item"
        message={`Remove "${deleteTarget?.name}" from the menu? This can't be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isConfirming={deleting}
      />
    </div>
  );
}
