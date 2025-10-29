export default function CheckoutLoading() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
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
    </div>
  );
}


