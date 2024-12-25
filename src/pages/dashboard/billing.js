'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth, supabase } from '@/context/auth-context';
import { Card } from 'react-bootstrap';
import ManagePaymentMethodsModal from '@/components/dashboard/billing/manage-payment-methods-modal';

export default function Billing() {
  const router = useRouter();
  const { user, auth } = useAuth();
  const [showManagePayments, setShowManagePayments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentMethodLoading, setPaymentMethodLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadPaymentMethods(user.id);
    } else {
      router.push('/login');
    }
  }, [user, router]);

  const loadPaymentMethods = async (userId) => {
    try {
      setPaymentMethodLoading(true);
      console.log('Loading payment methods for user:', userId);
      
      // Get default payment method from payment_methods table with all details
      const { data: paymentMethod, error: paymentMethodError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (paymentMethodError) {
        if (paymentMethodError.code === 'PGRST116') { // Not found error
          console.log('No payment methods found');
          setPaymentMethod(null);
        } else {
          console.error('Error loading payment methods:', paymentMethodError);
          setError('Failed to load payment method');
        }
      } else if (paymentMethod) {
        console.log('Payment method found:', paymentMethod);
        // Transform the database record into the format expected by the UI
        setPaymentMethod({
          card: {
            brand: paymentMethod.card_brand,
            last4: paymentMethod.card_last4,
            exp_month: paymentMethod.card_exp_month,
            exp_year: paymentMethod.card_exp_year
          },
          billing_details: {
            name: paymentMethod.billing_name,
            email: paymentMethod.billing_email,
            address: {
              line1: paymentMethod.billing_address_line1,
              line2: paymentMethod.billing_address_line2,
              city: paymentMethod.billing_city,
              state: paymentMethod.billing_state,
              postal_code: paymentMethod.billing_postal_code,
              country: paymentMethod.billing_country
            }
          }
        });
      }
    } catch (error) {
      console.error('Error in loadPaymentMethods:', error);
      setError('Failed to load payment method');
    } finally {
      setPaymentMethodLoading(false);
      setLoading(false);
    }
  };

  const handlePaymentMethodAdded = () => {
    if (user) {
      loadPaymentMethods(user.id);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container py-4">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-4">
        <h1 className="h3 mb-4">Payment Methods</h1>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="row g-4">
          {/* Payment Method Card */}
          <div className="col-md-6">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Payment Method</h5>
                  {paymentMethod && (
                    <button 
                      className="btn btn-link p-0" 
                      onClick={() => setShowManagePayments(true)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                  )}
                </div>
                {paymentMethodLoading ? (
                  <div className="text-center p-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : paymentMethod ? (
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <i className={`bi bi-credit-card-2-front fs-3 ${getCardIcon(paymentMethod.card.brand)}`}></i>
                    </div>
                    <div>
                      <div className="fw-bold">
                        {getCardBrandName(paymentMethod.card.brand)} •••• {paymentMethod.card.last4}
                        <span className="ms-2 badge bg-primary">Primary Card</span>
                      </div>
                      <div className="text-muted small">
                        Expires {paymentMethod.card.exp_month}/{paymentMethod.card.exp_year}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <i className="bi bi-credit-card display-4 text-muted mb-3"></i>
                    <p className="text-muted mb-3">No payment method added yet</p>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => setShowManagePayments(true)}
                    >
                      Add Payment Method
                    </button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Billing Information Card */}
          <div className="col-12">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Billing Information</h5>
                </div>
                {paymentMethod ? (
                  <div>
                    <div className="fw-bold">{paymentMethod.billing_details.name}</div>
                    <div className="text-muted">
                      {paymentMethod.billing_details.address.line1}
                      {paymentMethod.billing_details.address.line2 && <>, {paymentMethod.billing_details.address.line2}</>}<br />
                      {paymentMethod.billing_details.address.city}, {paymentMethod.billing_details.address.state} {paymentMethod.billing_details.address.postal_code}<br />
                      {paymentMethod.billing_details.address.country}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">
                    <i className="bi bi-info-circle me-2"></i>
                    No billing information added yet
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>

        <ManagePaymentMethodsModal
          show={showManagePayments}
          onHide={() => setShowManagePayments(false)}
          onPaymentMethodAdded={handlePaymentMethodAdded}
          currentPaymentMethod={paymentMethod}
        />
      </div>
    </DashboardLayout>
  );
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
  };
  return brands[brand.toLowerCase()] || brand;
}

function getCardIcon(brand) {
  const icons = {
    visa: 'text-primary',
    mastercard: 'text-danger',
    amex: 'text-info',
    discover: 'text-warning',
    default: 'text-secondary'
  };
  return icons[brand.toLowerCase()] || icons.default;
} 