'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';

export default function SupportFrumefni() {
  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 radial-glow-top" />
        <div className="absolute inset-0 bg-grid" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              <span className="text-white">Support the</span>
              <br />
              <span className="gradient-text">Frumefni Project</span>
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-white mb-4">
              Representing Human Connection at the 2026 Iceland Eclipse
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative py-12 md:py-16">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-2xl p-8 md:p-12 space-y-8">
            
            {/* Introduction */}
            <div>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: '#e8eaf6' }}>
                In August 2026, <strong className="text-[#00d4ff]">Frumefni: The Elemental Contact</strong> has been invited to participate in The Portal at Iceland Eclipse, an international innovation residency and gathering of artists, researchers, and creators from around the world.
              </p>
            </div>

            <div>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: '#9ca3c2' }}>
                Frumefni will represent a pioneering intersection of performance art, human sensory research, and environmental immersion—exploring the relationship between the human body, the Earth, and cosmic phenomena during one of the rarest celestial events observable from Earth: a total solar eclipse.
              </p>
            </div>

            <div>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: '#9ca3c2' }}>
                This residency provides a unique opportunity to conduct live experiential research and artistic expression within one of the planet's most geologically and energetically significant environments.
              </p>
            </div>

            {/* The Mission */}
            <div className="pt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">The Mission</h2>
              <p className="text-base md:text-lg leading-relaxed mb-4" style={{ color: '#9ca3c2' }}>
                Frumefni seeks to deepen understanding of human perception, embodiment, and connection through direct engagement with elemental environments.
              </p>
              <p className="text-base md:text-lg leading-relaxed mb-4" style={{ color: '#9ca3c2' }}>
                The project will contribute:
              </p>
              <ul className="space-y-3 ml-6">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#00d4ff' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>A structured ceremonial performance aligned with eclipse totality</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#00d4ff' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Qualitative sensory research on human experience during cosmic events</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#00d4ff' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Documentation and synthesis to support future interdisciplinary exploration</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#00d4ff' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>A framework for future artistic, scientific, and cultural initiatives</span>
                </li>
              </ul>
              <p className="text-base md:text-lg leading-relaxed mt-4" style={{ color: '#9ca3c2' }}>
                The project's outcomes will be shared openly, contributing to broader cultural and intellectual discourse.
              </p>
            </div>

            {/* Why Support Matters */}
            <div className="pt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Why Support Matters</h2>
              <p className="text-base md:text-lg leading-relaxed mb-4" style={{ color: '#9ca3c2' }}>
                Participation in the residency requires international travel, specialized preparation, and on-site research and documentation.
              </p>
              <p className="text-base md:text-lg leading-relaxed mb-4" style={{ color: '#9ca3c2' }}>
                Support from sponsors and aligned partners enables:
              </p>
              <ul className="space-y-3 ml-6">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#a855f7' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Travel and transportation to Iceland</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#a855f7' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Residency and accommodation expenses</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#a855f7' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Research documentation and archival production</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#a855f7' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Equipment and logistical preparation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#a855f7' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Preservation and sharing of the project's findings</span>
                </li>
              </ul>
              <p className="text-base md:text-lg leading-relaxed mt-4 font-medium" style={{ color: '#e8eaf6' }}>
                Your support directly enables the realization of a project that bridges art, science, and human experience.
              </p>
            </div>

            {/* What Sponsors Help Make Possible */}
            <div className="pt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">What Sponsors Help Make Possible</h2>
              <p className="text-base md:text-lg leading-relaxed mb-4" style={{ color: '#9ca3c2' }}>
                By supporting Frumefni, you contribute to:
              </p>
              <ul className="space-y-3 ml-6">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#00bfa6' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Advancement of interdisciplinary artistic and research work</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#00bfa6' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Cultural exploration and documentation of a rare astronomical event</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#00bfa6' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Expansion of human understanding of perception and environment</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#00bfa6' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Creation of publicly shared insights and artistic contributions</span>
                </li>
              </ul>
              <p className="text-base md:text-lg leading-relaxed mt-4" style={{ color: '#9ca3c2' }}>
                Sponsors become part of a project that exists at the intersection of human curiosity, natural forces, and creative exploration.
              </p>
            </div>

            {/* Recognition and Acknowledgment */}
            <div className="pt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Recognition and Acknowledgment</h2>
              <p className="text-base md:text-lg leading-relaxed mb-4" style={{ color: '#9ca3c2' }}>
                Sponsors may be acknowledged through:
              </p>
              <ul className="space-y-3 ml-6">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#f59e0b' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Project website recognition</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#f59e0b' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Research and documentation credits</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#f59e0b' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Project publications and reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#f59e0b' }} />
                  <span className="text-base md:text-lg" style={{ color: '#9ca3c2' }}>Future exhibitions and presentations</span>
                </li>
              </ul>
              <p className="text-base md:text-lg leading-relaxed mt-4" style={{ color: '#9ca3c2' }}>
                Supporters become part of the permanent historical record of the project.
              </p>
            </div>

            {/* How to Support */}
            <div className="pt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">How to Support</h2>
              <p className="text-base md:text-lg leading-relaxed mb-6" style={{ color: '#9ca3c2' }}>
                If you or your organization would like to support Frumefni, please reach out directly:
              </p>
              
              <div className="rounded-xl p-6 mb-6" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
                <p className="text-lg font-semibold text-white mb-2">Michael Brandon Lane</p>
                <p className="text-base" style={{ color: '#9ca3c2' }}>Project Lead, Frumefni</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00d4ff]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <a href="mailto:brandon@frumefni.world" className="text-[#00d4ff] hover:underline">brandon@frumefni.world</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#00d4ff]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <a href="https://www.frumefni.world" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">www.frumefni.world</a>
                  </div>
                </div>
              </div>

              {/* Support Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="https://ko-fi.com/frumefni" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-primary text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
                  </svg>
                  Support on Ko-fi
                </a>
                <a 
                  href="https://buy.stripe.com/aFa9AU5zfdPPc5r7ahdQQ04" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-secondary text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                  </svg>
                  Support via Stripe
                </a>
              </div>
            </div>

            {/* Closing Statement */}
            <div className="pt-4 mt-8 border-t" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
              <p className="text-lg md:text-xl leading-relaxed italic text-center" style={{ color: '#e8eaf6' }}>
                Frumefni is not simply an event. It is an exploration of human presence within the larger natural and cosmic systems we inhabit.
              </p>
              <p className="text-lg md:text-xl leading-relaxed font-semibold text-center mt-4 text-white">
                Your support helps make this exploration possible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }} className="mt-16">
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
              <Link href="/" className="text-sm text-[#6b7294] hover:text-[#00d4ff] transition-colors">
                Home
              </Link>
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
