export default function Loading() {
  return (
    <div className="container mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 animate-pulse">
      <div className="h-8 w-48 bg-stone-200 rounded-xl mb-3" />
      <div className="h-4 w-80 bg-stone-200/80 rounded-lg mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-72 bg-stone-200/70 rounded-2xl border border-stone-200" />
        <div className="h-72 bg-stone-200/70 rounded-2xl border border-stone-200 md:col-span-2" />
      </div>

      <div className="mt-8 space-y-4">
        <div className="h-16 bg-stone-200/60 rounded-xl" />
        <div className="h-16 bg-stone-200/60 rounded-xl" />
        <div className="h-16 bg-stone-200/60 rounded-xl" />
      </div>
    </div>
  );
}
