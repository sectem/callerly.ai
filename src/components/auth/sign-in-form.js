'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/router'
import Image from 'next/image'
import Link from 'next/link'

export default function SignInForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [touched, setTouched] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signIn, user } = useAuth()
  const router = useRouter()
  const { redirect } = router.query

  // Only redirect if remember me is checked
  useEffect(() => {
    if (user && formData.rememberMe) {
      router.push(redirect || '/dashboard')
    }
  }, [user, router, redirect, formData.rememberMe])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const getFieldError = (fieldName) => {
    if (!touched[fieldName]) return ''
    
    switch (fieldName) {
      case 'email':
        return !formData.email 
          ? 'Email is required'
          : !/\S+@\S+\.\S+/.test(formData.email)
          ? 'Please enter a valid email'
          : ''
      case 'password':
        return !formData.password 
          ? 'Password is required'
          : ''
      default:
        return ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await signIn({
        email: formData.email,
        password: formData.password,
        options: {
          persistSession: true // Always persist the session
        }
      })
      if (error) throw error
      
      // Only redirect if remember me is checked
      if (formData.rememberMe) {
        router.push(redirect || '/dashboard')
      }
    } catch (error) {
      console.error('Error signing in:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getInputClassName = (fieldName) => {
    const baseClasses = 'form-control rounded-3'
    const errorClass = touched[fieldName] && getFieldError(fieldName) ? 'is-invalid' : ''
    return `${baseClasses} ${errorClass}`.trim()
  }

  return (
    <div className="container-fluid vh-100 p-0">
      <div className="row h-100 g-0">
        <div className="col-lg-6 bg-dark d-none d-lg-block">
          <div className="position-relative h-100">
            {/* Background image will go here */}
          </div>
        </div>
        
        <div className="col-lg-6 bg-white h-100">
          <div className="d-flex flex-column h-100 p-4 pt-5">
            <div className="text-center mb-4">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={180}
                height={48}
                priority
                style={{ objectFit: 'contain' }}
              />
            </div>
            
            <h2 className="text-center mb-2 fs-4">Log in</h2>
            <p className="text-center text-muted mb-4">Enter your details to proceed</p>
            
            {error && (
              <div className="alert alert-danger py-2 small mb-4" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-grow-1">
              <div className="form-floating mb-3">
                <input
                  type="email"
                  className={getInputClassName('email')}
                  id="email"
                  name="email"
                  placeholder="Enter your username"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <label htmlFor="email">Enter your username</label>
                {touched.email && getFieldError('email') && (
                  <div className="invalid-feedback">
                    {getFieldError('email')}
                  </div>
                )}
              </div>

              <div className="form-floating mb-3">
                <input
                  type="password"
                  className={getInputClassName('password')}
                  id="password"
                  name="password"
                  placeholder="Enter your new password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                <label htmlFor="password">Enter your new password</label>
                {touched.password && getFieldError('password') && (
                  <div className="invalid-feedback">
                    {getFieldError('password')}
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rememberMe"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <label className="form-check-label small" htmlFor="rememberMe">
                    Remember me
                  </label>
                </div>
                <Link href="/forgot-password" className="small text-decoration-none">
                  Forgot password
                </Link>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 rounded-3"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Submit'}
              </button>

              <div className="text-center mt-4">
                <p className="text-muted small mb-3">or</p>
                <div className="d-flex justify-content-center gap-3">
                  <button type="button" className="btn btn-outline-secondary rounded-3">
                    <i className="bi bi-google"></i>
                  </button>
                  <button type="button" className="btn btn-outline-secondary rounded-3">
                    <i className="bi bi-apple"></i>
                  </button>
                  <button type="button" className="btn btn-outline-secondary rounded-3">
                    <i className="bi bi-windows"></i>
                  </button>
                </div>
              </div>

              <div className="text-center mt-4">
                <p className="text-muted small mb-0">
                  Create a new account? <Link href="/signup" className="text-decoration-none text-primary">Sign up</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 