import {
  computeSubtestSimilarityIndex,
  type SimilarityScopeFilter,
} from "@/lib/admin/computeSubtestSimilarityIndex";
import type { SimilarityClustersResult } from "@/lib/admin/similarityClusterTypes";

export type { SimilarityScopeFilter };

/**
 * Находит группы папок с схожими ответами по субтестам (последнее прохождение).
 */
export async function computeSimilarAnswerClusters(
  scopeFilter: SimilarityScopeFilter = "all"
): Promise<SimilarityClustersResult> {
  return computeSubtestSimilarityIndex(scopeFilter);
}
