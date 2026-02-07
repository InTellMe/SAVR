'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface VideoConfig {
  src: string;
  text?: string;
}

const VIDEOS: VideoConfig[] = [
  {
    src: 'https://player.cloudinary.com/embed/?cloud_name=dksj2niho&public_id=V26IldZawv9enlKxsjkB-seedance-1-5-pro-353gx_zym9gv',
  },
  {
    src: 'https://player.cloudinary.com/embed/?cloud_name=dksj2niho&public_id=Jxf1HeY1hWtqqoiNFq2W-seedance-1-5-pro-wu6pa_1_dqktv6',
    text: 'Now offering safe recipes for your pets!',
  },
];

const ROTATION_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds (as specified in requirements)
const VIDEO_LOAD_TIMEOUT = 10000; // 10 seconds timeout for video loading

export default function VideoHero() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [showText, setShowText] = useState(false);

  // Rotate videos every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % VIDEOS.length);
      setShowText(false); // Reset text visibility on video change
      setShowFallback(false); // Reset fallback on video change
    }, ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Fallback timeout: if video doesn't load within timeout, show fallback
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (!showFallback) {
      timeoutId = setTimeout(() => {
        // If we reach here and haven't explicitly loaded, assume failure
        console.warn('Video load timeout reached, showing fallback');
        setShowFallback(true);
      }, VIDEO_LOAD_TIMEOUT);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentVideoIndex, showFallback]);

  // Handle text fade-in for second video
  useEffect(() => {
    if (currentVideoIndex === 1 && VIDEOS[1].text) {
      // Show text 2 seconds after video loads
      const timeout = setTimeout(() => {
        setShowText(true);
      }, 2000);

      return () => clearTimeout(timeout);
    } else {
      setShowText(false);
    }
  }, [currentVideoIndex]);

  const currentVideo = VIDEOS[currentVideoIndex];

  return (
    <div className="relative mb-8 flex justify-center">
      {/* Video container */}
      <div className="relative w-48 md:w-72 h-auto animate-float">
        {showFallback ? (
          // Fallback logo image
          <Image
            src="https://res.cloudinary.com/dksj2niho/image/upload/w_640,h_640,c_fit,q_auto,f_auto/v1770328403/SAVR_Logo_NO_BG_3_hixen3.png"
            alt="SAVR Logo"
            width={280}
            height={280}
            className="w-full h-auto drop-shadow-[0_0_60px_rgba(0,212,255,0.25)]"
            priority
            unoptimized
          />
        ) : (
          <div className="relative" style={{ aspectRatio: '640 / 360' }}>
            {/* Cloudinary video embed with autoplay enabled by default */}
            {/* Note: Video looping and audio settings are configured in the Cloudinary video player */}
            {/* The onLoad handler cancels the timeout when iframe loads. While this doesn't guarantee
                the video content loaded successfully, it's the best detection available without 
                direct access to the Cloudinary player API */}
            <iframe
              src={currentVideo.src}
              width="640"
              height="360"
              style={{ height: 'auto', width: '100%', aspectRatio: '640 / 360' }}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              className="rounded-lg drop-shadow-[0_0_60px_rgba(0,212,255,0.25)]"
              onLoad={() => {
                // Iframe loaded successfully, cancel fallback timeout
                setShowFallback(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Text overlay for second video */}
      {currentVideo.text && showText && (
        <div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center px-6 py-3 rounded-lg"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            animation: 'fadeIn 2s ease-in-out',
          }}
        >
          <p className="text-sm md:text-base font-semibold text-[#00d4ff]">
            {currentVideo.text}
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, 10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}
