import { fetchRawAnswersRecords } from "@/lib/admin/fetchRawAnswersRecords";
import { listReportExportCandidates } from "@/lib/admin/listReportExportCandidates";
import {
  REPORT_EXPORT_TEST_KIND_LABELS,
  REPORT_EXPORT_TEST_KINDS,
  type ReportExportTestKind,
} from "@/lib/admin/reportExportKinds";
import { similaritySubtestLabel } from "@/lib/admin/similaritySubtestCatalog";
import { splitAnswersIntoSubtestFingerprints } from "@/lib/admin/splitAnswersIntoSubtestFingerprints";
import {
  ANSWER_SIMILARITY_CLOSE_COMPLETION_MINUTES,
  ANSWER_SIMILARITY_MIN_COMPARABLE,
  ANSWER_SIMILARITY_SOFT_THRESHOLD,
  ANSWER_SIMILARITY_THRESHOLD,
  type FolderSubtestSimilarityResult,
  type SimilarityClusterSummary,
  type SimilarityClustersResult,
  type SimilarityFolderHint,
  type SimilarityFolderSeverity,
  type SimilarityMatchSeverity,
  type SubtestSimilarityAlert,
  type SubtestSimilarityFolderSummary,
  type SubtestSimilarityPeerMatch,
} from "@/lib/admin/similarityClusterTypes";

export type SimilarityScopeFilter = "all" | "screening" | "audit";

type ParticipantEntry = {
  folderKey: string;
  displayName: string;
  completedAtMs: number | null;
  subtests: Record<string, Record<string, string>>;
};

/**
 * Индекс схожести ответов по каждому субтесту батареи (последнее прохождение).
 */
export async function computeSubtestSimilarityIndex(
  scopeFilter: SimilarityScopeFilter = "all"
): Promise<SimilarityClustersResult> {
  const testKinds = _kindsForScope(scopeFilter);
  const folderHints: Record<string, SimilarityFolderHint> = {};
  const folderAlerts: Record<string, SubtestSimilarityAlert[]> = {};
  const clusters: SimilarityClusterSummary[] = [];
  let globalColorOffset = 0;

  for (const testKind of testKinds) {
    const batch = await _indexForTestKind(testKind, globalColorOffset);
    globalColorOffset += batch.clusters.length;
    clusters.push(...batch.clusters);

    for (const [folderKey, hint] of Object.entries(batch.folderHints)) {
      const existing = folderHints[folderKey];
      if (
        !existing ||
        hint.suspiciousSubtestCount > existing.suspiciousSubtestCount ||
        (hint.suspiciousSubtestCount === existing.suspiciousSubtestCount &&
          hint.similarityPercent > existing.similarityPercent)
      ) {
        folderHints[folderKey] = hint;
      }
    }

    for (const [folderKey, alerts] of Object.entries(batch.folderAlerts)) {
      const merged = [...(folderAlerts[folderKey] ?? []), ...alerts];
      folderAlerts[folderKey] = _mergeFolderAlerts(merged);
    }
  }

  return {
    thresholdPercent: Math.round(ANSWER_SIMILARITY_THRESHOLD * 100),
    softThresholdPercent: Math.round(ANSWER_SIMILARITY_SOFT_THRESHOLD * 100),
    closeCompletionMinutes: ANSWER_SIMILARITY_CLOSE_COMPLETION_MINUTES,
    folderHints,
    clusters,
    folderAlerts,
  };
}

/**
 * Подозрительные совпадения по субтестам для одной папки.
 */
export async function computeFolderSubtestSimilarityAlerts(
  folderKey: string,
  scopeFilter: SimilarityScopeFilter = "all"
): Promise<FolderSubtestSimilarityResult> {
  const index = await computeSubtestSimilarityIndex(scopeFilter);
  const alerts = index.folderAlerts[folderKey] ?? [];
  return {
    thresholdPercent: index.thresholdPercent,
    softThresholdPercent: index.softThresholdPercent,
    closeCompletionMinutes: index.closeCompletionMinutes,
    summary: _folderSummaryFromAlerts(alerts),
    alerts,
  };
}

async function _indexForTestKind(
  testKind: ReportExportTestKind,
  colorOffset: number
): Promise<SimilarityClustersResult> {
  const candidates = await listReportExportCandidates(testKind);
  const withFolder = candidates.filter((item) => item.folderKey !== null);
  if (withFolder.length < 2) {
    return _emptyResult();
  }

  const sessionIds = withFolder.map((item) => item.sessionId);
  const records = await fetchRawAnswersRecords(testKind, sessionIds);
  const recordBySession = new Map(records.map((row) => [row.sessionId, row]));

  const participants: ParticipantEntry[] = [];
  for (const candidate of withFolder) {
    const record = recordBySession.get(candidate.sessionId);
    if (!record) {
      continue;
    }
    const subtests = splitAnswersIntoSubtestFingerprints(testKind, record.answers);
    if (Object.keys(subtests).length === 0) {
      continue;
    }
    participants.push({
      folderKey: candidate.folderKey!,
      displayName: candidate.displayName,
      completedAtMs: record.completedAtDate.getTime(),
      subtests,
    });
  }

  if (participants.length < 2) {
    return _emptyResult();
  }

  const subtestIds = _collectSubtestIds(participants);
  const folderHints: Record<string, SimilarityFolderHint> = {};
  const folderAlerts: Record<string, SubtestSimilarityAlert[]> = {};
  const clusters: SimilarityClusterSummary[] = [];
  let clusterIndex = 0;

  const folderHighCounts = new Map<string, number>();
  const folderSoftOnlyCounts = new Map<string, number>();
  const folderMaxPercent = new Map<string, number>();
  const folderCloseInTime = new Set<string>();

  for (const subtestId of subtestIds) {
    const active = participants.filter((entry) => _countAnswered(entry.subtests[subtestId] ?? {}) > 0);
    if (active.length < 2) {
      continue;
    }

    const unionFind = new _UnionFind(active.map((entry) => entry.folderKey));
    const pairScores = new Map<string, number>();
    const peerMatchesByFolder = new Map<string, SubtestSimilarityPeerMatch[]>();
    const subtestHighFolders = new Set<string>();

    for (let i = 0; i < active.length; i += 1) {
      for (let j = i + 1; j < active.length; j += 1) {
        const left = active[i]!;
        const right = active[j]!;
        const score = _answerSimilarity(left.subtests[subtestId] ?? {}, right.subtests[subtestId] ?? {});
        if (score < ANSWER_SIMILARITY_SOFT_THRESHOLD) {
          continue;
        }

        const percent = Math.round(score * 100);
        const severity = _severityFromScore(score);
        const gapMinutes = _completionGapMinutes(left.completedAtMs, right.completedAtMs);
        const closeInTime =
          gapMinutes !== null && gapMinutes <= ANSWER_SIMILARITY_CLOSE_COMPLETION_MINUTES;

        if (severity === "high") {
          unionFind.union(left.folderKey, right.folderKey);
          pairScores.set(_pairKey(left.folderKey, right.folderKey), score);
        }

        const leftMatch: SubtestSimilarityPeerMatch = {
          otherFolderKey: right.folderKey,
          otherDisplayName: right.displayName,
          similarityPercent: percent,
          severity,
          completedAtGapMinutes: gapMinutes,
          closeInTime,
        };
        const rightMatch: SubtestSimilarityPeerMatch = {
          otherFolderKey: left.folderKey,
          otherDisplayName: left.displayName,
          similarityPercent: percent,
          severity,
          completedAtGapMinutes: gapMinutes,
          closeInTime,
        };
        _appendPeerMatch(peerMatchesByFolder, left.folderKey, leftMatch);
        _appendPeerMatch(peerMatchesByFolder, right.folderKey, rightMatch);

        if (closeInTime) {
          folderCloseInTime.add(left.folderKey);
          folderCloseInTime.add(right.folderKey);
        }

        for (const folderKey of [left.folderKey, right.folderKey]) {
          folderMaxPercent.set(folderKey, Math.max(folderMaxPercent.get(folderKey) ?? 0, percent));
        }

        if (severity === "high") {
          subtestHighFolders.add(left.folderKey);
          subtestHighFolders.add(right.folderKey);
        }
      }
    }

    const subtestLabel = similaritySubtestLabel(testKind, subtestId);

    for (const [folderKey, matches] of peerMatchesByFolder) {
      if (matches.length === 0) {
        continue;
      }

      if (subtestHighFolders.has(folderKey)) {
        folderHighCounts.set(folderKey, (folderHighCounts.get(folderKey) ?? 0) + 1);
      } else {
        folderSoftOnlyCounts.set(folderKey, (folderSoftOnlyCounts.get(folderKey) ?? 0) + 1);
      }

      const sortedMatches = _sortPeerMatches(matches);
      const alert: SubtestSimilarityAlert = {
        subtestId,
        subtestLabel,
        testKind,
        testKindLabel: REPORT_EXPORT_TEST_KIND_LABELS[testKind],
        maxSeverity: sortedMatches.some((item) => item.severity === "high") ? "high" : "soft",
        matches: sortedMatches,
      };
      const list = folderAlerts[folderKey] ?? [];
      list.push(alert);
      folderAlerts[folderKey] = list;
    }

    for (const [root, folderKeys] of unionFind.groups()) {
      if (folderKeys.length < 2) {
        continue;
      }
      const colorIndex = colorOffset + clusterIndex;
      clusterIndex += 1;
      const clusterId = `${testKind}:${subtestId}:${root}`;
      const avgSimilarity = _clusterAverageSimilarity(folderKeys, pairScores);

      clusters.push({
        clusterId,
        colorIndex,
        folderKeys: [...folderKeys].sort(),
        testKind,
        testKindLabel: REPORT_EXPORT_TEST_KIND_LABELS[testKind],
        memberCount: folderKeys.length,
        subtestId,
        subtestLabel,
      });

      const hintBase = {
        testKind,
        testKindLabel: REPORT_EXPORT_TEST_KIND_LABELS[testKind],
      };

      for (const folderKey of folderKeys) {
        const nextHint = _buildFolderHint({
          ...hintBase,
          clusterId,
          colorIndex,
          memberCount: folderKeys.length,
          similarityPercent: Math.round(avgSimilarity * 100),
          folderKey,
          alerts: folderAlerts[folderKey] ?? [],
          highCount: folderHighCounts.get(folderKey) ?? 0,
          softOnlyCount: folderSoftOnlyCounts.get(folderKey) ?? 0,
          hasCloseInTime: folderCloseInTime.has(folderKey),
        });
        _upsertFolderHint(folderHints, folderKey, nextHint);
      }
    }
  }

  for (const [folderKey, alerts] of Object.entries(folderAlerts)) {
    const merged = _mergeFolderAlerts(alerts);
    folderAlerts[folderKey] = merged;
    const nextHint = _buildFolderHint({
      clusterId: folderHints[folderKey]?.clusterId ?? `${testKind}:suspicious:${folderKey}`,
      colorIndex: folderHints[folderKey]?.colorIndex ?? colorOffset + clusterIndex,
      memberCount: merged[0]?.matches.length ?? 1,
      testKind,
      testKindLabel: REPORT_EXPORT_TEST_KIND_LABELS[testKind],
      similarityPercent: folderMaxPercent.get(folderKey) ?? Math.round(ANSWER_SIMILARITY_SOFT_THRESHOLD * 100),
      folderKey,
      alerts: merged,
      highCount: folderHighCounts.get(folderKey) ?? 0,
      softOnlyCount: folderSoftOnlyCounts.get(folderKey) ?? 0,
      hasCloseInTime: folderCloseInTime.has(folderKey),
    });
    _upsertFolderHint(folderHints, folderKey, nextHint);
  }

  return {
    thresholdPercent: Math.round(ANSWER_SIMILARITY_THRESHOLD * 100),
    softThresholdPercent: Math.round(ANSWER_SIMILARITY_SOFT_THRESHOLD * 100),
    closeCompletionMinutes: ANSWER_SIMILARITY_CLOSE_COMPLETION_MINUTES,
    folderHints,
    clusters,
    folderAlerts,
  };
}

function _emptyResult(): SimilarityClustersResult {
  return {
    thresholdPercent: Math.round(ANSWER_SIMILARITY_THRESHOLD * 100),
    softThresholdPercent: Math.round(ANSWER_SIMILARITY_SOFT_THRESHOLD * 100),
    closeCompletionMinutes: ANSWER_SIMILARITY_CLOSE_COMPLETION_MINUTES,
    folderHints: {},
    clusters: [],
    folderAlerts: {},
  };
}

function _collectSubtestIds(participants: ReadonlyArray<ParticipantEntry>): string[] {
  const ids = new Set<string>();
  for (const entry of participants) {
    for (const subtestId of Object.keys(entry.subtests)) {
      ids.add(subtestId);
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b, "ru", { numeric: true }));
}

function _appendPeerMatch(
  map: Map<string, SubtestSimilarityPeerMatch[]>,
  folderKey: string,
  match: SubtestSimilarityPeerMatch
): void {
  const list = map.get(folderKey) ?? [];
  const existing = list.find((item) => item.otherFolderKey === match.otherFolderKey);
  if (existing) {
    existing.similarityPercent = Math.max(existing.similarityPercent, match.similarityPercent);
    existing.severity =
      existing.severity === "high" || match.severity === "high" ? "high" : "soft";
    existing.closeInTime = existing.closeInTime || match.closeInTime;
    if (match.completedAtGapMinutes !== null) {
      existing.completedAtGapMinutes =
        existing.completedAtGapMinutes === null
          ? match.completedAtGapMinutes
          : Math.min(existing.completedAtGapMinutes, match.completedAtGapMinutes);
    }
    map.set(folderKey, list);
    return;
  }
  list.push(match);
  map.set(folderKey, list);
}

function _mergeFolderAlerts(alerts: ReadonlyArray<SubtestSimilarityAlert>): SubtestSimilarityAlert[] {
  const bySubtest = new Map<string, SubtestSimilarityAlert>();
  for (const alert of alerts) {
    const key = `${alert.testKind}:${alert.subtestId}`;
    const existing = bySubtest.get(key);
    if (!existing) {
      bySubtest.set(key, {
        ...alert,
        matches: [...alert.matches],
      });
      continue;
    }
    for (const match of alert.matches) {
      const peer = existing.matches.find((item) => item.otherFolderKey === match.otherFolderKey);
      if (peer) {
        peer.similarityPercent = Math.max(peer.similarityPercent, match.similarityPercent);
        peer.severity = peer.severity === "high" || match.severity === "high" ? "high" : "soft";
        peer.closeInTime = peer.closeInTime || match.closeInTime;
        if (match.completedAtGapMinutes !== null) {
          peer.completedAtGapMinutes =
            peer.completedAtGapMinutes === null
              ? match.completedAtGapMinutes
              : Math.min(peer.completedAtGapMinutes, match.completedAtGapMinutes);
        }
      } else {
        existing.matches.push(match);
      }
    }
    existing.maxSeverity = existing.matches.some((item) => item.severity === "high") ? "high" : "soft";
    existing.matches = _sortPeerMatches(existing.matches);
  }
  return [...bySubtest.values()].sort(
    (a, b) =>
      (b.matches[0]?.similarityPercent ?? 0) - (a.matches[0]?.similarityPercent ?? 0) ||
      a.subtestLabel.localeCompare(b.subtestLabel, "ru")
  );
}

function _answerSimilarity(
  left: Record<string, string>,
  right: Record<string, string>
): number {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  let comparable = 0;
  let matched = 0;

  for (const key of keys) {
    const a = _normalizeAnswerValue(left[key]);
    const b = _normalizeAnswerValue(right[key]);
    if (a.length === 0 || b.length === 0) {
      continue;
    }
    comparable += 1;
    if (a === b) {
      matched += 1;
    }
  }

  if (comparable < ANSWER_SIMILARITY_MIN_COMPARABLE) {
    return 0;
  }
  return matched / comparable;
}

function _normalizeAnswerValue(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function _countAnswered(fingerprint: Record<string, string>): number {
  return Object.values(fingerprint).filter((value) => _normalizeAnswerValue(value).length > 0).length;
}

function _pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function _clusterAverageSimilarity(
  folderKeys: string[],
  pairSimilarity: Map<string, number>
): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < folderKeys.length; i += 1) {
    for (let j = i + 1; j < folderKeys.length; j += 1) {
      const score = pairSimilarity.get(_pairKey(folderKeys[i]!, folderKeys[j]!));
      if (score !== undefined) {
        sum += score;
        count += 1;
      }
    }
  }
  if (count === 0) {
    return ANSWER_SIMILARITY_THRESHOLD;
  }
  return sum / count;
}

function _kindsForScope(scope: SimilarityScopeFilter): ReportExportTestKind[] {
  if (scope === "screening") {
    return ["screening"];
  }
  if (scope === "audit") {
    return ["audit_middle", "audit_senior"];
  }
  return [...REPORT_EXPORT_TEST_KINDS];
}

function _severityFromScore(score: number): SimilarityMatchSeverity {
  return score >= ANSWER_SIMILARITY_THRESHOLD ? "high" : "soft";
}

function _completionGapMinutes(leftMs: number | null, rightMs: number | null): number | null {
  if (leftMs === null || rightMs === null) {
    return null;
  }
  return Math.round(Math.abs(leftMs - rightMs) / 60_000);
}

function _sortPeerMatches(
  matches: ReadonlyArray<SubtestSimilarityPeerMatch>
): SubtestSimilarityPeerMatch[] {
  return [...matches].sort((a, b) => {
    if (a.closeInTime !== b.closeInTime) {
      return a.closeInTime ? -1 : 1;
    }
    if (a.severity !== b.severity) {
      return a.severity === "high" ? -1 : 1;
    }
    return (
      b.similarityPercent - a.similarityPercent ||
      a.otherDisplayName.localeCompare(b.otherDisplayName, "ru")
    );
  });
}

function _folderSummaryFromAlerts(
  alerts: ReadonlyArray<SubtestSimilarityAlert>
): SubtestSimilarityFolderSummary {
  const highSubtestCount = alerts.filter((item) => item.maxSeverity === "high").length;
  const softSubtestCount = alerts.length - highSubtestCount;
  return {
    totalAlertSubtests: alerts.length,
    highSubtestCount,
    softSubtestCount,
    hasCloseInTimeMatch: alerts.some((item) => item.matches.some((match) => match.closeInTime)),
  };
}

function _buildFolderHint(input: {
  clusterId: string;
  colorIndex: number;
  memberCount: number;
  testKind: ReportExportTestKind;
  testKindLabel: string;
  similarityPercent: number;
  folderKey: string;
  alerts: ReadonlyArray<SubtestSimilarityAlert>;
  highCount: number;
  softOnlyCount: number;
  hasCloseInTime: boolean;
}): SimilarityFolderHint {
  const highSubtestCount = input.alerts.filter((item) => item.maxSeverity === "high").length;
  const softSubtestCount = input.alerts.length - highSubtestCount;
  const severity: SimilarityFolderSeverity = highSubtestCount > 0 ? "high" : "soft";
  return {
    clusterId: input.clusterId,
    colorIndex: input.colorIndex,
    memberCount: input.memberCount,
    testKind: input.testKind,
    testKindLabel: input.testKindLabel,
    similarityPercent: input.similarityPercent,
    suspiciousSubtestCount: input.alerts.length,
    highSubtestCount,
    softSubtestCount,
    severity,
    hasCloseInTimeMatch: input.hasCloseInTime,
  };
}

function _upsertFolderHint(
  folderHints: Record<string, SimilarityFolderHint>,
  folderKey: string,
  nextHint: SimilarityFolderHint
): void {
  const existing = folderHints[folderKey];
  if (
    !existing ||
    nextHint.suspiciousSubtestCount > existing.suspiciousSubtestCount ||
    (nextHint.suspiciousSubtestCount === existing.suspiciousSubtestCount &&
      nextHint.similarityPercent > existing.similarityPercent)
  ) {
    folderHints[folderKey] = nextHint;
  }
}

class _UnionFind {
  private readonly parent = new Map<string, string>();

  constructor(keys: string[]) {
    for (const key of keys) {
      this.parent.set(key, key);
    }
  }

  find(key: string): string {
    let root = key;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    let cur = key;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA);
    }
  }

  groups(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      const list = out.get(root) ?? [];
      list.push(key);
      out.set(root, list);
    }
    return out;
  }
}
