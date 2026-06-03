import Script from 'next/script';

// Inject the GA4 + Meta Pixel libraries, each gated on its ID env. When an ID
// is absent the tag is omitted entirely, so window.gtag / window.fbq never
// exist and track() no-ops. Mounted in the (site) layout only — never under
// /tg/, so Telegram miniapp traffic is not double-counted.
//
// Both loaders self-inject their <script> from inside an inline Script (the
// pattern Meta's base snippet already uses). We deliberately avoid next/script's
// `src` prop: under this repo's strict tsconfig (exactOptionalPropertyTypes +
// moduleResolution:Bundler) the React 19 typings reject `<Script src=...>`, and
// the inline-children form is the only one that typechecks. Runtime behaviour
// (async load) is identical.
//
// Page-view autosend is disabled on both (GA: send_page_view:false; Meta: no
// fbq('track','PageView') here). AnalyticsListener fires PageView on mount and
// every route change — the SPA-correct source of truth.

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const AnalyticsScripts = () => (
  <>
    {GA_ID && (
      <Script id="ga4-init" strategy="afterInteractive">
        {`(function(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';document.head.appendChild(s);})();window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`}
      </Script>
    )}

    {META_ID && (
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_ID}');`}
      </Script>
    )}
  </>
);
