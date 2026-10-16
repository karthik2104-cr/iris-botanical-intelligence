import type { Measurements, Prediction } from "../types/api";

const HISTORY_KEY = "iris-prediction-history";
const HISTORY_EVENT = "iris-history";
const MAX_ENTRIES = 6;

export interface StoredPrediction {
  id: string;
  at: string;
  predicted_species: string;
  highest_probability: number;
  measurements: Measurements;
}

function isMeasurements(value: unknown): value is Measurements {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["sepal_length_cm", "sepal_width_cm", "petal_length_cm", "petal_width_cm"].every(
    (key) => typeof record[key] === "number" && Number.isFinite(record[key] as number),
  );
}

function isEntry(value: unknown): value is StoredPrediction {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredPrediction>;
  return (
    typeof record.id === "string" &&
    typeof record.at === "string" &&
    typeof record.predicted_species === "string" &&
    typeof record.highest_probability === "number" &&
    Number.isFinite(record.highest_probability) &&
    isMeasurements(record.measurements)
  );
}

export function readPredictionHistory(): StoredPrediction[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function rememberPrediction(prediction: Prediction): StoredPrediction[] {
  const entry: StoredPrediction = {
    id: `${Date.now()}-${prediction.predicted_species}`,
    at: new Date().toISOString(),
    predicted_species: prediction.predicted_species,
    highest_probability: prediction.highest_probability,
    measurements: {
      sepal_length_cm: prediction.measurements.sepal_length_cm,
      sepal_width_cm: prediction.measurements.sepal_width_cm,
      petal_length_cm: prediction.measurements.petal_length_cm,
      petal_width_cm: prediction.measurements.petal_width_cm,
    },
  };
  const next = [entry, ...readPredictionHistory().filter((item) => item.id !== entry.id)].slice(0, MAX_ENTRIES);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(HISTORY_EVENT));
  return next;
}

export function subscribePredictionHistory(listener: () => void): () => void {
  const onCustom = () => listener();
  const onStorage = (event: StorageEvent) => {
    if (event.key === HISTORY_KEY) listener();
  };
  window.addEventListener(HISTORY_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(HISTORY_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
