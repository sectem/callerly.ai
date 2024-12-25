'use client'
import { useState } from 'react'
import { Modal, Form, Button } from 'react-bootstrap'
import { useAuth, supabase } from '@/context/auth-context'
import { loadStripe } from '@stripe/stripe-js'
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: true
}

function AddPaymentMethodForm({ onSuccess, onHide }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  })
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()

  const handleCardChange = (event) => {
    setError(null)
    setCardComplete(event.complete)
  }

  const handleBillingDetailsChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1]
      setBillingDetails(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else {
      setBillingDetails(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log('=== PAYMENT METHOD FORM SUBMISSION STARTED ===')

    try {
      setError(null)
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User authentication required')
      }

      if (!stripe || !elements) {
        throw new Error('Stripe not initialized')
      }

      const card = elements.getElement(CardElement)
      if (!card) {
        throw new Error('Card element not found')
      }

      // Create payment method in Stripe
      console.log('Creating Stripe payment method...')
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card,
        billing_details: billingDetails
      })

      if (stripeError) {
        console.error('Stripe error:', stripeError)
        throw new Error(stripeError.message)
      }

      console.log('Payment method created:', paymentMethod.id)

      // Create customer and save payment method using Edge Function
      console.log('Calling create-customer API...')
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            type: 'create_customer',
            payment_method: paymentMethod.id,
            user_id: user.id,
            billing_details: {
              ...billingDetails,
              card: {
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                exp_month: paymentMethod.card.exp_month,
                exp_year: paymentMethod.card.exp_year
              }
            }
          })
        }
      )

      console.log('Create customer API response status:', response.status)
      const customerData = await response.json()
      console.log('Create customer API response data:', customerData)

      if (!response.ok) {
        console.error('Customer creation failed:', customerData)
        throw new Error(customerData.error || 'Failed to save payment method')
      }

      console.log('Payment method saved successfully to database')
      console.log('=== PAYMENT METHOD FORM SUBMISSION COMPLETED SUCCESSFULLY ===')
      
      // First call the success callback
      onSuccess?.()
      
      // Then close the modal
      onHide?.()
    } catch (error) {
      console.error('=== PAYMENT METHOD FORM SUBMISSION ERROR ===')
      console.error('Error details:', error)
      console.error('Error message:', error.message)
      if (error.stack) console.error('Error stack:', error.stack)
      setError(error.message)
      // Reset card element on error
      elements?.getElement(CardElement)?.clear()
      setCardComplete(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger py-2 small mb-4" role="alert">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="form-label">Billing Details</label>
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Full Name"
          name="name"
          value={billingDetails.name}
          onChange={handleBillingDetailsChange}
          required
        />
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Address Line 1"
          name="address.line1"
          value={billingDetails.address.line1}
          onChange={handleBillingDetailsChange}
          required
        />
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Address Line 2 (Optional)"
          name="address.line2"
          value={billingDetails.address.line2}
          onChange={handleBillingDetailsChange}
        />
        <div className="row">
          <div className="col">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="City"
              name="address.city"
              value={billingDetails.address.city}
              onChange={handleBillingDetailsChange}
              required
            />
          </div>
          <div className="col">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="State"
              name="address.state"
              value={billingDetails.address.state}
              onChange={handleBillingDetailsChange}
              required
            />
          </div>
        </div>
        <div className="row">
          <div className="col">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="ZIP Code"
              name="address.postal_code"
              value={billingDetails.address.postal_code}
              onChange={handleBillingDetailsChange}
              required
            />
          </div>
          <div className="col">
            <select
              className="form-select mb-2"
              name="address.country"
              value={billingDetails.address.country}
              onChange={handleBillingDetailsChange}
              required
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              {/* Add more countries as needed */}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label">Card Details</label>
        <div className={`border rounded p-3 ${cardComplete ? 'border-success' : ''} ${error ? 'border-danger' : ''}`}>
          <CardElement 
            options={CARD_ELEMENT_OPTIONS}
            onChange={handleCardChange}
          />
        </div>
        <small className="text-muted d-block mt-2">
          <i className="bi bi-shield-check me-2"></i>
          Your payment information is securely stored by Stripe
        </small>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button 
          type="button" 
          className="btn btn-light" 
          onClick={onHide}
          disabled={loading}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || !cardComplete}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Saving...
            </>
          ) : (
            'Save Payment Method'
          )}
        </button>
      </div>
    </form>
  )
}

export default function AddPaymentMethodModal({ show, onHide, onSuccess }) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Payment Method</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Elements stripe={stripePromise}>
          <AddPaymentMethodForm onSuccess={onSuccess} onHide={onHide} />
        </Elements>
      </Modal.Body>
    </Modal>
  )
}
