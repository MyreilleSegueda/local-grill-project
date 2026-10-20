import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "../api/fetcher";
import { useAuth } from "./useAuth";

export function useProducts() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["products", token],
    queryFn: async () => {
      if (!token) throw new Error("No token");
      const res = await fetchWithAuth("/api/products", token);
      return res.data?.products || [];
    },
    enabled: !!token,
    refetchInterval: 60000,
  });
}
