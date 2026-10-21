"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import { AdminSettingsGroup } from "@/components/admin/AdminSettingsGroup";
import { AdminSettingsRow } from "@/components/admin/AdminSettingsRow";
import { AdminSettingsSheet } from "@/components/admin/AdminSettingsSheet";
import {
  COMMISSION_QUESTION_CATEGORIES,
  COMMISSION_SPECIALTY_OPTIONS,
  type ClassifiedCommissionQuestionDraft,
  type CommissionQuestionCategoryId,
  type CommissionQuestionRecord,
} from "@/lib/admin/commission/commissionQuestionTypes";
import { CANDIDATE_POSITION_LEVEL_OPTIONS } from "@/lib/admin/candidatePositionLevels";
import {
  adminFieldLabelClass,
  adminInputClass,
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/lib/admin/adminPanelTheme";

type CommissionSheetId = "filters" | "bulk" | null;

type DraftRow = ClassifiedCommissionQuestionDraft & { key: string };

/**
 * Подраздел настроек: банк вопросов комиссии с ИИ-классификацией.
 */
export function CommissionQuestionsPanel(): React.ReactElement {
  const [items, setItems] = useState<ReadonlyArray<CommissionQuestionRecord>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filterPositionLevel, setFilterPositionLevel] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [contextPositionLevel, setContextPositionLevel] = useState("");
  const [contextSpecialty, setContextSpecialty] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [drafts, setDrafts] = useState<ReadonlyArray<DraftRow>>([]);
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<CommissionSheetId>(null);

  const loadItems = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterPositionLevel) {
        params.set("positionLevel", filterPositionLevel);
      }
      if (filterSpecialty) {
        params.set("specialty", filterSpecialty);
      }
      if (filterCategory) {
        params.set("category", filterCategory);
      }
      const res = await fetch(`/api/admin/commission-questions?${params.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json()) as { items?: CommissionQuestionRecord[]; error?: string };
      if (!res.ok || !body.items) {
        setError(body.error ?? "Не удалось загрузить вопросы.");
        setItems([]);
        return;
      }
      setItems(body.items);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterPositionLevel, filterSpecialty, filterCategory]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, CommissionQuestionRecord[]>();
    for (const item of items) {
      const bucket = map.get(item.category) ?? [];
      bucket.push(item);
      map.set(item.category, bucket);
    }
    return COMMISSION_QUESTION_CATEGORIES.map((category) => ({
      category,
      items: map.get(category.id) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [items]);

  async function classifyBulk(): Promise<void> {
    if (bulkText.trim().length < 8) {
      setError("Вставьте хотя бы один вопрос.");
      return;
    }

    setClassifying(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/commission-questions/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: bulkText,
          contextPositionLevel: contextPositionLevel || undefined,
          contextSpecialty: contextSpecialty || undefined,
        }),
      });
      const body = (await res.json()) as {
        drafts?: ClassifiedCommissionQuestionDraft[];
        parsedCount?: number;
        error?: string;
      };
      if (!res.ok || !body.drafts) {
        setError(body.error ?? "Не удалось разобрать вопросы.");
        return;
      }
      setDrafts(
        body.drafts.map((draft, index) => ({
          ...draft,
          key: `draft-${String(index)}-${draft.text.slice(0, 24)}`,
        }))
      );
      setSuccess(`ИИ разобрал ${String(body.parsedCount ?? body.drafts.length)} вопросов. Проверьте и сохраните.`);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setClassifying(false);
    }
  }

  async function saveDrafts(): Promise<void> {
    if (drafts.length === 0) {
      return;
    }
    setSavingDrafts(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/commission-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: drafts.map((draft) => ({
            text: draft.text,
            category: draft.category,
            positionLevels: draft.positionLevels,
            specialties: draft.specialties,
            aiSuggested: true,
          })),
        }),
      });
      const body = (await res.json()) as { items?: CommissionQuestionRecord[]; error?: string };
      if (!res.ok || !body.items) {
        setError(body.error ?? "Не удалось сохранить вопросы.");
        return;
      }
      setDrafts([]);
      setBulkText("");
      setSuccess(`Сохранено вопросов: ${String(body.items.length)}.`);
      await loadItems();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setSavingDrafts(false);
    }
  }

  function updateDraft(key: string, patch: Partial<DraftRow>): void {
    setDrafts((prev) =>
      prev.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft))
    );
  }

  function removeDraft(key: string): void {
    setDrafts((prev) => prev.filter((draft) => draft.key !== key));
  }

  async function moveQuestionCategory(
    questionId: string,
    category: CommissionQuestionCategoryId
  ): Promise<void> {
    setBusyQuestionId(questionId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/commission-questions/${encodeURIComponent(questionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось переместить вопрос.");
        return;
      }
      await loadItems();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusyQuestionId(null);
    }
  }

  async function deleteQuestion(questionId: string): Promise<void> {
    if (!window.confirm("Удалить вопрос из банка?")) {
      return;
    }
    setBusyQuestionId(questionId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/commission-questions/${encodeURIComponent(questionId)}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Не удалось удалить вопрос.");
        return;
      }
      await loadItems();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusyQuestionId(null);
    }
  }

  const filterSummary = _commissionFilterSummary(
    filterPositionLevel,
    filterSpecialty,
    filterCategory
  );

  return (
    <div className="space-y-6">
      <AdminSettingsGroup title="Банк вопросов">
        <AdminSettingsRow
          title="Фильтры списка"
          subtitle={filterSummary}
          onClick={() => setSheet("filters")}
        />
        <AdminSettingsRow
          title="Добавить вопросы"
          subtitle="Массовый ввод с ИИ"
          statusLabel={drafts.length > 0 ? `${String(drafts.length)} в черновике` : undefined}
          statusTone={drafts.length > 0 ? "info" : undefined}
          onClick={() => setSheet("bulk")}
        />
      </AdminSettingsGroup>

      <AdminSettingsSheet
        open={sheet === "filters"}
        title="Фильтры списка"
        onClose={() => setSheet(null)}
      >
        <div className="grid gap-4">
          <FilterSelect
            id="filter-position-level"
            label="Уровень должности"
            value={filterPositionLevel}
            onChange={setFilterPositionLevel}
            options={CANDIDATE_POSITION_LEVEL_OPTIONS}
          />
          <FilterSelect
            id="filter-specialty"
            label="Специальность"
            value={filterSpecialty}
            onChange={setFilterSpecialty}
            options={COMMISSION_SPECIALTY_OPTIONS}
          />
          <FilterSelect
            id="filter-category"
            label="Категория навыков"
            value={filterCategory}
            onChange={setFilterCategory}
            options={COMMISSION_QUESTION_CATEGORIES.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
          />
          <div className="flex justify-end pt-2">
            <Button type="button" className={adminPrimaryButtonClass} onClick={() => setSheet(null)}>
              Готово
            </Button>
          </div>
        </div>
      </AdminSettingsSheet>

      <AdminSettingsSheet open={sheet === "bulk"} title="Добавить вопросы" onClose={() => setSheet(null)}>
        <div className="space-y-4">
          <p className={adminPanelMutedTextClass}>Каждый вопрос — с новой строки; ИИ разнесёт по категориям.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FilterSelect
              id="context-position-level"
              label="Контекст: уровень"
              value={contextPositionLevel}
              onChange={setContextPositionLevel}
              options={CANDIDATE_POSITION_LEVEL_OPTIONS}
            />
            <FilterSelect
              id="context-specialty"
              label="Контекст: специальность"
              value={contextSpecialty}
              onChange={setContextSpecialty}
              options={COMMISSION_SPECIALTY_OPTIONS}
            />
          </div>
          <div>
            <label htmlFor="bulk-questions" className={adminFieldLabelClass}>
              Вопросы
            </label>
            <textarea
              id="bulk-questions"
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              rows={8}
              placeholder={
                "Умеете ли Вы считать P&L?\nКак выстраиваете мотивацию линейного персонала?"
              }
              className={`${adminInputClass} min-h-[180px] resize-y py-3`}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              disabled={classifying}
              onClick={() => void classifyBulk()}
              className={adminSecondaryButtonClass}
            >
              {classifying ? "Разбор…" : "Разобрать с ИИ"}
            </Button>
            {drafts.length > 0 ? (
              <Button
                type="button"
                disabled={savingDrafts}
                onClick={() => void saveDrafts()}
                className={adminPrimaryButtonClass}
              >
                {savingDrafts ? "Сохранение…" : `Сохранить ${String(drafts.length)}`}
              </Button>
            ) : null}
          </div>
        </div>
      </AdminSettingsSheet>

      {drafts.length > 0 ? (
        <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
          <h3 className={adminPanelSectionTitleClass}>Предпросмотр после ИИ</h3>
          <p className={adminPanelMutedTextClass}>
            Проверьте категории и удалите ошибочные вопросы до сохранения.
          </p>
          <div className="space-y-3">
            {drafts.map((draft) => (
              <DraftCard
                key={draft.key}
                draft={draft}
                disabled={savingDrafts}
                onCategoryChange={(category) => updateDraft(draft.key, { category })}
                onRemove={() => removeDraft(draft.key)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm font-medium text-[var(--admin-ok)]" role="status">
          {success}
        </p>
      ) : null}

      <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[16px] font-medium text-[var(--admin-text)]">
            Сохранённые вопросы {loading ? "" : `(${String(items.length)})`}
          </h3>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void loadItems()}
            className={adminSecondaryButtonClass}
          >
            Обновить
          </Button>
        </div>

        {loading ? (
          <p className={adminPanelMutedTextClass}>Загрузка…</p>
        ) : groupedItems.length === 0 ? (
          <p className={adminPanelMutedTextClass}>
            По заданным фильтрам вопросов нет. Добавьте их через массовый ввод.
          </p>
        ) : (
          groupedItems.map((group) => (
            <section key={group.category.id} className="space-y-3">
              <h4 className="text-[16px] font-semibold text-[var(--admin-accent)]">
                {group.category.label}
              </h4>
              {group.items.map((item) => (
                <SavedQuestionCard
                  key={item.id}
                  item={item}
                  busy={busyQuestionId === item.id}
                  onMoveCategory={(category) => void moveQuestionCategory(item.id, category)}
                  onDelete={() => void deleteQuestion(item.id)}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
};

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: FilterSelectProps): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className={adminFieldLabelClass}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${adminInputClass} text-[15px]`}
      >
        <option value="">Все</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type DraftCardProps = {
  draft: DraftRow;
  disabled: boolean;
  onCategoryChange: (category: CommissionQuestionCategoryId) => void;
  onRemove: () => void;
};

function DraftCard({
  draft,
  disabled,
  onCategoryChange,
  onRemove,
}: DraftCardProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-[var(--admin-bg)] px-4 py-4">
      <p className="text-[15px] font-medium text-[var(--admin-text)]">{draft.text}</p>
      {draft.rationale ? (
        <p className={`mt-2 text-[13px] ${adminPanelMutedTextClass}`}>{draft.rationale}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <CategorySelect
          value={draft.category}
          disabled={disabled}
          onChange={onCategoryChange}
        />
        <Button type="button" variant="secondary" disabled={disabled} onClick={onRemove}>
          Убрать
        </Button>
      </div>
      <TagRow labels={draft.positionLevels} prefix="Уровни" />
      <TagRow labels={draft.specialties} prefix="Специальности" />
    </div>
  );
}

type SavedQuestionCardProps = {
  item: CommissionQuestionRecord;
  busy: boolean;
  onMoveCategory: (category: CommissionQuestionCategoryId) => void;
  onDelete: () => void;
};

function SavedQuestionCard({
  item,
  busy,
  onMoveCategory,
  onDelete,
}: SavedQuestionCardProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-[var(--admin-bg)] px-4 py-4">
      <p className="text-[15px] font-medium text-[var(--admin-text)]">{item.text}</p>
      {item.aiSuggested ? (
        <p className="mt-1 text-[12px] font-semibold text-[var(--admin-info)]">
          Добавлено с помощью ИИ
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <CategorySelect value={item.category} disabled={busy} onChange={onMoveCategory} />
        <Button type="button" variant="secondary" disabled={busy} onClick={onDelete}>
          Удалить
        </Button>
      </div>
      <TagRow labels={item.positionLevelLabels} prefix="Уровни" />
      <TagRow labels={item.specialtyLabels} prefix="Специальности" />
    </div>
  );
}

type CategorySelectProps = {
  value: CommissionQuestionCategoryId;
  disabled: boolean;
  onChange: (category: CommissionQuestionCategoryId) => void;
};

function CategorySelect({
  value,
  disabled,
  onChange,
}: CategorySelectProps): React.ReactElement {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as CommissionQuestionCategoryId)}
      className={`${adminInputClass} h-10 min-w-[220px] text-[14px]`}
      aria-label="Категория вопроса"
    >
      {COMMISSION_QUESTION_CATEGORIES.map((category) => (
        <option key={category.id} value={category.id}>
          {category.label}
        </option>
      ))}
    </select>
  );
}

type TagRowProps = {
  labels: ReadonlyArray<string>;
  prefix: string;
};

function _commissionFilterSummary(
  positionLevel: string,
  specialty: string,
  category: string
): string {
  const parts: string[] = [];
  if (positionLevel) {
    const label = CANDIDATE_POSITION_LEVEL_OPTIONS.find((o) => o.value === positionLevel)?.label;
    parts.push(label ?? "Уровень");
  }
  if (specialty) {
    const label = COMMISSION_SPECIALTY_OPTIONS.find((o) => o.value === specialty)?.label;
    parts.push(label ?? "Специальность");
  }
  if (category) {
    const label = COMMISSION_QUESTION_CATEGORIES.find((c) => c.id === category)?.label;
    parts.push(label ?? "Категория");
  }
  return parts.length > 0 ? parts.join(" · ") : "Все уровни и категории";
}

function TagRow({ labels, prefix }: TagRowProps): React.ReactElement | null {
  if (labels.length === 0) {
    return null;
  }
  return (
    <p className={`mt-2 text-[12px] ${adminPanelMutedTextClass}`}>
      {prefix}: {labels.join(", ")}
    </p>
  );
}
