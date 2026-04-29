import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { usePrices } from "../hooks/usePrices";
import { useLiquidity } from "../hooks/useLiquidity";
import { useAssetHealth } from "../hooks/useAssets";
import { useChartAnnotations } from "../hooks/useChartAnnotations";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import {
  getAssetMetadataBySymbol,
  upsertAssetMetadata,
} from "../services/api";
import HealthScoreCard from "../components/HealthScoreCard";
import PriceChart from "../components/PriceChart";
import LiquidityDepthChart from "../components/LiquidityDepthChart";
import { TimeRangeSelector } from "../components/TimeRangeSelector";
import AddToWatchlistButton from "../components/watchlist/AddToWatchlistButton";
import PullToRefresh from "../components/PullToRefresh";
import AssetTagsPanel from "../components/asset/AssetTagsPanel";
import ChartAnnotationPanel from "../components/asset/ChartAnnotationPanel";

const USER_NAME = "xqcxx";

function normalizeTags(raw: string[]) {
  return Array.from(
    new Set(
      raw
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
    )
  );
}

function addDraftTags(current: string[], draft: string) {
  const nextTags = draft
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return normalizeTags([...current, ...nextTags]);
}

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const queryClient = useQueryClient();
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const health = useAssetHealth(symbol ?? "");
  const { data: priceData, isLoading: priceLoading, refetch: refetchPrices } = usePrices(
    symbol ?? ""
  );
  const { data: liquidityData, isLoading: liquidityLoading, refetch: refetchLiquidity } =
    useLiquidity(symbol ?? "");

  const metadataQuery = useQuery({
    queryKey: ["asset-metadata", symbol],
    queryFn: async () => {
      if (!symbol) return null;
      try {
        return await getAssetMetadataBySymbol(symbol);
      } catch {
        return null;
      }
    },
    enabled: !!symbol,
  });

  const annotations = useChartAnnotations(symbol ?? "");
  const latestPriceTimestamp =
    priceData?.history && priceData.history.length > 0
      ? priceData.history[priceData.history.length - 1].timestamp
      : new Date().toISOString();

  useEffect(() => {
    setDraftTags(normalizeTags(metadataQuery.data?.tags ?? []));
    setTagInput("");
  }, [metadataQuery.data?.asset_id, metadataQuery.data?.tags]);

  const saveTags = useMutation({
    mutationFn: async () => {
      if (!symbol) {
        throw new Error("Missing asset symbol");
      }

      const assetId =
        metadataQuery.data?.asset_id ?? `asset_${symbol.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;

      return upsertAssetMetadata({
        assetId,
        symbol,
        metadata: {
          tags: draftTags,
          category: metadataQuery.data?.category ?? null,
          description: metadataQuery.data?.description ?? null,
        },
        updatedBy: USER_NAME,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["asset-metadata", symbol] });
    },
  });

  const pullToRefresh = usePullToRefresh({
    enabled: true,
    onRefresh: async () => {
      await Promise.all([
        health.refetch(),
        refetchPrices(),
        refetchLiquidity(),
        metadataQuery.refetch(),
      ]);
    },
  });

  const canSaveTags = useMemo(() => {
    const currentTags = normalizeTags(metadataQuery.data?.tags ?? []);
    const nextTags = normalizeTags(draftTags);
    return currentTags.join("|") !== nextTags.join("|") && (nextTags.length > 0 || Boolean(metadataQuery.data));
  }, [draftTags, metadataQuery.data]);

  const statusText = metadataQuery.isLoading
    ? "Loading metadata"
    : saveTags.isPending
      ? "Saving"
      : metadataQuery.data
        ? "Synced"
        : "Draft";

  if (!symbol) {
    return <div className="text-stellar-text-secondary">No asset symbol provided.</div>;
  }

  const onAddDraftTag = () => {
    setDraftTags((current) => addDraftTags(current, tagInput));
    setTagInput("");
  };

  const onRemoveDraftTag = (tag: string) => {
    setDraftTags((current) => current.filter((entry) => entry !== tag));
  };

  return (
    <div className="space-y-8">
      <PullToRefresh
        isPulling={pullToRefresh.isPulling}
        pullDistance={pullToRefresh.pullDistance}
        progress={pullToRefresh.progress}
        isRefreshing={pullToRefresh.isRefreshing}
      />

      <div className="rounded-2xl border border-stellar-border bg-gradient-to-br from-stellar-card via-stellar-card to-stellar-dark/35 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">{symbol}</h1>
            <p className="mt-2 text-stellar-text-secondary">
              Detailed monitoring for {symbol} on the Stellar network
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void pullToRefresh.refresh();
              }}
              className="rounded-md border border-stellar-border px-4 py-2 text-sm text-white hover:bg-stellar-border"
            >
              Refresh views
            </button>
            <AddToWatchlistButton symbol={symbol} className="text-sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <HealthScoreCard
          symbol={symbol}
          overallScore={health.data?.overallScore ?? null}
          factors={health.data?.factors ?? null}
          trend={health.data?.trend ?? null}
        />
        <div className="space-y-3 lg:col-span-2">
          <TimeRangeSelector chartId={`price-${symbol}`} title="Price chart range" />
          <PriceChart
            symbol={symbol}
            data={priceData?.history ?? []}
            isLoading={priceLoading}
            chartId={`price-${symbol}`}
            annotations={annotations.annotations}
          />
        </div>
      </div>

      <ChartAnnotationPanel
        symbol={symbol}
        annotations={annotations.annotations}
        defaultTimestamp={latestPriceTimestamp}
        addAnnotation={annotations.addAnnotation}
        updateAnnotation={annotations.updateAnnotation}
        removeAnnotation={annotations.removeAnnotation}
        clearAnnotations={annotations.clearAnnotations}
        exportAnnotations={annotations.exportAnnotations}
      />

      <div className="space-y-3">
        <TimeRangeSelector
          chartId={`liquidity-${symbol}`}
          title="Liquidity chart range"
          showApplyGlobally={false}
        />
        <LiquidityDepthChart
          symbol={symbol}
          data={liquidityData?.sources ?? []}
          isLoading={liquidityLoading}
          chartId={`liquidity-${symbol}`}
        />
      </div>

      <AssetTagsPanel
        symbol={symbol}
        tags={draftTags}
        draftTagInput={tagInput}
        onDraftTagInputChange={setTagInput}
        onAddTag={onAddDraftTag}
        onRemoveTag={onRemoveDraftTag}
        onSave={() => {
          void saveTags.mutateAsync();
        }}
        onReset={() => {
          setDraftTags(normalizeTags(metadataQuery.data?.tags ?? []));
          setTagInput("");
        }}
        canSave={canSaveTags}
        isSaving={saveTags.isPending}
        statusText={statusText}
      />

      <div className="bg-stellar-card border border-stellar-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Price Sources</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stellar-text-secondary border-b border-stellar-border">
                <th className="pb-3 pr-4">Source</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Last Updated</th>
                <th className="pb-3">Deviation</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {priceData?.sources && priceData.sources.length > 0 ? (
                priceData.sources.map(
                  (source: {
                    source: string;
                    price: number;
                    timestamp: string;
                  }) => (
                    <tr key={source.source} className="border-b border-stellar-border">
                      <td className="py-3 pr-4">{source.source}</td>
                      <td className="py-3 pr-4">${source.price.toFixed(4)}</td>
                      <td className="py-3 pr-4 text-stellar-text-secondary">{source.timestamp}</td>
                      <td className="py-3">--</td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-stellar-text-secondary">
                    No price source data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
