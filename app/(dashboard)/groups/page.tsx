"use client";

// Usage: manage model groups with responsive table and channel mapping dialog.
import { useState } from "react";
import useSWR from "swr";
import { Layers, Pencil, Plus, Search, Server, Trash2 } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const balanceStrategies = [
  { key: "round_robin", label: "轮询" },
  { key: "random", label: "随机" },
  { key: "weighted", label: "加权" },
  { key: "failover", label: "故障转移" },
];

interface GroupChannel {
  channelId: number;
  modelMapping?: string;
  weight: number;
  priority: number;
  channel: { id: number; name: string };
}

interface Group {
  id: number;
  name: string;
  description?: string;
  balanceStrategy: string;
  status: string;
  groupChannels: GroupChannel[];
}

interface Channel {
  id: number;
  name: string;
}

export default function GroupsPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/groups", fetcher);
  const { data: channelsData } = useSWR("/api/admin/channels", fetcher);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    balanceStrategy: "round_robin",
    channels: [] as { channelId: number; modelMapping: string; weight: number; priority: number }[],
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", balanceStrategy: "round_robin", channels: [] });
    setOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditing(group);
    setForm({
      name: group.name,
      description: group.description || "",
      balanceStrategy: group.balanceStrategy,
      channels: group.groupChannels.map((gc) => ({
        channelId: gc.channelId,
        modelMapping: gc.modelMapping || "",
        weight: gc.weight,
        priority: gc.priority,
      })),
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (editing) {
      await fetch(`/api/admin/groups/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setOpen(false);
    mutate();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    mutate();
  };

  const addChannel = () => {
    setForm({
      ...form,
      channels: [...form.channels, { channelId: 0, modelMapping: "", weight: 1, priority: 0 }],
    });
  };

  const removeChannel = (index: number) => {
    setForm({
      ...form,
      channels: form.channels.filter((_, i) => i !== index),
    });
  };

  const updateChannel = (index: number, field: string, value: string | number) => {
    const channels = [...form.channels];
    channels[index] = { ...channels[index], [field]: value };
    setForm({ ...form, channels });
  };

  const groups = Array.isArray(data?.data) ? (data.data as Group[]) : [];
  const channels = Array.isArray(channelsData?.data) ? (channelsData.data as Channel[]) : [];
  const filteredData = groups.filter((group) => group.name.toLowerCase().includes(search.toLowerCase()));
  const strategyLabel = (key: string) =>
    balanceStrategies.find((strategy) => strategy.key === key)?.label || key;

  return (
    <div className="space-y-6">
      <PageHeader
        title="分组管理"
        description="配置负载均衡和模型路由"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            添加分组
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索分组..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline">共 {filteredData.length} 个分组</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <SectionHeader
            title="所有分组"
            description="分组与渠道路由配置"
            icon={<Layers className="h-4 w-4" />}
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
              getRowId={(group) => group.id}
              emptyState="暂无分组"
              tableLabel="分组列表"
              columns={[
                {
                  key: "name",
                  header: "名称",
                  cell: (group) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                        <Layers className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold">{group.name}</span>
                    </div>
                  ),
                },
                {
                  key: "description",
                  header: "描述",
                  cell: (group) => (
                    <span className="text-sm text-muted-foreground">{group.description || "-"}</span>
                  ),
                },
                {
                  key: "strategy",
                  header: "策略",
                  cell: (group) => <Badge variant="secondary">{strategyLabel(group.balanceStrategy)}</Badge>,
                },
                {
                  key: "channels",
                  header: "渠道",
                  cell: (group) => (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Server className="h-4 w-4" />
                      <span>{group.groupChannels?.length || 0} 个渠道</span>
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "状态",
                  cell: (group) => (
                    <Badge variant={group.status === "active" ? "success" : "destructive"}>
                      {group.status}
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  header: "操作",
                  align: "right",
                  cell: (group) => (
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(group)}>
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
                            onClick={() => handleDelete(group.id)}
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
              renderMobileCard={(group) => (
                <Card className="border border-border/60">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.description || "暂无描述"}</p>
                        </div>
                      </div>
                      <Badge variant={group.status === "active" ? "success" : "destructive"}>
                        {group.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{strategyLabel(group.balanceStrategy)}</Badge>
                      <div className="flex items-center gap-1">
                        <Server className="h-3.5 w-3.5" />
                        <span>{group.groupChannels?.length || 0} 个渠道</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(group)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Layers className="h-4 w-4" />
              </span>
              {editing ? "编辑分组" : "添加分组"}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="名称（对外模型名）"
                  description="客户端使用的模型名称"
                  required
                  htmlFor="group-name"
                >
                  <Input
                    id="group-name"
                    placeholder="gpt-4o"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </FormField>
                <FormField label="描述" htmlFor="group-description">
                  <Input
                    id="group-description"
                    placeholder="生产环境 GPT-4 池"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </FormField>
              </div>

              <FormField label="负载均衡策略" description="请求如何分配到各渠道" htmlFor="group-strategy">
                <Select
                  value={form.balanceStrategy}
                  onValueChange={(value) => setForm({ ...form, balanceStrategy: value })}
                >
                  <SelectTrigger id="group-strategy">
                    <SelectValue placeholder="选择策略" />
                  </SelectTrigger>
                  <SelectContent>
                    {balanceStrategies.map((strategy) => (
                      <SelectItem key={strategy.key} value={strategy.key}>
                        {strategy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <Separator />

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">渠道映射</p>
                    <p className="text-xs text-muted-foreground">配置处理此分组的渠道</p>
                  </div>
                  <Button variant="secondary" size="sm" className="gap-2" onClick={addChannel}>
                    <Plus className="h-4 w-4" />
                    添加渠道
                  </Button>
                </div>

                {form.channels.length ? (
                  <div className="space-y-3">
                    {form.channels.map((channel, index) => (
                      <Card key={`${channel.channelId}-${index}`} className="border border-border/60">
                        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_0.7fr_0.7fr_auto]">
                          <FormField label="渠道">
                            <Select
                              value={channel.channelId ? String(channel.channelId) : ""}
                              onValueChange={(value) =>
                                updateChannel(index, "channelId", parseInt(value, 10) || 0)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="选择渠道" />
                              </SelectTrigger>
                              <SelectContent>
                                {channels.map((c: Channel) => (
                                  <SelectItem key={String(c.id)} value={String(c.id)}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormField>
                          <FormField label="模型映射" description="覆盖模型名称">
                            <Input
                              placeholder="实际模型名"
                              value={channel.modelMapping}
                              onChange={(event) => updateChannel(index, "modelMapping", event.target.value)}
                            />
                          </FormField>
                          <FormField label="权重">
                            <Input
                              type="number"
                              value={String(channel.weight)}
                              onChange={(event) =>
                                updateChannel(index, "weight", parseInt(event.target.value, 10) || 1)
                              }
                            />
                          </FormField>
                          <FormField label="优先级">
                            <Input
                              type="number"
                              value={String(channel.priority)}
                              onChange={(event) =>
                                updateChannel(index, "priority", parseInt(event.target.value, 10) || 0)
                              }
                            />
                          </FormField>
                          <div className="flex items-end justify-end">
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => removeChannel(index)}
                              aria-label="删除渠道"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border border-dashed border-border/80">
                    <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center text-xs text-muted-foreground">
                      <Server className="h-8 w-8 text-muted-foreground/70" />
                      <p>暂无渠道配置</p>
                      <p>点击“添加渠道”创建映射</p>
                    </CardContent>
                  </Card>
                )}
              </div>
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
