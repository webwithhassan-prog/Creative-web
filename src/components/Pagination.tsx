import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { btnSecondary } from "@/lib/ui";

export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  extraQuery = "",
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  extraQuery?: string;
}) {
  if (totalPages <= 1) return null;

  const qs = extraQuery ? `${extraQuery}&` : "";

  return (
    <div className="no-print mt-4 flex items-center justify-between text-sm text-ink-soft">
      <span>
        Page {page} of {totalPages} ({total} total)
      </span>
      <div className="flex gap-2">
        <Link
          href={`${basePath}?${qs}page=${page - 1}`}
          aria-disabled={page <= 1}
          className={`${btnSecondary} ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
        >
          <ChevronLeft size={16} /> Prev
        </Link>
        <Link
          href={`${basePath}?${qs}page=${page + 1}`}
          aria-disabled={page >= totalPages}
          className={`${btnSecondary} ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
        >
          Next <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
