"use client";

import { AppShell, SimpleHeader } from "@/components/app-shell";

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell header={<SimpleHeader />}>
      <div className="max-w-lg px-4 py-8">
        <h1 className="text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.03em]">Dashboard failed to load</h1>
        <p className="mt-3 text-sm text-text-secondary" role="alert">
          {error.message || "An unexpected error occurred while reading local data files."}
        </p>
        <button type="button" onClick={reset} className="btn btn-accent mt-6">
          Try again
        </button>
      </div>
    </AppShell>
  );
}
