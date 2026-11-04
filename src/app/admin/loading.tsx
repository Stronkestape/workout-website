import React from 'react';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton matching AdminDashboardClient */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-4 sm:py-6">
            <div>
              <div className="h-7 w-56 bg-stone-200 rounded-lg animate-pulse" />
              <div className="h-4 w-72 bg-stone-200/80 rounded-md mt-2 animate-pulse" />
            </div>
          </div>

          {/* Navigation Tabs Skeleton */}
          <div className="border-t border-gray-200 -mb-px flex space-x-2 sm:space-x-8 py-3">
            <div className="h-5 w-28 bg-stone-200 rounded animate-pulse" />
            <div className="h-5 w-32 bg-stone-200/70 rounded animate-pulse" />
            <div className="h-5 w-36 bg-stone-200/60 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content Area Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[560px]">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <div className="h-7 w-48 bg-stone-200 rounded-lg animate-pulse" />
              <div className="h-4 w-80 bg-stone-200/80 rounded-md mt-2 animate-pulse" />
            </div>
            <div className="h-10 w-44 bg-stone-200 rounded-xl animate-pulse" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6 space-y-4">
            <div className="h-16 bg-stone-100 rounded-xl animate-pulse" />
            <div className="h-16 bg-stone-100 rounded-xl animate-pulse" />
            <div className="h-16 bg-stone-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
