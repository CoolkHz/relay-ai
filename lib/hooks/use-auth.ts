"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAuth() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("/api/auth/me", fetcher);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    mutate(null);
    router.push("/login");
  };

  return {
    user: data?.user,
    isLoading,
    isError: error || data?.error,
    logout,
    mutate,
  };
}
