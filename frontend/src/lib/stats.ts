import type { IrisRecord, MeasurementKey } from "../types/api";

export interface HistogramResult {
  bins: Array<Record<string, string | number>>;
  species: string[];
}

export function buildHistogram(
  records: IrisRecord[],
  feature: MeasurementKey,
  binCount = 12,
): HistogramResult {
  const species = Array.from(new Set(records.map((record) => record.species)));
  if (records.length === 0) return { bins: [], species };
  const values = records.map((record) => record[feature]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = min + index * width;
    const end = start + width;
    const row: Record<string, string | number> = {
      label: start.toFixed(1),
      range: `${start.toFixed(2)}–${end.toFixed(2)} cm`,
    };
    for (const name of species) row[name] = 0;
    return row;
  });

  for (const record of records) {
    let index = Math.floor((record[feature] - min) / width);
    if (!Number.isFinite(index) || index < 0) index = 0;
    if (index >= binCount) index = binCount - 1;
    const row = bins[index];
    row[record.species] = Number(row[record.species] ?? 0) + 1;
  }
  return { bins, species };
}

export function filterRecords(records: IrisRecord[], species: string, query: string): IrisRecord[] {
  const needle = query.trim().toLowerCase();
  return records.filter((record) => {
    if (species !== "all" && record.species !== species) return false;
    if (!needle) return true;
    const blob = [
      record.species,
      record.sepal_length_cm,
      record.sepal_width_cm,
      record.petal_length_cm,
      record.petal_width_cm,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(needle);
  });
}

export function correlationColor(value: number): string {
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) {
    return `color-mix(in srgb, var(--botanical) ${Math.round(12 + clamped * 78)}%, var(--sage))`;
  }
  return `color-mix(in srgb, var(--terracotta) ${Math.round(12 + -clamped * 78)}%, var(--sage))`;
}
