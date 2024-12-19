export interface MenuItem {
  path: string
  label: string
  icon: string
  description?: string
}

export interface DashboardLayoutProps {
  children: React.ReactNode
} 