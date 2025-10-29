"use client";

export default function Loading({ label = "Loading...", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-gray-700 ${className}`}>
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
      <span className="text-sm">{label}</span>
    </div>
  );
}


