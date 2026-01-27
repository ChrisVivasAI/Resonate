import { ClientLayout } from '@/components/layout'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientLayout>{children}</ClientLayout>
}
