'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface FAQCategory {
  title: string;
  items: { question: string; answer: string }[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    title: 'Getting Started',
    items: [
      {
        question: 'How do I add items to my inventory?',
        answer:
          'There are three ways: (1) Upload a photo of your pantry or fridge — our AI will detect ingredients automatically. (2) Add items manually from the Inventory page using the form. (3) Scan a product barcode to look it up in the Open Food Facts database.',
      },
      {
        question: 'What if the AI misidentifies an ingredient from my photo?',
        answer:
          'After uploading, you can review all detected ingredients before saving. Remove any that are wrong, then head to Inventory to manually add anything that was missed. You can also tap Edit on any saved item to correct its name, quantity, or category.',
      },
      {
        question: 'How do I manually add or edit inventory items?',
        answer:
          'Go to the Inventory page and use the "Add Item Manually" section. Enter the name, quantity, unit, and category (pantry, fridge, or freezer). To edit an existing item, click the Edit button on its card and update any field.',
      },
      {
        question: 'What file types can I upload?',
        answer:
          'SAVR accepts common image formats including JPEG and PNG. For best results use a well-lit, non-blurry photo where labels and items are clearly visible.',
      },
    ],
  },
  {
    title: 'Recipes & Meal Plans',
    items: [
      {
        question: 'How does AI recipe generation work?',
        answer:
          'SAVR reads your current inventory and generates recipes using only what you have on hand. You can set preferences like cuisine style, dietary restrictions, skill level, and maximum cooking time. Recipes are saved automatically so you can revisit them.',
      },
      {
        question: 'Can I generate pet-safe recipes?',
        answer:
          'Yes! When generating a recipe, choose "Pets" and select the species (dog or cat). The AI automatically excludes toxic ingredients and follows vet-reviewed safety guidelines. Always consult your veterinarian before making significant dietary changes for your pet.',
      },
      {
        question: 'How do meal plans work?',
        answer:
          'Choose the number of days (1–14) and your dietary preferences. The AI creates a balanced meal schedule using your inventory, aiming to minimize waste and maximize variety. Each plan includes breakfast, lunch, and dinner suggestions.',
      },
      {
        question: 'How are grocery lists generated?',
        answer:
          'Select one or more saved recipes, and SAVR compares the required ingredients against your current inventory. The resulting grocery list contains only what you need to buy, organized by category. You can check items off as you shop.',
      },
      {
        question: 'Can I share recipes with others?',
        answer:
          'Yes. Open any recipe and tap the Share button. A shareable link is copied to your clipboard — anyone with the link can view the recipe, even without a SAVR account.',
      },
    ],
  },
  {
    title: 'Subscriptions & Billing',
    items: [
      {
        question: 'How does the 5-day free trial work?',
        answer:
          'Every plan starts with a 5-day free trial with full access. Your payment method is collected at signup but you are not charged until the trial ends. Cancel anytime during the trial to avoid any charges.',
      },
      {
        question: 'What is the difference between Basic and Pro?',
        answer:
          'Basic includes up to 50 inventory items, 10 AI recipes per month, 2 meal plans per month, and 5 pet recipes per month. Pro gives you unlimited everything, plus the AI cooking assistant chat, an ad-free experience, and priority support.',
      },
      {
        question: 'Can I use a coupon code?',
        answer:
          'Yes — both monthly and yearly subscriptions accept coupon codes at checkout. If a coupon reduces your total to $0.00, no payment method is required.',
      },
      {
        question: 'How do I cancel or change my plan?',
        answer:
          'Go to Settings and click "Manage Subscription" to open the Stripe billing portal. From there you can upgrade, downgrade, or cancel. If you cancel, you keep access until the end of your current billing period.',
      },
      {
        question: 'What payment methods are accepted?',
        answer:
          'We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through Stripe, our secure payment processor.',
      },
      {
        question: 'Can I get a refund?',
        answer:
          'We offer a 30-day money-back guarantee. If you are not satisfied, contact our support team for a full refund.',
      },
    ],
  },
  {
    title: 'Pet Recipe Safety',
    items: [
      {
        question: 'How does SAVR ensure pet recipes are safe?',
        answer:
          'Every pet recipe is generated using a curated safety database of foods that are known to be toxic or harmful to dogs and cats. Before a recipe is finalized, the AI cross-references every ingredient against this database and automatically removes anything flagged as unsafe. The AI also follows veterinary nutritional guidelines for portion sizes and ingredient ratios.',
      },
      {
        question: 'What toxic ingredients are filtered out?',
        answer:
          'For dogs, the system filters chocolate, xylitol, grapes, raisins, onions, garlic, macadamia nuts, avocado, alcohol, caffeine, and many more. For cats, additional items such as lilies, essential oils, and certain dairy products are excluded. The list is updated regularly based on the latest veterinary research.',
      },
      {
        question: 'Should I rely solely on SAVR for my pet\'s diet?',
        answer:
          'No. SAVR pet recipes are intended as occasional treats or meal supplements, not as a complete and balanced diet. Always consult your veterinarian before making significant dietary changes for your pet. If your pet has specific health conditions, allergies, or is on medication, please discuss any new foods with your vet first.',
      },
      {
        question: 'What veterinary guidance does SAVR follow?',
        answer:
          'Our pet recipe engine is built on guidelines from the ASPCA Animal Poison Control Center, the Pet Poison Helpline, and peer-reviewed veterinary nutrition research. Recipes follow species-appropriate macronutrient ratios and avoid known allergens and toxins for each species.',
      },
      {
        question: 'Can I report a safety concern with a pet recipe?',
        answer:
          'Absolutely. If you believe a recipe contains an unsafe ingredient, please contact us immediately through the AI chat assistant or our support channel. We take every report seriously and will review and update our safety database as needed.',
      },
    ],
  },
  {
    title: 'AI Chat Assistant',
    items: [
      {
        question: 'What can the AI chat assistant do?',
        answer:
          'The chat assistant (Pro plan) can answer cooking questions, suggest ingredient substitutions, explain techniques, help with portion scaling, and offer real-time guidance while you cook.',
      },
      {
        question: 'Does the chat assistant know my inventory?',
        answer:
          'Yes. The assistant has access to your current inventory and saved recipes, so it can give personalized suggestions based on what you actually have.',
      },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      {
        question: 'Is my data secure?',
        answer:
          'We use industry-standard encryption and security practices. Your data is stored on Google Cloud Platform with strict access controls. We never share your information with third parties.',
      },
      {
        question: 'Can I delete my data?',
        answer:
          'Yes. You can delete individual items, recipes, meal plans, and grocery lists at any time. For full account deletion, contact our support team.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        question: 'My photo upload did not detect any ingredients.',
        answer:
          'Make sure the photo is well-lit and items are clearly visible. Avoid blurry or dark images. If detection still fails, add items manually from the Inventory page or try a different angle.',
      },
      {
        question: 'Recipe generation says I have no ingredients.',
        answer:
          'You need items in your inventory before generating recipes. Upload a pantry photo or add items manually first, then try generating again.',
      },
      {
        question: 'I am seeing a "limit reached" error.',
        answer:
          'Basic plans have monthly usage limits (e.g., 10 recipes, 2 meal plans). Upgrade to Pro for unlimited access, or wait until the next billing cycle for your limits to reset.',
      },
      {
        question: 'The checkout page is not loading.',
        answer:
          'Make sure you are signed in, then try again. If the issue persists, disable browser extensions (especially ad blockers) and refresh the page. You can also try a different browser.',
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#00d4ff] mb-4">
            Support
          </h2>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#9ca3c2' }}>
            Everything you need to know about using SAVR. Can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/chat" className="text-[#00d4ff] hover:underline">
              Ask our AI assistant
            </Link>
            .
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-12">
          {FAQ_DATA.map((category) => (
            <div key={category.title}>
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: '#00d4ff' }}
              >
                {category.title}
              </h3>
              <div className="space-y-3">
                {category.items.map((item) => (
                  <FAQItem
                    key={item.question}
                    question={item.question}
                    answer={item.answer}
                  />
                ))}
              </div>
            </div>
          ))}
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
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="#6b7294"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          className="px-6 pb-5 text-sm leading-relaxed"
          style={{ color: '#9ca3c2' }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}
