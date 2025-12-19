"use client";

// Usage: manage provider channels with responsive table and dialog.
import { useState } from "react";
import useSWR from "swr";
import { Globe, Pencil, Plus, Search, Server, Trash2 } from "lucide-react";

import { FormField } from "@/components/dashboard/form-field";
import { PageHeader } from "@/components/dashboard/page-header";
import { ResponsiveTable } from "@/components/dashboard/responsive-table";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const channelTypes = [
  { key: "openai_chat", label: "OpenAI Chat" },
  { key: "openai_responses", label: "OpenAI Responses" },
  { key: "anthropic", label: "Anthropic" },
];

interface Channel {
  id: number;
  name: string;
  type: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  status: string;
  weight: number;
  priority: number;
}

export default function ChannelsPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/channels", fetcher);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "openai_chat",
    baseUrl: "",
    apiKey: "",
    models: "",
    weight: 1,
    priority: 0,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", type: "openai_chat", baseUrl: "", apiKey: "", models: "", weight: 1, priority: 0 });
    setOpen(true);
  };

  const openEdit = (channel: Channel) => {
    setEditing(channel);
    setForm({
      name: channel.name,
      type: channel.type,
      baseUrl: channel.baseUrl,
      apiKey: channel.apiKey,
      models: channel.models?.join(", ") || "",
      weight: channel.weight,
      priority: channel.priority,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const body = {
      ...form,
      models: form.models.split(",").map((m) => m.trim()).filter(Boolean),
    };

    if (editing) {
      await fetch(`/api/admin/channels/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setOpen(false);
    mutate();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    await fetch(`/api/admin/channels/${id}`, { method: "DELETE" });
    mutate();
  };

  const toggleStatus = async (channel: Channel) => {
    await fetch(`/api/admin/channels/${channel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: channel.status === "active" ? "disabled" : "active" }),
    });
    mutate();
  };

  const channels = Array.isArray(data?.data) ? (data.data as Channel[]) : [];
  const filteredData = channels.filter((channel) =>
    channel.name.toLowerCase().includes(search.toLowerCase()) ||
    channel.type.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = channels.filter((channel) => channel.status === "active").length;
  const disabledCount = channels.filter((channel) => channel.status !== "active").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="渠道管理"
        description="管理 API 提供商连接"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            添加渠道
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索渠道..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="success" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              启用 {activeCount}
            </Badge>
            <Badge variant="destructive" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              禁用 {disabledCount}
            </Badge>
            <Badge variant="outline" className="gap-2">
              总数 {channels.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <SectionHeader
            title="所有渠道"
            description="按渠道查看状态与可用模型"
            icon={<Server className="h-4 w-4" />}
            count={filteredData.length}
          />
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <ResponsiveTable
              data={filteredData}
              getRowId={(channel) => channel.id}
              emptyState="暂无渠道"
              tableLabel="渠道列表"
              columns={[
                {
                  key: "name",
                  header: "名称",
                  cell: (channel) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Server className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">{channel.name}</span>
                    </div>
                  ),
                },
                {
                  key: "type",
                  header: "类型",
                  cell: (channel) => <Badge variant="secondary">{channel.type}</Badge>,
                },
                {
                  key: "baseUrl",
                  header: "基础 URL",
                  cell: (channel) => (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex max-w-[220px] items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="h-3.5 w-3.5" />
                          <span className="truncate">{channel.baseUrl}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{channel.baseUrl}</TooltipContent>
                    </Tooltip>
                  ),
                },
                {
                  key: "models",
                  header: "模型",
                  cell: (channel) => (
                    <div className="flex flex-wrap gap-1.5">
                      {channel.models?.slice(0, 2).map((model) => (
                        <Badge key={model} variant="outline">
                          {model}
                        </Badge>
                      ))}
                      {(channel.models?.length || 0) > 2 ? (
                        <Badge variant="outline">+{channel.models.length - 2}</Badge>
                      ) : null}
                      {!channel.models?.length ? <span className="text-xs text-muted-foreground">-</span> : null}
                    </div>
                  ),
                },
                {
                  key: "weight",
                  header: "权重",
                  cell: (channel) => <Badge variant="outline">{channel.weight}</Badge>,
                },
                {
                  key: "status",
                  header: "状态",
                  cell: (channel) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 px-2 text-xs font-medium"
                      onClick={() => toggleStatus(channel)}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          channel.status === "active" ? "bg-emerald-500" : "bg-destructive"
                        }`}
                      />
                      {channel.status}
                    </Button>
                  ),
                },
                {
                  key: "actions",
                  header: "操作",
                  align: "right",
                  cell: (channel) => (
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(channel)}>
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
                            onClick={() => handleDelete(channel.id)}
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
              renderMobileCard={(channel) => (
                <Card className="border border-border/60">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Server className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{channel.name}</p>
                          <Badge variant="secondary" className="mt-1">
                            {channel.type}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => toggleStatus(channel)}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            channel.status === "active" ? "bg-emerald-500" : "bg-destructive"
                          }`}
                        />
                        {channel.status}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      <span className="truncate">{channel.baseUrl}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {channel.models?.slice(0, 3).map((model) => (
                        <Badge key={model} variant="outline">
                          {model}
                        </Badge>
                      ))}
                      {(channel.models?.length || 0) > 3 ? (
                        <Badge variant="outline">+{channel.models.length - 3}</Badge>
                      ) : null}
                      {!channel.models?.length ? <span className="text-xs text-muted-foreground">暂无模型</span> : null}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">权重 {channel.weight}</Badge>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(channel)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(channel.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Server className="h-4 w-4" />
              </span>
              {editing ? "编辑渠道" : "添加渠道"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="名称" required htmlFor="channel-name">
                <Input
                  id="channel-name"
                  placeholder="我的 OpenAI 渠道"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </FormField>
              <FormField label="类型" required htmlFor="channel-type">
                <Select
                  value={form.type}
                  onValueChange={(value) => setForm({ ...form, type: value })}
                >
                  <SelectTrigger id="channel-type">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelTypes.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="基础 URL" required htmlFor="channel-base-url" className="sm:col-span-2">
                <Input
                  id="channel-base-url"
                  placeholder="https://api.openai.com/v1"
                  value={form.baseUrl}
                  onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
                  required
                />
              </FormField>
              <FormField
                label="API 密钥"
                required={!editing}
                htmlFor="channel-api-key"
                className="sm:col-span-2"
              >
                <Input
                  id="channel-api-key"
                  type="password"
                  placeholder={editing ? "留空保持不变" : "sk-..."}
                  value={form.apiKey}
                  onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
                  required={!editing}
                />
              </FormField>
              <FormField label="模型" description="逗号分隔" htmlFor="channel-models" className="sm:col-span-2">
                <Input
                  id="channel-models"
                  placeholder="gpt-4o, gpt-4o-mini"
                  value={form.models}
                  onChange={(event) => setForm({ ...form, models: event.target.value })}
                />
              </FormField>
              <FormField label="权重" description="越高流量越多" htmlFor="channel-weight">
                <Input
                  id="channel-weight"
                  type="number"
                  value={String(form.weight)}
                  onChange={(event) =>
                    setForm({ ...form, weight: parseInt(event.target.value, 10) || 1 })
                  }
                />
              </FormField>
              <FormField label="优先级" description="越高越优先" htmlFor="channel-priority">
                <Input
                  id="channel-priority"
                  type="number"
                  value={String(form.priority)}
                  onChange={(event) =>
                    setForm({ ...form, priority: parseInt(event.target.value, 10) || 0 })
                  }
                />
              </FormField>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>{editing ? "更新" : "创建"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
