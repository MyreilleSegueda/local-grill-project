import { useEffect, useState } from 'react';

export function usePermissions(token?: string) {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/admin/permissions', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setPermissions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return { permissions, loading, error };
}
