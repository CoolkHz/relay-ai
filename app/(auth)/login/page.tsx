"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mutate } from "swr";
import { Icon } from "@iconify/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AuthBackgroundPaths } from "@/components/ui/auth-background-paths";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBg, setShowBg] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const update = () => setShowBg(mediaQuery.matches);
    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }

      await mutate("/api/auth/me");
      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative container flex min-h-screen flex-1 shrink-0 items-center justify-center bg-black text-white md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute top-4 right-4 text-white hover:bg-white/10 hover:text-white md:top-8 md:right-8",
        )}
      >
        返回首页
      </Link>
      {/* 左侧面板 - 仅桌面端显示 */}
      <div className="text-primary relative hidden h-full flex-col border-r border-white/10 p-10 lg:flex">
        <div className="bg-primary/5 absolute inset-0" />
        {showBg && <AuthBackgroundPaths />}
        <div className="from-black absolute inset-0 z-10 bg-gradient-to-t to-transparent" />
        <div className="relative z-20 flex items-center text-lg font-medium text-white/80">
          <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Icon icon="solar:bolt-linear" className="text-white" width={18} />
          </div>
          Relay AI
        </div>
        <div className="relative z-20 mt-auto max-w-3xl text-white/70">
          <blockquote className="leading-normal text-balance">
            &ldquo;统一的 LLM API 网关，让多模型管理变得简单高效。支持负载均衡、配额管理和实时监控。&rdquo;
          </blockquote>
        </div>
      </div>

      {/* 右侧表单 */}
      <div className="flex items-center justify-center p-4 lg:h-screen lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[350px]">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">欢迎回来</h1>
            <p className="text-white/60 text-sm">输入您的凭据以登录</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <Icon icon="solar:danger-circle-linear" width={16} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                placeholder="请输入用户名"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:border-white/20 focus-visible:ring-white/20"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                placeholder="请输入密码"
                type="password"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:border-white/20 focus-visible:ring-white/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  登录中
                </span>
              ) : (
                "登录"
              )}
            </Button>
          </form>

          <p className="text-white/50 px-8 text-center text-sm">
            点击登录即表示您同意我们的{" "}
            <Link href="/terms" className="hover:text-white underline underline-offset-4 text-white/70">
              服务条款
            </Link>{" "}
            和{" "}
            <Link href="/privacy" className="hover:text-white underline underline-offset-4 text-white/70">
              隐私政策
            </Link>
            。
          </p>
        </div>
      </div>
    </div>
  );
}
