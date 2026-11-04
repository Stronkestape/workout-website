import React from 'react';

export default function BookingsLoading() {
  return (
    <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 min-h-[85vh]">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="h-4 w-20 bg-stone-200 rounded mb-2 animate-pulse" />
          <div className="h-8 w-44 bg-stone-200 rounded-lg animate-pulse" />
          <div className="h-4 w-96 max-w-full bg-stone-200/80 rounded mt-2 animate-pulse" />
        </div>
        <div className="h-10 w-40 bg-stone-200 rounded-xl animate-pulse" />
      </div>

      <div className="space-y-4">
        <div className="h-28 bg-white rounded-2xl shadow-sm border border-stone-200/80 animate-pulse" />
        <div className="h-28 bg-white rounded-2xl shadow-sm border border-stone-200/80 animate-pulse" />
      </div>
    </div>
  );
}
