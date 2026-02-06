'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, userData } = useAuth();
  const [stats, setStats] = useState({
    inventoryCount: 0,
    recipeCount: 0,
    mealPlanCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;

      try {
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('userId', '==', user.uid)
        );
        const recipeQuery = query(
          collection(db, 'recipes'),
          where('userId', '==', user.uid)
        );
        const mealPlanQuery = query(
          collection(db, 'mealPlans'),
          where('userId', '==', user.uid)
        );

        const [inventorySnap, recipeSnap, mealPlanSnap] = await Promise.all([
          getDocs(inventoryQuery),
          getDocs(recipeQuery),
          getDocs(mealPlanQuery),
        ]);

        setStats({
          inventoryCount: inventorySnap.size,
          recipeCount: recipeSnap.size,
          mealPlanCount: mealPlanSnap.size,
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.email}!
          </h1>
          <p className="text-gray-600">
            You&apos;re on the <span className="font-semibold text-orange-600">{userData?.subscriptionTier || 'free'}</span> plan
            {userData?.subscriptionTier === 'free' && (
              <Link href="/pricing" className="ml-2 text-orange-600 hover:underline">
                Upgrade to Pro
              </Link>
            )}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
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
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">
              🎉 Get Started with SAVR
            </h3>
            <p className="text-orange-800 mb-4">
              Start by adding items to your inventory. Take a photo of your pantry or fridge, and our AI will automatically identify your ingredients!
            </p>
            <Link
              href="/inventory"
              className="inline-block px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
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
    <Link href={link} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
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
      className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition"
    >
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
