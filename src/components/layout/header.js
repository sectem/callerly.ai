import { useAuth } from '@/context/auth-context'
import Link from 'next/link'
import Image from 'next/image'
import { MAIN_NAVIGATION } from '@/constants/navigation'

export default function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="py-4 px-6 border-b">
      <nav className="flex justify-between items-center max-w-6xl mx-auto">
        <Link href="/" className="text-xl font-bold">
          <Image
            src="/images/logo.png"
            alt="Logo"
            width={180}
            height={48}
            priority
            style={{ objectFit: 'contain' }}
          />
        </Link>
        <div className="space-x-4">
          {MAIN_NAVIGATION.map((item) => (
            <Link 
              key={item.path} 
              href={item.path} 
              className="hover:text-gray-600"
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
              <button
                onClick={() => signOut()}
                className="hover:text-gray-600"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="hover:text-gray-600">Sign In</Link>
              <Link href="/signup" className="hover:text-gray-600">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
} 