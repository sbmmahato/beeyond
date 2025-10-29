import { revalidatePath } from "next/cache";
import AddToCartButton from "../components/AddToCartButton";

async function getProducts() {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
  const res = await fetch(`${base}/api/products?limit=24`, { next: { revalidate: 0 } });
  if (!res.ok) return { items: [], total: 0 };
  return res.json();
}

export default async function Page() {
  const { items } = await getProducts();
  async function addToCart(formData: FormData) {
    "use server";
    const productId = String(formData.get("productId"));
    const qty = Number(formData.get("qty")) || 1;
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
    await fetch(`${base}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
      body: JSON.stringify({ productId, qty })
    });
    revalidatePath("/cart");
  }
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Catalog</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((p: any) => (
          <form key={p.id} action={addToCart} className="bg-white rounded-lg shadow p-4 flex flex-col">
            <img src={p.image || "https://via.placeholder.com/400x300"} alt={p.name} className="rounded mb-3 aspect-[4/3] object-cover" />
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-gray-600">SKU: {p.sku}</div>
              <div className="mt-2 font-semibold">₹{p.price}</div>
              <div className="text-xs text-gray-600 mt-1">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</div>
            </div>
            <input type="hidden" name="productId" value={p.id} />
            <input type="hidden" name="qty" value={1} />
            <AddToCartButton disabled={p.stock <= 0}>
              {p.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </AddToCartButton>
          </form>
        ))}
      </div>
    </div>
  );
}
