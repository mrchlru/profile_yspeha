import React from "react";

import type { DashboardMethodologyContentBlock } from "@/lib/admin/dashboardMethodologyInfoTypes";

export type DashboardMethodologyInfoBodyProps = {
  blocks: ReadonlyArray<DashboardMethodologyContentBlock>;
};

/**
 * Текст справки методики из xlsx: заголовки, списки, подписи, итог.
 */
export function DashboardMethodologyInfoBody({
  blocks,
}: DashboardMethodologyInfoBodyProps): React.ReactElement {
  return (
    <div className="space-y-3 text-[#5F5E5E]">
      {blocks.map((block, index) => (
        <DashboardMethodologyContentBlockView key={blockKey(block, index)} block={block} />
      ))}
    </div>
  );
}

function blockKey(block: DashboardMethodologyContentBlock, index: number): string {
  switch (block.kind) {
    case "heading":
      return `h-${block.text.slice(0, 40)}-${String(index)}`;
    case "paragraph":
      return `p-${block.text.slice(0, 40)}-${String(index)}`;
    case "numbered":
      return `n-${String(index)}`;
    case "labeled":
      return `l-${block.label.slice(0, 24)}-${String(index)}`;
    case "summary":
      return `s-${String(index)}`;
    default:
      return `x-${String(index)}`;
  }
}

function DashboardMethodologyContentBlockView({
  block,
}: {
  block: DashboardMethodologyContentBlock;
}): React.ReactElement {
  switch (block.kind) {
    case "heading":
      return (
        <h3 className="pt-2 text-[15px] font-bold leading-snug text-[#3A3A3A] first:pt-0">{block.text}</h3>
      );
    case "paragraph":
      return <p className="text-[14px] leading-[1.65]">{block.text}</p>;
    case "numbered":
      return (
        <ol className="list-decimal space-y-2.5 pl-5 text-[14px] leading-[1.65] marker:font-semibold marker:text-[#3A3A3A]">
          {block.items.map((item, itemIndex) => (
            <li key={`${String(itemIndex)}-${item.slice(0, 32)}`}>{item}</li>
          ))}
        </ol>
      );
    case "labeled":
      return (
        <p className="text-[14px] leading-[1.65]">
          <span className="font-bold text-[#3A3A3A]">{block.label}:</span> {block.body}
        </p>
      );
    case "summary":
      return (
        <p className="mt-4 border-t border-black/8 pt-4 text-[14px] leading-[1.65]">
          <span className="font-bold text-[#3A3A3A]">Итог:</span> {block.body}
        </p>
      );
    default:
      return <></>;
  }
}
