/**
 * Modal
 *
 * UI responsibility: a centered overlay dialog used for admin forms
 * (create/edit menu item, confirm delete, etc.). Built as a plain
 * overlay rather than <dialog> to keep control over focus/backdrop
 * styling consistent across browsers.
 */
"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-sm bg-parchment p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-ink/60 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
