'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { validateEmail, validatePassword } from '@/utils/form'
import { ERROR_MESSAGES } from '@/constants/auth'
import { supabase } from '@/context/auth-context'

const REQUIRED_FIELDS = ['first_name', 'last_name', 'email', 'password', 'confirmPassword', 'acceptTerms']

function SignUpFormContent() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    phone: '',
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
      case 'first_name':
      case 'last_name':
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
    setLoading(true)
    setError(null)

    try {
      // Validate form
      const errors = Object.keys(formData).map(getFieldError).filter(Boolean)
      if (errors.length > 0) {
        setError(errors[0])
        setLoading(false)
        return
      }

      // Create user
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            company: formData.company,
            phone: formData.phone,
            role: formData.role,
            accept_promotional: formData.acceptPromotional
          }
        }
      })

      if (signUpError) throw signUpError

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error signing up:', error)
      setError(error.message)
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
    <div className="row g-0 min-vh-100">
      <div className="col-lg-6 bg-primary d-none d-lg-flex">
        <div className="p-4 p-lg-5">
          <h1 className="display-4 text-white mb-4">
            Welcome to XpertixeAI
          </h1>
          <p className="lead text-white-50 mb-4">
            Get started with AI-powered call handling and appointment management
          </p>
          <div className="mt-5">
            <div className="d-flex align-items-center mb-4">
              <div className="text-white-50 me-3">
                <i className="bi bi-check-circle-fill fs-4"></i>
              </div>
              <div className="text-white">
                Smart AI agents that handle your calls
              </div>
            </div>
            <div className="d-flex align-items-center mb-4">
              <div className="text-white-50 me-3">
                <i className="bi bi-check-circle-fill fs-4"></i>
              </div>
              <div className="text-white">
                Automated appointment scheduling
              </div>
            </div>
            <div className="d-flex align-items-center">
              <div className="text-white-50 me-3">
                <i className="bi bi-check-circle-fill fs-4"></i>
              </div>
              <div className="text-white">
                24/7 availability for your customers
              </div>
            </div>
          </div>
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
                  name: 'first_name',
                  label: 'First name'
                })}
              </div>
              <div className="col-6">
                {renderFormField({
                  name: 'last_name',
                  label: 'Last name'
                })}
              </div>
            </div>

            <div className="mt-3">
              {renderFormField({
                name: 'company',
                label: 'Company Name'
              })}
            </div>

            <div className="row g-3 mt-3">
              <div className="col-6">
                {renderFormField({
                  name: 'phone',
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
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <label className="form-check-label small" htmlFor="acceptTerms">
                  I agree to the <Link href="/terms" className="text-decoration-none">Terms of Service</Link> and <Link href="/privacy" className="text-decoration-none">Privacy Policy</Link>
                </label>
                {getFieldError('acceptTerms') && (
                  <div className="invalid-feedback d-block small">
                    {getFieldError('acceptTerms')}
                  </div>
                )}
              </div>

              <div className="form-check mb-4">
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

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

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
  );
}

export default function SignUpForm() {
  return <SignUpFormContent />
} 