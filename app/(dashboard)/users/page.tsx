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
  Avatar,
  Progress,
} from "@heroui/react";
import { Plus, Pencil, Trash2, Key, Copy, Check, Users, Search, Mail, Shield } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const { data, mutate, isLoading } = useSWR("/api/admin/users", fetcher);
  const { isOpen: isUserModalOpen, onOpen: onUserModalOpen, onClose: onUserModalClose } = useDisclosure();
  const { isOpen: isKeysModalOpen, onOpen: onKeysModalOpen, onClose: onKeysModalClose } = useDisclosure();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "user", quota: "0" });
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: keysData, mutate: mutateKeys } = useSWR(
    selectedUser ? `/api/admin/users/${selectedUser.id}/keys` : null,
    fetcher
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", email: "", password: "", role: "user", quota: "0" });
    onUserModalOpen();
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
    onUserModalOpen();
  };

  const openKeys = (user: User) => {
    setSelectedUser(user);
    setNewKey(null);
    setKeyName("");
    onKeysModalOpen();
  };

  const handleSubmit = async () => {
    const body: Record<string, unknown> = { ...form, quota: parseInt(form.quota) || 0 };
    if (!body.password) delete body.password;

    if (editing) {
      await fetch(`/api/admin/users/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    onUserModalClose();
    mutate();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    mutate();
  };

  const createKey = async () => {
    if (!selectedUser || !keyName) return;
    const res = await fetch(`/api/admin/users/${selectedUser.id}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName }),
    });
    const data = await res.json();
    setNewKey(data.key);
    setKeyName("");
    mutateKeys();
  };

  const deleteKey = async (keyId: number) => {
    if (!selectedUser || !confirm("Delete this API key?")) return;
    await fetch(`/api/admin/users/${selectedUser.id}/keys?keyId=${keyId}`, { method: "DELETE" });
    mutateKeys();
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredData = (data?.data || []).filter((user: User) =>
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-default-500 text-sm mt-0.5">管理用户账户和 API 访问权限</p>
        </div>
        <Button 
          color="primary" 
          size="sm"
          startContent={<Plus size={16} />} 
          onPress={openCreate}
        >
          添加用户
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="搜索用户..."
          value={search}
          onValueChange={setSearch}
          startContent={<Search size={18} className="text-default-400" />}
          className="max-w-xs"
          variant="bordered"
        />
        <div className="flex-1" />
        <div className="flex items-center gap-6 text-small">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-warning" />
            <span className="text-default-500">
              {(data?.data || []).filter((u: User) => u.role === "admin").length} 管理员
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <span className="text-default-500">
              {(data?.data || []).filter((u: User) => u.role === "user").length} 用户
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 py-3 border-b border-divider/60">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <span className="font-semibold">所有用户</span>
            <Chip size="sm" variant="flat">{filteredData.length}</Chip>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" color="primary" />
            </div>
          ) : (
            <Table aria-label="用户列表" removeWrapper>
              <TableHeader>
                <TableColumn>用户</TableColumn>
                <TableColumn>角色</TableColumn>
                <TableColumn>配额使用</TableColumn>
                <TableColumn>状态</TableColumn>
                <TableColumn align="center">操作</TableColumn>
              </TableHeader>
              <TableBody emptyContent="暂无用户">
                {filteredData.map((user: User) => {
                  const quotaPercent = user.quota > 0 ? (user.usedQuota / user.quota) * 100 : 0;
                  return (
                    <TableRow key={user.id} className="hover:bg-default-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user.username.charAt(0).toUpperCase()}
                            size="sm"
                            classNames={{
                              base: user.role === "admin" 
                                ? "bg-gradient-to-br from-warning to-warning-600" 
                                : "bg-gradient-to-br from-primary to-secondary",
                              name: "text-white font-semibold",
                            }}
                          />
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-tiny text-default-400 flex items-center gap-1">
                              <Mail size={10} />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={user.role === "admin" ? "warning" : "default"}
                          size="sm"
                          variant="flat"
                          startContent={user.role === "admin" ? <Shield size={12} /> : null}
                        >
                          {user.role}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="w-40">
                          {Number(user.quota) === 0 ? (
                            <Chip size="sm" variant="flat" color="success">无限制</Chip>
                          ) : (
                            <div>
                              <div className="flex justify-between text-tiny mb-1">
                                <span>{Number(user.usedQuota).toLocaleString()}</span>
                                <span className="text-default-400">/ {Number(user.quota).toLocaleString()}</span>
                              </div>
                              <Progress 
                                value={quotaPercent} 
                                size="sm" 
                                color={quotaPercent > 90 ? "danger" : quotaPercent > 70 ? "warning" : "primary"}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={user.status === "active" ? "success" : "danger"}
                          size="sm"
                          variant="dot"
                        >
                          {user.status}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Tooltip content="API 密钥">
                            <Button isIconOnly size="sm" variant="light" color="secondary" onPress={() => openKeys(user)}>
                              <Key size={16} />
                            </Button>
                          </Tooltip>
                          <Tooltip content="编辑">
                            <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(user)}>
                              <Pencil size={16} />
                            </Button>
                          </Tooltip>
                          <Tooltip content="删除" color="danger">
                            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(user.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={onUserModalClose} size="lg" backdrop="blur">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Users size={16} className="text-primary" />
            </div>
            {editing ? "编辑用户" : "添加用户"}
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-4">
              <Input
                label="用户名"
                placeholder="johndoe"
                value={form.username}
                onValueChange={(v) => setForm({ ...form, username: v })}
                isRequired
                variant="bordered"
                startContent={<Users size={16} className="text-default-400" />}
              />
              <Input
                label="邮箱"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onValueChange={(v) => setForm({ ...form, email: v })}
                isRequired
                variant="bordered"
                startContent={<Mail size={16} className="text-default-400" />}
              />
              <Input
                label={editing ? "密码（留空保持不变）" : "密码"}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onValueChange={(v) => setForm({ ...form, password: v })}
                isRequired={!editing}
                variant="bordered"
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="角色"
                  selectedKeys={[form.role]}
                  onSelectionChange={(keys) => setForm({ ...form, role: Array.from(keys)[0] as string })}
                  variant="bordered"
                >
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.key}>{opt.label}</SelectItem>
                  ))}
                </Select>
                <Input
                  label="配额"
                  type="number"
                  description="0 = 无限制"
                  value={form.quota}
                  onValueChange={(v) => setForm({ ...form, quota: v })}
                  variant="bordered"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onUserModalClose}>取消</Button>
            <Button color="primary" onPress={handleSubmit} className="font-semibold">
              {editing ? "更新" : "创建"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* API Keys Modal */}
      <Modal isOpen={isKeysModalOpen} onClose={onKeysModalClose} size="2xl" backdrop="blur">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
              <Key size={16} className="text-secondary" />
            </div>
            API 密钥 - {selectedUser?.username}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {newKey && (
                <Card className="border border-success bg-success-50">
                  <CardBody className="p-4">
                    <p className="mb-2 text-small font-medium text-success-700">
                      🎉 新 API 密钥已创建！请立即复制，之后将无法再次查看。
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg bg-white p-3 text-small font-mono border">
                        {newKey}
                      </code>
                      <Button 
                        isIconOnly 
                        size="sm" 
                        color={copied ? "success" : "default"}
                        variant="flat" 
                        onPress={copyKey}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="密钥名称（如：生产环境、开发环境）"
                  value={keyName}
                  onValueChange={setKeyName}
                  className="flex-1"
                  variant="bordered"
                  startContent={<Key size={16} className="text-default-400" />}
                />
                <Button color="primary" onPress={createKey} isDisabled={!keyName}>
                  创建密钥
                </Button>
              </div>

              <Table aria-label="API 密钥列表" removeWrapper>
                <TableHeader>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>密钥前缀</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn align="center">操作</TableColumn>
                </TableHeader>
                <TableBody emptyContent="暂无 API 密钥">
                  {(keysData?.data || []).map((key: ApiKey) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-small bg-default-100 px-2 py-1 rounded">{key.keyPrefix}...</code>
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={key.status === "active" ? "success" : "danger"}
                          size="sm"
                          variant="dot"
                        >
                          {key.status}
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
                              onPress={() => deleteKey(key.id)}
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
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onKeysModalClose}>关闭</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
