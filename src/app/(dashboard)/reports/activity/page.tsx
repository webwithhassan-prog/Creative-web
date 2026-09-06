import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { requireActiveCompany } from "@/lib/company";

const PAGE_SIZE = 50;

const ACTION_STYLES: Record<string, string> = {
  CREATE: "text-forest",
  UPDATE: "text-ink-soft",
  DELETE: "text-maroon",
};

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { active } = await requireActiveCompany();
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { companyId: active.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where: { companyId: active.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Activity Log"
        subtitle={`${active.name} — every create, update and delete, and who did it`}
      />

      <div className="ledger-sheet rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule-strong bg-paper-alt/70 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft">
                <th className="py-3 pl-6 pr-4">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-soft">
                    No activity recorded yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="transition hover:bg-paper-alt/50">
                    <td className="whitespace-nowrap py-3 pl-6 pr-4 text-ink-soft">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-ink">{entry.actorName}</td>
                    <td className={`px-4 py-3 font-semibold ${ACTION_STYLES[entry.action] ?? ""}`}>
                      {entry.action}
                    </td>
                    <td className="px-4 py-3 text-ink">{entry.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} basePath="/reports/activity" />
    </>
  );
}
