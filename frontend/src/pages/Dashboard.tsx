import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAssetsWithHealth } from "../hooks/useAssets";
import { useBridges } from "../hooks/useBridges";
import {
  isTimestampInRange,
  useDashboardFilters,
  type DashboardFilters,
} from "../hooks/useDashboardFilters";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import BridgeStatusCard from "../components/BridgeStatusCard";
import WatchlistWidget from "../components/watchlist/WatchlistWidget";
import ExternalDependencyPanel from "../components/dashboard/ExternalDependencyPanel";
import PullToRefresh from "../components/PullToRefresh";
import ComparativeSparklineGrid from "../components/analytics/ComparativeSparklineGrid";
import { SummaryCard } from "../components/SummaryCard";
import AssetDiscoverySection from "../components/dashboard/AssetDiscoverySection";
import FavoriteTagChip from "../components/favorites/FavoriteTagChip";
import AssetFilterPanel from "../components/Filters/AssetFilterPanel";
import { useFavorites } from "../hooks/useFavorites";
import { Tabs, TabList, Tab, TabPanel } from "../components/Tabs";
import type { AssetWithHealth, FilterStatus } from "../types";

type DashboardView = "overview" | "assets" | "bridges";
type BridgeStatusFilter = "all" | "healthy" | "degraded" | "down" | "unknown";

const VIEW_PARAM = "dashboard_view";
const BRIDGE_STATUS_PARAM = "dashboard_bridge_status";

const dashboardViews: Array<{ id: DashboardView; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Assets and bridges together" },
  { id: "assets", label: "Assets", description: "Asset health and watchlist focus" },
  { id: "bridges", label: "Bridges", description: "Bridge health focus" },
];

const bridgeStatusOptions: Array<{ id: BridgeStatusFilter; label: string }> = [
  { id: "all", label: "All statuses" },
  { id: "healthy", label: "Healthy" },
  { id: "degraded", label: "Degraded" },
  { id: "down", label: "Down" },
  { id: "unknown", label: "Unknown" },
];

function parseDashboardView(value: string | null): DashboardView {
  if (value === "assets" || value === "bridges") {
    return value;
  }
  return "overview";
}

function parseBridgeStatus(value: string | null): BridgeStatusFilter {
  if (
    value === "healthy" ||
    value === "degraded" ||
    value === "down" ||
    value === "unknown"
  ) {
    return value;
  }
  return "all";
}

function getAssetStatus(score: number | null | undefined): FilterStatus | null {
  if (score === null || score === undefined) return null;
  if (score >= 80) return "healthy";
  if (score >= 50) return "warning";
  return "critical";
}

function filterAssets(assets: AssetWithHealth[], filters: DashboardFilters): AssetWithHealth[] {
  const selectedAssets = new Set(filters.assets);

  return assets.filter((asset) => {
    if (selectedAssets.size > 0 && !selectedAssets.has(asset.symbol)) {
      return false;
    }

    if (filters.status !== "all") {
      const status = getAssetStatus(asset.health?.overallScore ?? null);
      if (status !== filters.status) return false;
    }

    return isTimestampInRange(asset.health?.lastUpdated, filters.timeRange);
  });
}

function useDashboardUrlState() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      view: parseDashboardView(params.get(VIEW_PARAM)),
      bridgeStatus: parseBridgeStatus(params.get(BRIDGE_STATUS_PARAM)),
    };
  }, [location.search]);

  function updateState(next: Partial<{ view: DashboardView; bridgeStatus: BridgeStatusFilter }>) {
    const params = new URLSearchParams(location.search);
    const nextView = next.view ?? state.view;
    const nextBridgeStatus = next.bridgeStatus ?? state.bridgeStatus;

    params.set(VIEW_PARAM, nextView);
    params.set(BRIDGE_STATUS_PARAM, nextBridgeStatus);

    navigate({ search: params.toString() }, { replace: true });
  }

  return {
    state,
    setView: (view: DashboardView) => updateState({ view }),
    setBridgeStatus: (bridgeStatus: BridgeStatusFilter) => updateState({ bridgeStatus }),
  };
}

export default function Dashboard() {
  const {
    data: assetsWithHealth,
    isLoading: assetsLoading,
    refetch: refetchAssets,
  } = useAssetsWithHealth();
  const { favoritesFilterMode, toggleFavoriteBridge, favoriteBridges } = useFavorites();
  const {
    data: bridgesData,
    isLoading: bridgesLoading,
    refetch: refetchBridges,
  } = useBridges();
  const dashboard = useDashboardUrlState();
  const {
    filters,
    savedPresets,
    hasActiveFilters,
    toggleAsset,
    toggleBridge,
    setStatus,
    setTimeRange,
    clearAll,
    savePreset,
    applyPreset,
    deletePreset,
  } = useDashboardFilters();
  const pullToRefresh = usePullToRefresh({
    enabled: true,
    onRefresh: async () => {
      await Promise.all([refetchAssets(), refetchBridges()]);
    },
  });

  const availableAssets = useMemo(() => {
    if (!assetsWithHealth) return [];
    return [...new Set(assetsWithHealth.map((asset) => asset.symbol))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [assetsWithHealth]);

  const availableBridges = useMemo(() => {
    return [...new Set((bridgesData?.bridges ?? []).map((bridge) => bridge.name))].sort(
      (a, b) => a.localeCompare(b),
    );
  }, [bridgesData?.bridges]);

  const filteredAssets = useMemo(
    () => filterAssets(assetsWithHealth ?? [], filters),
    [assetsWithHealth, filters],
  );

  const filteredBridges = useMemo(() => {
    let bridges = bridgesData?.bridges ?? [];
    if (dashboard.state.bridgeStatus !== "all") {
      bridges = bridges.filter((bridge) => bridge.status === dashboard.state.bridgeStatus);
    }
    if (filters.bridges.length > 0) {
      const selectedBridgeSet = new Set(filters.bridges);
      bridges = bridges.filter((bridge) => selectedBridgeSet.has(bridge.name));
    }
    if (favoritesFilterMode === "favorites") {
      bridges = bridges.filter((b) => favoriteBridges.includes(b.name));
    }
    return bridges;
  }, [
    bridgesData?.bridges,
    dashboard.state.bridgeStatus,
    favoritesFilterMode,
    favoriteBridges,
    filters.bridges,
  ]);

  const showAssets = dashboard.state.view !== "bridges";
  const showBridges = dashboard.state.view !== "assets";
  const sparklineItems = useMemo(
    () =>
      filteredAssets.slice(0, 6).map((asset) => ({
        symbol: asset.symbol,
        name: asset.name ?? asset.symbol,
        period: "7d" as const,
      })),
    [filteredAssets],
  );
  const showFilteredAssetEmpty =
    !assetsLoading &&
    hasActiveFilters &&
    filteredAssets.length === 0 &&
    (assetsWithHealth ?? []).length > 0;
  const bridgeFiltersActive =
    dashboard.state.bridgeStatus !== "all" ||
    filters.bridges.length > 0 ||
    favoritesFilterMode === "favorites";

  return (
    <div className="space-y-8">
      <PullToRefresh
        isPulling={pullToRefresh.isPulling}
        pullDistance={pullToRefresh.pullDistance}
        progress={pullToRefresh.progress}
        isRefreshing={pullToRefresh.isRefreshing}
      />

      <div className="space-y-4 rounded-2xl border border-stellar-border bg-gradient-to-br from-stellar-card via-stellar-card to-stellar-dark/40 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-stellar-text-secondary">
              Real-time monitoring of bridged assets on the Stellar network, with shareable
              views for assets, bridges, and the combined overview.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void pullToRefresh.refresh();
              }}
              className="rounded-full border border-stellar-border px-4 py-2 text-sm text-white transition-colors hover:bg-stellar-border"
            >
              Refresh data
            </button>
            <Tabs
              activeTab={dashboard.state.view}
              onTabChange={(id) => dashboard.setView(id as DashboardView)}
            >
              <TabList
                aria-label="Dashboard views"
                className="flex flex-wrap items-center gap-2"
              >
                {dashboardViews.map((view) => (
                  <Tab key={view.id} id={view.id}>
                    {view.label}
                  </Tab>
                ))}
              </TabList>
              {dashboardViews.map((view) => (
                <TabPanel key={view.id} id={view.id} keepMounted />
              ))}
            </Tabs>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-stellar-border/80 bg-stellar-dark/30 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-stellar-text-primary">Bridge status filter</p>
            <p className="text-xs text-stellar-text-secondary">
              The selected filter is encoded in the URL and survives reloads and shared links.
            </p>
          </div>

          <select
            value={dashboard.state.bridgeStatus}
            onChange={(e) => dashboard.setBridgeStatus(e.target.value as BridgeStatusFilter)}
            className="min-w-44 rounded-md border border-stellar-border bg-stellar-card px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-stellar-blue"
            aria-label="Filter bridges by status"
          >
            {bridgeStatusOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AssetFilterPanel
        assets={availableAssets}
        bridges={availableBridges}
        filters={filters}
        savedPresets={savedPresets}
        hasActiveFilters={hasActiveFilters}
        onToggleAsset={toggleAsset}
        onToggleBridge={toggleBridge}
        onStatusChange={setStatus}
        onTimeRangeChange={setTimeRange}
        onClearAll={clearAll}
        onSavePreset={savePreset}
        onApplyPreset={applyPreset}
        onDeletePreset={deletePreset}
      />

      {/* Overview Stats */}
      <section aria-labelledby="overview-stats">
        <h2 id="overview-stats" className="text-xl font-semibold text-white mb-4">
          Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Value Locked"
            value={
              bridgesLoading
                ? "--"
                : `$${bridgesData?.bridges
                    .reduce((sum, b) => sum + b.totalValueLocked, 0)
                    .toLocaleString() || "0"}`
            }
            loading={bridgesLoading}
            icon="💰"
            href="/bridges"
          />
          <SummaryCard
            title="Monitored Assets"
            value={assetsLoading ? "--" : assetsWithHealth?.length || 0}
            loading={assetsLoading}
            icon="📊"
            href="/assets"
          />
          <SummaryCard
            title="Active Bridges"
            value={
              bridgesLoading
                ? "--"
                : bridgesData?.bridges.filter((b: any) => b.status !== "down").length || 0
            }
            loading={bridgesLoading}
            icon="🌉"
            href="/bridges"
          />
          <SummaryCard
            title="System Health"
            value={assetsLoading ? "--" : "85%"}
            trend={{ value: "Improving", direction: "up" }}
            loading={assetsLoading}
            icon="❤️"
            href="/analytics"
          />
        </div>
      </section>

      {showAssets ? <ComparativeSparklineGrid items={sparklineItems} /> : null}

      {showAssets ? (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Asset Health</h2>
          </div>
          {showFilteredAssetEmpty ? (
            <div className="rounded-lg border border-stellar-border bg-stellar-card p-8 text-center">
              <p className="text-stellar-text-secondary">No assets match the selected filters.</p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-3 text-sm text-stellar-blue hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <AssetDiscoverySection assets={filteredAssets} isLoading={assetsLoading} />
          )}
        </section>
      ) : null}

      {showAssets ? <WatchlistWidget /> : null}

      {showAssets ? <ExternalDependencyPanel /> : null}

      {showBridges ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Bridge Status</h2>
            <Link to="/bridges" className="text-sm text-stellar-blue hover:underline">
              View all
            </Link>
          </div>
          {bridgesLoading ? (
            <p className="text-stellar-text-secondary">Loading bridges...</p>
          ) : filteredBridges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBridges.map((bridge) => (
                <BridgeStatusCard
                  key={bridge.name}
                  {...bridge}
                  topRight={
                    <FavoriteTagChip
                      compact
                      label={bridge.name}
                      active={favoriteBridges.includes(bridge.name)}
                      onToggle={() => toggleFavoriteBridge(bridge.name)}
                    />
                  }
                />
              ))}
            </div>
          ) : (
            <div className="bg-stellar-card border border-stellar-border rounded-lg p-8 text-center">
              <p className="text-stellar-text-secondary">
                {bridgeFiltersActive
                  ? "No bridges match the selected filters."
                  : "No bridge data available yet."}
              </p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
