'use client'
import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/router'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleChange = (e) => {
    setEmail(e.target.value)
  }

  const handleBlur = () => {
    setTouched(true)
  }

  const getFieldError = () => {
    if (!touched) return ''
    return !email 
      ? 'Email is required'
      : !/\S+@\S+\.\S+/.test(email)
      ? 'Please enter a valid email'
      : ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    
    const error = getFieldError()
    if (error) return

    try {
      setError(null)
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getInputClassName = () => {
    const baseClasses = 'form-control rounded-3'
    const errorClass = touched && getFieldError() ? 'is-invalid' : ''
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
            
            <div className="flex-grow-1 d-flex flex-column justify-content-center">
              <div className="mx-auto" style={{ maxWidth: '420px' }}>
                <h2 className="text-center mb-4 fs-4">Forgot Your Password</h2>
                
                {!success ? (
                  <>
                    {error && (
                      <div className="alert alert-danger py-2 small mb-4" role="alert">
                        {error}
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      <div 
                        className="form-floating mb-4"
                        style={{ 
                          width: '400px',
                          maxWidth: '100%',
                          margin: '0 auto'
                        }}
                      >
                        <input
                          type="email"
                          className={`${getInputClassName()} form-control-lg`}
                          id="email"
                          name="email"
                          placeholder="Email"
                          value={email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          required
                        />
                        <label 
                          htmlFor="email"
                          className="form-label"
                        >
                          Enter your email address
                        </label>
                        {touched && getFieldError() && (
                          <div className="invalid-feedback">
                            {getFieldError()}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary w-100 py-2 rounded-3"
                        style={{ 
                          maxWidth: '200px', 
                          margin: '0 auto', 
                          display: 'block' 
                        }}
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : 'Forgot Password'}
                      </button>

                      <div className="d-flex justify-content-center gap-4 mt-4">
                        <Link 
                          href="/signin" 
                          className="text-decoration-none text-primary fw-semibold"
                        >
                          Sign in
                        </Link>
                        <Link 
                          href="/signup" 
                          className="text-decoration-none text-primary fw-semibold"
                        >
                          Sign up
                        </Link>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="alert alert-success mb-4">
                      Password reset instructions have been sent to your email.
                    </div>
                    <Link 
                      href="/signin" 
                      className="btn btn-outline-primary rounded-3"
                      style={{ maxWidth: '200px', margin: '0 auto', display: 'block' }}
                    >
                      Return to Sign In
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 