"use client";

// Usage: users admin CRUD and API key management.
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Key, Copy, Check, Users, Search, Mail, Shield } from "lucide-react";

import { ErrorState } from "@/components/dashboard/error-state";
import { FormField } from "@/components/dashboard/form-field";
import { PageHeader } from "@/components/dashboard/page-header";
import { ResponsiveTable } from "@/components/dashboard/responsive-table";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { userSchema, userCreateSchema, validateForm } from "@/lib/validations";
import { jsonFetcher } from "@/lib/utils/fetcher";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  quota: number;
  usedQuota: number;
}

interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  status: string;
}

const roleOptions = [
  { key: "user", label: "用户" },
  { key: "admin", label: "管理员" },
];

export default function UsersPage() {
  const dialogViewportClassName = "p-1";
  const confirm = useConfirm();
  const { data, mutate, isLoading, error } = useSWR<{ data: User[] }>(
    "/api/admin/users",
    (url: string) => jsonFetcher(url) as Promise<{ data: User[] }>
  );
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user", quota: "0" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: keysData, mutate: mutateKeys, error: keysError } = useSWR<{ data: ApiKey[] }>(
    selectedUser ? `/api/admin/users/${selectedUser.id}/keys` : null,
    (url: string) => jsonFetcher(url) as Promise<{ data: ApiKey[] }>
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", email: "", password: "", role: "user", quota: "0" });
    setErrors({});
    setIsUserModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
      quota: String(user.quota),
    });
    setErrors({});
    setIsUserModalOpen(true);
  };

  const openKeys = (user: User) => {
    setSelectedUser(user);
    setNewKey(null);
    setKeyName("");
    setIsKeysModalOpen(true);
  };

  const handleSubmit = async () => {
    // Validate form - use different schema for create vs edit
    const schema = editing ? userSchema : userCreateSchema;
    const validation = validateForm(schema, form);
    if (!validation.success) {
      setErrors(validation.errors);
      toast.error("请检查表单填写是否正确");
      return;
    }
    setErrors({});

    const body: Record<string, unknown> = { ...form, quota: parseInt(form.quota) || 0 };
    if (!body.password) delete body.password;

    setIsSavingUser(true);
    try {
      const res = editing
        ? await fetch(`/api/admin/users/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "操作失败");
        return;
      }

      toast.success(editing ? "用户已更新" : "用户已创建");
      setIsUserModalOpen(false);
      mutate();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDelete = async (id: number) => {
    const userName = users.find((user) => user.id === id)?.username || "该用户";
    const accepted = await confirm({
      title: "删除用户",
      description: `确定要删除用户 "${userName}" 吗？此操作不可撤销。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!accepted) return;
    setDeletingUserId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "删除失败");
        return;
      }
      toast.success("用户已删除");
      mutate();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setDeletingUserId(null);
    }
  };

  const createKey = async () => {
    if (!selectedUser || !keyName) return;
    setIsCreatingKey(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "创建密钥失败");
        return;
      }
      const data = await res.json();
      setNewKey(data.key);
      setKeyName("");
      toast.success("API 密钥已创建");
      mutateKeys();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const deleteKey = async (keyId: number) => {
    if (!selectedUser) return;
    const keyNameValue = (keysData?.data as ApiKey[] | undefined)?.find((key) => key.id === keyId)?.name;
    const accepted = await confirm({
      title: "删除 API 密钥",
      description: `确定要删除密钥 "${keyNameValue || "未命名"}" 吗？此操作不可撤销。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!accepted) return;
    setDeletingKeyId(keyId);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/keys?keyId=${keyId}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "删除密钥失败");
        return;
      }
      toast.success("API 密钥已删除");
      mutateKeys();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setDeletingKeyId(null);
    }
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const users = Array.isArray(data?.data) ? data.data : [];
  const filteredData = users.filter((user) =>
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );
  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        description="管理用户账户和 API 访问权限"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            添加用户
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="warning" className="gap-2">
              <Shield className="h-3.5 w-3.5" />
              {adminCount} 管理员
            </Badge>
            <Badge variant="secondary" className="gap-2">
              <Users className="h-3.5 w-3.5" />
              {userCount} 用户
            </Badge>
            <Badge variant="outline" className="gap-2">
              总数 {users.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <SectionHeader
            title="所有用户"
            description="用户账户与配额管理"
            icon={<Users className="h-4 w-4" />}
            count={filteredData.length}
          />
        </CardHeader>
        <CardContent className="pt-0">
          {error ? (
            <ErrorState
              message={error}
              onRetry={() => mutate()}
              className="border-0 shadow-none"
            />
          ) : (
            <ResponsiveTable
              data={filteredData}
              getRowId={(user) => user.id}
              emptyState="暂无用户"
              tableLabel="用户列表"
              isLoading={isLoading}
              enableColumnVisibility
              columns={[
                {
                  key: "user",
                  header: "用户",
                  cell: (user) => (
                    <div className="flex items-center gap-3">
                      <Avatar
                        className={cn(
                          "h-9 w-9",
                          user.role === "admin"
                            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                            : "bg-gradient-to-br from-primary to-indigo-400 text-white"
                        )}
                      >
                        <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{user.username}</p>
                        <p className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{user.email}</span>
                        </p>
                      </div>
                    </div>
                  ),
                  sortValue: (user) => user.username,
                },
                {
                  key: "role",
                  header: "角色",
                  cell: (user) => (
                    <Badge variant={user.role === "admin" ? "warning" : "secondary"} className="gap-1.5">
                      {user.role === "admin" && <Shield className="h-3 w-3" />}
                      {user.role}
                    </Badge>
                  ),
                  sortValue: (user) => user.role,
                },
                {
                  key: "quota",
                  header: "配额使用",
                  align: "right",
                  mobileLabel: "配额",
                  cell: (user) => {
                    const quotaPercent = user.quota > 0 ? (user.usedQuota / user.quota) * 100 : 0;
                    return (
                      <div className="w-44">
                        {Number(user.quota) === 0 ? (
                          <Badge variant="success">无限制</Badge>
                        ) : (
                          <div>
                            <div className="mb-1 flex justify-between text-xs">
                              <span>{Number(user.usedQuota).toLocaleString()}</span>
                              <span className="text-muted-foreground">
                                / {Number(user.quota).toLocaleString()}
                              </span>
                            </div>
                            <Progress
                              value={quotaPercent}
                              className="h-2"
                              indicatorClassName={
                                quotaPercent > 90
                                  ? "bg-destructive"
                                  : quotaPercent > 70
                                    ? "bg-amber-500"
                                    : "bg-primary"
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  },
                  sortValue: (user) => Number(user.usedQuota) || 0,
                },
                {
                  key: "status",
                  header: "状态",
                  cell: (user) => (
                    <Badge variant={user.status === "active" ? "success" : "destructive"} className="gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {user.status}
                    </Badge>
                  ),
                  sortValue: (user) => user.status,
                },
                {
                  key: "actions",
                  header: "操作",
                  align: "right",
                  hideInColumnMenu: true,
                  cell: (user) => (
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openKeys(user)} aria-label="API 密钥">
                            <Key className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>API 密钥</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} aria-label="编辑用户">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>编辑</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            isLoading={deletingUserId === user.id}
                            onClick={() => handleDelete(user.id)}
                            aria-label="删除用户"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>删除</TooltipContent>
                      </Tooltip>
                    </div>
                  ),
                },
              ]}
              renderMobileCard={(user) => {
                const quotaPercent = user.quota > 0 ? (user.usedQuota / user.quota) * 100 : 0;
                return (
                  <Card className="border border-border/60">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            className={cn(
                              "h-9 w-9",
                              user.role === "admin"
                                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                                : "bg-gradient-to-br from-primary to-indigo-400 text-white"
                            )}
                          >
                            <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{user.username}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Badge variant={user.status === "active" ? "success" : "destructive"} className="gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {user.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={user.role === "admin" ? "warning" : "secondary"} className="gap-1.5">
                          {user.role === "admin" && <Shield className="h-3 w-3" />}
                          {user.role}
                        </Badge>
                        {Number(user.quota) === 0 ? (
                          <Badge variant="success">无限制</Badge>
                        ) : (
                          <Badge variant="outline">
                            {Number(user.usedQuota).toLocaleString()} / {Number(user.quota).toLocaleString()}
                          </Badge>
                        )}
                      </div>

                      {Number(user.quota) === 0 ? null : (
                        <div>
                          <div className="mb-1 flex justify-between text-xs">
                            <span>{Number(user.usedQuota).toLocaleString()}</span>
                            <span className="text-muted-foreground">
                              / {Number(user.quota).toLocaleString()}
                            </span>
                          </div>
                          <Progress
                            value={quotaPercent}
                            className="h-2"
                            indicatorClassName={
                              quotaPercent > 90
                                ? "bg-destructive"
                                : quotaPercent > 70
                                  ? "bg-amber-500"
                                  : "bg-primary"
                            }
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => openKeys(user)}>
                          <Key className="h-4 w-4" />
                          密钥
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          isLoading={deletingUserId === user.id}
                          onClick={() => handleDelete(user.id)}
                          aria-label="删除用户"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* User Edit/Create Dialog */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </span>
              {editing ? "编辑用户" : "添加用户"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]" viewportClassName={dialogViewportClassName}>
            <div className="grid gap-4 pr-2 pb-2 sm:grid-cols-2 sm:gap-6">
              <FormField label="用户名" required htmlFor="user-username" error={errors.username}>
                <Input
                  id="user-username"
                  placeholder="johndoe"
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  required
                />
              </FormField>
              <FormField label="邮箱" required htmlFor="user-email" error={errors.email}>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </FormField>
              <FormField
                label={editing ? "密码（留空保持不变）" : "密码"}
                required={!editing}
                htmlFor="user-password"
                className="sm:col-span-2"
                error={errors.password}
              >
                <Input
                  id="user-password"
                  type="password"
                  placeholder={editing ? "留空表示不修改" : "至少 8 位"}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required={!editing}
                />
              </FormField>
              <FormField label="角色" required htmlFor="user-role" reserveDescriptionSpace error={errors.role}>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                  <SelectTrigger id="user-role">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="配额" description="0 = 无限制" htmlFor="user-quota" error={errors.quota}>
                <Input
                  id="user-quota"
                  type="number"
                  value={form.quota}
                  onChange={(event) => setForm({ ...form, quota: event.target.value })}
                />
              </FormField>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={isSavingUser}
              loadingText={editing ? "更新中" : "创建中"}
            >
              {editing ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys Dialog */}
      <Dialog open={isKeysModalOpen} onOpenChange={setIsKeysModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Key className="h-4 w-4" />
              </span>
              API 密钥 - {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]" viewportClassName={dialogViewportClassName}>
            <div className="space-y-4 pr-2 pb-2">
              {newKey && (
                <Card className="border-emerald-500/40 bg-emerald-500/10">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      新 API 密钥已创建！请立即复制，之后将无法再次查看。
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg border border-border bg-background p-3 text-sm font-mono">
                        {newKey}
                      </code>
                      <Button
                        size="icon"
                        variant={copied ? "default" : "outline"}
                        onClick={copyKey}
                        aria-label="复制密钥"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold">创建新密钥</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="密钥名称（如：生产环境、开发环境）"
                    value={keyName}
                    onChange={(event) => setKeyName(event.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={createKey}
                    isLoading={isCreatingKey}
                    loadingText="创建中"
                    disabled={!keyName}
                  >
                    创建密钥
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold">现有密钥</p>
                {keysError ? (
                  <ErrorState
                    message={keysError}
                    onRetry={() => mutateKeys()}
                    className="border-0 shadow-none"
                  />
                ) : (
                  <ResponsiveTable
                    data={Array.isArray(keysData?.data) ? keysData.data : []}
                    getRowId={(key) => key.id}
                    emptyState="暂无 API 密钥"
                    tableLabel="API 密钥列表"
                    isLoading={Boolean(selectedUser) && !keysData}
                    columns={[
                      {
                        key: "name",
                        header: "名称",
                        cell: (key) => <span className="font-medium">{key.name}</span>,
                        sortValue: (key) => key.name,
                      },
                      {
                        key: "prefix",
                        header: "密钥前缀",
                        cell: (key) => (
                          <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{key.keyPrefix}...</code>
                        ),
                        sortValue: (key) => key.keyPrefix,
                      },
                      {
                        key: "status",
                        header: "状态",
                        cell: (key) => (
                          <Badge variant={key.status === "active" ? "success" : "destructive"} className="gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {key.status}
                          </Badge>
                        ),
                        sortValue: (key) => key.status,
                      },
                      {
                        key: "actions",
                        header: "操作",
                        align: "right",
                        hideInColumnMenu: true,
                        cell: (key) => (
                          <div className="flex justify-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10"
                                  isLoading={deletingKeyId === key.id}
                                  onClick={() => deleteKey(key.id)}
                                  aria-label="删除密钥"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>删除</TooltipContent>
                            </Tooltip>
                          </div>
                        ),
                      },
                    ]}
                    renderMobileCard={(key) => (
                      <Card className="border border-border/60">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{key.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">前缀：{key.keyPrefix}...</p>
                            </div>
                            <Badge variant={key.status === "active" ? "success" : "destructive"} className="gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {key.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              isLoading={deletingKeyId === key.id}
                              onClick={() => deleteKey(key.id)}
                              aria-label="删除密钥"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  />
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsKeysModalOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
