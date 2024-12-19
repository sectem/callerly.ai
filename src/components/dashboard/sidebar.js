/**
 * Sidebar Component
 * 
 * Main navigation component for the dashboard that includes links to all
 * major sections and a logout button. This component handles navigation
 * and user session management.
 * 
 * @component
 */
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/auth-context'
import { DASHBOARD_MENU_ITEMS } from '@/constants/navigation'

export default function Sidebar() {
  const router = useRouter()
  const { signOut } = useAuth()

  /**
   * Handles user logout
   * Clears the user session and redirects to signin page
   */
  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/signin')
    } catch (error) {
      console.error('Error signing out:', error)
      // TODO: Add proper error handling/notification
    }
  }

  return (
    <div className="h-100 d-flex flex-column bg-dark text-white">
      {/* Logo/Brand Header */}
      <div className="p-3 border-bottom border-secondary">
        <Link href="/dashboard" className="text-decoration-none">
          <h5 className="text-white m-0 d-flex align-items-center">
            <img 
              src="/images/logo.png" 
              alt="Logo" 
              className="me-2" 
              style={{ height: '30px', width: 'auto' }} 
            />
            Xpertixe AI
          </h5>
        </Link>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-grow-1 p-3">
        <ul className="nav flex-column gap-2">
          {DASHBOARD_MENU_ITEMS.map((item) => (
            <li key={item.path} className="nav-item">
              <Link 
                href={item.path}
                className={`nav-link d-flex align-items-center py-2 px-3 ${
                  router.pathname === item.path 
                    ? 'active bg-primary text-white' 
                    : 'text-white-50'
                }`}
              >
                <i className={`bi ${item.icon} me-3 fs-5`}></i>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Section */}
      <div className="p-3 border-top border-secondary mt-auto">
        <button 
          onClick={handleLogout}
          className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <i className="bi bi-box-arrow-right"></i>
          Logout
        </button>
      </div>
    </div>
  )
} 