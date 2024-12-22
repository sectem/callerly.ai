'use client'
import { useState } from 'react'
import { Modal } from 'react-bootstrap'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

function AddPaymentMethodForm({ onSuccess, onClose }) {
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
  const supabase = createClientComponentClient()

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
    
    if (!stripe || !elements || !cardComplete) {
      console.log('Form validation failed:', { stripe: !!stripe, elements: !!elements, cardComplete })
      if (!cardComplete) {
        setError('Please complete card details')
      }
      return
    }

    // Validate billing details
    if (!billingDetails.name || !billingDetails.address.line1 || 
        !billingDetails.address.city || !billingDetails.address.state || 
        !billingDetails.address.postal_code) {
      setError('Please fill in all required billing details')
      return
    }

    try {
      setError(null)
      setLoading(true)

      // Get current user
      console.log('Getting current user...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error('Authentication failed')
      }
      if (!user) {
        console.error('No user found')
        throw new Error('Not authenticated')
      }
      console.log('User retrieved:', { id: user.id, email: user.email })

      console.log('Creating Stripe payment method...')
      // Create payment method with billing details
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          name: billingDetails.name,
          email: user.email,
          address: billingDetails.address
        }
      })

      if (stripeError) {
        console.error('Stripe payment method creation error:', stripeError)
        throw new Error(stripeError.message)
      }

      console.log('Payment method created:', paymentMethod.id)

      // Create or update Stripe customer
      console.log('Calling create-customer API...')
      const response = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          payment_method: paymentMethod.id,
          user_id: user.id,
          billing_details: {
            ...billingDetails,
            email: user.email
          }
        })
      })

      console.log('Create customer API response status:', response.status)
      const customerData = await response.json()
      console.log('Create customer API response data:', customerData)

      if (!response.ok) {
        console.error('Customer creation failed:', customerData)
        throw new Error(customerData.error || 'Failed to save payment method')
      }

      console.log('Customer created/updated successfully:', customerData)

      // Save payment method details to database
      const { error: insertError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          stripe_customer_id: customerData.customer_id,
          payment_method_id: paymentMethod.id,
          card_brand: paymentMethod.card.brand,
          card_last4: paymentMethod.card.last4,
          card_exp_month: paymentMethod.card.exp_month,
          card_exp_year: paymentMethod.card.exp_year,
          billing_name: billingDetails.name,
          billing_email: user.email,
          billing_address_line1: billingDetails.address.line1,
          billing_address_line2: billingDetails.address.line2,
          billing_city: billingDetails.address.city,
          billing_state: billingDetails.address.state,
          billing_postal_code: billingDetails.address.postal_code,
          billing_country: billingDetails.address.country,
          is_default: true
        })

      if (insertError) {
        console.error('Failed to save payment method to database:', insertError)
        throw new Error('Failed to save payment method details')
      }

      // Update any existing payment methods to not be default
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('payment_method_id', paymentMethod.id)

      console.log('Payment method saved successfully to database')
      console.log('=== PAYMENT METHOD FORM SUBMISSION COMPLETED SUCCESSFULLY ===')
      
      // Force a page reload to update the UI
      window.location.reload()
      
      onSuccess?.()
      onClose?.()

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
          onClick={onClose}
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

export default function AddPaymentMethodModal({ show, onClose, onSuccess }) {
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Payment Method</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Elements stripe={stripePromise}>
          <AddPaymentMethodForm 
            onSuccess={onSuccess} 
            onClose={onClose} 
          />
        </Elements>
      </Modal.Body>
    </Modal>
  )
}
