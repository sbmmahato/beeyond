"use client";

import { useEffect, useMemo, useState } from "react";

type CartItem = { productId: string; name: string; price: number; stock: number; qty: number };

export default function CheckoutPage() {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [shipping, setShipping] = useState("standard");
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function load() {
    setIsLoading(true);
    const res = await fetch(`${base}/api/cart`, { headers: { "x-user-id": "demo-user" }, cache: "no-store" });
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setIsLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function reserve() {
    setError(null);
    if (!address || address.trim().length < 5) {
      setAddressError("Address must be at least 5 characters");
      return;
    }
    setAddressError(null);
    setIsReserving(true);
    const res = await fetch(`${base}/api/checkout/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "demo-user" },
      body: JSON.stringify({ address, shippingMethod: shipping })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "reserve_failed"); setIsReserving(false); return; }
    setReservationId(data.reservationId);
    setExpiresAt(data.expiresAt);
    setIsReserving(false);
  }

  async function confirm() {
    if (!reservationId) return;
    setError(null);
    setIsConfirming(true);
    const res = await fetch(`${base}/api/checkout/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "demo-user" },
      body: JSON.stringify({ reservationId })
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "confirm_failed"); setIsConfirming(false); return; }
    window.location.href = `/order/${data.orderId}`;
  }

  const remaining = useRemainingTime(expiresAt);

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
      {isLoading && (
        <div className="grid md:grid-cols-2 gap-6 animate-pulse">
          <div className="bg-white shadow rounded p-4">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
          <div className="bg-white shadow rounded p-4">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
              <div className="h-3 bg-gray-200 rounded" />
            </div>
            <div className="h-9 bg-gray-200 rounded mt-4" />
          </div>
        </div>
      )}
      {!isLoading && (
        <>
      {error && <div className="mb-3 text-red-600">{error}</div>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-medium mb-3">Shipping</h2>
          <label className="block text-sm mb-2">Address</label>
          <textarea
            className={`w-full border rounded p-2 ${addressError ? 'border-red-500' : ''}`}
            value={address}
            onChange={(e) => {
              const v = e.target.value;
              setAddress(v);
              if (v.trim().length < 5) setAddressError("Address must be at least 5 characters"); else setAddressError(null);
            }}
            rows={4}
            aria-invalid={!!addressError}
            aria-describedby={addressError ? 'address-error' : undefined}
          />
          {addressError && <div id="address-error" className="text-sm text-red-600 mt-1" aria-live="polite">{addressError}</div>}
          <label className="block text-sm mt-3 mb-1">Shipping Method</label>
          <select className="border rounded p-2" value={shipping} onChange={(e) => setShipping(e.target.value)}>
            <option value="standard">Standard</option>
            <option value="express">Express</option>
          </select>
        </div>
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-medium mb-3">Order Summary</h2>
          <div className="space-y-2 mb-3">
            {items.map((i) => (
              <div key={i.productId} className="flex justify-between text-sm">
                <span>{i.name} × {i.qty}</span>
                <span>₹{i.qty * i.price}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          {!reservationId ? (
            <button onClick={reserve} disabled={!address || !!addressError || isReserving} className="mt-4 w-full rounded bg-black text-white px-4 py-2 disabled:opacity-50">
              {isReserving ? 'Reserving…' : 'Reserve for 10 minutes'}
            </button>
          ) : (
            <div className="mt-4">
              <div className="text-sm text-gray-700">Reservation: <span className="font-mono">{reservationId}</span></div>
              <div className="text-sm text-gray-700 mt-1">Expires in: <span className="font-semibold">{remaining}</span></div>
              <button onClick={confirm} disabled={isConfirming} className="mt-3 w-full rounded bg-emerald-600 text-white px-4 py-2 disabled:opacity-50">
                {isConfirming ? 'Confirming…' : 'Confirm Order'}
              </button>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </main>
  );
}

function useRemainingTime(expiresAt: string | null) {
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return useMemo(() => {
    if (!expiresAt) return "--:--";
    const end = new Date(expiresAt).getTime();
    const diff = Math.max(0, end - now);
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s)}`;
  }, [expiresAt, now]);
}
