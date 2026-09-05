"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

export type MonthlyTotal = {
  label: string;
  purchases: number;
  sales: number;
};

const WIDTH = 640;
const HEIGHT = 260;
const PADDING_LEFT = 56;
const PADDING_BOTTOM = 28;
const PADDING_TOP = 16;
const PADDING_RIGHT = 16;

/** Rounds up to a "nice" axis maximum using the classic 1 / 2 / 5 / 10 step pattern. */
function niceCeiling(value: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
}

export function MonthlyTrendChart({ data }: { data: MonthlyTotal[] }) {
  const [hover, setHover] = useState<{ month: string; series: "Sales" | "Purchases"; value: number } | null>(
    null
  );

  const maxValue = Math.max(1000, ...data.flatMap((d) => [d.purchases, d.sales]));
  const niceMax = niceCeiling(maxValue);

  const chartWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(28, groupWidth * 0.32);
  const gap = 3;

  const yFor = (value: number) => PADDING_TOP + chartHeight * (1 - value / niceMax);
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PADDING_TOP + chartHeight * (1 - f),
    value: niceMax * f,
  }));

  return (
    <div className="relative">
      <div className="mb-3 flex items-center gap-4 text-xs font-medium text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-forest" /> Sales
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-maroon" /> Purchases
        </span>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Monthly sales and purchases trend">
        {gridLines.map((g) => (
          <g key={g.value}>
            <line
              x1={PADDING_LEFT}
              x2={WIDTH - PADDING_RIGHT}
              y1={g.y}
              y2={g.y}
              stroke="var(--rule)"
              strokeWidth={1}
            />
            <text x={PADDING_LEFT - 8} y={g.y + 3} textAnchor="end" fontSize={10} fill="var(--ink-soft)">
              {g.value >= 1000 ? `${(g.value / 1000).toFixed(0)}k` : g.value.toFixed(0)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const groupX = PADDING_LEFT + i * groupWidth;
          const centerX = groupX + groupWidth / 2;
          const salesX = centerX - barWidth - gap / 2;
          const purchasesX = centerX + gap / 2;
          const salesY = yFor(d.sales);
          const purchasesY = yFor(d.purchases);

          return (
            <g key={d.label}>
              <rect
                x={salesX}
                y={salesY}
                width={barWidth}
                height={Math.max(0, HEIGHT - PADDING_BOTTOM - salesY)}
                rx={3}
                fill="var(--forest)"
                opacity={hover && hover.month === d.label && hover.series !== "Sales" ? 0.5 : 1}
                onMouseEnter={() => setHover({ month: d.label, series: "Sales", value: d.sales })}
                onMouseLeave={() => setHover(null)}
              />
              <rect
                x={purchasesX}
                y={purchasesY}
                width={barWidth}
                height={Math.max(0, HEIGHT - PADDING_BOTTOM - purchasesY)}
                rx={3}
                fill="var(--maroon)"
                opacity={hover && hover.month === d.label && hover.series !== "Purchases" ? 0.5 : 1}
                onMouseEnter={() => setHover({ month: d.label, series: "Purchases", value: d.purchases })}
                onMouseLeave={() => setHover(null)}
              />
              <text
                x={centerX}
                y={HEIGHT - PADDING_BOTTOM + 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--ink-soft)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-sm border border-rule-strong bg-paper px-3 py-1.5 text-xs shadow-md">
          <span className="font-semibold text-ink">{hover.month}</span>
          <span className="ml-2 text-ink-soft">{hover.series}:</span>{" "}
          <span className="tabular font-semibold text-ink">{formatMoney(hover.value)}</span>
        </div>
      )}
    </div>
  );
}
