import * as StellarSdk from "@stellar/stellar-sdk";
import { BridgeWatchContractSdk } from "./client";
import type { BridgeWatchSdkConfig, InvokeContractParams } from "./types";
import { BridgeWatchQueryError, BridgeWatchTransactionError } from "./errors";

// ============================================================
// TypeScript interfaces mirroring Soroban contract types
// ============================================================

export interface AssetHealth {
  asset_code: string;
  health_score: number;
  liquidity_score: number;
  price_stability_score: number;
  bridge_uptime_score: number;
  paused: boolean;
  active: boolean;
  timestamp: number;
  expires_at: number;
}

export interface PriceRecord {
  asset_code: string;
  price: bigint;
  source: string;
  timestamp: number;
  expires_at: number;
}

export interface HealthScoreBatch {
  asset_code: string;
  health_score: number;
  liquidity_score: number;
  price_stability_score: number;
  bridge_uptime_score: number;
}

export interface HealthWeights {
  liquidity_weight: number;
  price_stability_weight: number;
  bridge_uptime_weight: number;
  version: number;
}

export interface HealthScoreResult {
  composite_score: number;
  liquidity_score: number;
  price_stability_score: number;
  bridge_uptime_score: number;
  weights: HealthWeights;
  timestamp: number;
  expires_at: number;
}

export interface AggregatedHealth {
  asset_code: string;
  weighted_health_score: number;
  weighted_liquidity_score: number;
  weighted_price_stability_score: number;
  weighted_bridge_uptime_score: number;
  source_count: number;
  computed_at: number;
}

export interface HealthSource {
  source_id: string;
  weight_bps: number;
  trusted: boolean;
  registered_at: number;
}

export interface EventReplayPage {
  total: number;
  schema_version: number;
}

export interface SubmitHealthParams {
  caller: string;
  asset_code: string;
  health_score: number;
  liquidity_score: number;
  price_stability_score: number;
  bridge_uptime_score: number;
}

export interface SubmitPriceParams {
  caller: string;
  asset_code: string;
  price: bigint | number;
  source: string;
}

// ============================================================
// ScVal creation helpers
// ============================================================

function scvString(v: string): StellarSdk.xdr.ScVal {
  return StellarSdk.xdr.ScVal.scvString(v);
}

function scvU32(v: number): StellarSdk.xdr.ScVal {
  return StellarSdk.xdr.ScVal.scvU32(v);
}

function scvI128(v: bigint | number): StellarSdk.xdr.ScVal {
  const val = typeof v === "number" ? BigInt(v) : v;
  const lo = StellarSdk.xdr.Uint64.fromString(
    String(val & BigInt("0xFFFFFFFFFFFFFFFF"))
  );
  const hi = StellarSdk.xdr.Int64.fromString(
    String(val >> BigInt(64))
  );
  return StellarSdk.xdr.ScVal.scvI128(
    new StellarSdk.xdr.Int128Parts({ lo, hi })
  );
}

function scvU64(v: number): StellarSdk.xdr.ScVal {
  return StellarSdk.xdr.ScVal.scvU64(
    StellarSdk.xdr.Uint64.fromString(String(v))
  );
}

function scvBool(v: boolean): StellarSdk.xdr.ScVal {
  return StellarSdk.xdr.ScVal.scvBool(v);
}

function scvAddress(v: string): StellarSdk.xdr.ScVal {
  return StellarSdk.Address.fromString(v).toScVal();
}

function scvMap(
  entries: Array<{ key: string; val: StellarSdk.xdr.ScVal }>
): StellarSdk.xdr.ScVal {
  return StellarSdk.xdr.ScVal.scvMap(
    entries.map(
      (e) =>
        new StellarSdk.xdr.ScMapEntry({
          key: scvString(e.key),
          val: e.val,
        })
    )
  );
}

function scvVec(items: StellarSdk.xdr.ScVal[]): StellarSdk.xdr.ScVal {
  return StellarSdk.xdr.ScVal.scvVec(items);
}

// ============================================================
// ScVal parsing helpers
// ============================================================

function isScvVoid(val: StellarSdk.xdr.ScVal): boolean {
  return val.switch().name === "scvVoid";
}

function parseScvString(val: StellarSdk.xdr.ScVal): string {
  const v = val.str();
  if (v == null) return "";
  return typeof v === "string" ? v : Buffer.from(v).toString("utf-8");
}

function parseScvU32(val: StellarSdk.xdr.ScVal): number {
  return val.u32() ?? 0;
}

function parseScvU64(val: StellarSdk.xdr.ScVal): number {
  return Number(val.u64()?.toString() ?? "0");
}

function parseScvBool(val: StellarSdk.xdr.ScVal): boolean {
  return val.b() ?? false;
}

function parseScvI128(val: StellarSdk.xdr.ScVal): bigint {
  const parts = val.i128();
  const lo = BigInt(parts.lo().toString());
  const hi = BigInt(parts.hi().toString());
  return (hi << BigInt(64)) | lo;
}

function getScvMap(
  val: StellarSdk.xdr.ScVal
): Map<string, StellarSdk.xdr.ScVal> {
  const entries = val.map() ?? [];
  const m = new Map<string, StellarSdk.xdr.ScVal>();
  for (const entry of entries) {
    const key = parseScvString(entry.key());
    m.set(key, entry.val());
  }
  return m;
}

function parseAssetHealth(val: StellarSdk.xdr.ScVal): AssetHealth {
  const m = getScvMap(val);
  return {
    asset_code: parseScvString(m.get("asset_code")!),
    health_score: parseScvU32(m.get("health_score")!),
    liquidity_score: parseScvU32(m.get("liquidity_score")!),
    price_stability_score: parseScvU32(m.get("price_stability_score")!),
    bridge_uptime_score: parseScvU32(m.get("bridge_uptime_score")!),
    paused: parseScvBool(m.get("paused")!),
    active: parseScvBool(m.get("active")!),
    timestamp: parseScvU64(m.get("timestamp")!),
    expires_at: parseScvU64(m.get("expires_at")!),
  };
}

function parsePriceRecord(val: StellarSdk.xdr.ScVal): PriceRecord {
  const m = getScvMap(val);
  return {
    asset_code: parseScvString(m.get("asset_code")!),
    price: parseScvI128(m.get("price")!),
    source: parseScvString(m.get("source")!),
    timestamp: parseScvU64(m.get("timestamp")!),
    expires_at: parseScvU64(m.get("expires_at")!),
  };
}

function parseHealthWeights(val: StellarSdk.xdr.ScVal): HealthWeights {
  const m = getScvMap(val);
  return {
    liquidity_weight: parseScvU32(m.get("liquidity_weight")!),
    price_stability_weight: parseScvU32(m.get("price_stability_weight")!),
    bridge_uptime_weight: parseScvU32(m.get("bridge_uptime_weight")!),
    version: parseScvU32(m.get("version")!),
  };
}

function parseHealthScoreResult(val: StellarSdk.xdr.ScVal): HealthScoreResult {
  const m = getScvMap(val);
  return {
    composite_score: parseScvU32(m.get("composite_score")!),
    liquidity_score: parseScvU32(m.get("liquidity_score")!),
    price_stability_score: parseScvU32(m.get("price_stability_score")!),
    bridge_uptime_score: parseScvU32(m.get("bridge_uptime_score")!),
    weights: parseHealthWeights(m.get("weights")!),
    timestamp: parseScvU64(m.get("timestamp")!),
    expires_at: parseScvU64(m.get("expires_at")!),
  };
}

function parseAggregatedHealth(val: StellarSdk.xdr.ScVal): AggregatedHealth {
  const m = getScvMap(val);
  return {
    asset_code: parseScvString(m.get("asset_code")!),
    weighted_health_score: parseScvU32(m.get("weighted_health_score")!),
    weighted_liquidity_score: parseScvU32(m.get("weighted_liquidity_score")!),
    weighted_price_stability_score: parseScvU32(
      m.get("weighted_price_stability_score")!
    ),
    weighted_bridge_uptime_score: parseScvU32(
      m.get("weighted_bridge_uptime_score")!
    ),
    source_count: parseScvU32(m.get("source_count")!),
    computed_at: parseScvU64(m.get("computed_at")!),
  };
}

function parseHealthSource(val: StellarSdk.xdr.ScVal): HealthSource {
  const m = getScvMap(val);
  return {
    source_id: parseScvString(m.get("source_id")!),
    weight_bps: parseScvU32(m.get("weight_bps")!),
    trusted: parseScvBool(m.get("trusted")!),
    registered_at: parseScvU64(m.get("registered_at")!),
  };
}

function parseEventReplayPage(val: StellarSdk.xdr.ScVal): EventReplayPage {
  const m = getScvMap(val);
  return {
    total: parseScvU32(m.get("total")!),
    schema_version: parseScvU32(m.get("schema_version")!),
  };
}

function extractResultScVal(
  simulation: StellarSdk.rpc.Api.SimulateTransactionResponse
): StellarSdk.xdr.ScVal | undefined {
  if (
    StellarSdk.rpc.Api.isSimulationSuccess(simulation) &&
    simulation.result?.retval
  ) {
    return simulation.result.retval;
  }
  return undefined;
}

// ============================================================
// TypedBridgeWatchContractSdk
// ============================================================

export class TypedBridgeWatchContractSdk extends BridgeWatchContractSdk {
  constructor(config: BridgeWatchSdkConfig) {
    super(config);
  }

  // ---------------------------------------------------------
  // Health query methods
  // ---------------------------------------------------------

  async getContractHealth(assetCode: string): Promise<AssetHealth | null> {
    const result = await this.queryMethod({
      method: "get_health",
      args: [scvString(assetCode)],
    });
    const val = extractResultScVal(result);
    if (!val || isScvVoid(val)) return null;
    return parseAssetHealth(val);
  }

  async getHealthScoreResult(
    assetCode: string
  ): Promise<HealthScoreResult | null> {
    const result = await this.queryMethod({
      method: "get_health_score_result",
      args: [scvString(assetCode)],
    });
    const val = extractResultScVal(result);
    if (!val || isScvVoid(val)) return null;
    return parseHealthScoreResult(val);
  }

  async getAggregatedHealth(
    assetCode: string
  ): Promise<AggregatedHealth | null> {
    const result = await this.queryMethod({
      method: "get_aggregated_health",
      args: [scvString(assetCode)],
    });
    const val = extractResultScVal(result);
    if (!val || isScvVoid(val)) return null;
    return parseAggregatedHealth(val);
  }

  async getHealthWeights(): Promise<HealthWeights> {
    const result = await this.queryMethod({
      method: "get_health_weights",
    });
    const val = extractResultScVal(result);
    if (!val) throw new BridgeWatchQueryError("Empty result from get_health_weights");
    return parseHealthWeights(val);
  }

  async getHealthSources(): Promise<HealthSource[]> {
    const result = await this.queryMethod({
      method: "get_health_sources",
    });
    const val = extractResultScVal(result);
    if (!val) return [];
    const items = val.vec() ?? [];
    return items.map((item) => parseHealthSource(item));
  }

  async calculateHealthScore(
    liquidityScore: number,
    priceStabilityScore: number,
    bridgeUptimeScore: number
  ): Promise<HealthScoreResult> {
    const result = await this.queryMethod({
      method: "calculate_health_score",
      args: [
        scvU32(liquidityScore),
        scvU32(priceStabilityScore),
        scvU32(bridgeUptimeScore),
      ],
    });
    const val = extractResultScVal(result);
    if (!val)
      throw new BridgeWatchQueryError("Empty result from calculate_health_score");
    return parseHealthScoreResult(val);
  }

  // ---------------------------------------------------------
  // Price query methods
  // ---------------------------------------------------------

  async getPrice(assetCode: string): Promise<PriceRecord | null> {
    const result = await this.queryMethod({
      method: "get_price",
      args: [scvString(assetCode)],
    });
    const val = extractResultScVal(result);
    if (!val || isScvVoid(val)) return null;
    return parsePriceRecord(val);
  }

  // ---------------------------------------------------------
  // Replay query methods
  // ---------------------------------------------------------

  async getReplaySchemaVersion(): Promise<number> {
    const result = await this.queryMethod({
      method: "get_replay_schema_version",
    });
    const val = extractResultScVal(result);
    if (!val)
      throw new BridgeWatchQueryError("Empty result from get_replay_schema_version");
    return parseScvU32(val);
  }

  async getReplayEvents(
    fromOrderingKey: number,
    limit: number
  ): Promise<EventReplayPage> {
    const result = await this.queryMethod({
      method: "get_replay_events",
      args: [scvU64(fromOrderingKey), scvU32(limit)],
    });
    const val = extractResultScVal(result);
    if (!val)
      throw new BridgeWatchQueryError("Empty result from get_replay_events");
    return parseEventReplayPage(val);
  }

  async getReplayLogSize(): Promise<number> {
    const result = await this.queryMethod({
      method: "get_replay_log_size",
    });
    const val = extractResultScVal(result);
    if (!val)
      throw new BridgeWatchQueryError("Empty result from get_replay_log_size");
    return parseScvU32(val);
  }

  // ---------------------------------------------------------
  // Signature methods
  // ---------------------------------------------------------

  async getSignatureThreshold(): Promise<number> {
    const result = await this.queryMethod({
      method: "get_signature_threshold",
    });
    const val = extractResultScVal(result);
    if (!val)
      throw new BridgeWatchQueryError("Empty result from get_signature_threshold");
    return parseScvU32(val);
  }

  // ---------------------------------------------------------
  // Invoke (write) methods
  // ---------------------------------------------------------

  async submitHealth(
    params: SubmitHealthParams
  ): ReturnType<BridgeWatchContractSdk["invokeAndSend"]> {
    return this.invokeAndSend(
      {
        sourcePublicKey: params.caller,
        method: "submit_health",
        args: [
          scvAddress(params.caller),
          scvString(params.asset_code),
          scvU32(params.health_score),
          scvU32(params.liquidity_score),
          scvU32(params.price_stability_score),
          scvU32(params.bridge_uptime_score),
        ],
      },
      params.caller
    );
  }

  async submitHealthBatch(
    caller: string,
    records: HealthScoreBatch[]
  ): ReturnType<BridgeWatchContractSdk["invokeAndSend"]> {
    const batchItems = records.map((r) =>
      scvMap([
        { key: "asset_code", val: scvString(r.asset_code) },
        { key: "health_score", val: scvU32(r.health_score) },
        { key: "liquidity_score", val: scvU32(r.liquidity_score) },
        { key: "price_stability_score", val: scvU32(r.price_stability_score) },
        { key: "bridge_uptime_score", val: scvU32(r.bridge_uptime_score) },
      ])
    );
    return this.invokeAndSend(
      {
        sourcePublicKey: caller,
        method: "submit_health_batch",
        args: [scvAddress(caller), scvVec(batchItems)],
      },
      caller
    );
  }

  async submitPrice(
    params: SubmitPriceParams
  ): ReturnType<BridgeWatchContractSdk["invokeAndSend"]> {
    return this.invokeAndSend(
      {
        sourcePublicKey: params.caller,
        method: "submit_price",
        args: [
          scvAddress(params.caller),
          scvString(params.asset_code),
          scvI128(params.price),
          scvString(params.source),
        ],
      },
      params.caller
    );
  }

  async buildSubmitHealthTransaction(
    params: SubmitHealthParams
  ): ReturnType<BridgeWatchContractSdk["buildInvokeTransaction"]> {
    return this.buildInvokeTransaction({
      sourcePublicKey: params.caller,
      method: "submit_health",
      args: [
        scvAddress(params.caller),
        scvString(params.asset_code),
        scvU32(params.health_score),
        scvU32(params.liquidity_score),
        scvU32(params.price_stability_score),
        scvU32(params.bridge_uptime_score),
      ],
    });
  }

  async buildSubmitHealthBatchTransaction(
    caller: string,
    records: HealthScoreBatch[]
  ): ReturnType<BridgeWatchContractSdk["buildInvokeTransaction"]> {
    const batchItems = records.map((r) =>
      scvMap([
        { key: "asset_code", val: scvString(r.asset_code) },
        { key: "health_score", val: scvU32(r.health_score) },
        { key: "liquidity_score", val: scvU32(r.liquidity_score) },
        { key: "price_stability_score", val: scvU32(r.price_stability_score) },
        { key: "bridge_uptime_score", val: scvU32(r.bridge_uptime_score) },
      ])
    );
    return this.buildInvokeTransaction({
      sourcePublicKey: caller,
      method: "submit_health_batch",
      args: [scvAddress(caller), scvVec(batchItems)],
    });
  }

  async buildSubmitPriceTransaction(
    params: SubmitPriceParams
  ): ReturnType<BridgeWatchContractSdk["buildInvokeTransaction"]> {
    return this.buildInvokeTransaction({
      sourcePublicKey: params.caller,
      method: "submit_price",
      args: [
        scvAddress(params.caller),
        scvString(params.asset_code),
        scvI128(params.price),
        scvString(params.source),
      ],
    });
  }
}
