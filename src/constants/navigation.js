/**
 * Dashboard Navigation Configuration
 * 
 * Defines the structure and properties of the dashboard's navigation menu.
 * Each item represents a major section of the dashboard.
 */
export const DASHBOARD_MENU_ITEMS = [
  { 
    path: '/dashboard', 
    label: 'Dashboard', 
    icon: 'bi-speedometer2',
    description: 'Overview and summary of all activities'
  },
  { 
    path: '/dashboard/appointments', 
    label: 'Appointments', 
    icon: 'bi-calendar',
    description: 'Manage and schedule appointments'
  },
  { 
    path: '/dashboard/contacts', 
    label: 'Contacts', 
    icon: 'bi-people',
    description: 'Contact management and details'
  },
  { 
    path: '/dashboard/reports', 
    label: 'Reports', 
    icon: 'bi-file-earmark-text',
    description: 'Analytics and reporting tools'
  },
  { 
    path: '/dashboard/billing', 
    label: 'Billing', 
    icon: 'bi-credit-card',
    description: 'Billing and payment management'
  },
  { 
    path: '/dashboard/script', 
    label: 'Script', 
    icon: 'bi-file-code',
    description: 'Script management and editing'
  },
  { 
    path: '/dashboard/settings', 
    label: 'Settings', 
    icon: 'bi-gear',
    description: 'System and user settings'
  }
] 

/**
 * Main Navigation Configuration
 * 
 * Defines the structure of the main navigation menu.
 * Used in the header and other public areas of the site.
 */
export const MAIN_NAVIGATION = [
  {
    path: '/',
    label: 'Home',
    description: 'Return to homepage'
  },
  {
    path: '/plans',
    label: 'Plans',
    description: 'View our subscription plans'
  },
  {
    path: '/about',
    label: 'About',
    description: 'Learn more about us'
  }
]; 