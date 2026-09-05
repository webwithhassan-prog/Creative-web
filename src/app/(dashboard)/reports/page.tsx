import Link from "next/link";
import { BookText, Scale, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const REPORTS = [
  {
    href: "/reports/day-book",
    icon: BookText,
    title: "Day Book",
    description:
      "Every purchase, sale and payment in chronological order for a date range you choose.",
  },
  {
    href: "/reports/trial-balance",
    icon: Scale,
    title: "Trial Balance",
    description:
      "Every supplier and customer's balance as of a given date, split into Debit and Credit columns.",
  },
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Printable statements beyond a single account" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="ledger-sheet group rounded-md p-6 pl-6 transition hover:bg-paper-alt/50"
          >
            <Icon size={22} className="text-gold" strokeWidth={1.75} />
            <p className="mt-3 flex items-center gap-1.5 font-serif text-lg font-semibold text-forest-dark">
              {title}
              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-0.5"
              />
            </p>
            <p className="mt-1 text-sm text-ink-soft">{description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
