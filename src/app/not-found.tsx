import Link from "next/link";
import { AppShell, SimpleHeader } from "@/components/app-shell";

export default function NotFound() {
  return (
    <AppShell header={<SimpleHeader />}>
      <div className="max-w-lg px-4 py-8">
        <h1 className="text-[1.5rem] leading-[1.15] font-semibold tracking-[-0.03em]">Company not found</h1>
        <p className="mt-3 text-sm text-text-secondary">That slug is not in the OurCrowd seed list.</p>
        <Link href="/" className="btn btn-accent mt-6">
          Back to desk
        </Link>
      </div>
    </AppShell>
  );
}
