import React from 'react';

export function DesktopCalendarSkeleton({ label = 'Órarend betöltése...' }: { label?: string }) {
  return (
    <div className="h-full w-full bg-stone-200/50 rounded-2xl animate-pulse flex items-center justify-center border border-stone-300">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-warm-terracotta border-t-transparent animate-spin" />
        <span className="text-stone-600 font-medium text-sm">{label}</span>
      </div>
    </div>
  );
}

export function MobileCalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white rounded-xl border border-stone-300 h-28 p-4 flex flex-col justify-between">
        <div className="h-5 bg-stone-200 rounded w-1/3" />
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-stone-100 rounded" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-stone-300 h-36 p-4 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-warm-terracotta border-t-transparent animate-spin" />
      </div>
      <div className="bg-white rounded-xl border border-stone-300 h-36 p-4" />
    </div>
  );
}

export function CalendarPageSkeleton({ wrapperClassName }: { wrapperClassName?: string }) {
  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Órarend & Edzések
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Válogass csoportos edzéseink közül, szűrj kategóriák szerint és foglald le a helyedet.
        </p>
      </div>
      <div className="mb-4 bg-white rounded-xl shadow-xs border border-stone-300 p-3 sm:p-4 h-24 animate-pulse" />
      <div className="hidden md:block">
        <div className={wrapperClassName}>
          <DesktopCalendarSkeleton label="Órarend betöltése..." />
        </div>
      </div>
      <div className="md:hidden">
        <MobileCalendarSkeleton />
      </div>
    </div>
  );
}
