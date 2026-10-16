import React from "react";

export type MethodologyCriteriaTableRow = {
  criterion: string;
  value: string;
};

export type MethodologyCriteriaTableProps = {
  leftHeader: string;
  rightHeader: string;
  rows: ReadonlyArray<MethodologyCriteriaTableRow>;
};

/**
 * Двухколоночная таблица «критерий — описание теста» (лист IQ в справочнике).
 */
export function MethodologyCriteriaTable({
  leftHeader,
  rightHeader,
  rows,
}: MethodologyCriteriaTableProps): React.ReactElement {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 bg-white/90">
      <table className="min-w-full text-left text-[13px] leading-snug text-[#4F4F4F]">
        <thead>
          <tr className="border-b border-black/10 bg-[#E8F0EE] text-[12px] font-bold text-[#4F4F4F]">
            <th className="px-3 py-2.5 align-top">{leftHeader}</th>
            <th className="px-3 py-2.5 align-top">{rightHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.criterion} className="border-t border-black/5 align-top even:bg-[#FAFAFA]">
              <td className="px-3 py-2.5 font-semibold whitespace-pre-wrap">{row.criterion}</td>
              <td className="px-3 py-2.5 whitespace-pre-wrap">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
