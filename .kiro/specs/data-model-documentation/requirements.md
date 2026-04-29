# Requirements Document

## Introduction

Stellar Bridge Watch is a full-stack TypeScript monorepo that monitors cross-chain bridged assets on the Stellar network. The project currently lacks a consolidated reference that explains how its core database entities relate to each other, how they evolve over time, and where each piece of data originates. This feature produces a documentation artifact — a set of Markdown files — that gives contributors a clear, accurate, and maintainable map of the data model. The output links directly to the canonical schema file and TypeScript types so it stays in sync with the codebase.

## Glossary

- **Data_Model_Doc**: The documentation artifact produced by this feature (one or more Markdown files).
- **Schema_File**: `backend/src/database/schema.sql` — the canonical SQL definition of all tables.
- **Types_File**: `backend/src/database/types.ts` — the TypeScript interfaces that mirror the SQL schema.
- **Migration**: A numbered file under `backend/src/database/migrations/` that applies an incremental schema change.
- **Hypertable**: A TimescaleDB time-series table (e.g., `prices`, `health_scores`, `alert_events`).
- **Regular_Table**: A standard PostgreSQL table without time-series partitioning.
- **Entity**: A top-level database table or logical group of related tables (e.g., Asset, Bridge, Alert).
- **Contributor**: Any developer reading or updating the documentation.
- **Source_Of_Truth**: The single authoritative location for a given piece of data (schema file, migration, or external contract).
- **Lifecycle**: The set of valid states an entity can occupy and the transitions between them.
- **Naming_Convention**: The agreed-upon rules for table names, column names, type aliases, and enum values used across the project.

---

## Requirements

### Requirement 1: Entity Descriptions

**User Story:** As a contributor, I want a plain-language description of every core entity, so that I understand what each table represents and why it exists.

#### Acceptance Criteria

1. THE Data_Model_Doc SHALL contain a dedicated section for each of the following entity groups: Assets, Bridges, Alerts, Metrics & Time-Series, Transactions, Health Scores, Supply Verification, Watchlists, and Supporting Entities (API keys, audit logs, preferences, webhooks, circuit breaker).
2. WHEN a section describes an entity, THE Data_Model_Doc SHALL include the entity's purpose, its primary key type (UUID, SERIAL, or composite), and whether it is a Hypertable or Regular_Table.
3. THE Data_Model_Doc SHALL list every column for each entity with its SQL data type, nullability, default value, and a one-line description of its meaning.
4. WHERE an entity uses a JSONB column, THE Data_Model_Doc SHALL describe the expected structure or reference the TypeScript interface that defines it.

---

### Requirement 2: Relationship Diagrams

**User Story:** As a contributor, I want visual diagrams of how entities relate to each other, so that I can understand foreign keys and data flow without reading raw SQL.

#### Acceptance Criteria

1. THE Data_Model_Doc SHALL include at least one Mermaid entity-relationship diagram covering all foreign-key relationships defined in the Schema_File and Migrations.
2. WHEN a foreign key uses `ON DELETE CASCADE`, THE Data_Model_Doc SHALL annotate that relationship in the diagram or an accompanying note.
3. THE Data_Model_Doc SHALL include a separate diagram or section showing the data-flow relationships between the time-series Hypertables and the Regular_Tables they reference (e.g., `alert_events` → `alert_rules`, `health_scores` → `assets`).
4. IF a relationship is enforced only at the application layer (not via a database foreign key), THEN THE Data_Model_Doc SHALL explicitly note it as an application-level constraint.

---

### Requirement 3: Field-Level Notes

**User Story:** As a contributor, I want field-level annotations on non-obvious columns, so that I can use them correctly without reading service code.

#### Acceptance Criteria

1. THE Data_Model_Doc SHALL annotate every `DECIMAL` column with a note that the PostgreSQL driver returns it as a string and that `parseFloat()` is required before arithmetic.
2. THE Data_Model_Doc SHALL annotate every `BIGINT` column that stores a Unix timestamp in milliseconds (e.g., `committed_at`, `timestamp`, `recovery_deadline`) with its unit and epoch.
3. WHEN a column stores an enumerated value (e.g., `status`, `asset_type`, `priority`), THE Data_Model_Doc SHALL list all valid values and reference the corresponding TypeScript union type in the Types_File.
4. THE Data_Model_Doc SHALL note that `issuer` is NULL for the native XLM asset and non-null for all bridged credit assets.
5. WHERE a column stores a Merkle root or cryptographic hash, THE Data_Model_Doc SHALL specify its encoding (hex string, fixed length) and the algorithm used where known.

---

### Requirement 4: Lifecycle Descriptions

**User Story:** As a contributor, I want state-machine diagrams or tables for entities that have a `status` field, so that I understand valid transitions and what triggers them.

#### Acceptance Criteria

1. THE Data_Model_Doc SHALL document the lifecycle of `reserve_commitments.status` with all valid states (`pending`, `verified`, `challenged`, `slashed`, `resolved`) and the events that trigger each transition.
2. THE Data_Model_Doc SHALL document the lifecycle of `bridge_transactions.status` with all valid states (`pending`, `processing`, `confirmed`, `failed`, `cancelled`) and the service or worker responsible for each transition.
3. THE Data_Model_Doc SHALL document the lifecycle of `alert_rules.is_active` and `alert_events` creation, including the cooldown mechanism controlled by `cooldown_seconds` and `last_triggered_at`.
4. THE Data_Model_Doc SHALL document the lifecycle of `circuit_breaker_pauses.status` (`active`, `recovering`, `resolved`) and the role of `guardian_approvals` and `guardian_threshold` in the recovery flow.
5. WHEN a lifecycle transition is driven by a background worker or job, THE Data_Model_Doc SHALL name the responsible file under `backend/src/workers/` or `backend/src/jobs/`.

---

### Requirement 5: Storage Considerations

**User Story:** As a contributor, I want notes on storage strategy and data retention, so that I can make informed decisions about queries and infrastructure.

#### Acceptance Criteria

1. THE Data_Model_Doc SHALL list all Hypertables and their configured TimescaleDB retention policies (currently 90 days for `prices`, `health_scores`, `liquidity_snapshots`, `alert_events`, `verification_results`).
2. THE Data_Model_Doc SHALL explain that Hypertables are partitioned by their `time` column with 1-day chunks and describe the performance implications for range queries.
3. THE Data_Model_Doc SHALL document all database indexes defined in the Schema_File and Migrations, grouped by table, with a note on the query pattern each index supports.
4. IF a table uses `DECIMAL(30,8)` precision, THEN THE Data_Model_Doc SHALL note the rationale (sub-satoshi precision for cross-chain amounts).
5. THE Data_Model_Doc SHALL note that `bridge_volume_stats` is a pre-aggregated daily summary table and is not a Hypertable, distinguishing it from the raw time-series tables.

---

### Requirement 6: Naming Conventions

**User Story:** As a contributor, I want a reference for the naming conventions used across the schema, so that I follow them consistently when adding new tables or columns.

#### Acceptance Criteria

1. THE Data_Model_Doc SHALL document the table naming convention: lowercase `snake_case`, plural nouns (e.g., `alert_rules`, `bridge_transactions`).
2. THE Data_Model_Doc SHALL document the primary key convention: UUID via `gen_random_uuid()` for most tables, `SERIAL` for circuit-breaker tables, and composite or application-assigned keys for specific cases.
3. THE Data_Model_Doc SHALL document the timestamp convention: all timestamps use `TIMESTAMPTZ` (UTC), columns are named `created_at` / `updated_at` for mutable records and `time` for Hypertable partition keys.
4. THE Data_Model_Doc SHALL document the TypeScript naming convention: interfaces use `PascalCase`, `New*` prefix for insert types that omit auto-generated fields, and union types for enumerated string columns.
5. THE Data_Model_Doc SHALL document the migration file naming convention: zero-padded three-digit prefix followed by a descriptive slug (e.g., `009_bridge_transactions.ts`).

---

### Requirement 7: Source of Truth Notes

**User Story:** As a contributor, I want to know the authoritative source for each entity's definition, so that I edit the right file when making schema changes.

#### Acceptance Criteria

1. THE Data_Model_Doc SHALL state that `backend/src/database/schema.sql` is the human-readable reference for the initial schema but is NOT run directly in production; Migrations are the Source_Of_Truth for production deployments.
2. THE Data_Model_Doc SHALL state that `backend/src/database/types.ts` is the Source_Of_Truth for TypeScript interfaces and must be kept in sync with the Schema_File and Migrations manually.
3. WHEN an entity's state is also mirrored from an on-chain Soroban contract (e.g., `bridge_operators`, `reserve_commitments`), THE Data_Model_Doc SHALL note that the contract state is the authoritative source and the database is a read-optimised cache.
4. THE Data_Model_Doc SHALL note that `bridge_operators.bridge_id` is a TEXT foreign key (not UUID) because it mirrors the on-chain identifier format.
5. IF a table is populated exclusively by a background job or worker, THEN THE Data_Model_Doc SHALL identify that job as the sole writer for that table.

---

### Requirement 8: Update Workflow

**User Story:** As a contributor, I want a step-by-step guide for updating the data model, so that I keep the schema, migrations, types, and documentation consistent.

#### Acceptance Criteria

1. THE Data_Model_Doc SHALL provide a numbered checklist for adding a new table: create a Migration file, update `schema.sql`, add TypeScript interfaces to `types.ts`, update the documentation.
2. THE Data_Model_Doc SHALL provide a numbered checklist for modifying an existing column: create a Migration file, update `schema.sql`, update the TypeScript interface, update field-level notes in the documentation.
3. THE Data_Model_Doc SHALL specify that Migration files must follow the zero-padded three-digit naming convention and that duplicate prefixes (as seen with `004_*`, `005_*`, `007_*`) should be avoided by checking existing files before creating a new one.
4. WHEN a schema change affects a Hypertable, THE Data_Model_Doc SHALL warn that TimescaleDB imposes restrictions on altering hypertable columns and reference the TimescaleDB documentation for the correct procedure.
5. THE Data_Model_Doc SHALL state that `schema.sql` is regenerated from migrations using `npm run migrate` and must not be edited directly.
