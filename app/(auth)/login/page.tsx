"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-foreground">
            <Icon icon="solar:bolt-linear" className="text-background" width={20} />
          </div>
          <h1 className="text-xl font-bold uppercase">Relay AI</h1>
          <p className="mt-1 text-small text-default-500">API 网关</p>
        </div>

        <Card>
          <CardBody className="p-6">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-semibold">欢迎回来</h2>
              <p className="text-small text-default-400">登录以继续</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 rounded-medium bg-danger-50 p-3 text-small text-danger">
                  <Icon icon="solar:danger-circle-linear" width={16} />
                  {error}
                </div>
              )}
              
              <Input
                label="用户名"
                placeholder="请输入用户名"
                value={username}
                onValueChange={setUsername}
                isRequired
                variant="bordered"
              />
              
              <Input
                label="密码"
                placeholder="请输入密码"
                type="password"
                value={password}
                onValueChange={setPassword}
                isRequired
                variant="bordered"
              />

              <Button
                type="submit"
                color="primary"
                isLoading={loading}
                className="mt-2"
              >
                登录
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
