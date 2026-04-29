# Implementation Plan: Data Model Documentation

## Overview

Author `backend/docs/data-model.md` section by section, grounding each chunk in the actual `schema.sql`, `types.ts`, and migration files. Each task produces a reviewable, self-contained portion of the document. Tasks build incrementally so the file is always in a coherent state.

## Tasks

- [x] 1. Create the file skeleton and author Section 1 — Introduction & Source of Truth
  - Create `backend/docs/data-model.md` with a top-level heading and a table of contents placeholder
  - Write the Introduction section stating that `schema.sql` is the human-readable reference but is NOT run directly in production
  - State that migrations under `backend/src/database/migrations/` are the production source of truth
  - State that `types.ts` is the TypeScript source of truth and must be kept in sync manually
  - Note that `bridge_operators` and `reserve_commitments` mirror on-chain Soroban contract state (contract is authoritative, DB is a read-optimised cache)
  - Note that `bridge_operators.bridge_id` is TEXT (not UUID) because it mirrors the on-chain identifier format
  - Identify background-job-only writer tables (e.g., `prices` written by price aggregator worker, `health_scores` by health calculation job)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Author Section 2 — Naming Conventions
  - Document table naming: lowercase `snake_case`, plural nouns
  - Document primary key convention: UUID via `gen_random_uuid()` for most tables; `SERIAL` for `circuit_breaker_configs`, `circuit_breaker_recovery_requests`, `circuit_breaker_whitelist`; `INTEGER` for `circuit_breaker_pauses`; composite/no surrogate key for hypertables
  - Document timestamp convention: `TIMESTAMPTZ` (UTC) throughout; `created_at`/`updated_at` for mutable records; `time` (or `verified_at`) as hypertable partition key
  - Document TypeScript naming: `PascalCase` interfaces; `New*` prefix for insert types; union types for enumerated string columns
  - Document migration file naming: zero-padded three-digit prefix + descriptive slug; note that duplicate prefixes exist (`004_*`, `005_*`, `007_*`) and must be avoided
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Author Section 3 — Entity Reference, part A: Assets, Bridges, and Transactions
  - Write the **Assets** subsection for the `assets` table: purpose, Regular_Table, UUID PK, full column table (name, SQL type, nullable, default, description); annotate `issuer` as NULL for native XLM; annotate `asset_type` enum with all values and link to `AssetType` in `types.ts`
  - Write the **Bridges** subsection covering `bridges`, `bridge_operators`, and `bridge_volume_stats`: purpose, table type, PK type, full column tables; annotate all DECIMAL columns with the `parseFloat()` note; annotate `bridge_operators.stake` as BIGINT; note `bridge_volume_stats` is a pre-aggregated daily summary (not a hypertable); annotate `bridge_operators.bridge_id` as TEXT FK mirroring on-chain identifier
  - Write the **Transactions** subsection covering `bridge_transactions` and `asset_transactions` / `asset_transaction_sync_states`: purpose, Regular_Table, UUID PK, full column tables; annotate `status` enum values and link to `BridgeTransactionStatus` / `BridgeTransactionType` in `types.ts`; annotate DECIMAL amount/fee columns
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.3, 3.4_

- [x] 4. Author Section 3 — Entity Reference, part B: Alerts, Metrics & Time-Series, and Supply Verification
  - Write the **Alerts** subsection covering `alert_rules` and `alert_events` (hypertable): purpose, table type, PK type, full column tables; annotate `conditions` JSONB with expected structure; annotate `priority` and `condition_op` enums; annotate `alert_events` as append-only; annotate DECIMAL `triggered_value` and `threshold` columns
  - Write the **Metrics & Time-Series** subsection covering `prices`, `health_scores`, and `liquidity_snapshots` (all hypertables): purpose, Hypertable designation, composite partition key, full column tables; annotate all DECIMAL columns; note `dex` enum values and link to `DexName` in `types.ts`
  - Write the **Supply Verification** subsection covering `reserve_commitments` and `verification_results` (hypertable): purpose, table type, PK type, full column tables; annotate `merkle_root` and `leaf_hash` as 64-character lowercase hex SHA-256 strings; annotate `committed_at` as Unix epoch in milliseconds; annotate `reserve_leaves` JSONB; annotate `status` enum and link to `CommitmentStatus` in `types.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Author Section 3 — Entity Reference, part C: Circuit Breaker, Webhooks, User Preferences, Balance Tracking, and Supporting Entities
  - Write the **Circuit Breaker** subsection covering `circuit_breaker_configs`, `circuit_breaker_triggers`, `circuit_breaker_pauses`, `circuit_breaker_recovery_requests`, and `circuit_breaker_whitelist`: purpose, SERIAL/INTEGER PKs, full column tables; annotate `timestamp` and `recovery_deadline` as Unix epoch in milliseconds; annotate DECIMAL threshold columns; annotate `status` enums and link to `TriggerStatus` / `PauseStatus` in `types.ts`
  - Write the **Webhooks** subsection covering `webhook_endpoints`, `webhook_deliveries`, and `webhook_delivery_logs`: purpose, UUID PKs, full column tables; annotate `custom_headers` and `filter_event_types` JSONB columns; annotate `payload` and `request_headers` JSONB
  - Write the **User Preferences** subsection covering `preference_defaults`, `user_preference_states`, `user_preferences`, and `preference_migration_history`: purpose, UUID PKs, full column tables; annotate `value` JSONB and link to `PreferenceCategory` union type
  - Write the **Balance Tracking** subsection covering `tracked_balances` and `balance_history`: purpose, UUID PKs, full column tables; annotate DECIMAL balance columns
  - Write the **Supporting Entities** subsection covering `audit_logs`, watchlists, API keys, and config entries (sourced from migrations): purpose, table type, PK type, full column tables
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_

- [x] 6. Checkpoint — Review Section 3 completeness
  - Verify every table listed in the design's entity-group table has a subsection
  - Verify every DECIMAL column has the `parseFloat()` annotation
  - Verify every BIGINT Unix-ms column has the unit annotation
  - Verify every enum column lists all valid values and references the TypeScript union type
  - Verify all JSONB columns describe their expected structure or reference a TypeScript interface
  - Ask the user if any corrections are needed before proceeding to diagrams.

- [x] 7. Author Section 4 — Relationship Diagrams
  - Write **Diagram 1** as a Mermaid `erDiagram` block covering all FK relationships from `schema.sql` and migrations: `bridge_volume_stats` → `bridges`, `bridge_transactions` → `bridges`, `reserve_commitments` → `bridge_operators`, `verification_results` → `bridge_operators`, `alert_events` → `alert_rules`, `webhook_deliveries` → `webhook_endpoints`, `webhook_delivery_logs` → `webhook_endpoints` and `webhook_deliveries`, `circuit_breaker_recovery_requests` → `circuit_breaker_pauses`; annotate CASCADE-delete relationships with a note
  - Add a prose note listing application-level (no DB FK) relationships: `prices.symbol` → `assets.symbol`, `health_scores.symbol` → `assets.symbol`, `liquidity_snapshots.symbol` → `assets.symbol`, `alert_events.asset_code` → `assets.symbol`
  - Write **Diagram 2** as a Mermaid `flowchart` showing hypertable data-flow relationships to the regular tables they reference
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 8. Author Section 5 — Entity Lifecycles
  - Write **5.1** `reserve_commitments.status` with a Mermaid `stateDiagram-v2` covering all five states (`pending`, `verified`, `challenged`, `slashed`, `resolved`) and transition triggers; name `backend/src/workers/bridgeVerification.job.ts` and `backend/src/workers/bridgeMonitor.worker.ts` as responsible workers
  - Write **5.2** `bridge_transactions.status` with a Mermaid `stateDiagram-v2` covering all five states (`pending`, `processing`, `confirmed`, `failed`, `cancelled`); name `backend/src/workers/bridgeMonitor.worker.ts` as the responsible worker
  - Write **5.3** `alert_rules.is_active` and `alert_events` creation as prose + table: describe the evaluation loop in `backend/src/workers/alertEvaluation.worker.ts`; explain the cooldown mechanism (`NOW() - last_triggered_at > cooldown_seconds`); note that `is_active = false` skips the rule
  - Write **5.4** `circuit_breaker_pauses.status` with a Mermaid `stateDiagram-v2` covering three states (`active`, `recovering`, `resolved`); explain the guardian approval flow (`guardian_approvals >= guardian_threshold`); name `backend/src/workers/circuitBreaker.worker.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Author Section 6 — Storage & Retention
  - Write the **Hypertables and Retention Policies** table listing all five hypertables (`prices`, `health_scores`, `liquidity_snapshots`, `alert_events`, `verification_results`) with their partition column, 1-day chunk interval, and 90-day retention policy
  - Add a note explaining that range queries on hypertables should always include a `time` filter to leverage chunk exclusion
  - Note that `bridge_volume_stats` is a pre-aggregated daily summary Regular_Table (not a hypertable), populated by aggregation workers
  - Write the **Indexes** table grouped by table, listing every index from `schema.sql` and migrations with the query pattern each supports
  - Add the **DECIMAL precision** note: `DECIMAL(30,8)` for cross-chain amounts (sub-satoshi precision), `DECIMAL(20,8)` for prices, `DECIMAL(20,2)` for TVL/volume aggregates
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Author Section 7 — Update Workflow
  - Write the **Adding a new table** numbered checklist (6 steps): check existing migration prefixes, create migration file, run `npm run migrate`, add TypeScript interfaces to `types.ts`, update `data-model.md`, add hypertable entry if applicable
  - Write the **Modifying an existing column** numbered checklist (5 steps): create new migration, run `npm run migrate`, update `types.ts`, update column table and field-level notes in `data-model.md`, consult TimescaleDB docs if column is on a hypertable
  - Add warnings: `schema.sql` must not be edited directly; duplicate migration prefixes must be avoided; TimescaleDB restricts certain `ALTER TABLE` operations on hypertables
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 11. Final checkpoint — Full document review
  - Replace the table of contents placeholder with a complete, accurate TOC linking to all seven sections
  - Verify both Mermaid diagrams in Section 4 render correctly (paste into mermaid.live)
  - Verify all four lifecycle state-machine diagrams in Section 5 are present and syntactically valid
  - Confirm the index table in Section 6 covers all indexes from `schema.sql`
  - Confirm the update workflow checklists in Section 7 are numbered and complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are documentation authoring tasks — no application code is written
- Each task produces a self-contained, reviewable chunk of `backend/docs/data-model.md`
- Source files to reference throughout: `backend/src/database/schema.sql`, `backend/src/database/types.ts`, and files under `backend/src/database/migrations/`
- Mermaid diagrams should be validated at [mermaid.live](https://mermaid.live) before the final checkpoint
