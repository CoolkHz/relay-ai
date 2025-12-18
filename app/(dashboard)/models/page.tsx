"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  useDisclosure,
  Tooltip,
  Spinner,
} from "@heroui/react";
import { Plus, Trash2, DollarSign, Search, Cpu, ArrowDownUp } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Model {
  id: number;
  name: string;
  inputPrice: string;
  outputPrice: string;
  source: string;
}

export default function ModelsPage() {
  const { data, mutate, isLoading } = useSWR("/api/admin/models", fetcher);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", inputPrice: "0", outputPrice: "0" });

  const openCreate = () => {
    setForm({ name: "", inputPrice: "0", outputPrice: "0" });
    onOpen();
  };

  const handleSubmit = async () => {
    await fetch("/api/admin/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        inputPrice: parseFloat(form.inputPrice) || 0,
        outputPrice: parseFloat(form.outputPrice) || 0,
      }),
    });
    onClose();
    mutate();
  };

  const handleDelete = async (name: string) => {
    if (!confirm("Delete this model price?")) return;
    await fetch(`/api/admin/models?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    mutate();
  };

  const filteredData = (data?.data || []).filter((model: Model) =>
    model.name.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate totals
  const totalModels = data?.data?.length || 0;
  const manualModels = (data?.data || []).filter((m: Model) => m.source === "manual").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模型计费</h1>
          <p className="text-default-500 text-sm mt-0.5">配置每百万 Token 的价格用于成本追踪</p>
        </div>
        <Button 
          color="primary" 
          size="sm"
          startContent={<Plus size={16} />} 
          onPress={openCreate}
        >
          添加模型
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardBody className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Cpu size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalModels}</p>
                <p className="text-[10px] text-default-500">总模型数</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-sm">
          <CardBody className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                <DollarSign size={18} className="text-success" />
              </div>
              <div>
                <p className="text-xl font-bold">{manualModels}</p>
                <p className="text-[10px] text-default-500">手动配置</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-sm">
          <CardBody className="p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                <ArrowDownUp size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalModels - manualModels}</p>
                <p className="text-[10px] text-default-500">自动检测</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="搜索模型..."
          value={search}
          onValueChange={setSearch}
          startContent={<Search size={18} className="text-default-400" />}
          className="max-w-xs"
          variant="bordered"
        />
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 py-3 border-b border-divider/60">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-success" />
            <span className="font-semibold">价格配置</span>
            <Chip size="sm" variant="flat">{filteredData.length}</Chip>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" color="primary" />
            </div>
          ) : (
            <Table aria-label="模型价格列表" removeWrapper>
              <TableHeader>
                <TableColumn>模型名称</TableColumn>
                <TableColumn align="end">输入价格</TableColumn>
                <TableColumn align="end">输出价格</TableColumn>
                <TableColumn>来源</TableColumn>
                <TableColumn align="center">操作</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无模型配置">
                {filteredData.map((model: Model) => (
                  <TableRow key={model.id} className="hover:bg-default-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-default-100">
                          <Cpu size={16} className="text-default-500" />
                        </div>
                        <span className="font-medium font-mono">{model.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <span className="font-semibold text-success">${Number(model.inputPrice).toFixed(4)}</span>
                        <p className="text-tiny text-default-400">每百万 Token</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <span className="font-semibold text-warning">${Number(model.outputPrice).toFixed(4)}</span>
                        <p className="text-tiny text-default-400">每百万 Token</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={model.source === "manual" ? "primary" : "success"}
                        size="sm"
                        variant="flat"
                      >
                        {model.source}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Tooltip content="删除" color="danger">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => handleDelete(model.name)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" backdrop="blur">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <DollarSign size={16} className="text-success" />
            </div>
            添加模型价格
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Input
                label="模型名称"
                placeholder="gpt-4o, claude-3-opus 等"
                description="输入 API 调用中使用的准确模型名称"
                value={form.name}
                onValueChange={(v) => setForm({ ...form, name: v })}
                isRequired
                variant="bordered"
                startContent={<Cpu size={16} className="text-default-400" />}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="输入价格"
                  type="number"
                  step="0.0001"
                  description="每百万输入 Token 成本"
                  value={form.inputPrice}
                  onValueChange={(v) => setForm({ ...form, inputPrice: v })}
                  variant="bordered"
                  startContent={<span className="text-default-400 text-small">$</span>}
                />
                <Input
                  label="输出价格"
                  type="number"
                  step="0.0001"
                  description="每百万输出 Token 成本"
                  value={form.outputPrice}
                  onValueChange={(v) => setForm({ ...form, outputPrice: v })}
                  variant="bordered"
                  startContent={<span className="text-default-400 text-small">$</span>}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>取消</Button>
            <Button color="primary" onPress={handleSubmit} className="font-semibold">
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
