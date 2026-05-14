import React, { useEffect, useRef } from 'react';

// AdSense Client ID from environment variables, fallback for development
const AD_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID || 'ca-pub-5738943819550045';

/**
 * Injects the global Google AdSense script into the document head.
 * Ensures the script is only loaded once.
 */
export function AdSenseScript() {
  useEffect(() => {
    // Only inject once
    if (document.querySelector('script#adsense-script')) return;

    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT_ID}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, []);

  return null;
}

interface AdUnitProps {
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders an individual AdSense ad unit.
 */
export function AdUnit({ slot = '0000000000', format = 'auto', responsive = true, className, style }: AdUnitProps) {
  const isLoaded = useRef(false);

  useEffect(() => {
    if (!isLoaded.current && typeof window !== 'undefined') {
      try {
        // Push ad request to Google's JS array
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        isLoaded.current = true;
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className || ''}`}
      style={style || { display: 'block' }}
      data-ad-client={AD_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
