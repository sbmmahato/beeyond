"use client";

import { useEffect, useState } from "react";

type CartItem = { productId: string; name: string; price: number; stock: number; qty: number };

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"update" | "remove" | null>(null);
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  async function load() {
    setIsLoading(true);
    const res = await fetch(`${base}/api/cart`, { headers: { "x-user-id": "demo-user" }, cache: "no-store" });
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setIsLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateQty(productId: string, qty: number) {
    setPendingId(productId);
    setPendingAction("update");
    await fetch(`${base}/api/cart/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-id": "demo-user" },
      body: JSON.stringify({ qty }),
    });
    await load();
    setPendingId(null);
    setPendingAction(null);
  }
  async function removeItem(productId: string) {
    setPendingId(productId);
    setPendingAction("remove");
    await fetch(`${base}/api/cart/${productId}`, {
      method: "DELETE",
      headers: { "x-user-id": "demo-user" },
    });
    await load();
    setPendingId(null);
    setPendingAction(null);
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">Cart</h1>
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white shadow animate-pulse">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 w-1/2 rounded mb-2" />
                <div className="h-3 bg-gray-200 w-1/3 rounded" />
              </div>
              <div className="h-9 w-28 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}
      {!isLoading && items.length === 0 && <p className="text-gray-600">Cart is empty.</p>}
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.productId} className="flex items-center gap-4 p-4 rounded-lg bg-white shadow">
            <div className="flex-1">
              <div className="font-medium">{i.name}</div>
              <div className="text-sm text-gray-600">Price: ₹{i.price}</div>
              <div className={`text-xs mt-1 ${i.stock <= 2 ? 'text-red-600' : 'text-gray-600'}`}>
                {i.stock <= 2 ? `Only ${i.stock} left` : `In stock: ${i.stock}`}
              </div>
            </div>
            <div className="flex items-center border rounded">
              <button className="px-3 py-2 disabled:opacity-50" disabled={pendingId === i.productId} onClick={() => updateQty(i.productId, Math.max(1, i.qty - 1))}>-</button>
              <span className="px-3 py-2 border-l border-r">
                {pendingId === i.productId && pendingAction === 'update' ? '...' : i.qty}
              </span>
              <button className="px-3 py-2 disabled:opacity-50" disabled={pendingId === i.productId} onClick={() => updateQty(i.productId, Math.min(5, i.qty + 1))}>+</button>
            </div>
            <button className="text-sm text-red-600 disabled:opacity-50" disabled={pendingId === i.productId} onClick={() => removeItem(i.productId)}>
              {pendingId === i.productId && pendingAction === 'remove' ? 'Removing…' : 'Remove'}
            </button>
          </div>
        ))}
      </div>
      {!isLoading && <div className="mt-6 text-xl font-semibold">Total: ₹{total}</div>}
      <div className="mt-4">
        <a href="/checkout" className="inline-flex items-center px-4 py-2 rounded bg-black text-white">Proceed to Checkout</a>
      </div>
    </main>
  );
}
