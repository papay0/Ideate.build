import Link from "next/link";

export default function PrototypeNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B8956F] to-[#8B6914] flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl font-bold">O</span>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">
          Prototype Not Found
        </h1>
        <p className="text-white/60 mb-6 max-w-md">
          This prototype may have been deleted or the link is incorrect.
        </p>
        <Link
          href="https://ideate.build"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#B8956F] to-[#A6845F] text-white font-medium rounded-xl hover:from-[#A6845F] hover:to-[#957555] transition-all shadow-lg"
        >
          Create Your Own Prototype
        </Link>
      </div>
    </div>
  );
}
