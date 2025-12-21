import { StatCard } from "@/components";

interface Benchmarking {
  apiCallMs: number;
  totalTimeMs: number;
  queryRewriteMs: number;
  rerankingMs: number;
  generationMs?: number;
  embeddingMs?: number;
  vectorizeMs?: number;
}

interface StatsSectionProps {
  benchmarking?: Benchmarking;
  searchType?: "search" | "aiSearch" | "vectorizeDirect";
  apiStats?: {
    totalCalls: number;
    totalTimeMs: number;
    avgTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
  };
  cosineStats?: {
    totalComparisons: number;
    avgSimilarity: number;
    minSimilarity: number;
    maxSimilarity: number;
    edgesCreated: number;
  };
}

export function StatsSection({ benchmarking, searchType, apiStats, cosineStats }: StatsSectionProps) {
  if (benchmarking && searchType) {
    if (searchType === "vectorizeDirect") {
      return (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Performance</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
              <div className="text-xs text-gray-600 mb-1">Total</div>
              <div className="text-sm font-semibold text-gray-900">{benchmarking.totalTimeMs.toFixed(1)}ms</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
              <div className="text-xs text-gray-600 mb-1">Embedding</div>
              <div className="text-sm font-semibold text-gray-900">{(benchmarking.embeddingMs || 0).toFixed(1)}ms</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
              <div className="text-xs text-gray-600 mb-1">Vectorize</div>
              <div className="text-sm font-semibold text-gray-900">{(benchmarking.vectorizeMs || 0).toFixed(1)}ms</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
              <div className="text-xs text-gray-600 mb-1">API</div>
              <div className="text-sm font-semibold text-gray-900">{benchmarking.apiCallMs.toFixed(1)}ms</div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Performance</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <div className="text-xs text-gray-600 mb-1">Total</div>
            <div className="text-sm font-semibold text-gray-900">{benchmarking.totalTimeMs.toFixed(1)}ms</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <div className="text-xs text-gray-600 mb-1">API</div>
            <div className="text-sm font-semibold text-gray-900">{benchmarking.apiCallMs.toFixed(1)}ms</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <div className="text-xs text-gray-600 mb-1">Rewrite</div>
            <div className="text-sm font-semibold text-gray-900">{benchmarking.queryRewriteMs.toFixed(1)}ms</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <div className="text-xs text-gray-600 mb-1">Rerank</div>
            <div className="text-sm font-semibold text-gray-900">{benchmarking.rerankingMs.toFixed(1)}ms</div>
          </div>
          {searchType === "aiSearch" && benchmarking.generationMs !== undefined && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 col-span-2">
              <div className="text-xs text-gray-600 mb-1">Generation</div>
              <div className="text-sm font-semibold text-gray-900">{benchmarking.generationMs.toFixed(1)}ms</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!apiStats || !cosineStats) {
    return null;
  }
  return (
    <>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="API Calls"
          value={apiStats.totalCalls}
          infoTooltip="Total number of API requests made"
        />
        <StatCard
          title="Avg API Time"
          value={apiStats.totalCalls > 0 ? `${apiStats.avgTimeMs.toFixed(1)}ms` : "0ms"}
          infoTooltip="Average time per API call (strict timing)"
        />
        <StatCard
          title="Cosine Comparisons"
          value={cosineStats.totalComparisons.toLocaleString()}
          infoTooltip="Total cosine similarity calculations performed"
        />
        <StatCard
          title="Avg Similarity"
          value={cosineStats.totalComparisons > 0 ? cosineStats.avgSimilarity.toFixed(3) : "0.000"}
          infoTooltip="Average cosine similarity score across all comparisons"
        />
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="API Time Range"
          value={apiStats.totalCalls > 0 ? `${apiStats.minTimeMs.toFixed(1)}-${apiStats.maxTimeMs.toFixed(1)}ms` : "0ms"}
          infoTooltip="Minimum and maximum API call times"
        />
        <StatCard
          title="Total API Time"
          value={apiStats.totalTimeMs > 0 ? `${apiStats.totalTimeMs.toFixed(0)}ms` : "0ms"}
          infoTooltip="Total time spent on API calls"
        />
        <StatCard
          title="Similarity Range"
          value={cosineStats.totalComparisons > 0 ? `[${cosineStats.minSimilarity.toFixed(3)}, ${cosineStats.maxSimilarity.toFixed(3)}]` : "[0, 0]"}
          infoTooltip="Minimum and maximum cosine similarity scores"
        />
        <StatCard
          title="Edges Created"
          value={cosineStats.edgesCreated.toLocaleString()}
          infoTooltip="Total graph edges created from similarity calculations"
        />
      </div>
    </>
  );
}

