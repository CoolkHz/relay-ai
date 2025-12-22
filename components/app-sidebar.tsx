"use client"

import {
  Home,
  Server,
  Layers,
  Users,
  DollarSign,
  FileText,
  Zap,
} from "lucide-react"

import { NavMain, type NavItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems: NavItem[] = [
  {
    title: "仪表盘",
    url: "/",
    icon: Home,
  },
  {
    title: "渠道管理",
    url: "/channels",
    icon: Server,
  },
  {
    title: "分组管理",
    url: "/groups",
    icon: Layers,
  },
  {
    title: "用户管理",
    url: "/users",
    icon: Users,
  },
  {
    title: "模型计费",
    url: "/models",
    icon: DollarSign,
  },
  {
    title: "请求日志",
    url: "/logs",
    icon: FileText,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-foreground text-background flex aspect-square size-8 items-center justify-center rounded-full">
                  <Zap className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold uppercase">Relay AI</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
