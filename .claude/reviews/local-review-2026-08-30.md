# Local Review — uncommitted changes (2026-08-30)

**Decision:** REQUEST CHANGES (3 HIGH, 5 MEDIUM, 2 LOW; no CRITICAL)

## HIGH

1. `backend/app/models/stock.py:44-88` — `lazy="select"` → `lazy="selectin"` on all four
   relationships reverts the optimization landed in 02db5ca (the explaining comment was
   deleted with it). Every `StokUrun` load now eagerly fetches its full `alimlar` and
   `hareketler` history; every `StokHareket`/`StokAlim` load pulls its `urun`, which in
   turn pulls that product's whole history. The product-list endpoint degrades from one
   query to a full history scan. Revert to `lazy="select"` and use `selectinload()` at the
   call sites that need the children.

2. `backend/alembic/versions/p009_patient_combined_search_index.py` — the expression index
   cannot be used by the query it targets. `demographics_repository.py:47-52` filters
   `ad ILIKE %s OR soyad ILIKE %s OR tc_kimlik ILIKE %s`; Postgres only uses an expression
   index when the query text contains that exact expression. `p005_pg_trgm_search_indexes`
   already ships per-column trgm indexes on `ad`, `soyad`, `tc_kimlik`, which *are* usable
   here. Drop this migration, or rewrite the repository filter to use the concatenated
   expression.

3. `backend/app/repositories/user_repository.py:11-32` — wrapping the column in
   `func.lower()` makes every login a sequential scan (no plain or unique index on
   `email`/`username` can be used); add a functional index, or store/compare a normalized
   column. Separately, `get_by_username` is now case-insensitive: if two users differ only
   in username case, `.first()` returns a non-deterministic row.

## MEDIUM

4. `p008_icd_drug_trgm_indexes.py`, `p009_...py` — plain `CREATE INDEX` while the project's
   own `p005` uses `CREATE INDEX CONCURRENTLY`. GIN builds on `hastalar`/`ilac_tanimlari`
   take an ACCESS EXCLUSIVE lock for the duration.

5. `frontend/lib/api/auth.ts:27-32` — FastAPI's `detail` is an array for 422 validation
   errors and can be an object; `new Error(detail)` then renders `[object Object]`.
   Coerce: use the string only when `typeof parsed.detail === "string"`.

6. `frontend/components/examination/shared/DebouncedText.tsx:30-36` — external `value`
   changes are silently dropped while `pendingRef` is true. If the parent sets a field
   programmatically (past-examination transfer, AI-scribe append) within `delay` ms of the
   user's last keystroke, that write is discarded and then overwritten by the stale local
   value. Compare against the last value seen from the parent instead of `localRef`.

7. `frontend/components/examination/forms/physical-exam/PhysicalExamForm.tsx:100-103` —
   `UroflowInput.update` sanitizes (digits only, max 4) in the *parent*, but `DebouncedInput`
   shows unsanitized local text. Typed letters stay on screen for 300ms and then snap away.
   Sanitize in `onValueChange` before `setLocal`.

8. `start.sh:60-61` — cleanup now `kill -9`s every process on port 3000. Unlike 3001 this is
   a very common default; the script will kill unrelated dev servers it did not start.
   Prefer killing only `$FRONTEND_PID`/its process group.

## LOW

9. `backend/app/api/v1/endpoints/auth.py:72` — extra DB round-trip: `authenticate_user`
   already loaded the user; return it (or its id) instead of re-querying for the audit log.

10. `frontend/components/examination/forms/diagnosis/DiagnosisForm.tsx:223` — the memo is
    ineffective here: `diagnosisAdapter.toNew` builds a fresh `diagnoses` array each call,
    so `Object.is` in `propsEqualWithShallowValue` fails on every keystroke. Either compare
    that key one level deeper or memoize the array. The flat-object forms (SystemQuery,
    PhysicalExam, MedicalHistory) do benefit.

## Positive

- Dead-code removal (`iief/hooks.ts`, `ipss/hooks.ts`, `*/logic.ts`, `shared/telemetry.ts`,
  `QuickSelectInput`, the two shared comboboxes) verified to have no remaining references.
- Migration chain `p008_stock_integrity → p008_icd_drug_trgm → p009_patient_search_trgm`
  is linear, single-headed, and has working downgrades.
- Splitting `hasHPV` into past/current memos, and the stable `useCallback` handlers, are
  correct — `handleNewExamination`'s dep list is complete and `resetForm` is itself memoized.

## Validation

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | Pass |
| ESLint | Pre-existing failures repo-wide (838 problems); no new rule class introduced |
| Python compile | Pass |
| Tests | Skipped (no runnable suite for these paths) |
| Build | Skipped |

---

## Second pass (same day, tree changed)

Newly touched since the first pass: `ExaminationToolbar.tsx`, `prescription-dialog.tsx`,
`QuestionnaireScoreCard.tsx`, `shared/types.ts`, `ed-drugs/constants.ts`, `iief/adapter.ts`,
`iief/IIEFForm.tsx`, `physical-exam/adapter.ts`, plus further import trimming in `page.tsx`,
`DiagnosisForm.tsx`, `PhysicalExamForm.tsx`.

**All ten findings above still stand.** The `backend/` and `start.sh` diffs are byte-identical
to the first pass, and the two new migrations are unchanged. The frontend delta is entirely
dead-code and unused-prop removal — no finding was addressed.

New observations:

- **Clean, verified** — `ExaminationToolbar` shed the `isAutoSaving` and `onDelete` props;
  neither had any reference left in the component, and examination delete is still reachable
  at `page.tsx:349`. Same for `PastPrescriptionItem`'s `setPrescriptionNote`. De-exporting
  `ScoreCardConfig`, `IIEFFormProps` and deleting `FormStatus` breaks no importer (tsc clean).
- **LOW (new)** — the unused-symbol sweep missed three: `prescription-dialog.tsx:72` (`drugs`),
  `:190` (`activeDoctor`), and `useExaminationPageLogic.ts:87` (`router`).

Re-run validation: `tsc --noEmit` Pass; ESLint 833 problems (down from 838, all pre-existing
classes); Python compile Pass.

---

## Fix pass — HIGH + MEDIUM resolved (2026-08-30)

| # | Sev | Fix |
|---|---|---|
| 1 | HIGH | `stock.py` reverted to `lazy="select"` + comment restored. No `selectinload()` needed: verified every call site in `stock_repository.py` uses explicit joins, never the relationship attributes. File is now identical to HEAD. |
| 2 | HIGH | `p009` rewritten — the unusable combined expression index is replaced by `ix_hastalar_protokol_no_trgm`, the one column in the search OR that `p005` did not cover. Built `CONCURRENTLY`. |
| 3 | HIGH | New `p010_user_ci_idx` adds `lower(email)` / `lower(username)` functional indexes so the case-insensitive login lookup is index-backed. `user_repository` now adds `order_by(User.id)` (deterministic on case-only collisions) and returns `None` on empty identifiers. |
| 4 | MED | `p008_icd_drug_trgm` now uses `CREATE INDEX CONCURRENTLY` inside `autocommit_block()`, matching `p005`. |
| 5 | MED | `auth.ts` gained `extractErrorDetail()` — handles string `detail`, 422 arrays (joins `msg`), falls back to raw text then `HTTP <status>`. No more `[object Object]`. |
| 6 | MED | `DebouncedText` tracks `lastPropRef`; any genuine external write now cancels the pending timer and wins, instead of being swallowed and overwritten. `flush` only fires when local actually diverges from the parent. |
| 7 | MED | `DebouncedInput` gained an optional `sanitize` prop; `UroflowInput` passes `onlyDigits` so typed letters never appear, removing the 300ms snap-back. |
| 8 | MED | `start.sh` cleanup no longer does blind `lsof | xargs kill -9`; frontend starts in its own process group (`set -m`) and cleanup kills only `-$FRONTEND_PID`. The startup port check now inspects `ps -o comm=` and refuses to kill a non-node occupant, exiting with a `FRONTEND_PORT=` hint. |

Also fixed while touching `DebouncedText`: two pre-existing `react-hooks/refs`
"cannot update ref during render" errors — ref writes moved into effects.

Remaining open: the three LOW items (unused `drugs`, `activeDoctor`, `router`;
`DiagnosisForm`'s ineffective memo; the extra audit-log round-trip in `auth.py`).

Validation after fixes: `tsc --noEmit` Pass · ESLint 831 problems (down from 833,
2 removed by this pass, none added) · Python compile Pass · `bash -n start.sh` Pass ·
migration chain linear: `p008_stock_integrity → p008_icd_drug_trgm → p009 → p010`.

## Fix pass — LOW resolved (2026-08-30)

| # | Fix |
|---|---|
| 9 | `auth_service.authenticate_user` now returns `user_id`; the login endpoint uses it for the audit record instead of re-querying. The endpoint builds its response key-by-key, so the extra key never reaches the wire. Also aligned the failure-branch audit detail key (`email` → `identifier`) with the success branch. |
| 10 | `propsEqualWithShallowValue` compares one level deeper: arrays are matched element-by-element, and elements that are plain objects by their flat fields. This makes `DiagnosisForm`'s memo actually fire — `diagnoses: {name, code}[]` is rebuilt by the adapter on every keystroke. Anything deeper deliberately returns "not equal" and falls through to a render: an extra render is safe, a skipped one is not. |
| 11 | Removed the three unused symbols (`drugs`, `activeDoctor`, `router`). `activeDoctor` also ran `JSON.parse(selectedDoctorId)` on every render, so deleting it removes a latent throw on malformed input. `drugs` turned out to be dead end-to-end — passed by `ExaminationDialogs` but never read in the dialog — so it was dropped from the interface, the destructure, and the call site, along with the now-orphaned `drugList`. |

Validation after this pass: `tsc --noEmit` Pass · ESLint 827 problems (down from 831;
zero `no-unused-vars` remaining in the touched files, none added) · Python compile Pass ·
`bash -n start.sh` Pass.

**All CRITICAL/HIGH/MEDIUM/LOW findings from this review are now resolved.**
