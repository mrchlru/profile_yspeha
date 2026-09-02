import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Управляет множественным выбором элементов списка по id.
 */
export function useBulkSelection<T>(
  items: ReadonlyArray<T>,
  getId: (item: T) => string
): {
  selectedIds: ReadonlySet<string>;
  selectedCount: number;
  allSelected: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  getSelectedItems: () => T[];
} {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());

  const itemIds = useMemo(() => items.map(getId), [items, getId]);

  useEffect(() => {
    setSelectedIds((previous) => {
      const validIds = new Set(itemIds);
      const next = new Set([...previous].filter((id) => validIds.has(id)));
      if (next.size === previous.size) {
        return previous;
      }
      return next;
    });
  }, [itemIds]);

  const toggle = useCallback((id: string): void => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((): void => {
    setSelectedIds((previous) => {
      if (previous.size === itemIds.length && itemIds.length > 0) {
        return new Set();
      }
      return new Set(itemIds);
    });
  }, [itemIds]);

  const clear = useCallback((): void => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string): boolean => selectedIds.has(id), [selectedIds]);

  const getSelectedItems = useCallback((): T[] => {
    return items.filter((item) => selectedIds.has(getId(item)));
  }, [getId, items, selectedIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    allSelected: itemIds.length > 0 && selectedIds.size === itemIds.length,
    isSelected,
    toggle,
    toggleAll,
    clear,
    getSelectedItems,
  };
}
