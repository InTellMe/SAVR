import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Turn Your Pantry Into
            <span className="text-orange-600"> Delicious Meals</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            AI-powered cooking assistant that helps you create recipes from what you have,
            plan meals, and never waste food again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="px-8 py-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-orange-600 border-2 border-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-white">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          Everything You Need to Cook Smarter
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="📸"
            title="Smart Inventory"
            description="Upload photos of your pantry and fridge. Our AI identifies ingredients instantly."
          />
          <FeatureCard
            icon="🍳"
            title="Recipe Generation"
            description="Get personalized recipes based on what you have, your dietary preferences, and skill level."
          />
          <FeatureCard
            icon="📅"
            title="Meal Planning"
            description="Plan your week ahead with smart meal plans that reduce waste and save time."
          />
          <FeatureCard
            icon="🛒"
            title="Grocery Lists"
            description="Auto-generated shopping lists based on your meal plans and current inventory."
          />
          <FeatureCard
            icon="💬"
            title="AI Cooking Assistant"
            description="Chat with your personal chef for cooking tips, substitutions, and techniques."
          />
          <FeatureCard
            icon="⚡"
            title="Quick & Easy"
            description="Filter recipes by cooking time, difficulty, and dietary restrictions."
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <Step number="1" title="Snap Photos" description="Take pictures of your pantry items" />
          <Step number="2" title="AI Analysis" description="Our AI identifies all ingredients" />
          <Step number="3" title="Get Recipes" description="Receive personalized recipe suggestions" />
          <Step number="4" title="Start Cooking" description="Follow step-by-step instructions" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-orange-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Cooking?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of home cooks who are saving time, reducing waste, and enjoying delicious meals.
          </p>
          <Link
            href="/sign-up"
            className="px-8 py-4 bg-white text-orange-600 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2024 PantryHustler. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
