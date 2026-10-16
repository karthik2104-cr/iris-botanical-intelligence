import { useCallback, useEffect, useState } from "react";
import { ApiError, getHealth } from "../services/api";
import type { HealthStatus } from "../types/api";

export function useApiHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getHealth();
      setHealth(result);
      setError(null);
    } catch (caught) {
      setHealth(null);
      setError(caught instanceof ApiError ? caught.message : "The configured API is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { health, error, loading, refresh };
}
