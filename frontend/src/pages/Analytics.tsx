import { useState } from "react";
import ColorPreviewTool from "../components/ColorPreviewTool";
import { MetricsDrilldown } from "../components/MetricsDrilldown";

export default function Analytics() {
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  const metrics = [
    { id: "tvl", label: "Total Value Locked", value: "$12.5M", trend: { value: "+12%", direction: "up" }, icon: "💰" },
    { id: "assets", label: "Monitored Assets", value: "42", trend: { value: "+3", direction: "up" }, icon: "📊" },
    { id: "bridges", label: "Active Bridges", value: "8/10", trend: { value: "2 down", direction: "down" }, icon: "🌉" },
    { id: "health", label: "System Health", value: "85%", trend: { value: "+5%", direction: "up" }, icon: "❤️" },
    { id: "alerts", label: "Active Alerts", value: "3", trend: { value: "-2", direction: "down" }, icon: "⚠️" },
    { id: "volume", label: "24h Volume", value: "$4.2M", trend: { value: "+8%", direction: "up" }, icon: "📈" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="mt-2 text-stellar-text-secondary">
            Historical trends, cross-asset comparisons, and ecosystem health metrics
          </p>
        </div>
        <button
          onClick={handleCaptureSnapshot}
          disabled={isLoading || bridgeData.length === 0}
          className="px-4 py-2 bg-stellar-blue text-white rounded-lg text-sm font-semibold hover:bg-stellar-blue/90 transition-colors disabled:opacity-50"
        >
          Capture Snapshot
        </button>
      </div>

      {snapshot && (
        <section className="print:m-0 print:p-0">
          <div className="flex justify-between items-center mb-4 no-print">
            <h2 className="text-xl font-semibold text-white">Latest Snapshot</h2>
            <button onClick={() => setSnapshot(null)} className="text-sm text-stellar-text-secondary hover:text-white">
              Dismiss
            </button>
          </div>
          <SnapshotCard 
            title={snapshot.title}
            bridges={bridgeData.slice(0, 5)} 
            timestamp={snapshot.timestamp}
          />
        </section>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.slice(0, 4).map((stat) => (
          <div
            key={stat.id}
            className="bg-stellar-card border border-stellar-border rounded-lg p-6 cursor-pointer hover:border-stellar-blue transition-colors"
            onClick={() => setIsDrilldownOpen(true)}
          >
            <p className="text-sm text-stellar-text-secondary">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
            {stat.trend && (
              <p className={`mt-1 text-sm ${stat.trend.direction === "up" ? "text-green-400" : "text-red-400"}`}>
                {stat.trend.value}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setIsDrilldownOpen(true)}
          className="bg-stellar-card border border-stellar-border rounded-lg p-6 flex flex-col items-center justify-center hover:border-stellar-blue transition-colors"
        >
          <span className="text-3xl mb-2">🔍</span>
          <span className="text-sm font-medium text-stellar-text-primary">View All Metrics</span>
        </button>
      </div>

      <BridgeComparison bridges={bridgeData} isLoading={isLoading} />

      {/* Health Score Trends */}
      <div className="bg-stellar-card border border-stellar-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Health Score Trends
        </h2>
        <div className="h-64 flex items-center justify-center">
          <p className="text-stellar-text-secondary">
            Historical health score charts will render here once data is
            available
          </p>
        </div>
      </div>

      {/* Volume Analytics */}
      <div className="bg-stellar-card border border-stellar-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Bridge Volume Analytics
        </h2>
        <div className="h-64 flex items-center justify-center">
          <p className="text-stellar-text-secondary">
            Volume analytics will render here once bridge monitoring data is
            collected
          </p>
        </div>
      </div>

      {/* Liquidity Distribution */}
      <div className="bg-stellar-card border border-stellar-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Liquidity Distribution Across DEXs
        </h2>
        <div className="h-64 flex items-center justify-center">
          <p className="text-stellar-text-secondary">
            DEX liquidity distribution charts will render here once data is
            aggregated
          </p>
        </div>
      </div>

      <ColorPreviewTool />

      {/* Metrics Drilldown Panel */}
      <MetricsDrilldown
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        metrics={metrics}
        title="Metrics Drilldown"
      />
    </div>
  );
}
