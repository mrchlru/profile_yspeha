"use client";

import React from "react";
import Image from "next/image";

import {
  DEFAULT_REPORT_BRAND_HYPERLINK_URL,
  TEST_BATTERY_BRAND_LOGO_PUBLIC_PATH,
} from "@/lib/report/reportBrandConstants";

type BtsBrandLogoLinkProps = {
  className?: string;
  width: number;
  height: number;
  priority?: boolean;
};

/** Логотип в шапке батарей тестов (`report-logo.png`, не wordmark отчётов). */
export function BtsBrandLogoLink({
  className,
  width,
  height,
  priority = false,
}: BtsBrandLogoLinkProps): React.ReactElement {
  return (
    <a
      href={DEFAULT_REPORT_BRAND_HYPERLINK_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label="Профиль Успеха"
    >
      <Image
        src={TEST_BATTERY_BRAND_LOGO_PUBLIC_PATH}
        alt="Профиль Успеха"
        width={width}
        height={height}
        className="h-full w-full object-contain object-left"
        priority={priority}
      />
    </a>
  );
}
