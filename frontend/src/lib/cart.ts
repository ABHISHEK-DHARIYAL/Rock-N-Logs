/**
 * Cart (client-only)
 *
 * A tiny external store persisted in localStorage so a customer's dishes survive navigation
 * and reloads, with an in-memory fallback if storage is blocked (private mode, etc.).
 *
 * SECURITY: prices kept here are for DISPLAY only. The server ignores them and prices the
 * order from the database when the booking is submitted. Anything read back from storage is
 * treated as untrusted and re-validated (shape, lengths, quantity limits).
 */
"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export interface CartLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export const MAX_QTY_PER_ITEM = 20; // mirrors the server's limit
const MAX_LINES = 40;
const STORAGE_KEY = "rnl-cart-v1";
const EMPTY: CartLine[] = [];

let memoryRaw: string | null = null;
let cache: { raw: string | null; lines: CartLine[] } | null = null;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

function parse(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    const lines: CartLine[] = [];
    for (const entry of data.slice(0, MAX_LINES)) {
      const { id, name, price, quantity } = (entry ?? {}) as Record<string, unknown>;
      if (
        typeof id === "string" && id.length > 0 && id.length <= 40 &&
        typeof name === "string" && name.length > 0 && name.length <= 160 &&
        typeof price === "number" && Number.isFinite(price) && price >= 0 &&
        typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1
      ) {
        lines.push({ id, name, price, quantity: Math.min(quantity, MAX_QTY_PER_ITEM) });
      }
    }
    return lines.length > 0 ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartLine[] {
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.lines; // stable reference while unchanged
  cache = { raw, lines: parse(raw) };
  return cache.lines;
}

function write(lines: CartLine[]) {
  const raw = lines.length > 0 ? JSON.stringify(lines) : null;
  memoryRaw = raw;
  try {
    if (raw) window.localStorage.setItem(STORAGE_KEY, raw);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: the in-memory copy still works for this tab */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener(); // other tab changed the cart
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const add = useCallback((item: Omit<CartLine, "quantity">) => {
    const current = getSnapshot();
    const existing = current.find((line) => line.id === item.id);
    if (existing) {
      write(current.map((line) => line.id === item.id ? { ...line, quantity: Math.min(line.quantity + 1, MAX_QTY_PER_ITEM) } : line));
    } else if (current.length < MAX_LINES) {
      write([...current, { ...item, quantity: 1 }]);
    }
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    const next = Math.min(Math.floor(quantity), MAX_QTY_PER_ITEM);
    write(getSnapshot().flatMap((line) => line.id !== id ? [line] : next >= 1 ? [{ ...line, quantity: next }] : []));
  }, []);

  const clear = useCallback(() => write([]), []);

  /**
   * Syncs the cart with the live menu: dishes that were deleted or made unavailable are dropped,
   * and names/prices are refreshed. Returns the names of the dishes that were removed.
   * (A cart restored from storage can be days old, so its ids may no longer be orderable.)
   */
  const reconcile = useCallback((menu: { id: string; name: string; price: number }[]) => {
    const live = new Map(menu.map((item) => [item.id, item]));
    const removed: string[] = [];
    let changed = false;
    const next = getSnapshot().flatMap((line) => {
      const current = live.get(line.id);
      if (!current) {
        removed.push(line.name);
        changed = true;
        return [];
      }
      if (current.name !== line.name || current.price !== line.price) {
        changed = true;
        return [{ ...line, name: current.name, price: current.price }];
      }
      return [line];
    });
    if (changed) write(next);
    return removed;
  }, []);

  return useMemo(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    // integer cents avoid floating-point drift (e.g. 3 x 12.10)
    const totalCents = lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0);
    return { lines, count, total: totalCents / 100, add, setQuantity, clear, reconcile };
  }, [lines, add, setQuantity, clear, reconcile]);
}
