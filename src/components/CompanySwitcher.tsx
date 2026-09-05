"use client";

import { useRef } from "react";
import { switchCompany } from "@/app/(dashboard)/companies/actions";
import type { Company } from "@prisma/client";

export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: Company[];
  activeCompanyId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={switchCompany}>
      <select
        name="companyId"
        defaultValue={activeCompanyId}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full truncate rounded-sm border border-paper/20 bg-forest px-2.5 py-2 text-sm font-medium text-paper outline-none transition hover:bg-forest-light focus:ring-2 focus:ring-gold/40"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id} className="text-ink">
            {c.name}
          </option>
        ))}
      </select>
    </form>
  );
}
