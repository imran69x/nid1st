import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h2 className="text-3xl font-extrabold text-slate-900 mb-2">404 - Page Not Found</h2>
      <p className="text-slate-500 mb-6 text-sm">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-800 text-white rounded-xl text-xs font-bold hover:bg-brand-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Return to Home
      </Link>
    </div>
  );
}
