import React from 'react';

export default function ProfileLoading() {
  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 min-h-[85vh]">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="h-4 w-20 bg-stone-200 rounded mb-2 animate-pulse" />
          <div className="h-8 w-44 bg-stone-200 rounded-lg animate-pulse" />
          <div className="h-4 w-80 max-w-full bg-stone-200/80 rounded mt-2 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-64 bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6 animate-pulse" />
        <div className="md:col-span-2 space-y-6">
          <div className="h-72 bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6 animate-pulse" />
          <div className="h-72 bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
