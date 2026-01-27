'use client'

import { useParams } from 'next/navigation'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

/**
 * This page redirects to the main project detail page.
 * The project detail functionality is maintained at /projects/[id]
 * This ensures backward compatibility while supporting the new URL structure.
 */
export default function ClientProjectDetailPage() {
  const params = useParams()
  const projectId = params.projectId as string

  useEffect(() => {
    // Redirect to the main project page
    window.location.href = `/projects/${projectId}`
  }, [projectId])

  return (
    <div className="flex items-center justify-center h-screen bg-charcoal-950">
      <p className="text-charcoal-500">Redirecting to project...</p>
    </div>
  )
}
