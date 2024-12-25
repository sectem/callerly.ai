'use client'
import { useState, useEffect } from 'react'
import { Modal, Dropdown } from 'react-bootstrap'
import { useAuth, supabase } from '@/context/auth-context'
import AddPaymentMethodModal from './add-payment-method-modal'

// Add global styles to remove dropdown arrows
const globalStyles = `
  .btn-no-caret.dropdown-toggle::after {
    display: none !important;
  }
`

export default function ManagePaymentMethodsModal({ show, onHide, onPaymentMethodAdded }) {
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddCard, setShowAddCard] = useState(false)

  useEffect(() => {
    if (show) {
      loadPaymentMethods()
    }
  }, [show])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User authentication required')
        return
      }

      // First get all payment methods from database
      const { data: methods, error: fetchError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })

      if (fetchError) {
        console.error('Error fetching payment methods:', fetchError)
        throw new Error('Failed to load payment methods')
      }

      // Then get details from Stripe for each payment method
      const methodsWithDetails = await Promise.all(
        methods.map(async (method) => {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  type: 'get_payment_method',
                  payment_method: method.payment_method_id
                })
              }
            )

            if (!response.ok) {
              throw new Error('Failed to get payment method details')
            }

            const { paymentMethod } = await response.json()
            return { ...method, stripeDetails: paymentMethod }
          } catch (error) {
            console.error('Error getting payment method details:', error)
            // Return the method without Stripe details if there's an error
            return method
          }
        })
      )

      setPaymentMethods(methodsWithDetails)
    } catch (error) {
      console.error('Error loading payment methods:', error)
      setError(error.message || 'Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (methodId) => {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User authentication required')
        return
      }

      // Get the payment method details
      const { data: method, error: fetchError } = await supabase
        .from('payment_methods')
        .select('payment_method_id')
        .eq('id', methodId)
        .single()

      if (fetchError) {
        console.error('Error fetching payment method:', fetchError)
        throw new Error('Failed to find payment method')
      }

      // First update in Stripe using Edge Function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            type: 'set_default_payment_method',
            payment_method: method.payment_method_id,
            user_id: user.id
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to set default payment method')
      }

      // Reload payment methods to get updated state
      await loadPaymentMethods()
      onPaymentMethodAdded?.()
    } catch (error) {
      console.error('Error setting default payment method:', error)
      setError(error.message || 'Failed to set default payment method')
    }
  }

  const handleDelete = async (methodId) => {
    try {
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User authentication required')
        return
      }

      // Check if this is the default payment method
      const { data: method, error: fetchError } = await supabase
        .from('payment_methods')
        .select('payment_method_id, is_default')
        .eq('id', methodId)
        .single()

      if (fetchError) {
        console.error('Error fetching payment method:', fetchError)
        throw new Error('Failed to find payment method')
      }

      if (method.is_default) {
        throw new Error('Cannot delete the default payment method. Please set another card as default first.')
      }

      // First delete from Stripe using Edge Function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            type: 'delete_payment_method',
            payment_method: method.payment_method_id,
            user_id: user.id
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete payment method')
      }

      // Reload payment methods to get updated state
      await loadPaymentMethods()
      onPaymentMethodAdded?.()
    } catch (error) {
      console.error('Error deleting payment method:', error)
      setError(error.message || 'Failed to delete payment method')
    }
  }

  const handleAddCardSuccess = async () => {
    try {
      setError(null)
      await loadPaymentMethods()
      setShowAddCard(false)
      onPaymentMethodAdded?.()
    } catch (error) {
      console.error('Error refreshing payment methods:', error)
      setError('Failed to refresh payment methods')
    }
  }

  return (
    <>
      <style>{globalStyles}</style>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Manage Payment Methods</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="payment-methods-list">
                {paymentMethods.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted mb-0">No payment methods added yet</p>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <div key={method.id} className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <i className={`bi bi-credit-card-2-front fs-3 ${getCardIcon(method.stripeDetails?.card.brand)}`}></i>
                            </div>
                            <div>
                              <div className="fw-bold">
                                {getCardBrandName(method.stripeDetails?.card.brand)} •••• {method.stripeDetails?.card.last4}
                                {method.is_default && (
                                  <span className="ms-2 badge bg-primary">Primary Card</span>
                                )}
                              </div>
                              <div className="text-muted small">
                                Expires {method.stripeDetails?.card.exp_month}/{method.stripeDetails?.card.exp_year}
                              </div>
                            </div>
                          </div>
                          {!method.is_default && (
                            <Dropdown align="end">
                              <Dropdown.Toggle 
                                variant="link" 
                                className="p-0 text-dark d-flex align-items-center btn-no-caret" 
                                style={{ 
                                  boxShadow: 'none',
                                  border: 'none',
                                  background: 'none'
                                }}
                              >
                                <i className="bi bi-three-dots-vertical"></i>
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item onClick={() => handleSetDefault(method.id)}>
                                  <i className="bi bi-check-circle me-2"></i>
                                  Set as Primary
                                </Dropdown.Item>
                                <Dropdown.Item 
                                  onClick={() => handleDelete(method.id)}
                                  className="text-danger"
                                >
                                  <i className="bi bi-trash me-2"></i>
                                  Delete Card
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="d-grid gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowAddCard(true)}
                  disabled={loading}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Add New Card
                </button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>

      <AddPaymentMethodModal
        show={showAddCard}
        onHide={() => setShowAddCard(false)}
        onSuccess={handleAddCardSuccess}
      />
    </>
  )
}

function getCardBrandName(brand) {
  const brands = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    jcb: 'JCB',
    diners: 'Diners Club',
    unionpay: 'UnionPay'
  }
  return brands[brand?.toLowerCase()] || brand
}

function getCardIcon(brand) {
  const icons = {
    visa: 'text-primary',
    mastercard: 'text-danger',
    amex: 'text-info',
    discover: 'text-warning',
    default: 'text-secondary'
  }
  return icons[brand?.toLowerCase()] || icons.default
}
