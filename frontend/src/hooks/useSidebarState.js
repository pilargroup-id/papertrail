import { useState } from 'react'

export function useSidebarState() {
  const [sidebarCollapsed, setSidebarCollapsedRaw] = useState(
    () => {
      try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch (_) { return false }
    }
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const setSidebarCollapsed = (updater) => {
    setSidebarCollapsedRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch (_) {}
      return next
    })
  }

  return { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, setMobileMenuOpen }
}
