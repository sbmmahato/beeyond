"use client";

import { useFormStatus } from "react-dom";

export default function AddToCartButton({ disabled, children }: { disabled?: boolean; children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="mt-3 inline-flex items-center justify-center rounded bg-black text-white px-3 py-2 text-sm disabled:opacity-50"
    >
      {pending ? "Adding…" : children || "Add to Cart"}
    </button>
  );
}


