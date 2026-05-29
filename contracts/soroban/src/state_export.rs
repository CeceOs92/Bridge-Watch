//! # State Export Functions
//!
//! Provides compact, exportable views of contract state for off-chain sync and auditing.
//!
//! ## Features
//! - Deterministic state snapshots
//! - Minimal payloads
//! - Stable schema versioning
//! - Read-only access
//! - Off-chain compatibility

use soroban_sdk::{contracttype, Address, Env, String, Vec};

/// Version marker for state export compatibility.
pub const STATE_EXPORT_VERSION: u32 = 1;

/// Compact representation of contract state for export.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StateExport {
    /// Schema version for compatibility tracking.
    pub version: u32,
    /// Timestamp when state was exported.
    pub exported_at: u64,
    /// Contract address generating the export.
    pub contract_address: Address,
    /// Compact state payload (deterministic).
    pub state_hash: String,
    /// Summary metadata.
    pub metadata: ExportMetadata,
}

/// Metadata about exported state.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExportMetadata {
    /// Total number of items in state.
    pub item_count: u32,
    /// Size estimate in bytes.
    pub size_estimate_bytes: u32,
    /// Compression level applied (0=none, 1=basic).
    pub compression_level: u32,
    /// Notes about the export.
    pub notes: String,
}

/// Summary of asset state for export.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetStateSnapshot {
    /// Asset code.
    pub asset_code: String,
    /// Asset status.
    pub status: String,
    /// Compliance status.
    pub compliance: String,
    /// Risk rating.
    pub risk_rating: String,
    /// Risk score in basis points.
    pub risk_score_bps: u32,
    /// Number of chain links.
    pub chain_count: u32,
    /// Number of oracle feeds.
    pub oracle_feed_count: u32,
    /// Number of bridge associations.
    pub bridge_count: u32,
    /// Number of liquidity pool associations.
    pub pool_count: u32,
    /// Is frozen.
    pub is_frozen: bool,
    /// Timestamp of last update.
    pub updated_at: u64,
}

/// Export helper for building state snapshots.
pub struct StateExportHelper {
    env: Env,
}

impl StateExportHelper {
    /// Create a new state export helper.
    pub fn new(env: Env) -> Self {
        StateExportHelper { env }
    }

    /// Generate deterministic state hash for audit trail.
    pub fn compute_state_hash(
        env: Env,
        asset_code: &String,
        status: &String,
        risk_score: u32,
        timestamp: u64,
    ) -> String {
        let mut hash_input = String::from_str(&env, "");
        hash_input = String::from_str(&env, &format!("{}{}{}{}", asset_code, status, risk_score, timestamp));
        hash_input
    }

    /// Create a state export snapshot.
    pub fn create_export(
        env: Env,
        contract_address: Address,
        state_hash: String,
        item_count: u32,
        notes: String,
    ) -> StateExport {
        let now = env.ledger().timestamp();
        StateExport {
            version: STATE_EXPORT_VERSION,
            exported_at: now,
            contract_address,
            state_hash,
            metadata: ExportMetadata {
                item_count,
                size_estimate_bytes: item_count * 256,
                compression_level: 0,
                notes,
            },
        }
    }

    /// Create asset state snapshot for export.
    pub fn snapshot_asset_state(
        asset_code: String,
        status: String,
        compliance: String,
        risk_rating: String,
        risk_score_bps: u32,
        chain_count: u32,
        oracle_feed_count: u32,
        bridge_count: u32,
        pool_count: u32,
        is_frozen: bool,
        updated_at: u64,
    ) -> AssetStateSnapshot {
        AssetStateSnapshot {
            asset_code,
            status,
            compliance,
            risk_rating,
            risk_score_bps,
            chain_count,
            oracle_feed_count,
            bridge_count,
            pool_count,
            is_frozen,
            updated_at,
        }
    }
}

// ===========================================================================
// Tests
// ===========================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[test]
    fn test_state_export_version() {
        assert_eq!(STATE_EXPORT_VERSION, 1);
    }

    #[test]
    fn test_create_export_snapshot() {
        let env = Env::default();
        let contract = Address::generate(&env);
        let hash = String::from_str(&env, "abc123");
        let notes = String::from_str(&env, "Daily export");

        let export = StateExportHelper::create_export(&env, contract.clone(), hash.clone(), 42, notes.clone());

        assert_eq!(export.version, STATE_EXPORT_VERSION);
        assert_eq!(export.contract_address, contract);
        assert_eq!(export.state_hash, hash);
        assert_eq!(export.metadata.item_count, 42);
        assert_eq!(export.metadata.notes, notes);
    }

    #[test]
    fn test_asset_state_snapshot() {
        let env = Env::default();
        let asset_code = String::from_str(&env, "USDC");
        let status = String::from_str(&env, "Active");
        let compliance = String::from_str(&env, "Compliant");
        let risk = String::from_str(&env, "Low");

        let snapshot = StateExportHelper::snapshot_asset_state(
            asset_code.clone(),
            status.clone(),
            compliance.clone(),
            risk.clone(),
            1_500,
            3,
            2,
            1,
            2,
            false,
            1_000_000,
        );

        assert_eq!(snapshot.asset_code, asset_code);
        assert_eq!(snapshot.status, status);
        assert_eq!(snapshot.risk_score_bps, 1_500);
        assert_eq!(snapshot.chain_count, 3);
        assert!(!snapshot.is_frozen);
    }

    #[test]
    fn test_compute_state_hash() {
        let env = Env::default();
        let asset_code = String::from_str(&env, "USDC");
        let status = String::from_str(&env, "Active");

        let hash = StateExportHelper::compute_state_hash(&env, &asset_code, &status, 5_000, 1_000_000);
        assert!(!hash.is_empty());
    }

    #[test]
    fn test_metadata_size_estimate() {
        let env = Env::default();
        let export = StateExportHelper::create_export(
            env,
            Address::generate(&env),
            String::from_str(&env, "hash"),
            100,
            String::from_str(&env, "test"),
        );

        assert_eq!(export.metadata.size_estimate_bytes, 25_600); // 100 * 256
    }
}
