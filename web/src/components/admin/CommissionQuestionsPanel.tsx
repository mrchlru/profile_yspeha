"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/Button";
import {
  COMMISSION_QUESTION_CATEGORIES,
  COMMISSION_SPECIALTY_OPTIONS,
  type ClassifiedCommissionQuestionDraft,
  type CommissionQuestionCategoryId,
  type CommissionQuestionRecord,
} from "@/lib/admin/commission/commissionQuestionTypes";
import { CANDIDATE_POSITION_LEVEL_OPTIONS } from "@/lib/admin/candidatePositionLevels";
import {
  adminPanelCardClass,
  adminPanelMutedTextClass,
  adminPanelSectionTitleClass,
} from "@/lib/admin/adminPanelTheme";
import { stepInputClass, stepLabelClass, stepNavPrimaryButtonClass } from "@/lib/stepPageTheme";

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

  return (
    <div className="space-y-6">
      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <div>
          <h2 className={adminPanelSectionTitleClass}>Вопросы комиссии</h2>
          <p className={`mt-2 ${adminPanelMutedTextClass}`}>
            Банк вопросов для анкет комиссии. Фильтрация по уровню должности и специальности.
            Можно вставить сразу несколько вопросов — ИИ распределит их по категориям навыков и
            целевым уровням; при необходимости переместите вопрос в другой блок или удалите.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
        </div>
      </div>

      <div className={`space-y-4 px-6 py-6 ${adminPanelCardClass}`}>
        <h3 className={adminPanelSectionTitleClass}>Массовый ввод с ИИ</h3>
        <p className={adminPanelMutedTextClass}>
          Вставьте вопросы списком (каждый с новой строки). ИИ разнесёт их по категориям: финансы,
          маркетинг, управление, софт-скиллы, хард-скиллы, аналитика и другие блоки.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <FilterSelect
            id="context-position-level"
            label="Контекст: уровень (необязательно)"
            value={contextPositionLevel}
            onChange={setContextPositionLevel}
            options={CANDIDATE_POSITION_LEVEL_OPTIONS}
          />
          <FilterSelect
            id="context-specialty"
            label="Контекст: специальность (необязательно)"
            value={contextSpecialty}
            onChange={setContextSpecialty}
            options={COMMISSION_SPECIALTY_OPTIONS}
          />
        </div>

        <div>
          <label htmlFor="bulk-questions" className={`block ${stepLabelClass}`}>
            Вопросы
          </label>
          <textarea
            id="bulk-questions"
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            rows={8}
            placeholder={"Умеете ли Вы считать P&L?\nКак выстраиваете мотивацию линейного персонала?\nОпишите кейс разрешения конфликта в команде."}
            className={`${stepInputClass} min-h-[180px] resize-y text-[15px]`}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={classifying}
            onClick={() => void classifyBulk()}
            className={stepNavPrimaryButtonClass}
          >
            {classifying ? "Разбор…" : "Разобрать с ИИ"}
          </Button>
          {drafts.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              disabled={savingDrafts}
              onClick={() => void saveDrafts()}
            >
              {savingDrafts ? "Сохранение…" : `Сохранить ${String(drafts.length)} вопросов`}
            </Button>
          ) : null}
        </div>
      </div>

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
        <p className="text-sm font-medium text-emerald-800" role="status">
          {success}
        </p>
      ) : null}

      <div className={`space-y-5 px-6 py-6 ${adminPanelCardClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={adminPanelSectionTitleClass}>
            Сохранённые вопросы {loading ? "" : `(${String(items.length)})`}
          </h3>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => void loadItems()}>
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
              <h4 className="text-[16px] font-extrabold text-[#007A68]">{group.category.label}</h4>
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
      <label htmlFor={id} className={`block ${stepLabelClass}`}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${stepInputClass} h-12 w-full text-[15px]`}
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
    <div className="rounded-2xl bg-white/60 px-4 py-4">
      <p className="text-[15px] font-medium text-[#4F4F4F]">{draft.text}</p>
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
    <div className="rounded-2xl bg-white/60 px-4 py-4">
      <p className="text-[15px] font-medium text-[#4F4F4F]">{item.text}</p>
      {item.aiSuggested ? (
        <p className="mt-1 text-[12px] font-bold text-sky-800">Добавлено с помощью ИИ</p>
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
      className={`${stepInputClass} h-10 min-w-[220px] text-[14px]`}
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
