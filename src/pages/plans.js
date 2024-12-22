'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/auth-context';

export default function PlansPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleGetPlan = async () => {
    try {
      setLoading(true);

      // Process payment with saved payment method
      const response = await fetch('/api/stripe/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: 100, // $100 worth of credits
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process payment');
      }

      const data = await response.json();
      if (data.success) {
        router.push('/dashboard/billing?purchase=success');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <h2>Please sign in to purchase a plan</h2>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body text-center p-5">
              <h1 className="display-4 mb-4">Basic Plan</h1>
              <p className="lead text-muted mb-4">
                Get started with our pay-as-you-go plan
              </p>
              <div className="mb-4">
                <h2 className="display-3 mb-0">$1</h2>
                <p className="text-muted">per minute</p>
              </div>
              <ul className="list-unstyled mb-4">
                <li className="mb-3">
                  <i className="bi bi-check2-circle text-success me-2"></i>
                  Pay only for what you use
                </li>
                <li className="mb-3">
                  <i className="bi bi-check2-circle text-success me-2"></i>
                  No monthly fees
                </li>
                <li className="mb-3">
                  <i className="bi bi-check2-circle text-success me-2"></i>
                  Cancel anytime
                </li>
                <li className="mb-3">
                  <i className="bi bi-check2-circle text-success me-2"></i>
                  24/7 support
                </li>
              </ul>
              <button
                className="btn btn-primary btn-lg w-100"
                onClick={handleGetPlan}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  'Get Plan'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 