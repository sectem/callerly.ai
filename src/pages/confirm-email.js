import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-context';
import Image from 'next/image';
import Link from 'next/link';

export default function ConfirmEmail() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const checkEmailVerification = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has confirmed their email
        if (user.email_confirmed_at) {
          // Check for subscription
          const response = await fetch('/api/stripe/check-subscription', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json();
          
          if (response.ok && data.hasSubscription) {
            router.push('/dashboard');
          } else {
            router.push('/plans');
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking verification:', error);
        setError('Error checking email verification status');
        setLoading(false);
      }
    };

    checkEmailVerification();
  }, [user, router]);

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend verification email');
      }

      alert('Verification email has been resent. Please check your inbox.');
    } catch (error) {
      console.error('Error resending email:', error);
      setError('Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-light bg-white shadow-sm">
        <div className="container">
          <Link href="/" className="navbar-brand">
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
      </nav>

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm">
              <div className="card-body text-center p-5">
                <div className="mb-4">
                  <i className="bi bi-envelope-check display-1 text-primary"></i>
                </div>
                
                <h1 className="h3 mb-3">Verify Your Email</h1>
                <p className="text-muted mb-4">
                  We've sent a verification email to <strong>{user?.email}</strong>. 
                  Please check your inbox and click the verification link to continue.
                </p>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <div className="d-grid gap-3">
                  <button
                    className="btn btn-primary"
                    onClick={handleResendEmail}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Resend Verification Email'}
                  </button>

                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-muted small mb-0">
                    Need help? <a href="mailto:support@xpertixeai.com" className="text-decoration-none">Contact Support</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 