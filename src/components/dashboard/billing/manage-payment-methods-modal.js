'use client'
import { useState, useEffect } from 'react'
import { Modal, Dropdown } from 'react-bootstrap'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (show) {
      loadPaymentMethods()
    }
  }, [show])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load all payment methods
      const { data: methods, error: dbError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })

      if (dbError) throw dbError

      // Load Stripe details for each payment method
      const methodsWithDetails = await Promise.all(methods.map(async (method) => {
        try {
          const response = await fetch('/api/stripe/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payment_method: method.payment_method_id,
              type: 'get_payment_method',
              user_id: user.id
            })
          })
          const { paymentMethod } = await response.json()
          return {
            ...method,
            stripeDetails: paymentMethod
          }
        } catch (error) {
          console.error('Error loading payment method details:', error)
          return method
        }
      }))

      setPaymentMethods(methodsWithDetails)
    } catch (error) {
      console.error('Error loading payment methods:', error)
      setError('Failed to load payment methods')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (methodId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update all payment methods to not default
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // Set the selected method as default
      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodId)

      await loadPaymentMethods()
      onPaymentMethodAdded?.()
    } catch (error) {
      console.error('Error setting default payment method:', error)
      setError('Failed to set default payment method')
    }
  }

  const handleDelete = async (methodId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId)

      await loadPaymentMethods()
      onPaymentMethodAdded?.()
    } catch (error) {
      console.error('Error deleting payment method:', error)
      setError('Failed to delete payment method')
    }
  }

  const handleAddCardSuccess = async () => {
    setShowAddCard(false)
    await loadPaymentMethods()
    onPaymentMethodAdded?.()
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
            <div className="payment-methods-list">
              {paymentMethods.map((method) => (
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
              ))}

              <button 
                className="btn btn-outline-primary w-100 mt-3"
                onClick={() => setShowAddCard(true)}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add New Card
              </button>
            </div>
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
