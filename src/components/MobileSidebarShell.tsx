"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function MobileSidebarShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-rule-strong bg-forest-dark px-4 py-3 text-paper md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-sm hover:bg-paper/10"
        >
          <Menu size={22} />
        </button>
        <div className="brand-monogram flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <span className="font-serif text-xs font-bold text-forest-dark">CDC</span>
        </div>
        <span className="font-serif text-sm font-bold">Creative Dyes and Chemicals</span>
      </header>

      {open && (
        <div
          className="no-print fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`no-print fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:transform-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-sm text-paper hover:bg-paper/10 md:hidden"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </>
  );
}
