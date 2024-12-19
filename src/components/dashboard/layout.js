/**
 * DashboardLayout Component
 * 
 * A layout wrapper for all dashboard pages that includes the sidebar
 * and main content area. This component ensures consistent layout
 * across all dashboard pages.
 * 
 * @component
 * @param {Object} props
 * @param {ReactNode} props.children - The content to be rendered in the main area
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import styles from '@/styles/dashboard.module.css';

const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'bi-grid'
  },
  {
    label: 'Appointments',
    href: '/dashboard/appointments',
    icon: 'bi-calendar'
  },
  {
    label: 'Contacts',
    href: '/dashboard/contacts',
    icon: 'bi-person'
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: 'bi-graph-up'
  },
  {
    label: 'Scripts',
    href: '/dashboard/script',
    icon: 'bi-file-text'
  },
  {
    label: 'Billing',
    href: '/dashboard/billing',
    icon: 'bi-credit-card'
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: 'bi-gear'
  }
];

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={140}
              height={36}
              priority
              style={{ objectFit: 'contain' }}
            />
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          {NAVIGATION_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${
                router.pathname === item.href ? styles.active : ''
              }`}
            >
              <i className={`bi ${item.icon} ${styles.navIcon}`}></i>
              {item.label}
            </Link>
          ))}

          <button
            onClick={handleSignOut}
            className={`${styles.navItem} ${styles.signOutBtn}`}
            style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
          >
            <i className={`bi bi-box-arrow-right ${styles.navIcon}`}></i>
            Sign Out
          </button>
        </nav>
      </aside>

      {/* Mobile Toggle */}
      <button
        className={`${styles.sidebarToggle} d-md-none`}
        onClick={toggleSidebar}
        aria-label="Toggle Sidebar"
      >
        <i className={`bi ${isSidebarOpen ? 'bi-x' : 'bi-list'}`}></i>
      </button>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {children}
      </main>

      <style jsx>{`
        :global(body) {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
} 