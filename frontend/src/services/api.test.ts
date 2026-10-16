import { describe, expect, it, vi } from "vitest";
import { ApiError, apiBaseUrl, apiUrl, fetchJson, formatApiError, getHealth } from "./api";

describe("formatApiError", () => {
  it("prefers field messages from the API", () => {
    const message = formatApiError(
      {
        detail: "The request contains invalid measurements.",
        errors: [{ field: "sepal_length_cm", message: "Sepal length must be a finite number" }],
      },
      "fallback",
    );
    expect(message).toBe("Sepal length must be a finite number");
  });

  it("uses the detail string when field errors are absent", () => {
    expect(formatApiError({ detail: "Model missing." }, "fallback")).toBe("Model missing.");
  });
});

describe("api configuration", () => {
  it("points every request at the configured base URL", () => {
    expect(apiBaseUrl()).toBe("http://127.0.0.1:8002");
    expect(apiUrl("/api/health")).toBe("http://127.0.0.1:8002/api/health");
    expect(apiUrl("/api/model-info")).toBe("http://127.0.0.1:8002/api/model-info");
    expect(apiUrl("/api/analytics")).toBe("http://127.0.0.1:8002/api/analytics");
    expect(apiUrl("/api/predict")).toBe("http://127.0.0.1:8002/api/predict");
    expect(apiUrl("/api/predict/batch")).toBe("http://127.0.0.1:8002/api/predict/batch");
  });
});

describe("fetchJson", () => {
  it("reports a network failure without throwing a generic error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchJson("/api/health")).rejects.toBeInstanceOf(ApiError);
    await expect(fetchJson("/api/health")).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("http://127.0.0.1:8002"),
    });
    vi.unstubAllGlobals();
  });

  it("sends health, model, analytics, and prediction calls to the configured origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await fetchJson("/api/health");
    await fetchJson("/api/predict", { method: "POST", body: "{}" });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://127.0.0.1:8002/api/health", expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://127.0.0.1:8002/api/predict", expect.any(Object));
    vi.unstubAllGlobals();
  });

  it("rejects a healthy response from a different service", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok", model_loaded: true }),
      }),
    );
    await expect(getHealth()).rejects.toMatchObject({
      message: expect.stringContaining("not the Iris classification API"),
    });
    vi.unstubAllGlobals();
  });
});
