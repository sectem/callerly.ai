'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { validateEmail, validatePassword } from '@/utils/form'
import { ERROR_MESSAGES } from '@/constants/auth'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const REQUIRED_FIELDS = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'acceptTerms']

function SignUpFormContent() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    phoneNumber: '',
    role: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPromotional: false
  })
  const [touched, setTouched] = useState({})
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError(null)
  }, [])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
  }, [])

  const getFieldError = useCallback((fieldName) => {
    if (!touched[fieldName]) return ''
    
    switch (fieldName) {
      case 'firstName':
      case 'lastName':
        return !formData[fieldName] ? ERROR_MESSAGES.REQUIRED_FIELD : ''
      case 'email':
        return !formData.email 
          ? ERROR_MESSAGES.REQUIRED_FIELD
          : !validateEmail(formData.email)
          ? ERROR_MESSAGES.INVALID_EMAIL
          : ''
      case 'password':
        return !formData.password 
          ? ERROR_MESSAGES.REQUIRED_FIELD
          : !validatePassword(formData.password)
          ? ERROR_MESSAGES.PASSWORD_LENGTH
          : ''
      case 'confirmPassword':
        return !formData.confirmPassword 
          ? ERROR_MESSAGES.REQUIRED_FIELD
          : formData.password !== formData.confirmPassword
          ? ERROR_MESSAGES.PASSWORDS_DONT_MATCH
          : ''
      case 'acceptTerms':
        return !formData.acceptTerms ? ERROR_MESSAGES.TERMS_REQUIRED : ''
      default:
        return ''
    }
  }, [touched, formData])

  const validateForm = useCallback(() => {
    const newTouched = REQUIRED_FIELDS.reduce((acc, field) => ({ ...acc, [field]: true }), {})
    setTouched(newTouched)
    return !REQUIRED_FIELDS.some(field => getFieldError(field))
  }, [getFieldError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setError(null)
      setLoading(true)

      // Create user account without email verification
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            company_name: formData.companyName,
            phone_number: formData.phoneNumber,
            role: formData.role
          }
        }
      })

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError(ERROR_MESSAGES.EMAIL_EXISTS)
          return
        }
        throw signUpError
      }

      if (authData?.user) {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession()

        // Only sign in if not already signed in
        if (!session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          })

          if (signInError) {
            console.error('Sign in error:', signInError)
            // Continue anyway since the account was created
          }
        }

        // Redirect to dashboard
        router.push('/dashboard')
      }

    } catch (error) {
      console.error('Signup error:', error)
      setError(error.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const getInputClassName = useCallback((fieldName) => {
    const baseClasses = 'form-control rounded-3'
    const errorClass = touched[fieldName] && getFieldError(fieldName) ? 'is-invalid' : ''
    return `${baseClasses} ${errorClass}`.trim()
  }, [touched, getFieldError])

  const renderFormField = useCallback(({ name, label, type = 'text', ...props }) => (
    <div className="form-floating">
      <input
        type={type}
        className={getInputClassName(name)}
        id={name}
        name={name}
        placeholder={label}
        value={formData[name]}
        onChange={handleChange}
        onBlur={handleBlur}
        required
        {...props}
      />
      <label htmlFor={name}>{label}</label>
      {touched[name] && getFieldError(name) && (
        <div className="invalid-feedback">
          {getFieldError(name)}
        </div>
      )}
    </div>
  ), [formData, getInputClassName, handleChange, handleBlur, getFieldError, touched])

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
            
            <h2 className="text-center mb-4 fs-4">Sign up</h2>
            
            {error && (
              <div className="alert alert-danger py-2 small mb-4" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex-grow-1">
              <div className="row g-3">
                <div className="col-6">
                  {renderFormField({
                    name: 'firstName',
                    label: 'First name'
                  })}
                </div>
                <div className="col-6">
                  {renderFormField({
                    name: 'lastName',
                    label: 'Last name'
                  })}
                </div>
              </div>

              <div className="mt-3">
                {renderFormField({
                  name: 'companyName',
                  label: 'Company Name'
                })}
              </div>

              <div className="row g-3 mt-3">
                <div className="col-6">
                  {renderFormField({
                    name: 'phoneNumber',
                    label: 'Phone Number',
                    type: 'tel'
                  })}
                </div>
                <div className="col-6">
                  {renderFormField({
                    name: 'role',
                    label: 'Role'
                  })}
                </div>
              </div>

              <div className="mt-3">
                {renderFormField({
                  name: 'email',
                  label: 'Email',
                  type: 'email'
                })}
              </div>

              <div className="row g-3 mt-3">
                <div className="col-6">
                  {renderFormField({
                    name: 'password',
                    label: 'Create password',
                    type: 'password'
                  })}
                </div>
                <div className="col-6">
                  {renderFormField({
                    name: 'confirmPassword',
                    label: 'Confirm password',
                    type: 'password'
                  })}
                </div>
              </div>

              <div className="mt-4">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className={`form-check-input ${touched.acceptTerms && !formData.acceptTerms ? 'is-invalid' : ''}`}
                    id="acceptTerms"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <label className="form-check-label small" htmlFor="acceptTerms">
                    I agree to the <Link href="/terms" className="text-decoration-none">Terms of Service</Link> and <Link href="/privacy" className="text-decoration-none">Privacy Policy</Link>
                  </label>
                  {touched.acceptTerms && !formData.acceptTerms && (
                    <div className="invalid-feedback">
                      {ERROR_MESSAGES.TERMS_REQUIRED}
                    </div>
                  )}
                </div>

                <div className="form-check mt-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="acceptPromotional"
                    name="acceptPromotional"
                    checked={formData.acceptPromotional}
                    onChange={handleChange}
                  />
                  <label className="form-check-label small" htmlFor="acceptPromotional">
                    I agree to receive promotional emails
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-3 rounded-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>

              <div className="text-center mt-4">
                <small className="text-muted">
                  Already have an account?{' '}
                  <Link href="/login" className="text-decoration-none">
                    Log in
                  </Link>
                </small>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignUpForm() {
  return <SignUpFormContent />
} 