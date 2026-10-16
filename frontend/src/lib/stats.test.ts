import { describe, expect, it } from "vitest";
import { observeSpecies } from "./speciesStats";
import { buildHistogram, filterRecords } from "./stats";
import { validateMeasurements } from "./validation";
import type { IrisRecord } from "../types/api";

const records: IrisRecord[] = [
  {
    sepal_length_cm: 5.1,
    sepal_width_cm: 3.5,
    petal_length_cm: 1.4,
    petal_width_cm: 0.2,
    species: "Iris setosa",
  },
  {
    sepal_length_cm: 6.3,
    sepal_width_cm: 3.3,
    petal_length_cm: 6.0,
    petal_width_cm: 2.5,
    species: "Iris virginica",
  },
];

describe("validateMeasurements", () => {
  it("accepts a complete finite measurement set", () => {
    expect(
      validateMeasurements({
        sepal_length_cm: 5.1,
        sepal_width_cm: 3.5,
        petal_length_cm: 1.4,
        petal_width_cm: 0.2,
      }),
    ).toBeNull();
  });

  it("rejects an empty, infinite, or out-of-range value", () => {
    expect(validateMeasurements({})).toMatch(/Sepal length/);
    expect(
      validateMeasurements({
        sepal_length_cm: Number.POSITIVE_INFINITY,
        sepal_width_cm: 3,
        petal_length_cm: 1,
        petal_width_cm: 0.2,
      }),
    ).toMatch(/finite/);
    expect(
      validateMeasurements({
        sepal_length_cm: 5,
        sepal_width_cm: 0,
        petal_length_cm: 1,
        petal_width_cm: 0.2,
      }),
    ).toMatch(/Sepal width/);
  });
});

describe("dataset helpers", () => {
  it("filters by species and search text", () => {
    expect(filterRecords(records, "Iris setosa", "").map((record) => record.species)).toEqual([
      "Iris setosa",
    ]);
    expect(filterRecords(records, "all", "6.3")).toHaveLength(1);
    expect(filterRecords(records, "all", "missing")).toHaveLength(0);
  });

  it("derives species ranges from the supplied rows", () => {
    const [setosa] = observeSpecies(records, ["Iris setosa", "Iris virginica"]);
    expect(setosa.count).toBe(1);
    expect(setosa.features.petal_length_cm).toMatchObject({ min: 1.4, max: 1.4, mean: 1.4 });
  });

  it("keeps every flower inside the histogram", () => {
    const histogram = buildHistogram(records, "sepal_length_cm", 2);
    const total = histogram.bins.reduce((sum, bin) => {
      return (
        sum +
        histogram.species.reduce((speciesSum, name) => speciesSum + Number(bin[name] ?? 0), 0)
      );
    }, 0);
    expect(total).toBe(records.length);
  });
});
