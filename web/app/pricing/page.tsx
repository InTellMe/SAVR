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

  const tier = userData?.subscriptionTier;
  const isBasic = tier === 'basic' || tier === 'free';
  const isPlus = tier === 'plus' || tier === 'pro';
  const isPremium = tier === 'premium';

  function handleFree() {
    if (!user) {
      router.push('/sign-up');
      return;
    }
    router.push('/dashboard');
  }

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

  const priceIdPlus =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS ||
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY ||
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ||
    'price_plus';
  const priceIdPremium =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PREMIUM || 'price_premium';

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Start free, upgrade when you&apos;re ready for more features
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Basic */}
          <PricingCard
            name="Basic"
            price="$0"
            period="forever"
            description="Perfect for getting started"
            features={[
              'Smart inventory (up to 50 items)',
              '10 AI recipes per month',
              '2 meal plans per month',
              '5 pet recipes per month',
              'Basic grocery lists',
              'Community support',
            ]}
            limitations={['No AI chat assistant']}
            buttonText={isBasic ? 'Current Plan' : 'Get Started'}
            buttonDisabled={isBasic}
            onSelect={handleFree}
            loading={loading}
            recommended={false}
          />

          {/* Plus */}
          <PricingCard
            name="Plus"
            price="$7.99"
            period="per month"
            description="For regular home cooks"
            features={[
              'Everything in Basic',
              'Unlimited inventory',
              'Unlimited recipes & meal plans',
              'Unlimited pet recipes',
              'AI cooking assistant chat',
              'Ad-free experience',
            ]}
            limitations={[]}
            buttonText={isPlus ? 'Current Plan' : 'Subscribe'}
            buttonDisabled={isPlus}
            onSelect={() => handleStripeSubscribe(priceIdPlus)}
            loading={loading}
            recommended={true}
          />

          {/* Premium */}
          <PricingCard
            name="Premium"
            price="$14.99"
            period="per month"
            description="For power users"
            features={[
              'Everything in Plus',
              'Real-time cooking coach',
              'Priority support',
              'Early access to new features',
            ]}
            limitations={[]}
            buttonText={isPremium ? 'Current Plan' : 'Subscribe'}
            buttonDisabled={isPremium}
            onSelect={() => handleStripeSubscribe(priceIdPremium)}
            loading={loading}
            recommended={false}
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FAQItem
              question="Can I switch plans anytime?"
              answer="Yes! You can upgrade from Basic to Plus or Premium at any time. Subscriptions can be canceled anytime and you'll retain access until the end of your billing period."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards including Visa, Mastercard, American Express, and Discover through our secure Stripe payment processor."
            />
            <FAQItem
              question="Is my data secure?"
              answer="Absolutely! We use industry-standard encryption and security practices. Your data is stored securely on Google Cloud Platform and we never share your information with third parties."
            />
            <FAQItem
              question="Can I get a refund?"
              answer="We offer a 30-day money-back guarantee on Plus and Premium. If you're not satisfied, contact our support team for a full refund."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  limitations,
  buttonText,
  buttonDisabled,
  onSelect,
  secondaryButtonText,
  secondaryButtonDisabled,
  onSecondarySelect,
  loading,
  recommended,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limitations: string[];
  buttonText: string;
  buttonDisabled: boolean;
  onSelect: () => void;
  secondaryButtonText?: string;
  secondaryButtonDisabled?: boolean;
  onSecondarySelect?: () => void;
  loading: boolean;
  recommended: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-8 relative ${
      recommended ? 'border-2 border-orange-500' : ''
    }`}>
      {recommended && (
        <div className="absolute top-0 right-0 bg-orange-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-semibold">
          Recommended
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex items-baseline">
          <span className="text-5xl font-bold text-gray-900">{price}</span>
          <span className="text-gray-600 ml-2">/ {period}</span>
        </div>
      </div>

      <button
        onClick={onSelect}
        disabled={buttonDisabled || loading}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition mb-6 ${
          recommended
            ? 'bg-orange-600 text-white hover:bg-orange-700'
            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Processing...' : buttonText}
      </button>

      {secondaryButtonText && onSecondarySelect && (
        <button
          onClick={onSecondarySelect}
          disabled={secondaryButtonDisabled || loading}
          className="w-full py-3 px-6 rounded-lg font-semibold transition mb-6 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : secondaryButtonText}
        </button>
      )}

      <div className="space-y-3 mb-6">
        <p className="font-semibold text-gray-900">Features:</p>
        {features.map((feature, index) => (
          <div key={index} className="flex items-start">
            <span className="text-green-500 mr-2 mt-1">✓</span>
            <span className="text-gray-700">{feature}</span>
          </div>
        ))}
      </div>

      {limitations.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-gray-200">
          <p className="font-semibold text-gray-900">Limitations:</p>
          {limitations.map((limitation, index) => (
            <div key={index} className="flex items-start">
              <span className="text-gray-400 mr-2 mt-1">−</span>
              <span className="text-gray-600 text-sm">{limitation}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition"
      >
        <span className="font-semibold text-gray-900">{question}</span>
        <span className="text-2xl text-gray-400">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 text-gray-600">
          {answer}
        </div>
      )}
    </div>
  );
}
