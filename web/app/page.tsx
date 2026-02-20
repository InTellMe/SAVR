'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import VideoHero from '@/components/VideoHero';
import { useAuth, hasActiveSubscription } from '@/contexts/AuthContext';
import { trackCheckoutIntentIfReturning, hasRecentCheckoutIntent } from '@/lib/checkout';

export default function Home() {
  const { user, userData, loading } = useAuth();
  const hasActiveSub = hasActiveSubscription(userData);

  // Detect if user is returning from Stripe Checkout and set the checkout intent flag
  // This is more reliable than setting it on the pricing page before they actually checkout
  useEffect(() => {
    trackCheckoutIntentIfReturning();
  }, []);

  // Redirect to dashboard if user just completed Stripe checkout
  // The Stripe Pricing Table redirects to savr.cam/ (root) after checkout,
  // so we detect checkout intent via localStorage and send them to the dashboard
  useEffect(() => {
    if (loading || !user) return;

    // If user already has an active subscription, let them browse the home page normally
    if (hasActiveSub) return;

    if (hasRecentCheckoutIntent()) {
      window.location.href = '/dashboard?stripeSuccess=true';
    }
  }, [loading, user, hasActiveSub]);

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 radial-glow-top" />
        <div className="absolute inset-0 bg-grid" />
        {/* Decorative orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-20 animate-pulse-glow" style={{ background: 'radial-gradient(circle, rgba(0, 212, 255, 0.15), transparent 70%)' }} />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full opacity-15 animate-pulse-glow" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15), transparent 70%)', animationDelay: '1.5s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Video Hero with rotating media */}
            <VideoHero />

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 8px rgba(0, 212, 255, 0.6)' }} />
              <span className="text-sm font-medium text-[#00d4ff]">AI-Powered Smart Kitchen</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6">
              <span className="text-white">Cook Smarter.</span>
              <br />
              <span className="gradient-text">Save Everything.</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: '#9ca3c2' }}>
              Transform your pantry into restaurant-quality meals with AI. Smart inventory tracking,
              personalized recipes, pet-safe treats, and intelligent meal planning — all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              {!user || !hasActiveSub ? (
                <>
                  <Link href="/sign-up" className="btn-primary text-base sm:text-lg w-full sm:w-auto text-center">
                    Start Free Trial
                  </Link>
                  <Link href="/pricing" className="btn-secondary text-base sm:text-lg w-full sm:w-auto text-center">
                    View Pricing
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard" className="btn-primary text-base sm:text-lg w-full sm:w-auto text-center">
                    Go to Dashboard
                  </Link>
                  <Link href="/pricing" className="btn-secondary text-base sm:text-lg w-full sm:w-auto text-center">
                    Manage Subscription
                  </Link>
                </>
              )}
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-5 h-5" fill="#f59e0b" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-[#9ca3c2]">Loved by home cooks</span>
              </div>
              <div className="hidden sm:block w-px h-5" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#00d4ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-medium text-[#9ca3c2]">Vet-reviewed pet recipes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 radial-glow-center" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-[#00d4ff] mb-4">Features</h2>
            <p className="text-2xl sm:text-3xl md:text-5xl font-bold text-white leading-tight">
              Everything you need to<br />
              <span className="gradient-text-cyan">cook like a pro</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<CameraIcon />}
              title="Smart Inventory"
              description="Snap a photo of your pantry or fridge. Our AI instantly identifies every ingredient and tracks expiration dates."
              accentColor="#00d4ff"
            />
            <FeatureCard
              icon={<ChefHatIcon />}
              title="AI Recipe Generation"
              description="Get personalized recipes crafted from what you already have. Filter by cuisine, dietary needs, or cooking time."
              accentColor="#a855f7"
            />
            <FeatureCard
              icon={<PawIcon />}
              title="Pet-Safe Recipes"
              description="Cook healthy, vet-reviewed treats for your cats and dogs. Toxic ingredients are automatically excluded."
              accentColor="#f59e0b"
            />
            <FeatureCard
              icon={<CalendarIcon />}
              title="Meal Planning"
              description="Plan your week with intelligent meal schedules that minimize waste and maximize nutrition."
              accentColor="#00bfa6"
            />
            <FeatureCard
              icon={<CartIcon />}
              title="Smart Grocery Lists"
              description="Auto-generated shopping lists synced with your meal plans. Never forget an ingredient again."
              accentColor="#ec4899"
            />
            <FeatureCard
              icon={<ChatIcon />}
              title="AI Cooking Assistant"
              description="Real-time chat with your personal AI chef. Get tips, substitutions, and step-by-step guidance."
              accentColor="#8b5cf6"
            />
          </div>
        </div>
      </section>

      {/* Pet Safety Notice */}
      <section className="relative py-16 md:py-20">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-6 md:p-8" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(245, 158, 11, 0.02))', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.12)' }}>
                <svg className="w-6 h-6 text-[#f59e0b]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 18.5c-2.5 0-4.5-1.2-5.3-3.1-.3-.7.1-1.4.8-1.4h9c.7 0 1.1.7.8 1.4-.8 1.9-2.8 3.1-5.3 3.1zM8.5 11a2 2 0 11-4 0 2 2 0 014 0zm11 0a2 2 0 11-4 0 2 2 0 014 0zM10 7a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-[#f59e0b] mb-2">Pet Recipe Safety</h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: '#9ca3c2' }}>
                  SAVR automatically filters toxic and harmful ingredients when generating pet recipes. Our AI cross-references every ingredient against veterinary safety databases from the ASPCA and Pet Poison Helpline before suggesting any recipe for your dog or cat.
                </p>
                <p className="text-xs" style={{ color: '#6b7294' }}>
                  Pet recipes are intended as occasional treats, not a complete diet. Always consult your veterinarian.{' '}
                  <Link href="/faq" className="text-[#f59e0b] hover:underline">Learn more in our FAQ</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 md:py-32">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-[#00d4ff] mb-4">How It Works</h2>
            <p className="text-2xl sm:text-3xl md:text-5xl font-bold text-white leading-tight">
              From pantry to plate<br />
              <span className="gradient-text-cyan">in four steps</span>
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <Step number="01" title="Snap Photos" description="Take a photo of your fridge, pantry, or individual ingredients." icon={<CameraScanIcon />} />
            <Step number="02" title="AI Identifies" description="Our vision AI recognizes every ingredient and adds it to your inventory." icon={<BrainIcon />} />
            <Step number="03" title="Get Recipes" description="Choose human meals or pet treats. Get recipes tailored to what you have." icon={<SparklesIcon />} />
            <Step number="04" title="Cook & Enjoy" description="Follow step-by-step instructions with real-time AI assistance." icon={<FlameIcon />} />
          </div>

          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 w-[60%] h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(0, 212, 255, 0.2), rgba(168, 85, 247, 0.2), transparent)', marginTop: '20px' }} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.06), rgba(168, 85, 247, 0.06))' }} />
        <div className="absolute inset-0 bg-grid" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to transform<br />
            <span className="gradient-text">your kitchen?</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10" style={{ color: '#9ca3c2' }}>
            Join thousands of home cooks who are saving time, reducing waste,
            and discovering incredible new recipes every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            {!user || !hasActiveSub ? (
              <>
                <Link href="/sign-up" className="btn-primary text-base sm:text-lg w-full sm:w-auto text-center">
                  Get Started Free
                </Link>
                <Link href="/pricing" className="btn-secondary text-base sm:text-lg w-full sm:w-auto text-center">
                  Compare Plans
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="btn-primary text-base sm:text-lg w-full sm:w-auto text-center">
                  Go to Dashboard
                </Link>
                <Link href="/pricing" className="btn-secondary text-base sm:text-lg w-full sm:w-auto text-center">
                  Manage Subscription
                </Link>
              </>
            )}
          </div>

          {/* Mobile app coming soon */}
          <div className="mt-12 inline-flex items-center gap-3 px-5 py-3 rounded-full" style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <svg className="w-5 h-5 text-[#a855f7]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
            <span className="text-sm font-medium text-[#a855f7]">Mobile app coming soon</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <Image
                src="https://res.cloudinary.com/dksj2niho/image/upload/w_64,h_64,c_fit,q_auto,f_auto/v1770328403/SAVR_Logo_NO_BG_3_hixen3.png"
                alt="SAVR"
                width={28}
                height={28}
                className="w-7 h-7"
                unoptimized
              />
              <span className="text-lg font-bold text-white">SAVR</span>
            </div>
            <div className="flex items-center gap-8">
              <Link href="/pricing" className="text-sm text-[#6b7294] hover:text-[#00d4ff] transition-colors">
                Pricing
              </Link>
              <Link href="/faq" className="text-sm text-[#6b7294] hover:text-[#00d4ff] transition-colors">
                FAQ
              </Link>
              <Link href="/terms" className="text-sm text-[#6b7294] hover:text-[#00d4ff] transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-[#6b7294] hover:text-[#00d4ff] transition-colors">
                Privacy
              </Link>
            </div>
            <p className="text-sm text-[#6b7294]">
              &copy; {new Date().getFullYear()} SAVR. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Feature Card ──────────────────────────────────────────── */
function FeatureCard({ icon, title, description, accentColor }: { icon: React.ReactNode; title: string; description: string; accentColor: string }) {
  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 group">
      <div
        className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 md:mb-5 transition-shadow duration-300"
        style={{
          background: `${accentColor}15`,
          boxShadow: `0 0 0 1px ${accentColor}25`,
        }}
      >
        <div style={{ color: accentColor }} className="w-5 h-5 md:w-6 md:h-6">
          {icon}
        </div>
      </div>
      <h3 className="text-base md:text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#9ca3c2' }}>{description}</p>
    </div>
  );
}

/* ─── Step ───────────────────────────────────────────────────── */
function Step({ number, title, description, icon }: { number: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="relative text-center group">
      <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 md:mb-5 rounded-2xl flex items-center justify-center glow-cyan" style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
        <div className="w-6 h-6 md:w-7 md:h-7 text-[#00d4ff]">{icon}</div>
      </div>
      <span className="text-xs font-bold tracking-widest text-[#00d4ff] uppercase mb-2 block">Step {number}</span>
      <h3 className="text-base md:text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#9ca3c2' }}>{description}</p>
    </div>
  );
}

/* ─── SVG Icon Components ─────────────────────────────────── */
function CameraIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function ChefHatIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
    </svg>
  );
}

function PawIcon() {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 18.5c-2.5 0-4.5-1.2-5.3-3.1-.3-.7.1-1.4.8-1.4h9c.7 0 1.1.7.8 1.4-.8 1.9-2.8 3.1-5.3 3.1zM8.5 11a2 2 0 11-4 0 2 2 0 014 0zm11 0a2 2 0 11-4 0 2 2 0 014 0zM10 7a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function CameraScanIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 003.75-3.75c0-2.068-1.683-3.75-3.75-3.75-2.068 0-3.75 1.682-3.75 3.75A3.75 3.75 0 0012 18z" />
    </svg>
  );
}
