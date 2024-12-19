/**
 * Dashboard Home Page
 * 
 * Main dashboard view that displays overview and summary information.
 * This is the landing page after user login.
 * 
 * @page
 */
import DashboardLayout from '@/components/dashboard/layout'

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="container-fluid">
        <h1 className="h3 mb-4">Dashboard</h1>
        {/* 
          TODO: Add dashboard widgets
          - Summary cards
          - Recent activity
          - Quick actions
          - Key metrics
        */}
      </div>
    </DashboardLayout>
  )
}

// Protect this page from unauthorized access
Dashboard.requireAuth = true 