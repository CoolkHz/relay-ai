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
  Select,
  SelectItem,
  useDisclosure,
  Tooltip,
  Spinner,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Server, Search, Globe, Key } from "lucide-react";

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
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    onOpen();
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
    onOpen();
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

    onClose();
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

  const filteredData = (data?.data || []).filter((channel: Channel) =>
    channel.name.toLowerCase().includes(search.toLowerCase()) ||
    channel.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">渠道管理</h1>
          <p className="text-default-500 text-sm mt-0.5">管理 API 提供商连接</p>
        </div>
        <Button 
          color="primary" 
          size="sm"
          startContent={<Plus size={16} />} 
          onPress={openCreate}
        >
          添加渠道
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="搜索渠道..."
          value={search}
          onValueChange={setSearch}
          startContent={<Search size={16} className="text-default-400" />}
          className="max-w-[240px]"
          size="sm"
          variant="bordered"
        />
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="text-default-500">
              {(data?.data || []).filter((c: Channel) => c.status === "active").length} 启用
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-danger" />
            <span className="text-default-500">
              {(data?.data || []).filter((c: Channel) => c.status !== "active").length} 禁用
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 py-3 border-b border-divider/60">
          <div className="flex items-center gap-2">
            <Server size={16} className="text-primary" />
            <span className="text-sm font-semibold">所有渠道</span>
            <Chip size="sm" variant="flat">{filteredData.length}</Chip>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Spinner size="md" color="primary" />
            </div>
          ) : (
            <Table aria-label="渠道列表" removeWrapper classNames={{ th: "text-xs", td: "py-3" }}>
              <TableHeader>
                <TableColumn>名称</TableColumn>
                <TableColumn>类型</TableColumn>
                <TableColumn>基础 URL</TableColumn>
                <TableColumn>模型</TableColumn>
                <TableColumn>权重</TableColumn>
                <TableColumn>状态</TableColumn>
                <TableColumn align="center">操作</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无渠道">
                {filteredData.map((channel: Channel) => (
                  <TableRow key={channel.id} className="hover:bg-default-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <Server size={14} className="text-primary" />
                        </div>
                        <span className="text-sm font-medium">{channel.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color="secondary">{channel.type}</Chip>
                    </TableCell>
                    <TableCell>
                      <Tooltip content={channel.baseUrl}>
                        <div className="flex items-center gap-1.5 max-w-[180px]">
                          <Globe size={12} className="text-default-400 flex-shrink-0" />
                          <span className="truncate text-xs text-default-500">{channel.baseUrl}</span>
                        </div>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {channel.models?.slice(0, 2).map((m) => (
                          <Chip key={m} size="sm" variant="flat">{m}</Chip>
                        ))}
                        {(channel.models?.length || 0) > 2 && (
                          <Chip size="sm" variant="flat">+{channel.models.length - 2}</Chip>
                        )}
                        {!channel.models?.length && <span className="text-default-400 text-xs">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="bordered">{channel.weight}</Chip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={channel.status === "active" ? "success" : "danger"}
                        variant="dot"
                        className="cursor-pointer"
                        onClick={() => toggleStatus(channel)}
                      >
                        {channel.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-0.5">
                        <Tooltip content="编辑">
                          <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(channel)}>
                            <Pencil size={14} />
                          </Button>
                        </Tooltip>
                        <Tooltip content="删除" color="danger">
                          <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(channel.id)}>
                            <Trash2 size={14} />
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
      <Modal isOpen={isOpen} onClose={onClose} size="xl" backdrop="blur">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2 text-base pb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Server size={14} className="text-primary" />
            </div>
            {editing ? "编辑渠道" : "添加渠道"}
          </ModalHeader>
          <ModalBody className="py-4">
            <div className="grid grid-cols-2 gap-3">
              <Input 
                label="名称" 
                placeholder="我的 OpenAI 渠道"
                value={form.name} 
                onValueChange={(v) => setForm({ ...form, name: v })} 
                isRequired 
                variant="bordered"
                size="sm"
                startContent={<Server size={14} className="text-default-400" />}
              />
              <Select
                label="类型"
                selectedKeys={[form.type]}
                onSelectionChange={(keys) => setForm({ ...form, type: Array.from(keys)[0] as string })}
                variant="bordered"
                size="sm"
              >
                {channelTypes.map((t) => (
                  <SelectItem key={t.key}>{t.label}</SelectItem>
                ))}
              </Select>
              <Input 
                label="基础 URL" 
                placeholder="https://api.openai.com/v1"
                value={form.baseUrl} 
                onValueChange={(v) => setForm({ ...form, baseUrl: v })} 
                isRequired 
                variant="bordered"
                size="sm"
                className="col-span-2"
                startContent={<Globe size={14} className="text-default-400" />}
              />
              <Input 
                label="API 密钥" 
                type="password" 
                placeholder={editing ? "留空保持不变" : "sk-..."}
                value={form.apiKey} 
                onValueChange={(v) => setForm({ ...form, apiKey: v })} 
                isRequired={!editing} 
                variant="bordered"
                size="sm"
                className="col-span-2"
                startContent={<Key size={14} className="text-default-400" />}
              />
              <Input 
                label="模型" 
                placeholder="gpt-4o, gpt-4o-mini"
                description="逗号分隔"
                value={form.models} 
                onValueChange={(v) => setForm({ ...form, models: v })} 
                variant="bordered"
                size="sm"
                className="col-span-2"
              />
              <Input 
                label="权重" 
                type="number" 
                description="越高流量越多"
                value={String(form.weight)} 
                onValueChange={(v) => setForm({ ...form, weight: parseInt(v) || 1 })} 
                variant="bordered"
                size="sm"
              />
              <Input 
                label="优先级" 
                type="number" 
                description="越高越优先"
                value={String(form.priority)} 
                onValueChange={(v) => setForm({ ...form, priority: parseInt(v) || 0 })} 
                variant="bordered"
                size="sm"
              />
            </div>
          </ModalBody>
          <ModalFooter className="pt-2">
            <Button variant="flat" size="sm" onPress={onClose}>取消</Button>
            <Button color="primary" size="sm" onPress={handleSubmit}>
              {editing ? "更新" : "创建"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
