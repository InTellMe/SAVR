'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '@/lib/db';

const CUISINE_OPTIONS = [
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Korean', 'Thai',
  'Indian', 'Vietnamese', 'French', 'Greek', 'Mediterranean',
  'Spanish', 'Middle Eastern', 'Moroccan', 'Ethiopian',
  'Caribbean', 'Southern (US)', 'Cajun/Creole', 'Tex-Mex',
  'Brazilian', 'Peruvian', 'Turkish', 'Filipino',
  'American', 'British', 'German', 'Irish', 'Polish',
  'Russian', 'Scandinavian', 'Indonesian', 'Malaysian',
  'Hawaiian', 'Cuban', 'Argentinian', 'Lebanese',
  'Afghan', 'Jamaican', 'Soul Food', 'Comfort Food',
  'BBQ / Grilling', 'Street Food', 'Fusion',
];

const DIET_OPTIONS = [
  'Vegetarian', 'Vegan', 'Pescatarian', 'Flexitarian',
  'Keto', 'Paleo', 'Whole30', 'Mediterranean Diet',
  'Low-Carb', 'Low-Fat', 'Low-Sodium', 'Low-Sugar',
  'High-Protein', 'High-Fiber', 'Carnivore',
  'Raw Food', 'Macrobiotic', 'DASH Diet', 'Zone Diet',
  'Intermittent Fasting Friendly', 'Calorie-Conscious',
];

const RESTRICTION_OPTIONS = [
  'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Egg-Free',
  'Soy-Free', 'Shellfish-Free', 'Fish-Free', 'Sesame-Free',
  'Corn-Free', 'Nightshade-Free', 'Legume-Free', 'Seed-Free',
  'Sugar-Free', 'Alcohol-Free', 'Caffeine-Free', 'MSG-Free',
  'Sulfite-Free', 'Latex-Fruit Free', 'FODMAP-Friendly',
  'Kosher', 'Halal', 'Jain', 'Sattvic',
  'Diabetic-Friendly', 'Heart-Healthy', 'Anti-Inflammatory',
  'Kidney-Friendly', 'Gout-Friendly', 'Pregnancy-Safe',
];

interface UserPreferences {
  cuisines: string[];
  diets: string[];
  restrictions: string[];
  additionalNotes: string;
}

export default function PreferencesPage() {
  return (
    <ProtectedRoute>
      <PreferencesContent />
    </ProtectedRoute>
  );
}

function PreferencesContent() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    cuisines: [],
    diets: [],
    restrictions: [],
    additionalNotes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPreferences() {
      if (!user) return;
      try {
        const userProfile = await getUserProfile(user.id);
        if (userProfile?.preferences) {
          setPreferences({
            cuisines: userProfile.preferences.cuisines || [],
            diets: userProfile.preferences.diets || [],
            restrictions: userProfile.preferences.restrictions || [],
            additionalNotes: userProfile.preferences.additionalNotes || '',
          });
        }
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateUserProfile(user.id, { preferences });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleOption(
    category: 'cuisines' | 'diets' | 'restrictions',
    option: string
  ) {
    setPreferences((prev) => {
      const list = prev[category];
      return {
        ...prev,
        [category]: list.includes(option)
          ? list.filter((o) => o !== option)
          : [...list, option],
      };
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00d4ff]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Food Preferences
          </h1>
          <p className="text-[#9ca3c2] text-base max-w-2xl">
            Tell us what you love and what to avoid. These preferences are used by the AI when generating recipes and meal plans so every suggestion fits your taste and dietary needs.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl px-5 py-4 text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-6 rounded-xl px-5 py-4 text-sm" style={{ background: 'rgba(0, 191, 166, 0.1)', border: '1px solid rgba(0, 191, 166, 0.25)', color: '#00bfa6' }}>
            Preferences saved successfully.
          </div>
        )}

        {/* Favorite Cuisines */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-1">Favorite Cuisines</h2>
            <p className="text-sm text-[#6b7294]">
              Select all the cuisines you enjoy. The AI will prioritize these when suggesting recipes.
            </p>
          </div>
          <div className="rounded-xl p-5" style={{ background: 'rgba(13, 17, 41, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="flex flex-wrap gap-2">
              {CUISINE_OPTIONS.map((cuisine) => {
                const selected = preferences.cuisines.includes(cuisine);
                return (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => toggleOption('cuisines', cuisine)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      selected ? 'text-black' : 'text-[#9ca3c2] hover:text-white'
                    }`}
                    style={
                      selected
                        ? { background: 'linear-gradient(135deg, #00d4ff, #0099cc)' }
                        : { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }
                    }
                  >
                    {cuisine}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Diet Preferences */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-1">Diet Preferences</h2>
            <p className="text-sm text-[#6b7294]">
              Choose any diets you follow. Recipes will be tailored to match.
            </p>
          </div>
          <div className="rounded-xl p-5" style={{ background: 'rgba(13, 17, 41, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map((diet) => {
                const selected = preferences.diets.includes(diet);
                return (
                  <button
                    key={diet}
                    type="button"
                    onClick={() => toggleOption('diets', diet)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      selected ? 'text-black' : 'text-[#9ca3c2] hover:text-white'
                    }`}
                    style={
                      selected
                        ? { background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }
                        : { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }
                    }
                  >
                    {diet}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Restrictions / Allergies */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-1">Restrictions &amp; Allergies</h2>
            <p className="text-sm text-[#6b7294]">
              Mark any ingredients or categories you need to avoid. The AI will exclude these from all suggestions.
            </p>
          </div>
          <div className="rounded-xl p-5" style={{ background: 'rgba(13, 17, 41, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="flex flex-wrap gap-2">
              {RESTRICTION_OPTIONS.map((restriction) => {
                const selected = preferences.restrictions.includes(restriction);
                return (
                  <button
                    key={restriction}
                    type="button"
                    onClick={() => toggleOption('restrictions', restriction)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      selected ? 'text-white' : 'text-[#9ca3c2] hover:text-white'
                    }`}
                    style={
                      selected
                        ? { background: 'rgba(239, 68, 68, 0.7)', border: '1px solid rgba(239, 68, 68, 0.5)' }
                        : { background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }
                    }
                  >
                    {restriction}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Additional Notes */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white mb-1">Additional Notes for AI</h2>
            <p className="text-sm text-[#6b7294]">
              Anything else the AI should know when planning your meals? For example: calorie targets, preferred cooking methods, foods you dislike but aren&apos;t allergic to, family size, etc.
            </p>
          </div>
          <div className="rounded-xl p-5" style={{ background: 'rgba(13, 17, 41, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <textarea
              value={preferences.additionalNotes}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, additionalNotes: e.target.value }))
              }
              rows={4}
              placeholder="e.g., I prefer quick 30-min meals, cooking for a family of 4, I don't like cilantro, trying to eat under 2000 calories/day, prefer baking over frying..."
              className="w-full px-4 py-3 rounded-xl text-white placeholder-[#6b7294] outline-none transition-all duration-200 resize-none text-sm"
              style={{ background: 'rgba(6, 9, 24, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(0, 212, 255, 0.4)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)')}
            />
          </div>
        </section>

        {/* Save button */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #0099cc)', color: '#000000' }}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          <p className="text-xs text-[#6b7294]">
            You can also override these on a per-recipe basis when generating a recipe.
          </p>
        </div>
      </div>
    </div>
  );
}
