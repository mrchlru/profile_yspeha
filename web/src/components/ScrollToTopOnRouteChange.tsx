"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { scrollPageToTop } from "@/lib/scrollPageToTop";

/**
 * При смене маршрута прокручивает страницу к началу (скрининг, аудит, intro).
 */
export function ScrollToTopOnRouteChange(): null {
  const pathname = usePathname();

  useEffect(() => {
    scrollPageToTop();
  }, [pathname]);

  return null;
}
