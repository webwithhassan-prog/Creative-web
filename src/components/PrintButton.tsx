"use client";

import { Printer } from "lucide-react";
import { btnSecondary } from "@/lib/ui";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={btnSecondary}
    >
      <Printer size={16} /> Print Statement
    </button>
  );
}
