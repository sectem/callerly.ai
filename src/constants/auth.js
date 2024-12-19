export const AUTH_ROUTES = {
  SIGN_IN: '/signin',
  SIGN_UP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard'
}

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  EMAIL_REGEX: /\S+@\S+\.\S+/
}

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email',
  PASSWORD_LENGTH: 'Password must be at least 6 characters',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  INVALID_RESET_LINK: 'Invalid or expired password reset link. Please request a new one.',
  TERMS_REQUIRED: 'You must accept the Terms and Conditions to continue',
  EMAIL_EXISTS: 'An account with this email already exists. Please sign in instead.',
} 