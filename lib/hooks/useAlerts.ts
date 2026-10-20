import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/fetcher";
import { useAuth } from "./useAuth";

export function useAlerts() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["alerts", token],
    queryFn: async () => {
      if (!token) throw new Error("No token");
      const res = await fetchWithAuth("/api/alerts", token);
      return res.data?.alerts || [];
    },
    enabled: !!token,
    refetchInterval: 60000,
  });
}
