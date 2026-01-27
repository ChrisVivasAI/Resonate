'use client'

import { ReactNode } from 'react'
import { ClientSidebar } from './client-sidebar'

interface ClientLayoutProps {
  children: ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <ClientSidebar />
      <main className="ml-[280px] min-h-screen transition-all duration-500">
        {children}
      </main>
    </div>
  )
}
