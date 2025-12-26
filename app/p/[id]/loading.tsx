/**
 * Loading skeleton for public prototype viewer
 */

export default function PrototypeLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header skeleton */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/10">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="w-6 h-6 rounded-md opacity-50" />
          <div className="w-32 h-4 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="w-28 h-8 rounded-lg bg-white/10 animate-pulse" />
      </header>

      {/* Content skeleton */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          {/* Phone frame skeleton for mobile, rectangle for desktop */}
          <div className="w-[300px] h-[600px] sm:w-[400px] sm:h-[700px] rounded-[40px] bg-white/5 animate-pulse" />
          <div className="flex items-center gap-2 text-white/40">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading prototype...</span>
          </div>
        </div>
      </main>
    </div>
  );
}
