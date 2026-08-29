# Component Inventory

UroLOG utilizes a component-based architecture powered by **shadcn/ui** and custom clinical components.

## UI Primitives (`components/ui/`)

These are low-level, reusable components based on Radix UI.

- **Button:** Standard interaction element (`button.tsx`).
- **Input / Textarea:** Form inputs (`input.tsx`, `textarea.tsx`).
- **Card:** Container for content sections (`card.tsx`).
- **Dialog / Alert Dialog:** Modals (`dialog.tsx`).
- **Select / Dropdown:** Option selection (`select.tsx`).
- **Table:** Data presentation (`table.tsx`).
- **DatePicker:** Date selection utility.

## Clinical Components (`components/clinical/`)

Specific components designed for medical workflows.

- **ExaminationForm:** Complex form managing steps of a physical exam.
- **PatientHistory:** Timeline or list view of patient history.
- **PrescriptionBuilder:** Interactive tool for creating prescriptions.
- **LabResultsParser:** Interface for uploading and parsing lab PDFs.
- **BodyInteract:** (Hypothetical) Interactive body map for symptom location.

## Layout Components (`components/layout/`)

- **Sidebar:** Main navigation menu.
- **Header:** Top bar containing user profile and search.
- **PatientBanner:** Sticky banner showing selected patient demographics.

## AI Components (`components/ai-scribe/`)

- **AudioRecorder:** Component for handling browser audio recording.
- **ScribeStatus:** Visual indicator of AI processing state.
- **TranscriptionReview:** Editor for reviewing AI-generated notes.
