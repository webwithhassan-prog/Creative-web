import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "bad";
}) {
  return (
    <div className="ledger-sheet rounded-md p-5 pl-14">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </p>
        <Icon size={18} className="text-gold" strokeWidth={1.75} />
      </div>
      <p
        className={clsx(
          "tabular mt-2 font-serif text-2xl font-bold",
          tone === "good" && "text-forest",
          tone === "bad" && "text-maroon",
          tone === "neutral" && "text-ink"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
