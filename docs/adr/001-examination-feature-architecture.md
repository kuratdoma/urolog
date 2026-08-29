# ADR 001: Examination Page Feature Architecture

## Status

Accepted

## Context

The `ExaminationPage` in `page.tsx` has grown to ~4000 lines, becoming a "God Component". It contains inline definitions for complex sub-components (`IPSSQuestion`, `IIEFQuestion`, `EDDrugsForm`, etc.) and manages monolithic state via `usePatientStore` directly.
This has led to:

- High cognitive load for developers.
- Difficulty in testing individual logic pieces (no unit tests possible for inline components).
- Risk of regression when modifying one section affecting others.
- Performance bottlenecks (re-renders of the entire page on single field change).

## Decision

We will refactor the Examination Page into a **Co-located Feature Module** architecture.

Each logical section (IPSS, IIEF, EDC, etc.) will be its own directory in `frontend/components/examination/forms/[feature]/` containing:

- `[Feature]Form.tsx`: Pure UI component (Stateless or Local UI State only).
- `schema.ts`: Zod schema for data validation and type inference.
- `logic.ts`: Pure functions for scoring, narrative generation, and business rules.
- `hooks.ts`: Custom controller hook (`use[Feature]Controller`) managing:
  - Connection to Global Store.
  - FSM (Finite State Machine) for Loading/Saving states.
  - Offline Sync Queue integration.
  - Telemetry.
- `constants.ts`: Static strings, options, and configuration.
- `index.ts`: Public API for the module.

## Consequences

### Positive

- **Testability:** Logic can be unit tested in isolation (`logic.ts`). UI can be component tested (`Form.tsx`).
- **Maintainability:** Clear separation of concerns.
- **Scalability:** New features can be added without touching the main page file.
- **Performance:** `React.memo` on forms prevents unnecessary re-renders.
- **Safety:** Zod schemas ensure data integrity at the form level.

### Negative

- **Boilerplate:** More files per feature (6-7 files instead of 1 block of code).
- **Complexity:** Requires strict adherence to the pattern.
- **Integration:** Connecting independent forms to a monolithic legacy store requires careful adapter logic.

## Safety Measures

- **Circular Dependencies:** Strictly forbidden between feature modules.
- **Legacy Adapters:** Hooks must rigorously map legacy data structures to new schemas bi-directionally.
- **Safe Mode:** Global Error Boundary must provide a native HTML fallback if the React tree crashes.
