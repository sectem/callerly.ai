'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'
import { AUTH_ROUTES, ERROR_MESSAGES } from '@/constants/auth'
import { getInputClassNames } from '@/utils/form'
import AuthLayout from '@/components/layout/auth-layout'
import Button from '@/components/ui/button'

export default function ResetPasswordForm() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [touched, setTouched] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validLink, setValidLink] = useState(false)
  const router = useRouter()
  const { code } = router.query

  useEffect(() => {
    const validateResetToken = async () => {
      if (!code) {
        setError(ERROR_MESSAGES.INVALID_RESET_LINK)
        return
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: code,
          type: 'recovery'
        })
        
        if (error) throw error
        setValidLink(true)
      } catch (error) {
        console.error('Error validating reset token:', error)
        setValidLink(false)
        setError(ERROR_MESSAGES.INVALID_RESET_LINK)
      }
    }

    validateResetToken()
  }, [code])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const getFieldError = (fieldName) => {
    if (!touched[fieldName]) return ''
    
    switch (fieldName) {
      case 'password':
        return !formData.password 
          ? 'New password is required'
          : formData.password.length < 6
          ? 'Password must be at least 6 characters'
          : ''
      case 'confirmPassword':
        return !formData.confirmPassword 
          ? 'Please confirm your password'
          : formData.password !== formData.confirmPassword
          ? 'Passwords do not match'
          : ''
      default:
        return ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Mark all fields as touched on submit
    const allFields = ['password', 'confirmPassword']
    const newTouched = allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {})
    setTouched(newTouched)

    // Check for any errors
    const hasErrors = allFields.some(field => getFieldError(field))
    if (hasErrors) return

    try {
      setError(null)
      setLoading(true)
      
      // First verify the token again
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: code,
        type: 'recovery'
      })
      
      if (verifyError) throw verifyError

      // Then update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password
      })
      
      if (updateError) throw updateError
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/signin')
      }, 2000)
    } catch (error) {
      console.error('Error resetting password:', error)
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
    <AuthLayout title="Reset Your Password">
      {!validLink ? (
        <div className="text-center">
          <div className="alert alert-danger mb-4">{error}</div>
          <Button
            as={Link}
            href={AUTH_ROUTES.FORGOT_PASSWORD}
            className="btn-primary rounded-3"
            style={{ maxWidth: '250px' }}
          >
            Request New Reset Link
          </Button>
        </div>
      ) : !success ? (
        <>
          {error && (
            <div className="alert alert-danger py-2 small mb-4" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-floating mb-3">
              <input
                type="password"
                className={`${getInputClassName('password')} form-control-lg`}
                id="password"
                name="password"
                placeholder="New Password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <label htmlFor="password">New Password</label>
              {touched.password && getFieldError('password') && (
                <div className="invalid-feedback">
                  {getFieldError('password')}
                </div>
              )}
            </div>

            <div className="form-floating mb-4">
              <input
                type="password"
                className={`${getInputClassName('confirmPassword')} form-control-lg`}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <label htmlFor="confirmPassword">Confirm Password</label>
              {touched.confirmPassword && getFieldError('confirmPassword') && (
                <div className="invalid-feedback">
                  {getFieldError('confirmPassword')}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="btn-primary w-100 py-2 rounded-3"
              style={{ maxWidth: '200px' }}
              loading={loading}
              loadingText="Resetting..."
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <div className="alert alert-success mb-4">
            Your password has been reset successfully. Redirecting to login...
          </div>
        </div>
      )}
    </AuthLayout>
  )
} 