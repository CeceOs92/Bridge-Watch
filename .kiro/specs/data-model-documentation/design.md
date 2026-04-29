# Design Document: Data Model Documentation

## Overview

This feature produces a single comprehensive Markdown file — `backend/docs/data-model.md` — that serves as the canonical human-readable reference for the Stellar Bridge Watch database schema. The document covers every table, its columns, relationships, lifecycles, storage strategy, naming conventions, source-of-truth notes, and a step-by-step update workflow.

The output is a **static documentation artifact**. No new application code is written. The design specifies exactly what the file contains, how it is structured, and how it links back to the canonical source files.

### Goals

- Give contributors a single place to understand the full data model without reading raw SQL or TypeScript
- Provide accurate Mermaid diagrams for all foreign-key and data-flow relationships
- Document field-level nuances (DECIMAL strings, BIGINT Unix timestamps, enum values, Merkle hashes)
- Describe entity lifecycles with state-machine diagrams
- Explain storage strategy, retention policies, and indexes
- Codify naming conventions and the update workflow

### Non-Goals

- Generating documentation automatically from the schema (this is hand-authored)
- Replacing the OpenAPI spec (`backend/docs/openapi.json`) for API documentation
- Modifying any application code

---

## Architecture

The feature is purely additive: one new file is created under `backend/docs/`.

```
backend/docs/
  data-model.md          ← new file (this feature)
  API.md
  analytics-service.md
  balance-tracking.md
  ...
```

The document references but does not duplicate:
- `backend/src/database/schema.sql` — canonical SQL reference
- `backend/src/database/types.ts` — canonical TypeScript interfaces
- `backend/src/database/migrations/` — production source of truth

---

## Components and Interfaces

### Document Structure

`backend/docs/data-model.md` is organised into the following top-level sections:

| # | Section | Satisfies Requirements |
|---|---------|----------------------|
| 1 | Introduction & Source of Truth | Req 7 |
| 2 | Naming Conventions | Req 6 |
| 3 | Entity Reference | Req 1, 3 |
| 4 | Relationship Diagrams | Req 2 |
| 5 | Entity Lifecycles | Req 4 |
| 6 | Storage & Retention | Req 5 |
| 7 | Update Workflow | Req 8 |

### Section 1 — Introduction & Source of Truth

States clearly:
- `schema.sql` is the human-readable reference but is **not** run directly in production
- Migrations under `backend/src/database/migrations/` are the **production source of truth**
- `types.ts` is the TypeScript source of truth and must be kept in sync manually
- `bridge_operators` and `reserve_commitments` mirror on-chain Soroban contract state; the contract is authoritative, the DB is a read-optimised cache
- `bridge_operators.bridge_id` is TEXT (not UUID) because it mirrors the on-chain identifier format
- Tables populated exclusively by background workers are identified with their writer

### Section 2 — Naming Conventions

Documents:
- **Tables**: lowercase `snake_case`, plural nouns (e.g., `alert_rules`, `bridge_transactions`)
- **Primary keys**: UUID via `gen_random_uuid()` for most tables; `SERIAL` for circuit-breaker tables (`circuit_breaker_configs`, `circuit_breaker_recovery_requests`, `circuit_breaker_whitelist`); `INTEGER` for `circuit_breaker_pauses`; composite/application-assigned for hypertables
- **Timestamps**: `TIMESTAMPTZ` (UTC) throughout; `created_at`/`updated_at` for mutable records; `time` as the hypertable partition key
- **TypeScript**: `PascalCase` interfaces; `New*` prefix for insert types omitting auto-generated fields; union types for enumerated string columns (e.g., `BridgeStatus`, `AlertPriority`)
- **Migration files**: zero-padded three-digit prefix + descriptive slug (e.g., `009_bridge_transactions.ts`); duplicate prefixes exist in the repo (`004_*`, `005_*`, `007_*`) and must be avoided going forward

### Section 3 — Entity Reference

One subsection per entity group. Each subsection contains:
1. A brief purpose statement
2. Table type (Regular or Hypertable) and primary key type
3. A Markdown table listing every column: name, SQL type, nullable, default, description
4. Field-level annotations for DECIMAL, BIGINT timestamps, enums, JSONB, and hashes

**Entity groups and their tables:**

| Group | Tables |
|-------|--------|
| Assets | `assets` |
| Bridges | `bridges`, `bridge_operators`, `bridge_volume_stats` |
| Transactions | `bridge_transactions`, `asset_transactions`, `asset_transaction_sync_states` |
| Alerts | `alert_rules`, `alert_events` (hypertable) |
| Metrics & Time-Series | `prices` (hypertable), `health_scores` (hypertable), `liquidity_snapshots` (hypertable) |
| Supply Verification | `reserve_commitments`, `verification_results` (hypertable) |
| Circuit Breaker | `circuit_breaker_configs`, `circuit_breaker_triggers`, `circuit_breaker_pauses`, `circuit_breaker_recovery_requests`, `circuit_breaker_whitelist` |
| Webhooks | `webhook_endpoints`, `webhook_deliveries`, `webhook_delivery_logs` |
| User Preferences | `preference_defaults`, `user_preference_states`, `user_preferences`, `preference_migration_history` |
| Balance Tracking | `tracked_balances`, `balance_history` |
| Supporting | `audit_logs`, watchlists, API keys, config entries |

**Field-level annotation rules applied throughout:**

- Every `DECIMAL` column: *"Returned as a string by the pg driver; use `parseFloat()` before arithmetic."*
- `BIGINT` Unix-ms columns (`committed_at`, `timestamp`, `recovery_deadline`): *"Unix epoch in milliseconds (UTC)."*
- Enum columns: list all valid values + link to the TypeScript union type in `types.ts`
- `issuer` on `assets`: *"NULL for the native XLM asset; non-null for all bridged credit assets."*
- `merkle_root` / `leaf_hash`: *"64-character lowercase hex string (SHA-256)."*
- JSONB columns: describe expected structure or reference the TypeScript interface

### Section 4 — Relationship Diagrams

**Diagram 1 — Full ER Diagram (all FK relationships)**

A single Mermaid `erDiagram` block covering every foreign key defined in `schema.sql` and migrations. Cascade-delete relationships are annotated with `||--o{` notation and a `(CASCADE)` label in the diagram or an adjacent note.

Key relationships to capture:
- `bridge_volume_stats.bridge_name` → `bridges.name` (CASCADE)
- `bridge_transactions.bridge_name` → `bridges.name` (CASCADE)
- `bridge_operators.bridge_id` ← `reserve_commitments.bridge_id` (CASCADE) — TEXT FK, application-level origin
- `bridge_operators.bridge_id` ← `verification_results.bridge_id` (CASCADE)
- `alert_rules.id` ← `alert_events.rule_id` (CASCADE)
- `webhook_endpoints.id` ← `webhook_deliveries.webhook_endpoint_id` (CASCADE)
- `webhook_deliveries.id` ← `webhook_delivery_logs.webhook_delivery_id` (CASCADE)
- `circuit_breaker_pauses.pause_id` ← `circuit_breaker_recovery_requests.pause_id`

Application-level (no DB FK) relationships noted separately:
- `prices.symbol` → `assets.symbol`
- `health_scores.symbol` → `assets.symbol`
- `liquidity_snapshots.symbol` → `assets.symbol`
- `alert_events.asset_code` → `assets.symbol`

**Diagram 2 — Hypertable Data-Flow**

A Mermaid `flowchart` or second `erDiagram` showing how each hypertable relates to the regular tables it references:

```
prices          --symbol--> assets
health_scores   --symbol--> assets
liquidity_snapshots --symbol--> assets
alert_events    --rule_id--> alert_rules
                --asset_code--> assets (app-level)
verification_results --bridge_id--> bridge_operators
```

### Section 5 — Entity Lifecycles

**5.1 `reserve_commitments.status`**

States: `pending` → `verified` | `challenged` → `slashed` | `resolved`

Mermaid `stateDiagram-v2` diagram. Transition triggers:
- `pending` → `verified`: verification job confirms Merkle proof (`backend/src/workers/bridgeVerification.job.ts`)
- `pending` → `challenged`: challenger submits dispute (on-chain event, synced by `backend/src/workers/bridgeMonitor.worker.ts`)
- `challenged` → `slashed`: challenge upheld on-chain
- `challenged` → `resolved`: challenge rejected
- `verified` → `resolved`: normal resolution

**5.2 `bridge_transactions.status`**

States: `pending` → `processing` → `confirmed` | `failed` | `cancelled`

Mermaid `stateDiagram-v2` diagram. Responsible workers:
- `pending` → `processing`: `backend/src/workers/bridgeMonitor.worker.ts`
- `processing` → `confirmed`: on-chain confirmation detected
- `processing` → `failed`: timeout or error
- `pending` → `cancelled`: manual cancellation via API

**5.3 `alert_rules.is_active` and `alert_events` creation**

Prose + table describing:
- Rule evaluation loop in `backend/src/workers/alertEvaluation.worker.ts`
- Cooldown mechanism: a new `alert_events` row is only created if `NOW() - last_triggered_at > cooldown_seconds`
- `is_active = false` skips the rule entirely during evaluation

**5.4 `circuit_breaker_pauses.status`**

States: `active` → `recovering` → `resolved`

Mermaid `stateDiagram-v2` diagram. Guardian approval flow:
- `active`: pause is in effect; `guardian_approvals` increments as guardians approve recovery
- `active` → `recovering`: `guardian_approvals >= guardian_threshold`
- `recovering` → `resolved`: recovery deadline passes or final approval received
- Responsible worker: `backend/src/workers/circuitBreaker.worker.ts`

### Section 6 — Storage & Retention

**Hypertables and retention policies:**

| Table | Partition Column | Chunk Interval | Retention |
|-------|-----------------|----------------|-----------|
| `prices` | `time` | 1 day | 90 days |
| `health_scores` | `time` | 1 day | 90 days |
| `liquidity_snapshots` | `time` | 1 day | 90 days |
| `alert_events` | `time` | 1 day | 90 days |
| `verification_results` | `verified_at` | 1 day | 90 days |

Notes:
- Range queries on hypertables should always include a `time` filter to leverage chunk exclusion
- `bridge_volume_stats` is a **pre-aggregated daily summary** (Regular_Table, not a hypertable); it is populated by `backend/src/jobs/dataCleanup.job.ts` and related aggregation workers

**All indexes grouped by table** (from `schema.sql` and migrations):

| Table | Index | Query Pattern |
|-------|-------|---------------|
| `prices` | `(symbol, time DESC)` | Time-range queries per asset |
| `health_scores` | `(symbol, time DESC)` | Health history per asset |
| `liquidity_snapshots` | `(symbol, time DESC)`, `(dex, time DESC)` | Liquidity by asset or DEX |
| `alert_events` | `(asset_code, time DESC)`, `(rule_id, time DESC)` | Alert history per asset or rule |
| `verification_results` | `(bridge_id, verified_at DESC)`, `(bridge_id, sequence)` | Verification history per bridge |
| `alert_rules` | `(owner_address)`, `(asset_code, is_active)` | Rules by owner; active rules per asset |
| `reserve_commitments` | `(bridge_id, status)`, `(committed_at)` | Pending/challenged commitments; time range |
| `bridge_volume_stats` | `(stat_date, bridge_name)` | Daily stats per bridge |
| `circuit_breaker_pauses` | `(pause_scope, identifier)`, `(status)` | Active pauses by scope |
| `circuit_breaker_triggers` | `(alert_type, asset_code)`, `(status)` | Triggers by type/asset |
| `webhook_endpoints` | `(owner_address)`, `(is_active)` | Endpoints by owner |
| `webhook_deliveries` | `(webhook_endpoint_id)`, `(status)`, `(created_at DESC)` | Pending/failed deliveries |
| `audit_logs` | `(actor_id)`, `(action)`, `(resource_type, resource_id)`, `(severity)`, `(created_at)` | Audit queries |

**DECIMAL precision note:**
- `DECIMAL(30,8)` is used for cross-chain amounts to support sub-satoshi precision
- `DECIMAL(20,8)` for prices
- `DECIMAL(20,2)` for TVL and volume aggregates

### Section 7 — Update Workflow

**Adding a new table (numbered checklist):**
1. Check `backend/src/database/migrations/` for the highest existing prefix; use the next available three-digit number
2. Create `backend/src/database/migrations/NNN_descriptive_slug.ts` with `up()` and `down()` functions
3. Run `npm run migrate` to apply and regenerate `schema.sql`
4. Add the TypeScript interface(s) to `backend/src/database/types.ts`
5. Update `backend/docs/data-model.md`: add entity subsection, column table, and update the ER diagram
6. If the table is a hypertable, add it to the Hypertables & Retention table in Section 6

**Modifying an existing column (numbered checklist):**
1. Create a new migration file (do not edit existing migrations)
2. Run `npm run migrate` to apply and regenerate `schema.sql`
3. Update the TypeScript interface in `types.ts`
4. Update the column table and any field-level notes in `data-model.md`
5. If the column is on a hypertable, consult the [TimescaleDB ALTER TABLE documentation](https://docs.timescale.com/use-timescale/latest/schema-management/alter/) — some operations require special handling

**Warnings:**
- `schema.sql` is regenerated from migrations via `npm run migrate` and must **not** be edited directly
- Duplicate migration prefixes exist (`004_*`, `005_*`, `007_*`); always check existing files before choosing a prefix
- TimescaleDB restricts certain `ALTER TABLE` operations on hypertables (e.g., adding NOT NULL columns without defaults)

---

## Data Models

The documentation artifact itself has no runtime data model. The entities it documents are defined in:
- `backend/src/database/schema.sql`
- `backend/src/database/types.ts`
- `backend/src/database/migrations/`

---

## Correctness Properties

PBT is not applicable to this feature. The output is a static Markdown documentation file. All acceptance criteria are documentation completeness and accuracy checks on a static artifact — there is no code logic with varying inputs that would benefit from property-based testing.

Alternative testing strategy: manual review against the acceptance criteria checklist in the requirements document, supplemented by a CI lint step that validates Mermaid diagram syntax.

---

## Error Handling

This feature has no runtime error handling — it is a documentation artifact. The only failure mode is the document becoming out of sync with the schema. This is mitigated by:

1. The update workflow checklist (Section 7 of the document) making documentation updates an explicit step in every schema change
2. Linking directly to `schema.sql` and `types.ts` so contributors can cross-reference
3. Noting in `schema.sql` that `data-model.md` must be updated when the schema changes

---

## Testing Strategy

Because this feature produces a static documentation artifact, automated testing is limited to structural checks:

**Manual review checklist** (run once after the document is authored):
- All entity groups from Req 1.1 have dedicated sections
- Every table has a complete column table (name, type, nullable, default, description)
- All DECIMAL columns have the `parseFloat()` annotation
- All BIGINT Unix-ms columns have the unit annotation
- All enum columns list valid values and reference `types.ts`
- Both Mermaid diagrams render correctly (paste into [mermaid.live](https://mermaid.live))
- All four lifecycle state-machine diagrams are present
- Hypertable retention table is complete
- Index table covers all indexes from `schema.sql`
- Update workflow checklists are numbered and complete

**CI lint (optional, recommended):**
```bash
npx @mermaid-js/mermaid-cli -i backend/docs/data-model.md --check
```
This validates that all Mermaid code blocks in the document parse without errors.

**No property-based tests are written for this feature.** The acceptance criteria are documentation quality checks, not executable code properties.
