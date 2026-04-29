import { useMemo, useState } from "react";
import type { FilterStatus } from "../../types";
import type {
  DashboardFilterPreset,
  DashboardFilters,
  DashboardTimeRangePreset,
} from "../../hooks/useDashboardFilters";

interface AssetFilterPanelProps {
  assets: string[];
  bridges: string[];
  filters: DashboardFilters;
  savedPresets: DashboardFilterPreset[];
  hasActiveFilters: boolean;
  onToggleAsset: (asset: string) => void;
  onToggleBridge: (bridge: string) => void;
  onStatusChange: (status: FilterStatus) => void;
  onTimeRangeChange: (timeRange: DashboardTimeRangePreset) => void;
  onClearAll: () => void;
  onSavePreset: (name: string) => boolean;
  onApplyPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
}

const STATUS_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Healthy" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

const TIME_RANGE_OPTIONS: Array<{ value: DashboardTimeRangePreset; label: string }> = [
  { value: "all", label: "All time" },
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
];

function SelectionGroup({
  title,
  items,
  selected,
  groupId,
  onToggle,
}: {
  title: string;
  items: string[];
  selected: string[];
  groupId: string;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-stellar-text-primary">{title}</legend>
      <div className="max-h-36 overflow-auto rounded-md border border-stellar-border bg-stellar-dark p-2">
        {items.length === 0 ? (
          <p className="text-xs text-stellar-text-secondary">No options available</p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const id = `${groupId}-${item}`;
              const checked = selected.includes(item);
              return (
                <li key={item}>
                  <label htmlFor={id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-stellar-text-primary hover:bg-stellar-card">
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(item)}
                      className="h-4 w-4 rounded border-stellar-border bg-stellar-card text-stellar-blue focus:ring-stellar-blue"
                    />
                    <span>{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </fieldset>
  );
}

export default function AssetFilterPanel({
  assets,
  bridges,
  filters,
  savedPresets,
  hasActiveFilters,
  onToggleAsset,
  onToggleBridge,
  onStatusChange,
  onTimeRangeChange,
  onClearAll,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
}: AssetFilterPanelProps) {
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");

  const selectedPreset = useMemo(
    () => savedPresets.find((preset) => preset.id === selectedPresetId) ?? null,
    [savedPresets, selectedPresetId],
  );

  function handleSavePreset() {
    const wasSaved = onSavePreset(presetName);
    if (wasSaved) {
      setPresetName("");
    }
  }

  function handleApplyPreset() {
    if (!selectedPresetId) return;
    onApplyPreset(selectedPresetId);
  }

  function handleDeletePreset() {
    if (!selectedPreset) return;
    onDeletePreset(selectedPreset.id);
    setSelectedPresetId("");
  }

  return (
    <section className="space-y-4 rounded-lg border border-stellar-border bg-stellar-card p-4" aria-labelledby="dashboard-filters-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 id="dashboard-filters-heading" className="text-base font-semibold text-stellar-text-primary">
          Filter Panel
        </h3>
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasActiveFilters}
          className="self-start rounded-md border border-stellar-border px-3 py-1.5 text-sm text-stellar-text-secondary hover:text-stellar-text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="dashboard-preset-name" className="block text-sm font-medium text-stellar-text-primary">
            Save current filters
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="dashboard-preset-name"
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Preset name"
              className="w-full rounded-md border border-stellar-border bg-stellar-dark px-3 py-2 text-sm text-stellar-text-primary placeholder:text-stellar-text-secondary focus:outline-none focus:ring-2 focus:ring-stellar-blue"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="rounded-md border border-stellar-border px-3 py-2 text-sm text-stellar-text-secondary hover:text-stellar-text-primary"
            >
              Save preset
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="dashboard-saved-presets" className="block text-sm font-medium text-stellar-text-primary">
            Saved presets
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              id="dashboard-saved-presets"
              value={selectedPresetId}
              onChange={(event) => setSelectedPresetId(event.target.value)}
              className="w-full rounded-md border border-stellar-border bg-stellar-dark px-3 py-2 text-sm text-stellar-text-primary focus:outline-none focus:ring-2 focus:ring-stellar-blue"
            >
              <option value="">Select preset</option>
              {savedPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyPreset}
              disabled={!selectedPreset}
              className="rounded-md border border-stellar-border px-3 py-2 text-sm text-stellar-text-secondary hover:text-stellar-text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleDeletePreset}
              disabled={!selectedPreset}
              className="rounded-md border border-stellar-border px-3 py-2 text-sm text-stellar-text-secondary hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SelectionGroup
          title="Assets"
          items={assets}
          selected={filters.assets}
          groupId="dashboard-filter-asset"
          onToggle={onToggleAsset}
        />

        <SelectionGroup
          title="Bridges"
          items={bridges}
          selected={filters.bridges}
          groupId="dashboard-filter-bridge"
          onToggle={onToggleBridge}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="dashboard-status-filter" className="mb-2 block text-sm font-medium text-stellar-text-primary">
            Status
          </label>
          <select
            id="dashboard-status-filter"
            value={filters.status}
            onChange={(event) => onStatusChange(event.target.value as FilterStatus)}
            className="w-full rounded-md border border-stellar-border bg-stellar-dark px-3 py-2 text-sm text-stellar-text-primary focus:outline-none focus:ring-2 focus:ring-stellar-blue"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-stellar-text-primary">Time range</legend>
          <div className="grid grid-cols-2 gap-2">
            {TIME_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onTimeRangeChange(option.value)}
                aria-pressed={filters.timeRange === option.value}
                className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                  filters.timeRange === option.value
                    ? "border-stellar-blue bg-stellar-blue/20 text-stellar-text-primary"
                    : "border-stellar-border bg-stellar-dark text-stellar-text-secondary hover:text-stellar-text-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
