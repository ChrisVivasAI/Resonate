'use client'

import { Sidebar } from './sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pl-[280px] min-h-screen">
        {children}
      </main>
    </div>
  )
}
