"use client";

// Usage: <Sidebar /> renders main navigation and user actions.
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react";

import { useAuth } from "@/lib/hooks/use-auth";
import SidebarNav from "./sidebar-nav";
import type { SidebarItem } from "./sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    <aside className="flex h-screen w-72 flex-col border-r bg-background p-6">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
          <Icon icon="solar:bolt-linear" className="text-background" width={18} />
        </div>
        <span className="text-small font-bold uppercase">Relay AI</span>
      </div>

      {/* Navigation - 使用 py-[10vh] 让列表向下偏移 */}
      <ScrollArea className="h-full py-[10vh]">
        <SidebarNav
          items={navItems}
          defaultSelectedKey={getSelectedKey()}
          onSelectKey={handleSelect}
        />
      </ScrollArea>

      {/* Bottom Section */}
      <div className="mt-auto space-y-3">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-3">
          <span className="text-sm text-muted-foreground">主题</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"}
              >
                <Icon
                  icon={theme === "dark" ? "solar:sun-linear" : "solar:moon-linear"}
                  width={18}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === "dark" ? "浅色模式" : "深色模式"}</TooltipContent>
          </Tooltip>
        </div>

        {/* User Section */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Avatar className="h-9 w-9 bg-primary text-primary-foreground">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {user?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role === "admin" ? "管理员" : "用户"}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={logout}
                aria-label="退出登录"
              >
                <Icon icon="solar:logout-2-linear" width={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>退出登录</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
