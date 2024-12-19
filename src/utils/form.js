import { VALIDATION_RULES } from '@/constants/auth'

export const validateEmail = (email) => {
  if (!email) return false
  return VALIDATION_RULES.EMAIL_REGEX.test(email)
}

export const validatePassword = (password) => {
  return password && password.length >= VALIDATION_RULES.PASSWORD_MIN_LENGTH
}

export const getInputClassNames = (baseClasses, isInvalid) => {
  return `${baseClasses} ${isInvalid ? 'is-invalid' : ''}`.trim()
} 