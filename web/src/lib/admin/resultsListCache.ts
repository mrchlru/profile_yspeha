import type { CandidateSearchTypeFilter } from "@/components/admin/CandidateSearchPanel";
import type { EmployeeFolderSummary } from "@/lib/admin/employeeFolderTypes";

export type ResultsListCacheKey = {
  query: string;
  typeFilter: CandidateSearchTypeFilter;
  archiveView: boolean;
};

export type ResultsListCacheEntry = {
  items: ReadonlyArray<EmployeeFolderSummary>;
  fetchedAt: number;
};

type CacheBucket = ResultsListCacheKey & ResultsListCacheEntry;

let cacheBucket: CacheBucket | null = null;

/**
 * Строит ключ кэша списка папок результатов.
 */
export function buildResultsListCacheKey(
  query: string,
  typeFilter: CandidateSearchTypeFilter,
  archiveView: boolean
): ResultsListCacheKey {
  return {
    query: query.trim(),
    typeFilter,
    archiveView,
  };
}

/**
 * Возвращает кэшированный список, если фильтры совпадают.
 */
export function readResultsListCache(
  key: ResultsListCacheKey
): ResultsListCacheEntry | null {
  if (cacheBucket === null) {
    return null;
  }
  if (!_sameKey(cacheBucket, key)) {
    return null;
  }
  return {
    items: cacheBucket.items,
    fetchedAt: cacheBucket.fetchedAt,
  };
}

/**
 * Сохраняет список папок в памяти вкладки.
 */
export function writeResultsListCache(
  key: ResultsListCacheKey,
  items: ReadonlyArray<EmployeeFolderSummary>
): void {
  cacheBucket = {
    ...key,
    items,
    fetchedAt: Date.now(),
  };
}

/**
 * Удаляет кэш списка (после удаления/архивации или явного сброса).
 */
export function clearResultsListCache(): void {
  cacheBucket = null;
}

/**
 * Удаляет одну папку из текущего кэша без сетевого запроса.
 */
export function removeResultsListCacheItem(folderKey: string): void {
  if (cacheBucket === null) {
    return;
  }
  cacheBucket = {
    ...cacheBucket,
    items: cacheBucket.items.filter((item) => item.key !== folderKey),
    fetchedAt: Date.now(),
  };
}

function _sameKey(a: ResultsListCacheKey, b: ResultsListCacheKey): boolean {
  return (
    a.query === b.query &&
    a.typeFilter === b.typeFilter &&
    a.archiveView === b.archiveView
  );
}
