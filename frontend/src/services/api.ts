import type {
  Analytics,
  BatchPrediction,
  HealthStatus,
  Measurements,
  ModelInfo,
  Prediction,
} from "../types/api";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8002";

export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return DEFAULT_API_BASE_URL;
}

export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl()}${suffix}`;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function formatApiError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as {
    detail?: unknown;
    errors?: Array<{ message?: string }>;
  };
  const messages = Array.isArray(record.errors)
    ? record.errors
        .map((error) => error.message)
        .filter((message): message is string => Boolean(message))
    : [];
  if (messages.length > 0) return messages.join(" ");
  if (typeof record.detail === "string" && record.detail.trim()) return record.detail;
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function wrongService(): ApiError {
  return new ApiError(
    `The service at ${apiBaseUrl()} responded, but it is not the Iris classification API.`,
    200,
  );
}

function isForeignValidation(body: unknown): boolean {
  if (!isRecord(body)) return false;
  if (typeof body.detail === "string" && /extra inputs|review:/i.test(body.detail)) return true;
  if (!Array.isArray(body.errors)) return false;
  return body.errors.some((error) => {
    if (!isRecord(error)) return false;
    const field = String(error.field ?? "");
    if (!field) return false;
    return !field.includes("sepal_") && !field.includes("petal_") && !field.startsWith("samples");
  });
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      `The API at ${apiBaseUrl()} is unavailable. Start the backend on that address, then try again.`,
      0,
    );
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const fallback =
      response.status === 404
        ? `The API at ${apiBaseUrl()} has no ${path}. Start the Iris classification API on that address.`
        : response.statusText || "Request failed.";
    if (isForeignValidation(body)) throw wrongService();
    const formatted = formatApiError(body, fallback);
    const message =
      response.status === 404 && (formatted === "Not Found" || formatted === response.statusText)
        ? fallback
        : formatted;
    throw new ApiError(message, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("The API returned a response that was not valid JSON.", response.status);
  }
}

export async function getHealth(): Promise<HealthStatus> {
  const body = await fetchJson<unknown>("/api/health");
  if (!isRecord(body) || typeof body.status !== "string" || typeof body.model_available !== "boolean") {
    throw wrongService();
  }
  return body as unknown as HealthStatus;
}

export async function getModelInfo(): Promise<ModelInfo> {
  const body = await fetchJson<unknown>("/api/model-info");
  if (!isRecord(body) || typeof body.model_name !== "string" || !isRecord(body.metrics)) {
    throw wrongService();
  }
  return body as unknown as ModelInfo;
}

export async function getAnalytics(): Promise<Analytics> {
  const body = await fetchJson<unknown>("/api/analytics");
  if (!isRecord(body) || !isRecord(body.dataset) || !isRecord(body.evaluation)) {
    throw wrongService();
  }
  return body as unknown as Analytics;
}

export async function predictFlower(measurements: Measurements): Promise<Prediction> {
  const body = await fetchJson<unknown>("/api/predict", {
    method: "POST",
    body: JSON.stringify(measurements),
  });
  if (!isRecord(body) || typeof body.predicted_species !== "string" || !Array.isArray(body.probabilities)) {
    throw wrongService();
  }
  return body as unknown as Prediction;
}

export function predictBatch(samples: Measurements[]): Promise<BatchPrediction> {
  return fetchJson<BatchPrediction>("/api/predict/batch", {
    method: "POST",
    body: JSON.stringify({ samples }),
  });
}
