export interface Asset {
  symbol: string;
  name: string;
}

export interface HealthFactors {
  liquidityDepth: number;
  priceStability: number;
  bridgeUptime: number;
  reserveBacking: number;
  volumeTrend: number;
}

export interface HealthScore {
  symbol: string;
  overallScore: number;
  factors: HealthFactors;
  trend: "improving" | "stable" | "deteriorating";
  lastUpdated: string;
}

export type HealthStatus = "healthy" | "warning" | "critical";

export interface AssetWithHealth extends Asset {
  health: HealthScore | null;
}

export type SortField = "symbol" | "score";
export type SortOrder = "asc" | "desc";
export type FilterStatus = "all" | HealthStatus;

export interface Bridge {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  totalValueLocked: number;
  supplyOnStellar: number;
  supplyOnSource: number;
  mismatchPercentage: number;
}

export interface BridgeStats {
  name: string;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  totalTransactions: number;
  averageTransferTime: number;
  uptime30d: number;
}

/**
 * Bridge summary data combining status and performance metrics
 * for display in summary card components
 */
export interface BridgeSummary {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  /** Coverage metric: bridge uptime percentage (0-100) */
  coverage: number;
  /** Performance metric: average transfer time in milliseconds */
  performance: number;
  /** Total value locked in the bridge */
  totalValueLocked: number;
  /** Supply on Stellar */
  supplyOnStellar: number;
  /** Supply on source chain */
  supplyOnSource: number;
  /** Mismatch percentage between supplies */
  mismatchPercentage: number;
  /** Timestamp of last data update */
  lastUpdated: string;
}

// Transaction History types
export type TransactionStatus = "pending" | "completed" | "failed";

export interface BridgeTransaction {
  id: string;
  txHash: string;
  bridge: string;
  asset: string;
  amount: number;
  sourceChain: string;
  destinationChain: string;
  senderAddress: string;
  recipientAddress: string;
  status: TransactionStatus;
  fee: number;
  timestamp: string;
  confirmedAt: string | null;
  stellarTxHash: string | null;
  ethereumTxHash: string | null;
  blockNumber: number | null;
}

export interface TransactionFilters {
  bridge: string;
  asset: string;
  status: TransactionStatus | "all";
  search: string;
  dateFrom: string;
  dateTo: string;
}

export interface TransactionPage {
  transactions: BridgeTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ExportFormat = "csv" | "json";

export type ExportDataType = "analytics" | "transactions" | "health_metrics";

export type ExportStatus = "pending" | "processing" | "completed" | "failed";

export interface ExportFilters {
  startDate: string;
  endDate: string;
  assetCodes?: string[];
  bridgeIds?: string[];
}

export interface ExportRecord {
  id: string;
  requested_by: string;
  format: ExportFormat;
  data_type: ExportDataType;
  filters: ExportFilters;
  status: ExportStatus;
  download_url: string | null;
  download_url_expires_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// WebSocket connection
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export type SubscriptionChannel = "prices" | "health" | "health-updates" | "alerts" | "bridges";

interface WsBaseMessage {
  channel: SubscriptionChannel | string;
  type?: string;
  timestamp?: string;
}

export interface WsPriceMessage extends WsBaseMessage {
  channel: "prices";
  symbol: string;
  price: number;
  source: string;
  vwap?: number;
}

export interface WsHealthMessage extends WsBaseMessage {
  channel: "health" | "health-updates";
  symbol: string;
  overallScore: number;
  factors: HealthFactors;
  trend: "improving" | "stable" | "deteriorating";
  lastUpdated: string;
}

export interface WsAlertMessage extends WsBaseMessage {
  channel: "alerts";
  severity: "info" | "warning" | "critical";
  message: string;
  symbol?: string;
  bridgeName?: string;
}

export interface WsBridgeMessage extends WsBaseMessage {
  channel: "bridges";
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  totalValueLocked: number;
  supplyOnStellar: number;
  supplyOnSource: number;
  mismatchPercentage: number;
}

export type WsMessage = WsPriceMessage | WsHealthMessage | WsAlertMessage | WsBridgeMessage;

export type PriceTimeframe = "1H" | "24H" | "7D" | "30D";

export interface AssetInfo {
  symbol: string;
  name: string;
  type?: string;
  description?: string;
  issuer?: string;
  domain?: string;
  bridge?: string;
  sourceChain?: string;
}

export interface AssetMetadata {
  id: string;
  asset_id: string;
  symbol: string;
  category: string | null;
  tags: string[];
  description?: string | null;
  updated_at?: string;
  version?: number;
}

export interface PriceSource {
  source: string;
  price: number;
  timestamp: string;
  deviation: number;
  status: "active" | "stale" | "offline";
}

export interface HealthHistoryPoint {
  timestamp: string;
  score: number;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimitPerMinute: number;
  usageCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  rateLimitPerMinute?: number;
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  apiKey: string;
  key: ApiKeyRecord;
}

/** Service dependency graph (`/metadata/dependencies`) */
export type DependencyNodeStatus = "healthy" | "degraded" | "down" | "unknown";

export type DependencyNodeType = string;

export interface DependencyGraph {
  summary: {
    totalNodes: number;
    degradedServices: number;
    downServices: number;
  };
  nodes: Array<{
    id: string;
    label: string;
    description: string;
    type: DependencyNodeType;
    status: DependencyNodeStatus;
    impactHint: string;
  }>;
  edges: Array<{ from: string; to: string; kind: string }>;
}

export type AlertRoutingSeverity = "critical" | "high" | "medium" | "low";
export type AlertRoutingChannel = "in_app" | "webhook" | "email";
export type AlertRoutingAuditStatus =
  | "queued"
  | "delivered"
  | "suppressed"
  | "failed"
  | "fallback";

export interface AlertRoutingRule {
  id: string;
  name: string;
  ownerAddress: string | null;
  severityLevels: AlertRoutingSeverity[];
  assetCodes: string[];
  sourceTypes: string[];
  channels: AlertRoutingChannel[];
  fallbackChannels: AlertRoutingChannel[];
  suppressionWindowSeconds: number;
  priorityOrder: number;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRoutingAuditEntry {
  id: string;
  eventTime: string;
  alertRuleId: string;
  routingRuleId: string | null;
  ownerAddress: string;
  assetCode: string;
  sourceType: string;
  severity: AlertRoutingSeverity;
  channel: string;
  status: AlertRoutingAuditStatus;
  reason: string | null;
  attemptCount: number;
  latencyMs: number | null;
  createdAt: string;
}

export interface CreateAlertRoutingRuleRequest {
  name: string;
  ownerAddress?: string;
  severityLevels?: AlertRoutingSeverity[];
  assetCodes?: string[];
  sourceTypes?: string[];
  channels: AlertRoutingChannel[];
  fallbackChannels?: AlertRoutingChannel[];
  suppressionWindowSeconds?: number;
  priorityOrder?: number;
  isActive?: boolean;
}

export type UpdateAlertRoutingRuleRequest = Partial<CreateAlertRoutingRuleRequest>;
