'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, Table, Nav } from 'react-bootstrap';
import WalletDisplay from '@/components/dashboard/wallet/wallet-display';
import CreditPurchaseModal from '@/components/dashboard/wallet/credit-purchase-modal';
import ManagePaymentMethodsModal from '@/components/dashboard/billing/manage-payment-methods-modal';

export default function BillingPage() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showManagePayments, setShowManagePayments] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentMethodLoading, setPaymentMethodLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('charges');
  const [charges, setCharges] = useState([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        window.location.href = '/login';
        return;
      }
      setUser(user);
      await loadPaymentMethods(user.id);
      await loadCharges(user.id);
      setLoading(false);
    } catch (error) {
      console.error('Auth error:', error);
      setError('Authentication failed');
      setLoading(false);
    }
  };

  const loadPaymentMethods = async (userId) => {
    try {
      setPaymentMethodLoading(true);
      console.log('Loading payment methods for user:', userId);
      
      const { data: paymentMethods, error: paymentMethodError } = await supabase
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
      } else if (paymentMethods) {
        console.log('Payment method found:', paymentMethods);
        await loadPaymentMethodDetails(paymentMethods.payment_method_id, userId);
      }
    } catch (error) {
      console.error('Error in loadPaymentMethods:', error);
      setError('Failed to load payment method');
    } finally {
      setPaymentMethodLoading(false);
    }
  };

  const loadPaymentMethodDetails = async (paymentMethodId, userId) => {
    try {
      console.log('Loading payment method details:', paymentMethodId);
      const response = await fetch('/api/stripe/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethodId,
          type: 'get_payment_method',
          user_id: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to load payment method details');
      }

      const data = await response.json();
      console.log('Payment method details loaded:', data.paymentMethod);
      setPaymentMethod(data.paymentMethod);
    } catch (error) {
      console.error('Error loading payment method details:', error);
      setError('Failed to load payment method details');
      setPaymentMethod(null);
    }
  };

  const loadCharges = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading charges:', error);
      } else {
        setCharges(data || []);
      }
    } catch (error) {
      console.error('Error loading charges:', error);
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

          {/* Current Balance Card */}
          <div className="col-md-6">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Current Balance</h5>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowPurchaseModal(true)}
                    disabled={!paymentMethod}
                  >
                    Buy Credits
                  </button>
                </div>
                <WalletDisplay />
              </Card.Body>
            </Card>
          </div>

          {/* Billing Information Card */}
          <div className="col-12">
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Billing Information</h5>
                  <button 
                    className="btn btn-link p-0"
                    onClick={() => setShowManagePayments(true)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
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

          {/* Payments History Card */}
          <div className="col-12">
            <Card>
              <Card.Body>
                <h5 className="card-title mb-3">Payments History</h5>
                <p className="text-muted small mb-3">Keep track of your payments</p>
                
                <Nav variant="tabs" className="mb-3">
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'charges'} 
                      onClick={() => setActiveTab('charges')}
                    >
                      Charges
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={activeTab === 'invoices'} 
                      onClick={() => setActiveTab('invoices')}
                    >
                      Invoices
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Card Details</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {charges.map((charge) => (
                        <tr key={charge.id}>
                          <td className="text-nowrap">
                            {new Date(charge.created_at).toLocaleDateString()}
                            <br />
                            <small className="text-muted">
                              {new Date(charge.created_at).toLocaleTimeString()}
                            </small>
                          </td>
                          <td>{charge.description}</td>
                          <td>${Math.abs(charge.amount).toFixed(2)}</td>
                          <td>
                            <span className="badge bg-success">Succeeded</span>
                          </td>
                          <td className="text-nowrap">
                            {paymentMethod && 
                              `${getCardBrandName(paymentMethod.card.brand)} ending ${paymentMethod.card.last4}`
                            }
                          </td>
                          <td>
                            <button className="btn btn-link btn-sm">
                              <i className="bi bi-box-arrow-up-right"></i>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {charges.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            No charges found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Modals */}
        <CreditPurchaseModal
          show={showPurchaseModal}
          onHide={() => setShowPurchaseModal(false)}
        />

        <ManagePaymentMethodsModal
          show={showManagePayments}
          onClose={() => setShowManagePayments(false)}
          onSuccess={handlePaymentMethodAdded}
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