"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/lib/hooks/use-auth"
import { AppSidebar } from "@/components/app-sidebar"
import { ContentHeader } from "@/components/dashboard/content-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, isError } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.push("/login")
    }
  }, [user, isLoading, isError, router])

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset className="@container/content peer-data-[variant=inset]:h-[calc(100svh-16px)]">
        <ContentHeader />
        <main
          data-layout="fixed"
          className="relative flex flex-1 flex-col overflow-hidden px-4 py-6 @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl"
        >
          <div className="flex-1 overflow-auto scrollbar-hide">
            {children}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
