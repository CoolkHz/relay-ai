"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Avatar,
  Button,
  ScrollShadow,
  Tooltip,
} from "@heroui/react";
import { Icon } from "@iconify/react";

import { useAuth } from "@/lib/hooks/use-auth";
import SidebarNav from "./sidebar-nav";
import type { SidebarItem } from "./sidebar-nav";

const navItems: SidebarItem[] = [
  {
    key: "/",
    href: "/",
    icon: "solar:home-2-linear",
    title: "仪表盘",
  },
  {
    key: "/channels",
    href: "/channels",
    icon: "solar:server-linear",
    title: "渠道管理",
  },
  {
    key: "/groups",
    href: "/groups",
    icon: "solar:layers-linear",
    title: "分组管理",
  },
  {
    key: "/users",
    href: "/users",
    icon: "solar:users-group-rounded-linear",
    title: "用户管理",
  },
  {
    key: "/models",
    href: "/models",
    icon: "solar:dollar-minimalistic-linear",
    title: "模型计费",
  },
  {
    key: "/logs",
    href: "/logs",
    icon: "solar:document-text-linear",
    title: "请求日志",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const getSelectedKey = () => {
    if (pathname === "/") return "/";
    const item = navItems.find(
      (item) => item.key !== "/" && pathname.startsWith(item.key)
    );
    return item?.key || "/";
  };

  const handleSelect = (key: string) => {
    router.push(key);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <aside className="flex h-screen w-72 flex-col border-r-small border-divider bg-background p-6">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
          <Icon icon="solar:bolt-linear" className="text-background" width={18} />
        </div>
        <span className="text-small font-bold uppercase">Relay AI</span>
      </div>

      {/* Navigation - 使用 py-[10vh] 让列表向下偏移 */}
      <ScrollShadow className="h-full max-h-full py-[10vh]">
        <SidebarNav
          items={navItems}
          defaultSelectedKey={getSelectedKey()}
          onSelect={handleSelect}
        />
      </ScrollShadow>

      {/* Bottom Section */}
      <div className="mt-auto space-y-3">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-3">
          <span className="text-small text-default-500">主题</span>
          <Tooltip content={theme === "dark" ? "浅色模式" : "深色模式"}>
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              onPress={toggleTheme}
            >
              <Icon 
                icon={theme === "dark" ? "solar:sun-linear" : "solar:moon-linear"} 
                width={18} 
              />
            </Button>
          </Tooltip>
        </div>

        {/* User Section */}
        <div className="flex items-center gap-3 rounded-large bg-content2 p-3">
          <Avatar
            name={user?.username?.charAt(0).toUpperCase()}
            size="sm"
            classNames={{
              base: "bg-primary",
              name: "text-primary-foreground font-semibold text-xs",
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-small font-medium truncate">{user?.username}</p>
            <p className="text-tiny text-default-400 capitalize">{user?.role === "admin" ? "管理员" : "用户"}</p>
          </div>
          <Tooltip content="退出登录">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={logout}
            >
              <Icon icon="solar:logout-2-linear" width={18} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
