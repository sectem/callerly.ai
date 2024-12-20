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
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { createClient } from '@supabase/supabase-js';
import styles from '@/styles/dashboard.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const NAVIGATION_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'bi-grid'
  },
  {
    label: 'AI Agents',
    href: '/dashboard/agents',
    icon: 'bi-robot'
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
  const [userProfile, setUserProfile] = useState(null);
  const router = useRouter();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

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

  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logoLink}>
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={180}
              height={40}
              priority
              style={{ objectFit: 'contain' }}
            />
          </Link>
        </div>

        <div className={styles.userProfile}>
          <div className={styles.profileImage}>
            {userProfile?.full_name ? (
              <span className={styles.initials}>
                {getInitials(userProfile.full_name)}
              </span>
            ) : (
              <i className="bi bi-person"></i>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h3 className={styles.userName}>
              {userProfile?.full_name || 'User'}
            </h3>
            <p className={styles.userEmail}>
              {user?.email || 'Loading...'}
            </p>
          </div>
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
            style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', marginTop: 'auto' }}
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
    </div>
  );
} 