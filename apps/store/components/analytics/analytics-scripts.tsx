import Script from 'next/script';

import { GA_MEASUREMENT_ID, YANDEX_METRICA_ID } from '@/lib/analytics';
import { PageViewTracker } from '@/components/analytics/page-view-tracker';

// The vendors' own loader snippets, loaded after the page is interactive so
// neither counter competes with the hero image. Renders nothing when no id is
// configured (see lib/analytics.ts).
export function AnalyticsScripts() {
  if (!YANDEX_METRICA_ID && !GA_MEASUREMENT_ID) return null;

  return (
    <>
      {YANDEX_METRICA_ID && (
        <>
          <Script id="yandex-metrica" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${YANDEX_METRICA_ID},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});`}
          </Script>
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc.yandex.ru/watch/${YANDEX_METRICA_ID}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript>
        </>
      )}
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
          </Script>
        </>
      )}
      <PageViewTracker />
    </>
  );
}
