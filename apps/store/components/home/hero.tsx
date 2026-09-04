import Image from 'next/image';
import Link from 'next/link';

// One object, one sentence, one action.
//
// This replaces HeroSlider, which showed two full-bleed photographs on an 8s
// timer behind a blurred glass panel. Three reasons it had to go: a slideshow
// decides for the visitor what they look at and for how long; the frosted panel
// over a photograph is the one texture the shop has nowhere; and a rotating
// banner cannot be the same gesture as the single lit bottle on the island.
//
// The shop's opening move is one object on a bare surface. So is this. Depth
// lives below the fold, in the twelve, exactly as it lives in the drawers.
export function Hero({
  image,
  tagline,
  headline,
  sub,
  cta,
  href,
  code,
}: {
  image: string;
  tagline: string;
  headline: string;
  sub: string;
  cta: string;
  href: string;
  code: string;
}) {
  return (
    <section className="border-border border-b">
      <div className="container grid items-center gap-12 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        {/* Text — left on desktop, second on mobile so the object leads there too */}
        <div className="order-2 max-w-lg space-y-6 md:order-1">
          <span className="text-muted-foreground text-micro block font-mono tracking-[0.28em] uppercase">
            {code}
          </span>

          <h1 className="text-4xl leading-[1.05] font-semibold tracking-[-0.02em] md:text-6xl">
            {headline}
          </h1>

          <p className="text-muted-foreground max-w-md text-sm leading-relaxed">{sub}</p>

          <div className="pt-2">
            <Link
              href={href}
              className="bg-foreground text-background text-label inline-flex h-11 items-center px-7 font-semibold tracking-[0.18em] whitespace-nowrap uppercase transition-opacity hover:opacity-80"
            >
              {cta}
            </Link>
          </div>

          {/* The tagline reads as a caption under a rule, the way the shelf
              label sits under the object — not as a chip beside the button. */}
          <p className="border-border text-muted-foreground text-micro border-t pt-4 font-mono leading-relaxed tracking-[0.2em] uppercase">
            {tagline}
          </p>
        </div>

        {/* The object. Hairline frame, no overlay, no drift, no gradient. */}
        <div className="border-border relative order-1 aspect-[4/5] w-full border md:order-2">
          <Image
            src={image}
            alt={headline}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
