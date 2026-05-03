'use client';

import Script from 'next/script';

/**
 * Loads the Facebook Pixel + Pinterest Tag scripts and fires their
 * init / PageView once each external src finishes loading.
 *
 * Why this lives in a Client Component: the layout is a Server
 * Component and can't pass `onLoad` event handlers to client
 * components. Wrapping the two `<Script>` tags here lets us run init
 * code on load without putting interpolated env vars into an inline
 * `<script>` body — that's what was crashing in iOS Safari + the
 * Facebook in-app browser with `SyntaxError: Unexpected EOF` (Sentry
 * issues CHUNKY-CRAYON-WEB-4X / 4S).
 *
 * Pixel IDs are read from NEXT_PUBLIC_* env vars at build time so they
 * inline as plain string literals here — no template-literal injection
 * into a script body.
 */
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
const PINTEREST_TAG_ID = process.env.NEXT_PUBLIC_PINTEREST_TAG_ID;

const PixelLoaders = () => {
  return (
    <>
      {FB_PIXEL_ID && (
        <>
          {/* Tiny inline stub: sets up window.fbq as a queue so calls
              made between mount and fbevents.js loading are buffered.
              Constant text — no env interpolation = no parse hazard. */}
          <Script id="facebook-pixel-stub" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window,document,'script');`}
          </Script>
          <Script
            id="facebook-pixel-loader"
            strategy="afterInteractive"
            src="https://connect.facebook.net/en_US/fbevents.js"
            onLoad={() => {
              const w = window as Window & {
                fbq?: (...args: unknown[]) => void;
              };
              if (typeof w.fbq === 'function' && FB_PIXEL_ID) {
                w.fbq('init', FB_PIXEL_ID);
                w.fbq('track', 'PageView');
              }
            }}
          />
        </>
      )}
      {PINTEREST_TAG_ID && (
        <>
          <Script id="pinterest-tag-stub" strategy="afterInteractive">
            {`!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[];n.version="3.0"}}();`}
          </Script>
          <Script
            id="pinterest-tag-loader"
            strategy="afterInteractive"
            src="https://s.pinimg.com/ct/core.js"
            onLoad={() => {
              const w = window as Window & {
                pintrk?: (...args: unknown[]) => void;
              };
              if (typeof w.pintrk === 'function' && PINTEREST_TAG_ID) {
                w.pintrk('load', PINTEREST_TAG_ID);
                w.pintrk('page');
              }
            }}
          />
        </>
      )}
    </>
  );
};

export default PixelLoaders;
