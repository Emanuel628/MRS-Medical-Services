import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  stripe ||= new Stripe(secretKey);
  return stripe;
}

export function getStripeCurrency() {
  return (process.env.STRIPE_CURRENCY || 'usd').trim().toLowerCase();
}

export function getStripeCheckoutUrls() {
  const origin = (process.env.SITE_ORIGIN || process.env.CLIENT_ORIGIN || '').replace(/\/$/, '');

  return {
    successUrl: process.env.STRIPE_SUCCESS_URL || `${origin || 'http://localhost:5173'}/dashboard?payment=success`,
    cancelUrl: process.env.STRIPE_CANCEL_URL || `${origin || 'http://localhost:5173'}/dashboard?payment=cancelled`,
  };
}

export function getStripeWebhookSecret() {
  return (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}
