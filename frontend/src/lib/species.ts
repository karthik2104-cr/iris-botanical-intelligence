export const SPECIES_COLORS: Record<string, string> = {
  "Iris setosa": "var(--setosa)",
  "Iris versicolor": "var(--versicolor)",
  "Iris virginica": "var(--virginica)",
};

export function speciesColor(name: string): string {
  return SPECIES_COLORS[name] ?? "var(--botanical)";
}

export function shortSpecies(name: string): string {
  return name.replace(/^Iris\s+/i, "");
}
