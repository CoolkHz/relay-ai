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
  Divider,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Layers, Search, Server } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const balanceStrategies = [
  { key: "round_robin", label: "轮询", description: "均匀分配" },
  { key: "random", label: "随机", description: "随机选择" },
  { key: "weighted", label: "加权", description: "按权重分配" },
  { key: "failover", label: "故障转移", description: "按优先级" },
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
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    onOpen();
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
    onOpen();
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
    onClose();
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

  const filteredData = (data?.data || []).filter((group: Group) =>
    group.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">分组管理</h1>
          <p className="text-default-500 text-sm mt-0.5">配置负载均衡和模型路由</p>
        </div>
        <Button 
          color="primary" 
          size="sm"
          startContent={<Plus size={16} />} 
          onPress={openCreate}
        >
          添加分组
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="搜索分组..."
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
            <Layers size={16} className="text-primary" />
            <span className="font-semibold">所有分组</span>
            <Chip size="sm" variant="flat">{filteredData.length}</Chip>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" color="primary" />
            </div>
          ) : (
            <Table aria-label="分组列表" removeWrapper>
              <TableHeader>
                <TableColumn>名称</TableColumn>
                <TableColumn>描述</TableColumn>
                <TableColumn>策略</TableColumn>
                <TableColumn>渠道</TableColumn>
                <TableColumn>状态</TableColumn>
                <TableColumn align="center">操作</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无分组">
                {filteredData.map((group: Group) => (
                  <TableRow key={group.id} className="hover:bg-default-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                          <Layers size={16} className="text-secondary" />
                        </div>
                        <span className="font-medium">{group.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-default-500">{group.description || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color="primary">
                        {balanceStrategies.find(s => s.key === group.balanceStrategy)?.label || group.balanceStrategy}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Server size={14} className="text-default-400" />
                        <span>{group.groupChannels?.length || 0} 个渠道</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={group.status === "active" ? "success" : "danger"}
                        size="sm"
                        variant="dot"
                      >
                        {group.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Tooltip content="编辑">
                          <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(group)}>
                            <Pencil size={16} />
                          </Button>
                        </Tooltip>
                        <Tooltip content="删除" color="danger">
                          <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(group.id)}>
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
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" backdrop="blur" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
              <Layers size={16} className="text-secondary" />
            </div>
            {editing ? "编辑分组" : "添加分组"}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="名称（对外模型名）"
                  placeholder="gpt-4o"
                  description="客户端使用的模型名称"
                  value={form.name}
                  onValueChange={(v) => setForm({ ...form, name: v })}
                  isRequired
                  variant="bordered"
                />
                <Input
                  label="描述"
                  placeholder="生产环境 GPT-4 池"
                  value={form.description}
                  onValueChange={(v) => setForm({ ...form, description: v })}
                  variant="bordered"
                />
              </div>

              <Select
                label="负载均衡策略"
                description="请求如何分配到各渠道"
                selectedKeys={[form.balanceStrategy]}
                onSelectionChange={(keys) =>
                  setForm({ ...form, balanceStrategy: Array.from(keys)[0] as string })
                }
                variant="bordered"
              >
                {balanceStrategies.map((s) => (
                  <SelectItem key={s.key} description={s.description}>{s.label}</SelectItem>
                ))}
              </Select>

              <Divider />

              {/* Channels Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold">渠道映射</p>
                    <p className="text-small text-default-500">配置处理此分组的渠道</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="flat" 
                    color="primary" 
                    startContent={<Plus size={14} />} 
                    onPress={addChannel}
                  >
                    添加渠道
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.channels.map((ch, i) => (
                    <Card key={i} className="border border-divider">
                      <CardBody className="p-4">
                        <div className="flex gap-3 items-end">
                          <Select
                            label="渠道"
                            placeholder="选择渠道"
                            selectedKeys={ch.channelId ? [String(ch.channelId)] : []}
                            onSelectionChange={(keys) =>
                              updateChannel(i, "channelId", parseInt(Array.from(keys)[0] as string) || 0)
                            }
                            className="flex-1"
                            size="sm"
                            variant="bordered"
                          >
                            {(channelsData?.data || []).map((c: Channel) => (
                              <SelectItem key={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </Select>
                          <Input
                            label="模型映射"
                            placeholder="实际模型名"
                            description="覆盖模型名称"
                            value={ch.modelMapping}
                            onValueChange={(v) => updateChannel(i, "modelMapping", v)}
                            className="flex-1"
                            size="sm"
                            variant="bordered"
                          />
                          <Input
                            label="权重"
                            type="number"
                            value={String(ch.weight)}
                            onValueChange={(v) => updateChannel(i, "weight", parseInt(v) || 1)}
                            className="w-24"
                            size="sm"
                            variant="bordered"
                          />
                          <Input
                            label="优先级"
                            type="number"
                            value={String(ch.priority)}
                            onValueChange={(v) => updateChannel(i, "priority", parseInt(v) || 0)}
                            className="w-24"
                            size="sm"
                            variant="bordered"
                          />
                          <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            color="danger"
                            onPress={() => removeChannel(i)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}

                  {form.channels.length === 0 && (
                    <Card className="border border-dashed border-divider">
                      <CardBody className="py-8">
                        <div className="text-center text-default-400">
                          <Server size={32} className="mx-auto mb-2 opacity-50" />
                          <p>暂无渠道配置</p>
                          <p className="text-tiny">点击"添加渠道"来添加渠道映射</p>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>取消</Button>
            <Button color="primary" onPress={handleSubmit} className="font-semibold">
              {editing ? "更新" : "创建"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
