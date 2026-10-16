import type { MeasurementKey, Measurements } from "../types/api";

export const MEASUREMENT_FIELDS: Array<{
  key: MeasurementKey;
  label: string;
  hint: string;
}> = [
  { key: "sepal_length_cm", label: "Sepal length", hint: "Outer leaf length" },
  { key: "sepal_width_cm", label: "Sepal width", hint: "Outer leaf width" },
  { key: "petal_length_cm", label: "Petal length", hint: "Inner petal length" },
  { key: "petal_width_cm", label: "Petal width", hint: "Inner petal width" },
];

export const MAX_MEASUREMENT_CM = 30;

export function validateMeasurements(values: Partial<Measurements>): string | null {
  for (const field of MEASUREMENT_FIELDS) {
    const value = values[field.key];
    if (value === undefined || Number.isNaN(value)) {
      return `${field.label} is required and must be a finite number.`;
    }
    if (!Number.isFinite(value)) {
      return `${field.label} must be a finite number.`;
    }
    if (value <= 0 || value > MAX_MEASUREMENT_CM) {
      return `${field.label} must be greater than 0 and at most ${MAX_MEASUREMENT_CM} cm.`;
    }
  }
  return null;
}

export const PRESETS: Array<{
  id: string;
  title: string;
  caption: string;
  values: Measurements;
}> = [
  {
    id: "setosa-example",
    title: "Setosa example",
    caption: "Illustrative short-petal measurements from the published table. Not a guaranteed classification.",
    values: {
      sepal_length_cm: 5.1,
      sepal_width_cm: 3.5,
      petal_length_cm: 1.4,
      petal_width_cm: 0.2,
    },
  },
  {
    id: "versicolor-example",
    title: "Versicolor example",
    caption: "Illustrative mid-sized measurements from the published table. Not a guaranteed classification.",
    values: {
      sepal_length_cm: 7.0,
      sepal_width_cm: 3.2,
      petal_length_cm: 4.7,
      petal_width_cm: 1.4,
    },
  },
  {
    id: "virginica-example",
    title: "Virginica example",
    caption: "Illustrative long-petal measurements from the published table. Not a guaranteed classification.",
    values: {
      sepal_length_cm: 6.3,
      sepal_width_cm: 3.3,
      petal_length_cm: 6.0,
      petal_width_cm: 2.5,
    },
  },
];
