/**
 * ConfirmationDialog
 *
 * UI responsibility: a yes/no confirmation prompt for destructive admin
 * actions (deleting a menu item, image, or promotion). Built on Modal so
 * every confirmation in the app looks and behaves the same way.
 */
"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmationDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="mb-6 text-ink/80">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={isConfirming}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
