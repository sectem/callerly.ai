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
import { useAuth, supabase } from '@/context/auth-context';
import styles from '@/styles/dashboard.module.css';

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'bi-speedometer2'
  },
  {
    label: 'Agents',
    href: '/dashboard/agents',
    icon: 'bi-robot'
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: 'bi-gear'
  },
  {
    label: 'Billing',
    href: '/dashboard/billing',
    icon: 'bi-credit-card'
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
        .eq('id', user.id)
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

  const getInitials = (profile) => {
    if (!profile) return '';
    const firstName = profile.first_name || '';
    const lastName = profile.last_name || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
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
            {userProfile ? (
              <span className={styles.initials}>
                {getInitials(userProfile)}
              </span>
            ) : (
              <i className="bi bi-person"></i>
            )}
          </div>
          <div className={styles.profileInfo}>
            <h3 className={styles.userName}>
              {userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}` : 'User'}
            </h3>
            <p className={styles.userEmail}>
              {user?.email || 'Loading...'}
            </p>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {menuItems.map((item) => (
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
            onClick={()=>handleSignOut()}
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