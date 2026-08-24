import { useState } from "react";
import type { Household } from "../../types";
import { Stepper } from "./Stepper";
import { VoiceInput } from "./VoiceInput";

interface VisitFormProps {
  household: Household;
  onSubmit?: (data: VisitFormData) => void | Promise<void>;
  onCancel?: () => void;
}

export interface VisitFormData {
  household_id: string;
  children_under_5: number;
  pregnant_women: number;
  symptoms_reported: string;
  referred: boolean;
  notes: string;
}

const SYMPTOM_OPTIONS = [
  "Fever",
  "Cough",
  "Diarrhea",
  "Vomiting",
  "Fast breathing",
  "Not eating well",
  "High temperature",
  "Other",
];

export function VisitForm({ household, onSubmit, onCancel }: VisitFormProps) {
  const [children, setChildren] = useState(household.under_five);
  const [pregnant, setPregnant] = useState(0);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [referred, setReferred] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleSymptom(s: string) {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit?.({
        household_id: household.household_id,
        children_under_5: children,
        pregnant_women: pregnant,
        symptoms_reported: selectedSymptoms.join(", "),
        referred,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="visit-form card" onSubmit={handleSubmit} aria-label={`Visit form for ${household.head_of_household}`}>
      <h3 className="visit-form-title">
        Visit: {household.head_of_household}
      </h3>

      <div className="visit-form-section">
        <Stepper
          label="Children under 5 seen"
          value={children}
          onChange={setChildren}
          min={0}
          max={20}
        />
      </div>

      <div className="visit-form-section">
        <Stepper
          label="Pregnant women seen"
          value={pregnant}
          onChange={setPregnant}
          min={0}
          max={10}
        />
      </div>

      <fieldset className="visit-form-section" aria-label="Symptoms observed">
        <legend className="visit-form-label">Symptoms Observed</legend>
        <div className="symptom-grid">
          {SYMPTOM_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`symptom-chip ${selectedSymptoms.includes(s) ? "symptom-active" : ""}`}
              onClick={() => toggleSymptom(s)}
              aria-pressed={selectedSymptoms.includes(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="visit-form-section">
        <label className="visit-form-checkbox" htmlFor="visit-referred">
          <input
            id="visit-referred"
            type="checkbox"
            checked={referred}
            onChange={(e) => setReferred(e.target.checked)}
          />
          <span>Referred to health facility</span>
        </label>
      </div>

      <div className="visit-form-section">
        <label htmlFor="visit-notes" className="visit-form-label">Notes</label>
        <div className="voice-notes-row">
          <textarea
            id="visit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input-field"
            placeholder="Optional notes about the visit..."
          />
          <VoiceInput
            onTranscription={(text) => setNotes((prev) => prev ? `${prev} ${text}` : text)}
            language="ny"
          />
        </div>
      </div>

      <div className="visit-form-actions">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : "Save Visit"}
        </button>
      </div>
    </form>
  );
}
