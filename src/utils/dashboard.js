/**
 * Dashboard Utility Functions
 * 
 * Common helper functions used across dashboard components.
 */

/**
 * Formats a number as a currency string
 * @param {number} value - The value to format
 * @param {string} [currency='USD'] - The currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value)
}

/**
 * Formats a date string
 * @param {string|Date} date - The date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options
  }).format(new Date(date))
}

/**
 * Calculates the percentage change between two numbers
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change
 */
export const calculateChange = (current, previous) => {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
} 