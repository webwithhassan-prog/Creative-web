import { Search } from "lucide-react";
import { inputClass } from "@/lib/ui";

export function SearchBox({
  defaultValue,
  placeholder,
  hidden,
}: {
  defaultValue?: string;
  placeholder: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form className="relative w-full max-w-xs">
      {hidden &&
        Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
      />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`${inputClass} pl-9`}
      />
    </form>
  );
}
