import type { Company } from "@prisma/client";
import { formatDateTime } from "@/lib/format";

export function InvoiceLetterhead({ company }: { company: Company }) {
  return (
    <div className="mb-6 border-b-2 border-forest/70 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
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
            {company.gstin && (
              <p className="text-sm text-ink-soft">GSTIN: {company.gstin}</p>
            )}
          </div>
        </div>
        <p className="print-only shrink-0 whitespace-nowrap text-xs text-ink-soft">
          Printed {formatDateTime(new Date())}
        </p>
      </div>
    </div>
  );
}
