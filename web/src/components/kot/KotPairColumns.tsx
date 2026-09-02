import React from "react";

import type { KotPairColumnRow } from "@/lib/kot/kotOfficial50Questions";

type KotPairColumnsProps = {
  readonly rows: readonly KotPairColumnRow[];
};

/**
 * Две колонки пар (как в бланке КОТ): левая и правая строка для сравнения.
 */
export function KotPairColumns(props: KotPairColumnsProps): React.ReactElement {
  return (
    <div className="mb-4 space-y-3" role="presentation">
      {props.rows.map((row, i) => (
        <div
          key={`${row.left}-${row.right}-${String(i)}`}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-0"
        >
          <div className="font-mono text-[15px] leading-snug text-[#1a1a1a] tabular-nums sm:text-right">
            {row.left}
          </div>
          <div className="font-mono text-[15px] leading-snug text-[#1a1a1a] tabular-nums sm:border-l sm:border-black/10 sm:pl-8">
            {row.right}
          </div>
        </div>
      ))}
    </div>
  );
}
