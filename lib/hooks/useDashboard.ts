import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/fetcher";
import { useAuth } from "./useAuth";

export function useDashboardKpis() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["dashboard-kpis", token],
    queryFn: async () => {
      if (!token) throw new Error("No token");
      const res = await fetchWithAuth("/api/dashboard/kpis", token);
      return res.data;
    },
    enabled: !!token,
    refetchInterval: 60000,
  });
}
