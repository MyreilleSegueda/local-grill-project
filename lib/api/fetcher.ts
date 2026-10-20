import { useCallback } from "react";

export async function fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      // Optionally trigger logout or redirect
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "API error");
    }
    return await res.json();
  } catch (err) {
    // Centralize error handling
    throw err;
  }
}

export function useFetcher(token: string) {
  return useCallback(
    async (url: string, options?: RequestInit) => fetchWithAuth(url, token, options),
    [token]
  );
}
