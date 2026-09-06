import Link from "next/link";
import { LogOut, Settings, UserCog } from "lucide-react";
import { Nav } from "./Nav";
import { CompanySwitcher } from "./CompanySwitcher";
import { logoutAction } from "@/app/(dashboard)/logout-action";
import type { SessionPayload } from "@/lib/auth";
import type { Company } from "@prisma/client";

export function Sidebar({
  session,
  companies,
  activeCompany,
}: {
  session: SessionPayload;
  companies: Company[];
  activeCompany: Company | null;
}) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-forest-dark text-paper">
      <div className="flex items-center gap-3 border-b border-paper/10 px-5 py-6">
        <div className="brand-monogram flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <span className="font-serif text-sm font-bold text-forest-dark">CA</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-serif text-sm font-bold leading-tight text-paper">
            Creative Accounts
          </p>
          <p className="truncate text-[11px] tracking-wide text-paper/50">
            Ledger &amp; Accounts Register
          </p>
        </div>
      </div>

      <div className="border-b border-paper/10 px-4 py-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-paper/40">
          Company
        </p>
        {activeCompany && companies.length > 0 ? (
          <CompanySwitcher
            companies={companies.map((c) => ({ id: c.id, name: c.name }))}
            activeCompanyId={activeCompany.id}
          />
        ) : (
          <Link
            href="/companies/new"
            className="block rounded-sm border border-dashed border-paper/30 px-2.5 py-2 text-center text-xs font-medium text-paper/70 hover:border-gold hover:text-gold"
          >
            + Add a company
          </Link>
        )}
        <Link
          href="/companies"
          className="mt-2 flex items-center gap-1.5 text-xs text-paper/50 hover:text-gold-bright"
        >
          <Settings size={12} /> Manage companies
        </Link>
      </div>

      <Nav />

      <div className="border-t border-paper/10 px-4 py-4">
        <p className="truncate text-xs font-medium text-paper/80">{session.name}</p>
        <p className="truncate text-[11px] text-paper/40">{session.email}</p>
        <Link
          href="/account"
          className="mt-2 flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium text-paper/60 transition hover:bg-paper/10 hover:text-paper"
        >
          <UserCog size={14} />
          Account settings
        </Link>
        <form action={logoutAction} className="mt-1">
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
