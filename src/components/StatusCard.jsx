import React from 'react';

export function StatusCard({ icon, count, label, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md p-4 w-48 hover:shadow-lg transition cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="text-gray-600 font-medium">{label}</div>
        {onClick && (
          <button className="text-xs text-blue-500 hover:underline">
            More ↗
          </button>
        )}
      </div>
      <div className="flex items-center mt-2 space-x-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-3xl font-semibold">{count}</span>
      </div>
    </div>
  );
}
