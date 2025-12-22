"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { jsonFetcher } from "@/lib/utils/fetcher";

type MeResponse = {
  user?: {
    id: number;
    username: string;
    email: string;
    role: "admin" | "user";
    quota?: number;
    usedQuota?: number;
  };
};

export function useAuth() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<MeResponse | null>(
    "/api/auth/me",
    (url: string) => jsonFetcher(url) as Promise<MeResponse>
  );

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    mutate(null);
    router.push("/login");
  };

  return {
    user: data?.user,
    isLoading,
    isError: Boolean(error),
    logout,
    mutate,
  };
}
