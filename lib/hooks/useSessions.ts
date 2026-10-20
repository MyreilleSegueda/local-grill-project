import { useCallback, useEffect, useState } from "react";

export function useSessions(token?: string) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Erreur lors du chargement des sessions");
      setSessions(Array.isArray(data) ? data : []);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Erreur inconnue";
      setError(message);
      throw cause;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);

  return { sessions, loading, error, refresh };
}
