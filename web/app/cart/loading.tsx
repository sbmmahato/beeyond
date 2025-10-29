export default function CartLoading() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Cart</h1>
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
    </div>
  );
}


