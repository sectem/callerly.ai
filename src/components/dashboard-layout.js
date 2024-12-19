import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import styles from '@/styles/dashboard.module.css';

const NAVIGATION_ITEMS = [
  { href: '/dashboard', icon: 'bi-grid', label: 'Dashboard' },
  { href: '/dashboard/billing', icon: 'bi-credit-card', label: 'Billing' },
  { href: '/dashboard/settings', icon: 'bi-gear', label: 'Settings' }
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
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.navItem}>
            <i className="bi bi-box"></i>
            <span>XpertixeAI</span>
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          {NAVIGATION_ITEMS.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${
                router.pathname === href ? styles.active : ''
              }`}
            >
              <i className={`bi ${icon} ${styles.navIcon}`}></i>
              <span>{label}</span>
            </Link>
          ))}

          <button
            onClick={handleSignOut}
            className={`${styles.navItem} ${styles.signOutBtn}`}
          >
            <i className={`bi bi-box-arrow-right ${styles.navIcon}`}></i>
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      {/* Mobile Toggle Button */}
      <button
        className={`${styles.sidebarToggle} d-md-none`}
        onClick={toggleSidebar}
        aria-label="Toggle Sidebar"
      >
        <i className={`bi ${isSidebarOpen ? 'bi-x' : 'bi-list'}`}></i>
      </button>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
} 