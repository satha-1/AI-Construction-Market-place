import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "../../api";

/** The signed-in vendor's own profile; `vendor` is null when onboarding is not done yet. */
export function useVendor() {
  const q = useQuery({
    queryKey: ["vendor", "me"],
    queryFn: async () => {
      try {
        return await api.myVendor();
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
  });
  return { vendor: q.data ?? null, isLoading: q.isLoading, error: q.error };
}
