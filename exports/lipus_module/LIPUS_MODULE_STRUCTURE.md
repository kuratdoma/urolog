# Lipus (WBL-ED) Clinical Module - Structural Metadata

This document provides a comprehensive structural and functional blueprint of the Lipus (Low-Intensity Pulsed Ultrasound / WBL-ED) clinical module. It is designed to enable an AI system to reconstruct, integrate, or further develop this module.

## 1. Module Overview
The Lipus module is a specialized clinical extension for tracking patients undergoing Low-Intensity Pulsed Ultrasound therapy for Erectile Dysfunction (ED). It handles complex data entry, trend visualization, and longitudinal tracking of clinical outcomes.

## 2. Core Entities & Relationships
- **Patient**: The base unit.
- **Muayene (Examination)**: A clinical visit. Each Lipus entry is linked to a unique `Muayene`.
- **LipusDetails**: Extended clinical data for a specific visit, containing scores, medical history, and safety parameters.

### Database Cardinality:
`Patient (1) -> (N) Muayene (1) -> (1) LipusDetails`

## 3. Data Dictionary
The module tracks 30+ parameters categorized as follows:

### A. Identification & Tracking
- `id`: UUID (Primary Key)
- `muayene_id`: UUID (Reference to Examination)
- `takip_donemi`: String (Auto-calculated: e.g., "0. Hafta", "4. Hafta", "Tarama").

### B. Medical History & Current Status
- `ed_tedavisi_6ay`: String. Changes in ED treatment in the last 6 months.
- `pde5_yaniti`: Enum (Var, Yok, Kısmen). Clinical response to PDE5 inhibitors.
- `pde5_kullanim`: String. Specific PDE5 inhibitor used during the Lipus trial.
- `ek_tedavi`: String. Concurrent regenerative treatments (PRP, Exosome, SVF).
- `alerji_var`: Boolean. Presence of allergies.
- `cerrahi_oyku`: Text. Relevant surgical history.
- `kullanilan_ilaclar`: Text. List of active medications.

### C. Clinical Scores (The "Core" Data)
- **IIEF-EF (Erectile Function)**:
    - `iief_s1` through `iief_s6`: Integer (0-5 scale per question).
    - `iief_total`: Integer (Sum of 1-6, max 30).
- **EHS (Erection Hardness Score)**:
    - `ehs_skor`: Integer (1-4).
- **SEP (Sexual Encounter Profile)**:
    - `sep2`: Enum (Evet, Hayır). Penetration success.
    - `sep3`: Enum (Evet, Hayır). Erection maintenance.
- **GAQ (Global Assessment Questionnaire)**:
    - `gaq1`: Enum (Evet, Hayır). Improved erections?
    - `gaq2`: Enum (Evet, Hayır). Improved sexual life?
- **VAS (Visual Analog Scale)**:
    - `vas_skor`: Integer (0-10). Pain during procedure.

### D. Safety & Side Effects
- `yan_etki_kizariklik`: Boolean. Redness.
- `yan_etki_morarma`: Boolean. Bruising.
- `yan_etki_hematuri`: Boolean. Hematuria.
- `yan_etki_yanma`: Boolean. Burning sensation.
- `yan_etki_diger`: Text. Other side effects.

## 4. Business Logic
- **Week Calculation (Frontend)**:
    - T0 (0. Hafta) is defined by the first record date.
    - Subsequent weeks are calculated via `(Current Date - T0 Date) / 7`.
- **IIEF Calculation**:
    - `iief_total` is the atomic sum of the 6 individual domain questions.
- **Trend Analysis**:
    - Dashboard uses `Recharts` (AreaChart) for visualizing the `iief_total` trend across periods.

## 5. UI/UX Design System
The module follows a "Premium Clinical Dashboard" aesthetic:
- **Primary Color**: Indigo (`#4f46e5`). Used for primary actions and brand elements.
- **Secondary Colors**: 
    - Emerald (`#10b981`) for positive outcomes (IIEF high scores).
    - Cyan (`#06b6d4`) for clinical scores (EHS).
    - Rose (`#f43f5e`) for risk factors (VAS pain, low scores).
- **Typography**: Bold, high-contrast typography (font-black for headings).
- **Layout**: 
    - Dashboard: 9:3 (Main area : Summary Sidebar).
    - Form: Symmetric 2-column grid inside the content area.

## 6. API Interface (REST)
- `GET /api/v1/clinical/lipus/patients/{id}/dashboard`: Returns chronological list of sessions with summary scores.
- `GET /api/v1/clinical/lipus/muayene/{id}`: Returns full details for a specific visit.
- `POST /api/v1/clinical/lipus`: Create new session details.
- `PUT /api/v1/clinical/lipus/{id}`: Update existing session details.

## 7. Component Architecture
- `LipusDashboardPage`: Main view controller.
- `LipusForm`: Multi-column entry form (Stateless/Hydrated by initialData).
- `LipusIIEFForm`: Sub-component specialized in buttons-based IIEF entry.
- `PEQuestion`: Shared UI primitive for consistent binary/scale selections.
