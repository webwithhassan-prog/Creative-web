import Link from "next/link";
import { BookText, Scale, ArrowRight, Clock, History, DatabaseBackup, Receipt, UploadCloud } from "lucide-react";
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
  {
    href: "/reports/aging",
    icon: Clock,
    title: "Aging Report",
    description:
      "Outstanding balances broken down by how long they've been open — current, 1-30, 31-60, 61-90, 90+ days.",
  },
  {
    href: "/reports/tax-summary",
    icon: Receipt,
    title: "Tax Summary",
    description:
      "Output tax collected on sales vs. input tax paid on purchases for a date range, with the net payable.",
  },
  {
    href: "/reports/activity",
    icon: History,
    title: "Activity Log",
    description: "Every create, update and delete across this company, with who did it and when.",
  },
  {
    href: "/reports/backup/export",
    icon: DatabaseBackup,
    title: "Data Backup",
    description:
      "Download everything for this company — accounts, products, invoices, payments and the activity log — as one JSON file.",
  },
  {
    href: "/reports/backup/restore",
    icon: UploadCloud,
    title: "Restore Backup",
    description:
      "Load a backup JSON file into a brand-new company — never overwrites what's already here.",
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
