'use client';

import { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

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
};

function PaymentForm({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment method
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Save payment method
      const response = await fetch('/api/stripe/save-payment-method', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save payment method');
      }

      onComplete();
    } catch (err) {
      console.error('Payment setup error:', err);
      setError(err.message || 'Failed to set up payment method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="mb-4">
        <h4 className="mb-3">Payment Details</h4>
        <div className="border rounded p-3 bg-light">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="d-grid">
        <Button 
          type="submit" 
          disabled={!stripe || loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Setting up payment...
            </>
          ) : (
            'Save Payment Method'
          )}
        </Button>
      </div>

      <div className="mt-4 text-center text-muted">
        <small>
          <i className="bi bi-shield-check me-2"></i>
          Your payment information is securely stored by Stripe
        </small>
      </div>
    </Form>
  );
}

export default function PaymentSetup({ onComplete }) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm onComplete={onComplete} />
    </Elements>
  );
}
