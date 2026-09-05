import type { Company } from "@prisma/client";

export function InvoiceLetterhead({ company }: { company: Company }) {
  return (
    <div className="mb-6 flex items-center gap-4 border-b border-rule-strong pb-5">
      {company.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={company.logo}
          alt={`${company.name} logo`}
          className="h-16 w-16 shrink-0 rounded-sm object-contain"
        />
      ) : null}
      <div className="min-w-0">
        <p className="font-serif text-xl font-bold text-forest-dark">{company.name}</p>
        {company.address && <p className="text-sm text-ink-soft">{company.address}</p>}
        <p className="text-sm text-ink-soft">
          {[company.phone, company.email].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}
