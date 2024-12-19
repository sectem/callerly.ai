'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/dashboard/layout';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/auth-context';
import styles from '@/styles/dashboard.module.css';

// Move plan features to a separate constants file for better organization
const PLAN_DETAILS = {
  'Basic Plan': {
    id: process.env.NEXT_PUBLIC_STRIPE_BASIC_PLAN_ID,
    features: [
      'AI-powered inbound call handling with pre-set scripts',
      '100 minutes of calling/month',
      'Appointment booking with Google Calendar integration',
      'Basic reporting: View call logs and appointment details',
      'CRM integrations: Follow Up Boss, KV Core, GoHighLevel (GHL)',
      'SMS/email notifications for confirmed appointments',
      'No outbound call support',
      '1 user seat'
    ]
  },
  'Premium Plan': {
    id: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_ID,
    features: [
      'All features in the Basic Plan',
      'AI-powered inbound call handling with customizable scripts',
      'Outbound call scheduling for up to 350 minutes of calling/month',
      'Advanced reporting: Call trends, appointment success rates, and missed calls',
      'CRM integrations: Follow Up Boss, KV Core, GoHighLevel (GHL)',
      'Retry logic for missed call automation',
      'Task automation for reminders and follow-ups',
      'SMS/email notifications with retry logic',
      '5 user seats'
    ]
  },
  'Enterprise Plan': {
    id: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PLAN_ID,
    features: [
      'All features in the Premium Plan',
      'AI-powered inbound call handling with fully customizable scripts',
      'Custom call minute limits based on business needs',
      'Outbound call scheduling with priority queuing',
      'CRM integrations: Follow Up Boss, KV Core, GHL, and custom API support',
      'Workflow automation and retry logic for calls and notifications',
      'AI-powered advanced analytics and reporting for deeper insights',
      'Task automation for complex workflows',
      'Dedicated account manager and priority support',
      'Unlimited user seats'
    ]
  }
};

const STATUS_BADGES = {
  active: `${styles.badge} ${styles.badgeSuccess}`,
  trialing: `${styles.badge} ${styles.badgeInfo}`,
  past_due: `${styles.badge} ${styles.badgeWarning}`,
  canceled: `${styles.badge} ${styles.badgeDanger}`,
  default: `${styles.badge} ${styles.badgeSecondary}`
};

const HELP_LINKS = [
  {
    icon: 'bi-question-circle',
    text: 'Billing FAQ',
    href: '#'
  },
  {
    icon: 'bi-envelope',
    text: 'Contact Support',
    href: 'mailto:support@xpertixeai.com'
  },
  {
    icon: 'bi-file-text',
    text: 'View Documentation',
    href: '#'
  }
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  const getPlanNameFromPriceId = useCallback((priceId) => {
    return Object.entries(PLAN_DETAILS).find(
      ([_, details]) => details.id === priceId
    )?.[0] || 'No Plan';
  }, []);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch profile using user_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, stripe_price_id, subscription_period_end, stripe_subscription_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      if (!profile) {
        throw new Error('No subscription data found');
      }

      const planName = getPlanNameFromPriceId(profile.stripe_price_id);
      setSubscription({ ...profile, planName });

    } catch (error) {
      console.error('Error fetching subscription:', error);
      setError('Failed to load subscription details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, getPlanNameFromPriceId]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const handleUpgrade = () => router.push('/plans');

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No active session. Please sign in again.');
      }

      // First verify if user has a subscription
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Error fetching profile information. Please try again.');
      }

      if (!profile?.stripe_customer_id) {
        throw new Error('No subscription found. Please subscribe to a plan first.');
      }

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      if (!data.url) {
        throw new Error('No portal URL received');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      setError(error.message || 'Failed to open subscription management portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className={styles.mainContent}>
          <h1 className={styles.heading}>Billing & Subscription</h1>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.loadingSpinner} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className={styles.mainContent}>
          <h1 className={styles.heading}>Billing & Subscription</h1>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={`${styles.alert} ${styles.alertDanger}`}>
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
              <button 
                className={styles.btnOutline}
                onClick={fetchSubscriptionStatus}
                disabled={loading}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <h1 className={styles.heading}>Billing & Subscription</h1>
          <button
            className={`${styles.btn} ${styles.btnOutline}`}
            onClick={handleManageSubscription}
            disabled={loading}
          >
            <i className="bi bi-gear"></i>
            Manage Billing
          </button>
        </div>

        {subscription ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h5 className={`${styles.heading} mb-2`}>{subscription.planName}</h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className={STATUS_BADGES[subscription.subscription_status] || STATUS_BADGES.default}>
                      {subscription.subscription_status}
                    </span>
                    {subscription.subscription_period_end && (
                      <span className={styles.textMuted}>
                        {subscription.subscription_status === 'canceled' ? 'Access until' : 
                         subscription.subscription_status === 'trialing' ? 'Trial ends' : 
                         'Next billing date'} {formatDate(subscription.subscription_period_end)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {subscription.subscription_status !== 'canceled' && (
                    <button
                      className={`${styles.btn} ${styles.btnOutlineDanger}`}
                      onClick={handleManageSubscription}
                      disabled={loading}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Cancel Subscription
                    </button>
                  )}
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleUpgrade}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-up-circle me-2"></i>
                    {subscription.subscription_status === 'canceled' ? 'Resubscribe' : 'Upgrade Plan'}
                  </button>
                </div>
              </div>

              {subscription.subscription_status === 'past_due' && (
                <div className={`${styles.alert} ${styles.alertWarning}`}>
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Your payment is past due. Please update your payment method to avoid service interruption.
                </div>
              )}

              {subscription.subscription_status === 'canceled' && (
                <div className={`${styles.alert} ${styles.alertInfo}`}>
                  <i className="bi bi-info-circle me-2"></i>
                  Your subscription has been canceled but you still have access until {formatDate(subscription.subscription_period_end)}.
                  You can resubscribe anytime to continue using our services.
                </div>
              )}

              <div className="mt-4">
                <h6 className={`${styles.heading} mb-3`}>Current Plan Features:</h6>
                <ul className="list-unstyled">
                  {PLAN_DETAILS[subscription.planName]?.features.map((feature, index) => (
                    <li key={index} className="mb-2">
                      <i className="bi bi-check2 text-success me-2"></i>
                      <span className={styles.text}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={`${styles.cardBody} text-center py-5`}>
              <i className={`bi bi-credit-card ${styles.textPrimary} fs-1 mb-3`}></i>
              <h5 className={`${styles.heading} mb-3`}>No Active Subscription</h5>
              <p className={`${styles.textMuted} mb-4`}>Choose a plan to get started with our services.</p>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleUpgrade}
                disabled={loading}
              >
                <i className="bi bi-arrow-up-circle me-2"></i>
                View Plans
              </button>
            </div>
          </div>
        )}

        <div className={`${styles.card} mt-4`}>
          <div className={styles.cardBody}>
            <h5 className={`${styles.heading} mb-4`}>Need Help?</h5>
            <div className="row g-4">
              {HELP_LINKS.map((link, index) => (
                <div key={index} className="col-md-4">
                  <a
                    href={link.href}
                    className={`text-decoration-none ${styles.text} ${styles.hoverPrimary}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="d-flex align-items-center">
                      <i className={`bi ${link.icon} fs-4 me-3 ${styles.textPrimary}`}></i>
                      <span>{link.text}</span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 