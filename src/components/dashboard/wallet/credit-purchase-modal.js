'use client';

import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useAuth } from '@/context/auth-context';

export default function CreditPurchaseModal({ show, onHide }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState('');
  const { user } = useAuth();

  const handlePurchase = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error('Please sign in to purchase credits');
      }

      if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Process payment using saved payment method
      const response = await fetch('/api/stripe/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutes: parseFloat(amount), // $1 per minute
          price: parseFloat(amount)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Payment successful
      window.location.href = '/dashboard/billing?purchase=success';
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Purchase Credits</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <div className="alert alert-danger mb-4">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <Form.Group className="mb-4">
          <Form.Label>Amount ($)</Form.Label>
          <Form.Control
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount in dollars"
          />
          <Form.Text className="text-muted">
            $1 = 1 minute of credit
          </Form.Text>
        </Form.Group>

        <div className="d-grid">
          <Button 
            variant="primary" 
            onClick={handlePurchase}
            disabled={loading || !amount || isNaN(amount) || parseFloat(amount) <= 0}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Processing...
              </>
            ) : (
              `Pay $${amount || '0'} for ${amount || '0'} minutes`
            )}
          </Button>
        </div>

        <div className="mt-4 text-center text-muted">
          <small>
            <i className="bi bi-shield-check me-2"></i>
            Secure payment using your saved payment method
          </small>
        </div>
      </Modal.Body>
    </Modal>
  );
}
