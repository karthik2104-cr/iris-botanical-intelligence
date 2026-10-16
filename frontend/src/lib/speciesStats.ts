import type { FeatureProfile, IrisRecord, MeasurementKey } from "../types/api";
import { MEASUREMENT_FIELDS } from "./validation";

export interface ObservedRange {
  min: number;
  max: number;
  mean: number;
  q1: number;
  median: number;
  q3: number;
}

export interface SpeciesObservation {
  species: string;
  count: number;
  features: Record<MeasurementKey, ObservedRange>;
}

function quantile(sorted: number[], probability: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function observeSpecies(records: IrisRecord[], order: string[] = []): SpeciesObservation[] {
  const discovered = Array.from(new Set(records.map((record) => record.species)));
  const names = order.length > 0 ? order : discovered;
  return names.map((species) => {
    const rows = records.filter((record) => record.species === species);
    const features = {} as Record<MeasurementKey, ObservedRange>;
    for (const field of MEASUREMENT_FIELDS) {
      const values = rows.map((row) => row[field.key]).sort((left, right) => left - right);
      const mean = values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
      features[field.key] = {
        min: values[0] ?? 0,
        max: values[values.length - 1] ?? 0,
        mean,
        q1: quantile(values, 0.25),
        median: quantile(values, 0.5),
        q3: quantile(values, 0.75),
      };
    }
    return { species, count: rows.length, features };
  });
}

export function sliderRange(key: MeasurementKey, profiles: FeatureProfile[] | undefined) {
  const profile = profiles?.find((item) => item.key === key);
  if (!profile) {
    return key.endsWith("width_cm") ? { min: 0.1, max: 5 } : { min: 0.1, max: 8 };
  }
  const span = Math.max(profile.max - profile.min, 0.4);
  return {
    min: Math.max(0.1, Number((profile.min - span * 0.08).toFixed(1))),
    max: Number((profile.max + span * 0.08).toFixed(1)),
  };
}
