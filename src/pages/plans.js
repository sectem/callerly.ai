import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { getStripe, SUBSCRIPTION_PRODUCTS } from '@/utils/stripe';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/utils/supabase';

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

export default function PlansPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [currentPlanStatus, setCurrentPlanStatus] = useState(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (!user?.id) return;

      try {
        // First try to fetch profile using id
        let profile = null;
        const { data: profileById, error: profileError } = await supabase
          .from('profiles')
          .select('stripe_price_id, subscription_status')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile by id:', profileError);
          // Try alternative query using user_id
          const { data: profileByUserId, error: altError } = await supabase
            .from('profiles')
            .select('stripe_price_id, subscription_status')
            .eq('user_id', user.id)
            .single();

          if (altError) {
            throw altError;
          }

          profile = profileByUserId;
        } else {
          profile = profileById;
        }

        console.log('Fetched profile:', profile); // Debug log

        if (profile?.stripe_price_id) {
          const planEntry = Object.entries(PLAN_DETAILS).find(
            ([_, details]) => details.id === profile.stripe_price_id
          );
          
          console.log('Found plan:', planEntry); // Debug log
          
          if (planEntry) {
            const [planName] = planEntry;
            setCurrentPlan(planName);
            setCurrentPlanStatus(profile.subscription_status);
            console.log('Set current plan:', planName, profile.subscription_status); // Debug log
          }
        }
      } catch (error) {
        console.error('Error fetching current plan:', error);
        setError('Error loading subscription details. Please try again.');
      }
    };

    fetchCurrentPlan();
  }, [user]);

  const handleSubscription = async (priceId) => {
    try {
      if (!user) {
        router.push('/signin');
        return;
      }

      setError(null);
      setLoading(true);

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.email
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const stripe = await getStripe();
      
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = (planName, details, isPopular = false) => {
    const isCurrentPlan = currentPlan === planName;
    const isActive = currentPlanStatus === 'active';
    const buttonDisabled = loading || (isCurrentPlan && isActive);

    return (
      <div className="col">
        <div className={`card h-100 shadow${isPopular ? ' border-primary' : '-sm'}${isCurrentPlan && isActive ? ' border-success' : ''}`}>
          <div className="card-body p-4">
            {isPopular && (
              <div className="position-absolute top-0 start-50 translate-middle">
                <span className="badge bg-primary px-3 py-2">Most Popular</span>
              </div>
            )}
            {isCurrentPlan && isActive && (
              <div className="position-absolute top-0 end-0 mt-3 me-3">
                <span className="badge bg-success">
                  <i className="bi bi-check-circle me-1"></i>
                  Currently Subscribed
                </span>
              </div>
            )}
            <h2 className="card-title h3 mb-4">{planName}</h2>
            <p className="text-muted mb-4">
              {planName === 'Basic Plan' && 'Perfect for startups and small businesses to get started with AI-powered call handling.'}
              {planName === 'Premium Plan' && 'Designed for growing businesses that need advanced automation and additional call minutes.'}
              {planName === 'Enterprise Plan' && 'Tailored for large businesses requiring a scalable solution and custom minutes.'}
            </p>
            
            <ul className="list-unstyled mb-4">
              {details.features.map((feature, index) => (
                <li key={index} className="mb-2">
                  <i className="bi bi-check2 text-success me-2"></i>
                  {feature}
                </li>
              ))}
            </ul>
            
            {isCurrentPlan && isActive ? (
              <div className="alert alert-success mb-3">
                <i className="bi bi-info-circle me-2"></i>
                You are currently subscribed to this plan
              </div>
            ) : null}
            
            <button
              className={`btn ${isCurrentPlan ? 'btn-outline-primary' : 'btn-primary'} w-100 py-2`}
              onClick={() => handleSubscription(details.id)}
              disabled={buttonDisabled}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : isCurrentPlan && isActive ? (
                <>
                  <i className="bi bi-check2-circle me-2"></i>
                  Current Plan
                </>
              ) : isCurrentPlan ? (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Reactivate Plan
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-up-circle me-2"></i>
                  {currentPlan ? 'Upgrade to' : 'Select'} {planName}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-light bg-white shadow-sm">
        <div className="container">
          <Link href="/" className="navbar-brand">
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={140}
              height={36}
              priority
              style={{ objectFit: 'contain' }}
            />
          </Link>
          {user && (
            <Link href="/dashboard" className="btn btn-outline-primary">
              <i className="bi bi-arrow-left me-2"></i>
              Back to Dashboard
            </Link>
          )}
        </div>
      </nav>

      <div className="container py-5">
        <div className="text-center mb-5">
          <h1 className="display-4 mb-3">Choose Your Plan</h1>
          <p className="lead text-muted">Select the perfect plan for your business needs</p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="row row-cols-1 row-cols-md-3 g-4 mb-5 justify-content-center">
          {renderPlanCard('Basic Plan', PLAN_DETAILS['Basic Plan'])}
          {renderPlanCard('Premium Plan', PLAN_DETAILS['Premium Plan'], true)}
          {renderPlanCard('Enterprise Plan', PLAN_DETAILS['Enterprise Plan'])}
        </div>

        <div className="text-center">
          <div className="d-flex justify-content-center gap-3">
            <Link href="/terms-of-service" className="text-muted small">Terms of Service</Link>
            <span className="text-muted">|</span>
            <Link href="/privacy-policy" className="text-muted small">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
} 