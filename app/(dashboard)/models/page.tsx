"use client";

// Usage: manage model pricing with responsive table and dialog.
import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowDownUp, Cpu, DollarSign, Plus, Search, Trash2 } from "lucide-react";

import { FormField } from "@/components/dashboard/form-field";
import { PageHeader } from "@/components/dashboard/page-header";
import { ResponsiveTable } from "@/components/dashboard/responsive-table";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { modelSchema, validateForm } from "@/lib/validations";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Model {
  id: number;
  name: string;
  inputPrice: string;
  outputPrice: string;
  source: string;
}

export default function ModelsPage() {
  const dialogViewportClassName = "p-1";
  const confirm = useConfirm();
  const { data, mutate, isLoading } = useSWR("/api/admin/models", fetcher);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingModelName, setDeletingModelName] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", inputPrice: "0", outputPrice: "0" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openCreate = () => {
    setForm({ name: "", inputPrice: "0", outputPrice: "0" });
    setErrors({});
    setOpen(true);
  };

  const handleSubmit = async () => {
    // Validate form
    const validation = validateForm(modelSchema, form);
    if (!validation.success) {
      setErrors(validation.errors);
      toast.error("请检查表单填写是否正确");
      return;
    }
    setErrors({});

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          inputPrice: parseFloat(form.inputPrice) || 0,
          outputPrice: parseFloat(form.outputPrice) || 0,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "创建失败");
        return;
      }

      toast.success("模型价格已添加");
      setOpen(false);
      mutate();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    const accepted = await confirm({
      title: "删除模型",
      description: `确定要删除模型 "${name}" 的计费配置吗？此操作不可撤销。`,
      confirmText: "删除",
      variant: "destructive",
    });
    if (!accepted) return;
    setDeletingModelName(name);
    try {
      const res = await fetch(`/api/admin/models?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        toast.error(error.error || "删除失败");
        return;
      }
      toast.success("模型价格已删除");
      mutate();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setDeletingModelName(null);
    }
  };

  const models = Array.isArray(data?.data) ? (data.data as Model[]) : [];
  const filteredData = models.filter((model) => model.name.toLowerCase().includes(search.toLowerCase()));

  // Calculate totals
  const totalModels = models.length;
  const manualModels = models.filter((model) => model.source === "manual").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="模型计费"
        description="配置每百万 Token 的价格用于成本追踪"
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            添加模型
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="bg-gradient-to-br from-muted/40 via-background to-card">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalModels}</p>
              <p className="text-xs text-muted-foreground">总模型数</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 via-background to-card">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{manualModels}</p>
              <p className="text-xs text-muted-foreground">手动配置</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-secondary/20 via-background to-card">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary">
              <ArrowDownUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalModels - manualModels}</p>
              <p className="text-xs text-muted-foreground">自动检测</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索模型..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="outline">共 {filteredData.length} 条配置</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <SectionHeader
            title="价格配置"
            description="成本模型与来源"
            icon={<DollarSign className="h-4 w-4" />}
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
              getRowId={(model) => model.id}
              emptyState="暂无模型配置"
              tableLabel="模型价格列表"
              columns={[
                {
                  key: "name",
                  header: "模型名称",
                  cell: (model) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold font-mono">{model.name}</span>
                    </div>
                  ),
                },
                {
                  key: "inputPrice",
                  header: "输入价格",
                  align: "right",
                  cell: (model) => (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-500">
                        ${Number(model.inputPrice).toFixed(4)}
                      </p>
                      <p className="text-xs text-muted-foreground">每百万 Token</p>
                    </div>
                  ),
                },
                {
                  key: "outputPrice",
                  header: "输出价格",
                  align: "right",
                  cell: (model) => (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-amber-500">
                        ${Number(model.outputPrice).toFixed(4)}
                      </p>
                      <p className="text-xs text-muted-foreground">每百万 Token</p>
                    </div>
                  ),
                },
                {
                  key: "source",
                  header: "来源",
                  cell: (model) => (
                    <Badge variant={model.source === "manual" ? "secondary" : "success"}>{model.source}</Badge>
                  ),
                },
                {
                  key: "actions",
                  header: "操作",
                  align: "right",
                  cell: (model) => (
                    <div className="flex justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            isLoading={deletingModelName === model.name}
                            onClick={() => handleDelete(model.name)}
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
              renderMobileCard={(model) => (
                <Card className="border border-border/60">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold font-mono">{model.name}</p>
                        <Badge variant={model.source === "manual" ? "secondary" : "success"} className="mt-1">
                          {model.source}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        isLoading={deletingModelName === model.name}
                        onClick={() => handleDelete(model.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/60 p-2">
                        <p className="text-muted-foreground">输入价格</p>
                        <p className="font-medium">${Number(model.inputPrice).toFixed(4)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 p-2">
                        <p className="text-muted-foreground">输出价格</p>
                        <p className="font-medium">${Number(model.outputPrice).toFixed(4)}</p>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <DollarSign className="h-4 w-4" />
              </span>
              添加模型价格
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]" viewportClassName={dialogViewportClassName}>
            <div className="space-y-4 pr-2 pb-2">
              <FormField
                label="模型名称"
                description="输入 API 调用中使用的准确模型名称"
                error={errors.name}
                required
                htmlFor="model-name"
              >
                <Input
                  id="model-name"
                  placeholder="gpt-4o, claude-3-opus 等"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="输入价格" description="每百万输入 Token 成本" htmlFor="model-input-price" error={errors.inputPrice}>
                  <Input
                    id="model-input-price"
                    type="number"
                    step="0.0001"
                    value={form.inputPrice}
                    onChange={(event) => setForm({ ...form, inputPrice: event.target.value })}
                  />
                </FormField>
                <FormField label="输出价格" description="每百万输出 Token 成本" htmlFor="model-output-price" error={errors.outputPrice}>
                  <Input
                    id="model-output-price"
                    type="number"
                    step="0.0001"
                    value={form.outputPrice}
                    onChange={(event) => setForm({ ...form, outputPrice: event.target.value })}
                  />
                </FormField>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} isLoading={isSaving} loadingText="保存中">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
