'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export default function PricingPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const tier = userData?.subscriptionTier;
  const status = userData?.subscriptionStatus;
  const hasActiveSub = status === 'active' || status === 'trialing';
  const isBasic = hasActiveSub && (tier === 'basic' || tier === 'free');
  const isPro = hasActiveSub && (tier === 'pro' || tier === 'plus' || tier === 'premium');

  async function handleStripeSubscribe(priceId: string) {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const createStripeCheckout = httpsCallable(functions, 'createStripeCheckout');
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const result = await createStripeCheckout({
        priceId,
        successUrl: `${appBaseUrl}/dashboard?stripeSuccess=true`,
        cancelUrl: `${appBaseUrl}/pricing?stripeCancelled=true`,
      });
      const data = result.data as { url: string };
      window.location.href = data.url;
    } catch (err) {
      console.error('Stripe checkout error:', err);
      setError('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  }

  const priceIdBasicMonthly =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_MONTHLY || 'price_basic_monthly';
  const priceIdBasicYearly =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_YEARLY || 'price_basic_yearly';
  const priceIdProMonthly =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || 'price_pro_monthly';
  const priceIdProYearly =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_YEARLY || 'price_pro_yearly';

  const plans = [
    {
      name: 'Basic',
      description: 'Everything you need to get started',
      monthlyPrice: '$4.99',
      yearlyPrice: '$49.99',
      monthlySavings: null,
      yearlySavings: 'Save $9.89/yr',
      features: [
        'Smart inventory (up to 50 items)',
        '10 AI recipes per month',
        '2 meal plans per month',
        '5 pet recipes per month',
        'Basic grocery lists',
        'Community support',
      ],
      limitations: ['No AI chat assistant'],
      recommended: false,
      isCurrent: isBasic,
      monthlyPriceId: priceIdBasicMonthly,
      yearlyPriceId: priceIdBasicYearly,
      accentColor: '#00d4ff',
    },
    {
      name: 'Pro',
      description: 'For passionate home cooks',
      monthlyPrice: '$9.99',
      yearlyPrice: '$99.99',
      monthlySavings: null,
      yearlySavings: 'Save $19.89/yr',
      features: [
        'Everything in Basic',
        'Unlimited inventory items',
        'Unlimited recipes & meal plans',
        'Unlimited pet recipes',
        'AI cooking assistant chat',
        'Ad-free experience',
        'Priority support',
        'Cancel anytime',
      ],
      limitations: [],
      recommended: true,
      isCurrent: isPro,
      monthlyPriceId: priceIdProMonthly,
      yearlyPriceId: priceIdProYearly,
      accentColor: '#a855f7',
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Onboarding banner for new users */}
        {user && userData?.subscriptionStatus === 'pending' && (
          <div className="max-w-2xl mx-auto mb-10 rounded-xl px-6 py-5 text-center" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
            <h3 className="text-lg font-semibold text-white mb-2">Choose a plan to get started</h3>
            <p className="text-sm text-[#9ca3c2]">
              Select a plan below to begin your 5-day free trial. Your payment info is collected now but you will not be charged until the trial ends. Cancel anytime.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#00d4ff] mb-4">Pricing</h2>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            Simple, transparent<br />
            <span className="gradient-text">pricing</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#9ca3c2' }}>
            Try any plan free for 5 days. No charge until your trial ends. Coupon codes accepted at checkout.
          </p>

          {/* Billing toggle */}
          <div className="mt-10 inline-flex items-center rounded-full p-1" style={{ background: 'rgba(10, 10, 10, 0.8)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                billingCycle === 'monthly'
                  ? 'text-[#000000]'
                  : 'text-[#9ca3c2] hover:text-white'
              }`}
              style={billingCycle === 'monthly' ? { background: 'linear-gradient(135deg, #00d4ff, #0099cc)' } : {}}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                billingCycle === 'yearly'
                  ? 'text-[#000000]'
                  : 'text-[#9ca3c2] hover:text-white'
              }`}
              style={billingCycle === 'yearly' ? { background: 'linear-gradient(135deg, #00d4ff, #0099cc)' } : {}}
            >
              Yearly
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={billingCycle === 'yearly' ? { background: 'rgba(0, 0, 0, 0.3)', color: '#000000' } : { background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff' }}>
                Save
              </span>
            </button>
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 md:p-10 transition-all duration-300 ${
                plan.recommended ? 'glow-cyan-strong' : ''
              }`}
              style={{
                background: plan.recommended
                  ? 'linear-gradient(135deg, rgba(13, 17, 41, 0.9), rgba(19, 24, 54, 0.9))'
                  : 'rgba(13, 17, 41, 0.7)',
                border: `1px solid ${plan.recommended ? 'rgba(0, 212, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
              }}
            >
              {plan.recommended && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)', color: '#000000' }}
                >
                  Recommended
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-sm" style={{ color: '#9ca3c2' }}>{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold text-white">
                    {billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-sm" style={{ color: '#6b7294' }}>
                    / {billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'yearly' && plan.yearlySavings && (
                  <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(0, 191, 166, 0.12)', color: '#00bfa6' }}>
                    {plan.yearlySavings}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleStripeSubscribe(billingCycle === 'monthly' ? plan.monthlyPriceId : plan.yearlyPriceId)}
                disabled={plan.isCurrent || loading}
                className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 mb-2 ${
                  plan.isCurrent
                    ? 'cursor-not-allowed opacity-50'
                    : ''
                }`}
                style={
                  plan.recommended
                    ? { background: 'linear-gradient(135deg, #00d4ff, #0099cc)', color: '#000000' }
                    : { background: 'rgba(255, 255, 255, 0.06)', color: '#e8eaf6', border: '1px solid rgba(255, 255, 255, 0.1)' }
                }
              >
                {loading ? 'Processing...' : plan.isCurrent ? 'Current Plan' : 'Start 5-Day Free Trial'}
              </button>
              {!plan.isCurrent && (
                <p className="text-xs text-center mb-6" style={{ color: '#6b7294' }}>
                  No charge for 5 days. Cancel anytime.
                </p>
              )}
              {plan.isCurrent && <div className="mb-6" />}

              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke={plan.accentColor} strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-sm" style={{ color: '#c8cbe0' }}>{feature}</span>
                  </div>
                ))}
                {plan.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="#6b7294" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                    </svg>
                    <span className="text-sm" style={{ color: '#6b7294' }}>{limitation}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#00d4ff] mb-4">FAQ</h2>
            <p className="text-3xl md:text-4xl font-bold text-white">Frequently asked questions</p>
          </div>
          <div className="space-y-4">
            <FAQItem
              question="How does the 5-day free trial work?"
              answer="Every plan starts with a 5-day free trial. You'll get full access to all features in your chosen plan. Your card is collected at signup but won't be charged until the trial ends. Cancel anytime during the trial and you won't be billed."
            />
            <FAQItem
              question="Can I use a coupon code?"
              answer="Yes! Both monthly and yearly plans accept coupon codes. Enter your code at checkout. If a coupon reduces your total to $0.00, no payment method is required."
            />
            <FAQItem
              question="Can I switch plans anytime?"
              answer="Yes! You can upgrade from Basic to Pro at any time. Subscriptions can be canceled anytime and you'll retain access until the end of your billing period."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards including Visa, Mastercard, American Express, and Discover through our secure Stripe payment processor."
            />
            <FAQItem
              question="Is my data secure?"
              answer="We use industry-standard encryption and security practices. Your data is stored securely on Google Cloud Platform and we never share your information with third parties."
            />
            <FAQItem
              question="Can I get a refund?"
              answer="We offer a 30-day money-back guarantee. If you're not satisfied, contact our support team for a full refund."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: isOpen ? 'rgba(13, 17, 41, 0.8)' : 'rgba(13, 17, 41, 0.5)',
        border: `1px solid ${isOpen ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 text-left flex justify-between items-center"
      >
        <span className="font-semibold text-white text-sm">{question}</span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="#6b7294"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: '#9ca3c2' }}>
          {answer}
        </div>
      )}
    </div>
  );
}
