'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackCheckoutIntentIfReturning } from '@/lib/checkout';
import { getInventory, getRecipes, getMealPlans } from '@/lib/db';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, userData } = useAuth();
  const searchParams = useSearchParams();
  const stripeSuccess = searchParams.get('stripeSuccess') === 'true';
  const [showSuccessBanner, setShowSuccessBanner] = useState(stripeSuccess);
  const [stats, setStats] = useState({
    inventoryCount: 0,
    recipeCount: 0,
    mealPlanCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Detect if user is returning from Stripe Checkout and set the checkout intent flag
  // This is more reliable than setting it on the pricing page before they actually checkout
  useEffect(() => {
    trackCheckoutIntentIfReturning();
  }, []);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;

      try {
        const [inventory, recipes, mealPlans] = await Promise.all([
          getInventory(user.id),
          getRecipes(user.id),
          getMealPlans(user.id),
        ]);

        setStats({
          inventoryCount: inventory.length,
          recipeCount: recipes.length,
          mealPlanCount: mealPlans.length,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user]);

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        {showSuccessBanner && (
          <div className="mb-6 rounded-xl px-5 py-4 flex items-center justify-between" style={{ background: 'rgba(0, 191, 166, 0.1)', border: '1px solid rgba(0, 191, 166, 0.25)' }}>
            <div>
              <p className="font-semibold text-[#00bfa6]">Subscription activated!</p>
              <p className="text-sm text-[#9ca3c2]">Your plan is now active. Your 5-day free trial has started — enjoy full access.</p>
            </div>
            <button onClick={() => setShowSuccessBanner(false)} className="text-[#9ca3c2] hover:text-white ml-4 text-lg">&times;</button>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 break-words">
            Welcome back, {user?.email}!
          </h1>
          <p className="text-[#9ca3c2]">
            You&apos;re on the <span className="font-semibold text-[#00d4ff]">{userData?.subscription_tier || 'basic'}</span> plan
            {userData?.subscription_tier === 'basic' && (
              <Link href="/pricing" className="ml-2 text-[#00d4ff] hover:text-[#00bfa6] transition">
                Upgrade to Pro
              </Link>
            )}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <StatCard
            title="Inventory Items"
            value={loading ? '...' : stats.inventoryCount}
            icon="📦"
            link="/inventory"
          />
          <StatCard
            title="Saved Recipes"
            value={loading ? '...' : stats.recipeCount}
            icon="🍳"
            link="/recipes"
          />
          <StatCard
            title="Meal Plans"
            value={loading ? '...' : stats.mealPlanCount}
            icon="📅"
            link="/meal-plans"
          />
        </div>

        {/* Quick Actions */}
        <div className="glass-card rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <ActionButton
              href="/upload"
              icon="📸"
              title="Upload Pantry Photo"
              description="Add new items to inventory"
            />
            <ActionButton
              href="/recipes"
              icon="✨"
              title="Generate Recipe"
              description="Create recipe from inventory"
            />
            <ActionButton
              href="/meal-plans"
              icon="📅"
              title="Plan Meals"
              description="Create weekly meal plan"
            />
            <ActionButton
              href="/grocery-lists"
              icon="🛒"
              title="Grocery List"
              description="Manage shopping lists"
            />
          </div>
        </div>

        {/* Getting Started */}
        {stats.inventoryCount === 0 && !loading && (
          <div className="glass-card rounded-lg p-6 border-[#00d4ff]/20">
            <h3 className="text-lg font-semibold text-white mb-2">
              🎉 Get Started with SAVR
            </h3>
            <p className="text-[#9ca3c2] mb-4">
              Start by adding items to your inventory. Take a photo of your pantry or fridge, and our AI will automatically identify your ingredients!
            </p>
            <Link
              href="/inventory"
              className="inline-block px-6 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition"
            >
              Add Your First Items
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, link }: { title: string; value: string | number; icon: string; link: string }) {
  return (
    <Link href={link} className="glass-card rounded-lg p-6 hover:border-[#00d4ff]/40 transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#9ca3c2] text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </Link>
  );
}

function ActionButton({ href, icon, title, description }: { href: string; icon: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="p-4 border border-white/6 rounded-lg hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5 transition"
    >
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-[#9ca3c2]">{description}</p>
    </Link>
  );
}
