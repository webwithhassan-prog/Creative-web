import { LogOut } from "lucide-react";
import { Nav } from "./Nav";
import { logoutAction } from "@/app/(dashboard)/logout-action";
import type { SessionPayload } from "@/lib/auth";

export function Sidebar({ session }: { session: SessionPayload }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-forest-dark text-paper">
      <div className="flex items-center gap-3 border-b border-paper/10 px-5 py-6">
        <div className="brand-monogram flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <span className="font-serif text-sm font-bold text-forest-dark">CDC</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-sm font-bold leading-tight text-paper">
            Creative Dyes
          </p>
          <p className="truncate text-[11px] tracking-wide text-paper/50">
            and Chemicals
          </p>
        </div>
      </div>

      <Nav />

      <div className="border-t border-paper/10 px-4 py-4">
        <p className="truncate text-xs font-medium text-paper/80">{session.name}</p>
        <p className="truncate text-[11px] text-paper/40">{session.email}</p>
        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium text-paper/60 transition hover:bg-maroon/20 hover:text-paper"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
