import { loadStripe } from '@stripe/stripe-js';

// Make sure to add your publishable key in the environment variables
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export const getStripe = () => {
  return stripePromise;
};

// Subscription product IDs from your Stripe dashboard
export const SUBSCRIPTION_PRODUCTS = {
  BASIC: process.env.NEXT_PUBLIC_STRIPE_BASIC_PLAN_ID,
  PREMIUM: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PLAN_ID,
  ENTERPRISE: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PLAN_ID,
}; 