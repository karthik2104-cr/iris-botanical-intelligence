export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatScore(value: number, digits = 3): string {
  return value.toFixed(digits);
}

export function formatCm(value: number, digits = 2): string {
  return `${value.toFixed(digits)} cm`;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function formatDuration(seconds: number): string {
  const milliseconds = seconds * 1000;
  if (milliseconds < 1) return `${milliseconds.toFixed(3)} ms`;
  if (milliseconds < 100) return `${milliseconds.toFixed(2)} ms`;
  if (seconds < 10) return `${seconds.toFixed(2)} s`;
  return `${seconds.toFixed(1)} s`;
}

export function chartModelName(name: string): string {
  if (name === "Support Vector Machine") return "SVM";
  if (name === "K-Nearest Neighbors") return "K-nearest neighbors";
  if (name === "Gaussian Naive Bayes") return "Naive Bayes";
  if (name === "Logistic Regression") return "Logistic regression";
  if (name === "Decision Tree") return "Decision tree";
  if (name === "Random Forest") return "Random forest";
  return name;
}

export function formatSignedScore(value: number, digits = 3): string {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}`;
}
