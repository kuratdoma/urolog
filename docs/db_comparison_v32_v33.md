# Database Architectural Comparison: UroLOG (v3.2 vs v3.3)

This document outlines the structural and parameter-level differences between the legacy sharded version (v3.2) and the current monolithic version (v3.3) after the UUID conversion.

## 1. Architectural Evolution

| Dimension | Legacy Sharded (v3.2) | New Monolith (v3.3) |
| :--- | :--- | :--- |
| **Data Topology** | Fragmented across multiple doctor-shards | Unified single records database |
| **Identifier Scheme** | `INTEGER` (Local auto-increment) | `UUID` (Deterministic v5 globally unique) |
| **Referential Integrity** | Application-managed "Soft Links" | Engine-enforced "Hard Foreign Keys" |
| **Collision Risk** | High on merge/re-import | Zero (collision-free namespace) |
| **ID Persistence** | Volatile (changes on DB reset) | Immutable (derived from original identifiers) |

## 2. Parameter Transformation Specs

### Primary Identifying Logic
All `id` and `hasta_id` columns have been transformed using a deterministic **UUIDv5** mapping. This ensures that the same original integer ID always results in the same UUID string, enabling idempotent sync/backup operations.

*   **Namespace**: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`
*   **Formula**: `uuid_generate_v5(NAMESPACE, OLD_INTEGER_ID::TEXT)`

### Key Clinical Mapping Parameters

| Legacy Column (v3.2) | Monolith Column (v3.3) | Note |
| :--- | :--- | :--- |
| `id (int)` | `id (uuid)` | Primary Key transformation |
| `hasta_id (int)` | `hasta_id (uuid)` | Foreign Key transformation |
| `sikayet` | `sikayet` | Symptom descriptions |
| `oyku` | `oyku` | Clinical history |
| `bulgu_notu` | `bulgu_notu` | Key symptoms/signs summary (v3.3 preference) |
| `fizik_muayene` | `fizik_muayene` | Full systemic exam notes |
| `tani_metni` | `tani` | Concatenated diagnostic fields |

## 3. Structural Comparison of Major Tables

### Demographics (`hastalar`)
*   **v3.2**: Uses integer `id`. `tc_kimlik` is often used as a secondary fallback.
*   **v3.3**: Uses UUID `id`. Centralised demographics repository.

### Examinations (`muayeneler`)
*   **v3.2**: Distributed clinical records. Symptoms might be spread across notes.
*   **v3.3**: Unified examinations table. Supports "promoted notes" from legacy sources through the `ClinicalOrchestrator` projection.

### Clinical Progress Notes (`klinik_notlar`)
*   **v3.2**: Generic notes table (`sharded_clinical_notlar`).
*   **v3.3**: Typed progress notes (`klinik_notlar`). Classified as MUAYENE, OPERASYON, or TAKİP for timeline visibility.

## 4. Operational Parameters

### SQL Access & Query Strategy
*   **v3.2**: Relied on numeric lookups. Required knowing which "shard" (doctor) the patient belonged to.
*   **v3.3**: Relies on UUID lookups. Patient assignment is managed at the record level through `hasta_id`.

### API Compatibility
*   **v3.2 APIs**: Expected `int` IDs.
*   **v3.3 APIs**: Now strictly expect `UUID` strings. Legacy adapters are maintained in the backend to bridge frontend requests during the transition period.

---
**Architect's Note**:
The v3.3 monolith is the precursor to a "True Sharding" implementation. By adopting UUIDs now, we eliminate the need for future identifier transformations when distributing data across nodes. v3.3 provides the structural truth that the system requires for the 2026 AI-native era.
