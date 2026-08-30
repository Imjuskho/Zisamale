import { useCallback, useEffect, useState } from "react";

interface UseFetchResult<T> {
  data: T | null;
  error: boolean;
  loading: boolean;
  reload: () => void;
}

/** Minimal fetch state for the public seam. Data is read-only and light, so
 * plain fetch + useState covers it; no cache layer needed client-side. */
export function useFetch<T>(loader: () => Promise<T>): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    loader()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  return { data, error, loading, reload };
}