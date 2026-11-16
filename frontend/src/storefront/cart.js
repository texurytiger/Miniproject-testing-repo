import { useEffect, useState } from 'react';

/**
 * Browser-side cart (like a guest cart). Checkout is server-side in Sprint 2 (E2 orders + payments),
 * so nothing here is trusted: prices are re-read from the server at checkout.
 */
const KEY = 'team3.cart';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const write = (items) => {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* private mode */ }
  window.dispatchEvent(new Event('team3:cart'));
};

export const cart = {
  items: read,
  add(product, qty = 1) {
    const items = read();
    const row = items.find((i) => i.id === product.id);
    if (row) row.qty = Math.min(10, row.qty + qty);
    else items.push({ id: product.id, name: product.name, price: product.price, mrp: product.mrp, image: product.image, category: product.category, qty });
    write(items);
  },
  setQty(id, qty) { write(read().map((i) => (i.id === id ? { ...i, qty } : i)).filter((i) => i.qty > 0)); },
  clear() { write([]); },
};

export function useCart() {
  const [items, setItems] = useState(read);
  useEffect(() => {
    const on = () => setItems(read());
    window.addEventListener('team3:cart', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('team3:cart', on); window.removeEventListener('storage', on); };
  }, []);
  return { items, count: items.reduce((n, i) => n + i.qty, 0), total: items.reduce((n, i) => n + i.qty * i.price, 0) };
}

export const rupees = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
export const off = (p) => (p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);
