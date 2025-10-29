import "./globals.css";

export const metadata = { title: "Shop", description: "Inventory-aware checkout demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-semibold">Store</a>
          <div className="flex gap-4">
            <a href="/" className="text-sm text-gray-700 hover:text-black">Catalog</a>
            <a href="/cart" className="text-sm text-gray-700 hover:text-black">Cart</a>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 pb-24">{children}</main>
      </body>
    </html>
  );
}
