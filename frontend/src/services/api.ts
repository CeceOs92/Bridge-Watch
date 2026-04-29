import type {
  AlertRoutingAuditEntry,
  AlertRoutingRule,
  ApiKeyRecord,
  Asset,
  AssetMetadata,
  AssetInfo,
  AssetWithHealth,
  CreateAlertRoutingRuleRequest,
  Bridge,
  BridgeStats,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  DependencyGraph,
  HealthScore,
  TransactionFilters,
  TransactionPage,
  UpdateAlertRoutingRuleRequest,
} from "../types";
const API_BASE_URL = "/api/v1";

async function fetchApi<T>(
  endpoint: string,
  init?: RequestInit,
  apiKey?: string
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (apiKey) {
    headers.set("x-api-key", apiKey);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      detail = body.error ?? body.message ?? "";
    } catch {
      // ignore non-JSON error bodies
    }
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`API error: ${response.status} ${response.statusText}${suffix}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/** Root health endpoint (not under /api/v1). */
export async function getServerHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch("/health");
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export interface SystemStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  maintenance?: {
    active: boolean;
    message: string;
    severity: "info" | "warning" | "critical";
    statusPageUrl?: string;
  };
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const response = await fetch("/health/detailed");
  if (!response.ok) {
    throw new Error(`System status check failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Assets
export function getAssets() {
  return fetchApi<{ assets: Asset[]; total: number }>("/assets");
}

export function getAssetDetail(symbol: string) {
  return fetchApi<{ symbol: string; details: unknown }>(`/assets/${symbol}`);
}

export function getAssetHealth(symbol: string) {
  return fetchApi<HealthScore | null>(`/assets/${symbol}/health`);
}

export function getAssetHealthHistory(
  symbol: string,
  period: "24h" | "7d" | "30d" = "7d"
) {
  return fetchApi<
    | {
        symbol: string;
        period: "24h" | "7d" | "30d";
        points: Array<{ timestamp: string; score: number }>;
      }
    | null
  >(`/assets/${symbol}/health/history?period=${period}`);
}

export async function getAssetsWithHealth(): Promise<AssetWithHealth[]> {
  const { assets } = await getAssets();
  const healthPromises = assets.map(async (asset) => {
    try {
      const health = await getAssetHealth(asset.symbol);
      return { ...asset, health };
    } catch {
      return { ...asset, health: null };
    }
  });
  return Promise.all(healthPromises);
}

export function getAssetLiquidity(symbol: string) {
  return fetchApi<{
    symbol: string;
    totalLiquidity: number;
    sources: Array<{
      dex: string;
      bidDepth: number;
      askDepth: number;
      totalLiquidity: number;
      timestamp?: string;
    }>;
  } | null>(`/assets/${symbol}/liquidity`);
}

export function getAssetPrice(symbol: string) {
  return fetchApi<{
    symbol: string;
    vwap: number;
    sources: Array<{ source: string; price: number; timestamp: string }>;
    history?: Array<{ source: string; price: number; timestamp: string }>;
    deviation: number;
    lastUpdated: string;
  } | null>(`/assets/${symbol}/price`);
}

export function getAssetInfo(symbol: string) {
  return fetchApi<AssetInfo | null>(`/assets/${symbol}/info`);
}

export function getAssetMetadataBySymbol(symbol: string) {
  return fetchApi<AssetMetadata>(`/metadata/symbol/${symbol}`);
}

export function upsertAssetMetadata(payload: {
  assetId: string;
  symbol: string;
  metadata: {
    category?: string | null;
    tags?: string[];
    description?: string | null;
  };
  updatedBy: string;
}) {
  return fetchApi<AssetMetadata>("/metadata", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getAssetPriceHistory(symbol: string, timeframe: string) {
  return fetchApi<Array<{ source: string; price: number; timestamp: string }>>(
    `/assets/${symbol}/price/history?timeframe=${timeframe}`
  );
}

export function getAssetPriceSources(symbol: string) {
  return fetchApi<Array<{ source: string; price: number; timestamp: string }>>(
    `/assets/${symbol}/price/sources`
  );
}

export function getAssetLiquiditySources(symbol: string) {
  return fetchApi<Array<{
    dex: string;
    bidDepth: number;
    askDepth: number;
    totalLiquidity: number;
  }>>(`/assets/${symbol}/liquidity/sources`);
}

export function getAssetVolume(symbol: string) {
  return fetchApi<{
    symbol: string;
    volume24h: number;
    volume7d: number;
    volume30d: number;
  } | null>(`/assets/${symbol}/volume`);
}

export function getAssetSupplyVerification(symbol: string) {
  return fetchApi<{
    symbol: string;
    onChainSupply: number;
    offChainSupply: number;
    mismatchPercentage: number;
    lastVerified: string;
  } | null>(`/assets/${symbol}/supply`);
}

export function getAssetAlerts(symbol: string) {
  return fetchApi<Array<{
    id: string;
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
    createdAt: string;
  }>>(`/assets/${symbol}/alerts`);
}

export interface AlertSuppressionRule {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  maintenanceMode: boolean;
  expiresAt: string | null;
}

export function getSuppressionRules(includeExpired = false) {
  return fetchApi<{ rules: AlertSuppressionRule[] }>(
    `/alert-suppression/rules?includeExpired=${includeExpired ? "true" : "false"}`
  );
}

export function toggleSuppressionRule(id: string, payload: { actor: string; isActive: boolean }) {
  return fetchApi<{ rule: AlertSuppressionRule }>(`/alert-suppression/rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createMaintenanceOverride(payload: {
  actor: string;
  startAt: string;
  endAt: string;
  description?: string;
  sources?: string[];
  assetCodes?: string[];
}) {
  return fetchApi<{ rule: AlertSuppressionRule }>("/alert-suppression/maintenance/override", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function previewSuppression(payload: {
  actor: string;
  assetCode: string;
  source: string;
  alertType: "price_deviation" | "supply_mismatch" | "bridge_downtime" | "health_score_drop" | "volume_anomaly" | "reserve_ratio_breach";
  priority: "critical" | "high" | "medium" | "low";
}) {
  return fetchApi<{
    decision: {
      suppressed: boolean;
      matchedRule: { id: string; name: string } | null;
      reason: string | null;
    };
  }>("/alert-suppression/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Bridges
export function getBridges() {
  return fetchApi<{ bridges: Bridge[] }>("/bridges");
}

export function getBridgeStats(bridge: string) {
  return fetchApi<BridgeStats | null>(`/bridges/${bridge}/stats`);
}

export function getDependencyGraph(filters?: {
  type?: string;
  status?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("q", filters.search);

  const query = params.toString();
  return fetchApi<DependencyGraph>(
    `/metadata/dependencies${query ? `?${query}` : ""}`
  );
}

// Transactions
export function getTransactions(
  filters: TransactionFilters,
  page: number,
  pageSize: number
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.bridge) params.set("bridge", filters.bridge);
  if (filters.asset) params.set("asset", filters.asset);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  return fetchApi<TransactionPage>(`/transactions?${params.toString()}`);
}

export function exportTransactionsCsv(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.bridge) params.set("bridge", filters.bridge);
  if (filters.asset) params.set("asset", filters.asset);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  params.set("format", "csv");

  return `${API_BASE_URL}/transactions/export?${params.toString()}`;
}

// API key management
export function listApiKeys(apiKey: string) {
  return fetchApi<{ keys: ApiKeyRecord[] }>("/admin/api-keys", undefined, apiKey);
}

export function createApiKey(
  apiKey: string,
  payload: CreateApiKeyRequest
) {
  return fetchApi<CreateApiKeyResponse>(
    "/admin/api-keys",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    apiKey
  );
}

export function rotateApiKey(apiKey: string, id: string) {
  return fetchApi<CreateApiKeyResponse>(
    `/admin/api-keys/${id}/rotate`,
    { method: "POST" },
    apiKey
  );
}

export function revokeApiKey(apiKey: string, id: string) {
  return fetchApi<{ key: ApiKeyRecord }>(
    `/admin/api-keys/${id}/revoke`,
    { method: "POST" },
    apiKey
  );
}

export function extendApiKey(apiKey: string, id: string, extraDays: number) {
  return fetchApi<{ key: ApiKeyRecord }>(
    `/admin/api-keys/${id}/extend`,
    {
      method: "POST",
      body: JSON.stringify({ extraDays }),
    },
    apiKey
  );
}

// Alert routing admin
export function listAlertRoutingRules(apiKey: string, ownerAddress?: string) {
  const suffix = ownerAddress
    ? `?ownerAddress=${encodeURIComponent(ownerAddress)}`
    : "";
  return fetchApi<{ rules: AlertRoutingRule[] }>(
    `/admin/alert-routing/rules${suffix}`,
    undefined,
    apiKey
  );
}

export function createAlertRoutingRule(
  apiKey: string,
  payload: CreateAlertRoutingRuleRequest
) {
  return fetchApi<{ rule: AlertRoutingRule }>(
    "/admin/alert-routing/rules",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    apiKey
  );
}

export function updateAlertRoutingRule(
  apiKey: string,
  id: string,
  payload: UpdateAlertRoutingRuleRequest
) {
  return fetchApi<{ rule: AlertRoutingRule }>(
    `/admin/alert-routing/rules/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    apiKey
  );
}

export function deleteAlertRoutingRule(apiKey: string, id: string) {
  return fetchApi<Record<string, never>>(
    `/admin/alert-routing/rules/${id}`,
    {
      method: "DELETE",
    },
    apiKey
  );
}

export function getAlertRoutingAudit(
  apiKey: string,
  options?: {
    ownerAddress?: string;
    status?: "queued" | "delivered" | "suppressed" | "failed" | "fallback";
    channel?: string;
    limit?: number;
  }
) {
  const params = new URLSearchParams();
  if (options?.ownerAddress) params.set("ownerAddress", options.ownerAddress);
  if (options?.status) params.set("status", options.status);
  if (options?.channel) params.set("channel", options.channel);
  if (options?.limit) params.set("limit", String(options.limit));

  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";

  return fetchApi<{ entries: AlertRoutingAuditEntry[] }>(
    `/admin/alert-routing/audit${suffix}`,
    undefined,
    apiKey
  );
}

// Supply Chain
export function getSupplyChainGraph() {
  return fetchApi<import("../components/SupplyChainViz/types").SupplyChainGraph>("/supply-chain");
}

export function getSupplyChainNodes() {
  return fetchApi<{ nodes: import("../components/SupplyChainViz/types").ChainNode[] }>("/supply-chain/nodes");
}

export function getSupplyChainEdges() {
  return fetchApi<{ edges: import("../components/SupplyChainViz/types").BridgeEdge[] }>("/supply-chain/edges");
}

// Price Feeds
export function getPriceFeeds() {
  return fetchApi<{
    prices: Array<{
      symbol: string;
      price: number;
      confidence: number;
      sources: number;
      lastUpdated: string;
    }>;
  }>("/price-feeds");
}

export function getPriceFeed(symbol: string) {
  return fetchApi<{
    symbol: string;
    price: number;
    confidence: number;
    sources: number;
    lastUpdated: string;
  }>(`/price-feeds/${symbol}`);
}

export function getPriceFeedComparison(symbol: string) {
  return fetchApi<{
    symbol: string;
    consensus: number;
    samples: Array<{
      source: string;
      price: number;
      weight: number;
      isOutlier: boolean;
    }>;
  }>(`/price-feeds/${symbol}/compare`);
}

export function getPriceFeedHealth() {
  return fetchApi<{
    sources: Array<{
      name: string;
      successRate: number;
      avgLatencyMs: number;
      lastSuccess: string | null;
    }>;
  }>("/price-feeds/health");
}

export interface ExternalDependencyCheck {
  id: string;
  providerKey: string;
  status: "healthy" | "degraded" | "down" | "maintenance" | "unknown";
  checkedAt: string;
  latencyMs: number | null;
  statusCode: number | null;
  withinThreshold: boolean;
  alertTriggered: boolean;
  error: string | null;
  details: Record<string, unknown>;
}

export interface ExternalDependency {
  providerKey: string;
  displayName: string;
  category: string;
  endpoint: string;
  checkType: "http" | "jsonrpc";
  latencyWarningMs: number;
  latencyCriticalMs: number;
  failureThreshold: number;
  maintenanceMode: boolean;
  maintenanceNote: string | null;
  status: "healthy" | "degraded" | "down" | "maintenance" | "unknown";
  lastCheckedAt: string | null;
  lastLatencyMs: number | null;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  alertState: "none" | "firing" | "suppressed";
  history?: ExternalDependencyCheck[];
}

export function getExternalDependencies(includeHistory = true, historyLimit = 8) {
  const params = new URLSearchParams({
    includeHistory: includeHistory ? "true" : "false",
    historyLimit: String(historyLimit),
  });

  return fetchApi<{
    dependencies: ExternalDependency[];
    summary: Record<"healthy" | "degraded" | "down" | "maintenance" | "unknown", number>;
  }>(`/external-dependencies?${params.toString()}`);
}

export interface IndexedSearchResult {
  id: string;
  type: "asset" | "bridge" | "incident" | "alert";
  title: string;
  description: string;
  relevanceScore: number;
  highlights: string[];
  metadata: Record<string, unknown>;
}

export function searchIndexed(query: string, limit = 12) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fuzzy: "true",
  });

  return fetchApi<{
    success: boolean;
    data: {
      results: IndexedSearchResult[];
      total: number;
    };
  }>(`/search?${params.toString()}`);
}
