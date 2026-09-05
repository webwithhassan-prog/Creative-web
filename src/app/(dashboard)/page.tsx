import Link from "next/link";
import clsx from "clsx";
import { Landmark, HandCoins, Boxes, AlertTriangle, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { closingBalance, balanceLabel } from "@/lib/ledger";
import { formatMoney, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { MonthlyTrendChart, type MonthlyTotal } from "@/components/MonthlyTrendChart";
import { requireActiveCompany } from "@/lib/company";

const RANGES = [
  { value: "1", label: "This Month" },
  { value: "3", label: "3 Months" },
  { value: "6", label: "6 Months" },
  { value: "12", label: "12 Months" },
  { value: "year", label: "This Year" },
] as const;

type Period = { label: string; start: Date; end: Date };

/** Builds the chart's buckets: weeks within the current month for "1", otherwise calendar months. */
function buildPeriods(range: string): Period[] {
  if (range === "1") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const periods: Period[] = [];
    let weekStart = monthStart;
    let weekNo = 1;
    while (weekStart < monthEnd) {
      const weekEnd = new Date(Math.min(weekStart.getTime() + 7 * 86_400_000, monthEnd.getTime()));
      periods.push({ label: `Week ${weekNo}`, start: weekStart, end: weekEnd });
      weekStart = weekEnd;
      weekNo += 1;
    }
    return periods;
  }

  const monthCount = range === "year" ? new Date().getMonth() + 1 : [3, 6, 12].includes(Number(range)) ? Number(range) : 6;
  const spansMultipleYears = monthCount > 6;
  const periods: Period[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - i);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    periods.push({
      label: start.toLocaleDateString("en-US", spansMultipleYears ? { month: "short", year: "2-digit" } : { month: "short" }),
      start,
      end,
    });
  }
  return periods;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { active } = await requireActiveCompany();
  const companyId = active.id;
  const { range: rangeParam } = await searchParams;
  const range = RANGES.some((r) => r.value === rangeParam) ? rangeParam! : "6";
  const periods = buildPeriods(range);
  const trendStart = periods[0].start;

  const [
    parties,
    products,
    recentPurchases,
    recentSales,
    recentPayments,
    trendPurchases,
    trendSales,
  ] = await Promise.all([
    prisma.party.findMany({
      where: { companyId },
      include: { purchaseInvoices: true, saleInvoices: true, payments: true },
    }),
    prisma.product.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.purchaseInvoice.findMany({
      where: { companyId },
      include: { party: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.saleInvoice.findMany({
      where: { companyId },
      include: { party: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { companyId },
      include: { party: true },
      orderBy: { date: "desc" },
      take: 5,
    }),
    prisma.purchaseInvoice.findMany({
      where: { companyId, date: { gte: trendStart } },
      select: { date: true, totalAmount: true },
    }),
    prisma.saleInvoice.findMany({
      where: { companyId, date: { gte: trendStart } },
      select: { date: true, totalAmount: true },
    }),
  ]);

  const monthlyTrend: MonthlyTotal[] = periods.map((period) => {
    const purchases = trendPurchases
      .filter((p) => p.date >= period.start && p.date < period.end)
      .reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const sales = trendSales
      .filter((s) => s.date >= period.start && s.date < period.end)
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);

    return { label: period.label, purchases, sales };
  });

  let totalPayable = 0;
  let totalReceivable = 0;

  for (const party of parties) {
    const balance = closingBalance(party);
    const { amount, side } = balanceLabel(balance);
    if (party.type === "SUPPLIER" && side === "Cr") totalPayable += amount;
    if (party.type === "CUSTOMER" && side === "Dr") totalReceivable += amount;
  }

  const lowStock = products.filter(
    (p) => Number(p.currentStock) <= Number(p.reorderLevel)
  );

  const activity = [
    ...recentPurchases.map((p) => ({
      id: `pur-${p.id}`,
      date: p.date,
      label: `Purchase from ${p.party.name}`,
      ref: p.invoiceNo,
      amount: Number(p.totalAmount),
      href: `/purchases/${p.id}`,
      tone: "bad" as const,
    })),
    ...recentSales.map((s) => ({
      id: `sale-${s.id}`,
      date: s.date,
      label: `Sale to ${s.party.name}`,
      ref: s.invoiceNo,
      amount: Number(s.totalAmount),
      href: `/sales/${s.id}`,
      tone: "good" as const,
    })),
    ...recentPayments.map((p) => ({
      id: `pay-${p.id}`,
      date: p.date,
      label:
        p.direction === "OUT"
          ? `Payment to ${p.party.name}`
          : `Payment from ${p.party.name}`,
      ref: p.method,
      amount: Number(p.amount),
      href: `/parties/${p.partyId}`,
      tone: p.direction === "OUT" ? ("bad" as const) : ("good" as const),
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your ledgers, stock and recent activity"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Receivable"
          value={formatMoney(totalReceivable)}
          hint="Owed to you by customers"
          icon={HandCoins}
          tone="good"
        />
        <StatCard
          label="Total Payable"
          value={formatMoney(totalPayable)}
          hint="Owed by you to suppliers"
          icon={Landmark}
          tone="bad"
        />
        <StatCard
          label="Products"
          value={String(products.length)}
          hint="Active items in inventory"
          icon={Boxes}
        />
        <StatCard
          label="Low Stock Alerts"
          value={String(lowStock.length)}
          hint={lowStock.length ? "Below reorder level" : "All stock healthy"}
          icon={AlertTriangle}
          tone={lowStock.length ? "bad" : "neutral"}
        />
      </div>

      <div className="ledger-sheet mt-8 rounded-md p-6 pl-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-forest-dark">
            Sales &amp; Purchases
          </h2>
          <div className="flex flex-wrap gap-1 rounded-sm border border-rule-strong bg-paper p-1">
            {RANGES.map((r) => (
              <Link
                key={r.value}
                href={`/?range=${r.value}`}
                className={clsx(
                  "rounded-sm px-2.5 py-1 text-xs font-semibold transition",
                  range === r.value
                    ? "bg-forest text-paper"
                    : "text-ink-soft hover:text-ink"
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>
        <MonthlyTrendChart data={monthlyTrend} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="ledger-sheet rounded-md p-6 pl-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-forest-dark">
              Recent Activity
            </h2>
          </div>
          {activity.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No transactions recorded yet. Start by adding a purchase or sale.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-4 py-3 transition hover:bg-paper-alt/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {item.label}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {formatDate(item.date)} · {item.ref}
                      </p>
                    </div>
                    <span
                      className={`tabular shrink-0 text-sm font-semibold ${
                        item.tone === "good" ? "text-forest" : "text-maroon"
                      }`}
                    >
                      {formatMoney(item.amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ledger-sheet rounded-md p-6 pl-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-forest-dark">
              Low Stock
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Every product is at or above its reorder level.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {lowStock.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <span className="truncate text-sm font-medium text-ink">
                    {p.name}
                  </span>
                  <span className="tabular text-sm font-semibold text-maroon">
                    {Number(p.currentStock)} {p.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
