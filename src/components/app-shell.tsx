import Link from "next/link";
import { DeskMark } from "@/components/desk-mark";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  fillViewport?: boolean;
}

export function AppShell({ children, header, footer, fillViewport = false }: AppShellProps) {
  return (
    <div className={`desk-shell${fillViewport ? " desk-shell--fill" : ""}`}>
      {header}
      <div className="desk-main mx-auto flex w-full min-h-0 max-w-[1920px] flex-col">
        {children}
      </div>
      {footer}
    </div>
  );
}

export function SimpleHeader() {
  return (
    <header className="desk-header">
      <Link href="/" className="inline-flex items-center gap-2 text-[1.05rem] font-semibold tracking-[-0.02em]">
        <DeskMark size={20} />
        OurCrowd <span className="text-brand">Press</span>
        <span className="ml-2 text-[11px] font-medium tracking-[0.04em] text-text-secondary uppercase">
          Portfolio Coverage Desk
        </span>
      </Link>
    </header>
  );
}
