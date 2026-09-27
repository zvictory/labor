import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';

import type { ProductDetailDTO } from '@/lib/catalog/types';
import { formatUzs } from '@/lib/money';
import { TELEGRAM_URL } from '@/lib/telegram';
import {
  HERO_SCENES,
  HERO_STORIES,
  weaveHeroSlides,
  type HeroStory,
  type HeroStoryId,
} from '@/lib/catalog/hero-scenes';
import { AddToCart } from '@/components/cart/add-to-cart';
import { TickScale, toTicks } from '@/components/catalog/tick-scale';
import { HeroCarousel } from '@/components/home/hero-carousel';
import { SceneVideo } from '@/components/home/scene-video';

// The home page opens on up to three bottles, one slide each, and the first
// screen of a phone is enough to buy the one showing: name, what it smells
// like, how long it lasts, the price and the button. The photo takes whatever
// height is left (never under 90 px) so the action stays above the fold from a
// 667 px phone up. A product with a scene photograph fills its slide
// full-bleed; any other shows its bottle on paper. Between the bottles come
// stories about the shop — decants, choosing, delivery, notes — each a scene
// with one button to its page.

type Lang = 'en' | 'ru' | 'uz';

type StoryCopy = { code: string; title: string; text: string; cta: string };

const COPY: Record<
  Lang,
  {
    decant: string;
    telegram: string;
    trust: string;
    carousel: string;
    slide: (index: number, count: number) => string;
    pause: string;
    play: string;
    stories: Record<HeroStoryId, StoryCopy>;
  }
> = {
  ru: {
    decant: 'Декант',
    telegram: 'Или закажите в Telegram',
    trust: 'Только оригинал · Доставка по Узбекистану · Оплата при получении или картой',
    carousel: 'Ароматы в фокусе',
    slide: (index, count) => `${index} из ${count}`,
    pause: 'Остановить показ',
    play: 'Продолжить показ',
    stories: {
      decants: {
        code: 'Декант · 10 мл',
        title: 'Сначала — 10 мл',
        text: 'Оригинальные ароматы в декантах по 10 мл: поносите, а потом решайте, нужен ли флакон.',
        cta: 'Смотреть каталог',
      },
      blotters: {
        code: 'Подбор · 4 вопроса',
        title: 'Не знаете, с чего начать?',
        text: 'Ответьте на четыре коротких вопроса, и мы подберём ароматы под настроение, шлейф и образ.',
        cta: 'Подобрать аромат',
      },
      uzbekistan: {
        code: 'Доставка · Узбекистан',
        title: 'Доставка по всему Узбекистану',
        text: 'По Ташкенту — в день заказа, в регионы — за 2–4 дня. Payme, Click, картой или наличными при получении.',
        cta: 'Доставка и оплата',
      },
      notes: {
        code: 'Ноты · сырьё',
        title: 'Аромат начинается с нот',
        text: 'Роза, уд, бергамот, ваниль: выберите ноту и найдите ароматы, в которых она звучит.',
        cta: 'Все ноты',
      },
    },
  },
  en: {
    decant: 'Decant',
    telegram: 'Or order on Telegram',
    trust: 'Authentic only · Delivery across Uzbekistan · Pay on delivery or by card',
    carousel: 'Fragrances in focus',
    slide: (index, count) => `${index} of ${count}`,
    pause: 'Pause the slideshow',
    play: 'Play the slideshow',
    stories: {
      decants: {
        code: 'Decant · 10 ml',
        title: 'Start with 10 ml',
        text: 'Authentic fragrances in 10 ml decants: wear one for a while, then decide whether you need the bottle.',
        cta: 'Browse the catalogue',
      },
      blotters: {
        code: 'Finder · 4 questions',
        title: 'Not sure where to start?',
        text: 'Answer four short questions and we narrow the catalogue to fragrances that fit your mood and your day.',
        cta: 'Find my perfume',
      },
      uzbekistan: {
        code: 'Delivery · Uzbekistan',
        title: 'Delivery across Uzbekistan',
        text: 'Same day in Tashkent, 2–4 days to the regions. Payme, Click, card, or cash on delivery.',
        cta: 'Delivery & payment',
      },
      notes: {
        code: 'Notes · raw materials',
        title: 'A scent begins with its notes',
        text: 'Rose, oud, bergamot, vanilla: pick a note and find the fragrances it lives in.',
        cta: 'All notes',
      },
    },
  },
  uz: {
    decant: 'Dekant',
    telegram: 'Yoki Telegramda buyurtma bering',
    trust:
      'Faqat original · Oʻzbekiston boʻylab yetkazish · Qabul qilganda yoki karta bilan toʻlov',
    carousel: 'Diqqat markazidagi hidlar',
    slide: (index, count) => `${count} tadan ${index}`,
    pause: 'Namoyishni toʻxtatish',
    play: 'Namoyishni davom ettirish',
    stories: {
      decants: {
        code: 'Dekant · 10 ml',
        title: 'Avval — 10 ml',
        text: 'Original atirlar 10 ml dekantlarda: sepib yuring, keyin flakon kerakmi — oʻzingiz hal qilasiz.',
        cta: 'Katalogni koʻrish',
      },
      blotters: {
        code: 'Tanlash · 4 savol',
        title: 'Nimadan boshlashni bilmayapsizmi?',
        text: 'Toʻrtta qisqa savolga javob bering — kayfiyat, vaziyat va ifor kuchiga mos atirlarni tanlab beramiz.',
        cta: 'Atir tanlash',
      },
      uzbekistan: {
        code: 'Yetkazish · Oʻzbekiston',
        title: 'Butun Oʻzbekiston boʻylab yetkazib berish',
        text: 'Toshkent boʻylab — buyurtma kuni, viloyatlarga — 2–4 kunda. Payme, Click, karta yoki yetkazishda naqd.',
        cta: 'Yetkazib berish va toʻlov',
      },
      notes: {
        code: 'Notalar · xomashyo',
        title: 'Atir notalardan boshlanadi',
        text: 'Atirgul, ud, bergamot, vanil: notani tanlang va u bor atirlarni toping.',
        cta: 'Barcha notalar',
      },
    },
  },
};

// The photograph settles while its slide shows (a little longer than the 7 s
// timer, so it is still moving under the crossfade), and the text rises in
// block by block; --rise staggers the blocks. Reduced motion: both stay still.
// A scene's loop drifts with its photograph, so the two stay registered while
// the loop fades in over it.
const DRIFT = 'motion-safe:group-data-[active=true]/slide:animate-[hero-drift_7.5s_ease-out_both]';
const RISE =
  'motion-safe:group-data-[active=true]/slide:animate-[hero-rise_600ms_cubic-bezier(.22,1,.36,1)_var(--rise)_both]';

// Both kinds of slide share the frame and the type: a story reads as a page of
// the same catalogue as the bottles around it.
const FRAME =
  'container flex h-[clamp(400px,calc(100svh-230px),500px)] flex-col gap-3 py-4 lg:h-[clamp(560px,calc(100svh-140px),720px)] lg:justify-center lg:py-16';
const COLUMN = 'relative flex shrink-0 flex-col gap-3 lg:isolate lg:max-w-[440px] lg:gap-8';
const CODE_LINE = 'text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase';
const TITLE =
  'text-[32px] leading-9 font-semibold tracking-[-0.025em] md:text-5xl md:leading-[1.05]';

// One note per layer: how the scent opens, sits and dries down.
const arcOf = (notes: ProductDetailDTO['notes']): string[] =>
  [notes.top[0], notes.middle[0], notes.base[0]].flatMap((n) => (n ? [n.name] : []));

export function Hero({
  products,
  locale,
  lang,
}: {
  products: ProductDetailDTO[];
  locale: string;
  lang: Lang;
}) {
  const c = COPY[lang];
  const slots = weaveHeroSlides(products, HERO_STORIES);
  const labels = {
    carousel: c.carousel,
    slides: slots.map(
      (slot, i) =>
        `${c.slide(i + 1, slots.length)}: ${slot.kind === 'product' ? slot.product.name : c.stories[slot.story.id].title}`,
    ),
    pause: c.pause,
    play: c.play,
  };

  return (
    <HeroCarousel
      labels={labels}
      slides={slots.map((slot, i) =>
        slot.kind === 'product' ? (
          <HeroSlide
            key={slot.product.id}
            product={slot.product}
            locale={locale}
            lang={lang}
            first={i === 0}
          />
        ) : (
          <StorySlide
            key={slot.story.id}
            story={slot.story}
            locale={locale}
            lang={lang}
            first={i === 0}
          />
        ),
      )}
    />
  );
}

function HeroSlide({
  product,
  locale,
  lang,
  first,
}: {
  product: ProductDetailDTO;
  locale: string;
  lang: Lang;
  /** The first slide carries the page's h1 and the priority image. */
  first: boolean;
}) {
  const t = useTranslations('product');
  const c = COPY[lang];
  const pdp = `/${locale}/product/${product.slug}`;
  const codeLine = [
    product.brand,
    product.volume_ml ? `${c.decant} ${t('volumeShort', { ml: product.volume_ml })}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const arc = arcOf(product.notes);
  const scene = HERO_SCENES[product.slug];
  const src = scene?.src ?? product.image;
  const Title = first ? 'h1' : 'h2';

  return (
    <div className={FRAME}>
      <Link
        href={pdp}
        className={`relative min-h-[90px] flex-1 overflow-hidden lg:absolute lg:min-h-0 ${scene ? 'lg:inset-0' : 'lg:top-16 lg:right-0 lg:bottom-24 lg:left-1/2'}`}
      >
        {src && (
          <Image
            src={src}
            alt={product.name}
            fill
            priority={first}
            sizes={scene ? '100vw' : '(min-width:1024px) 50vw, 100vw'}
            className={`${scene ? 'object-cover' : 'object-contain mix-blend-multiply dark:mix-blend-normal'} ${DRIFT}`}
            style={scene ? { objectPosition: scene.position } : undefined}
          />
        )}
        {scene?.video && (
          <SceneVideo
            video={scene.video}
            className={`object-cover ${DRIFT}`}
            style={{ objectPosition: scene.position }}
          />
        )}
      </Link>

      <div className={COLUMN}>
        {scene && <SceneScrim />}
        <div className="flex flex-col gap-2">
          {codeLine && <p className={`${CODE_LINE} ${RISE} [--rise:0ms]`}>{codeLine}</p>}
          <Title className={`${TITLE} ${RISE} [--rise:60ms]`}>
            <Link href={pdp}>{product.name}</Link>
          </Title>
          {arc.length > 0 && (
            <p className={`text-muted-foreground text-label font-mono ${RISE} [--rise:120ms]`}>
              {arc.join(' · ')}
            </p>
          )}
          <div className={`flex items-end justify-between gap-4 pt-0.5 ${RISE} [--rise:180ms]`}>
            <div className="flex gap-5">
              <Measure label={t('longevity')} ticks={toTicks(product.avg_longevity, 10)} />
              <Measure label={t('sillage')} ticks={toTicks(product.avg_sillage, 10)} />
            </div>
            <p className="font-mono text-[15px] leading-5 whitespace-nowrap tabular-nums">
              {formatUzs(product.price, locale)}
            </p>
          </div>
        </div>

        <div className={`flex flex-col ${RISE} [--rise:240ms]`}>
          <AddToCart productId={product.id} locale={locale} />
          <a
            href={TELEGRAM_URL}
            className="flex min-h-11 items-center justify-center font-mono text-xs underline underline-offset-4"
          >
            {c.telegram}
          </a>
          <p className="text-muted-foreground text-label text-center font-mono text-balance">
            {c.trust}
          </p>
        </div>
      </div>
    </div>
  );
}

function StorySlide({
  story,
  locale,
  lang,
  first,
}: {
  story: HeroStory;
  locale: string;
  lang: Lang;
  /** The first slide carries the page's h1 and the priority image. */
  first: boolean;
}) {
  const s = COPY[lang].stories[story.id];
  const href = `/${locale}${story.path}`;
  const Title = first ? 'h1' : 'h2';
  const fit = `object-cover [object-position:var(--pos-phone)] lg:[object-position:var(--pos)] ${DRIFT}`;
  const crop = { '--pos': story.position, '--pos-phone': story.phonePosition } as CSSProperties;

  return (
    <div className={FRAME}>
      {/* The photograph repeats the button's link for a tap; the keyboard and
          screen readers get the button alone. */}
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="relative min-h-[90px] flex-1 overflow-hidden lg:absolute lg:inset-0 lg:min-h-0"
      >
        <Image
          src={story.src}
          alt=""
          fill
          priority={first}
          sizes="100vw"
          className={fit}
          style={crop}
        />
        {story.video && <SceneVideo video={story.video} className={fit} style={crop} />}
      </Link>

      <div className={COLUMN}>
        <SceneScrim />
        <div className="flex flex-col gap-2">
          <p className={`${CODE_LINE} ${RISE} [--rise:0ms]`}>{s.code}</p>
          <Title className={`${TITLE} ${RISE} [--rise:60ms]`}>{s.title}</Title>
          <p className={`text-muted-foreground text-sm text-pretty ${RISE} [--rise:120ms]`}>
            {s.text}
          </p>
        </div>
        <Link
          href={href}
          className={`bg-foreground text-background flex h-12 items-center justify-center px-7 text-xs font-semibold tracking-[0.18em] uppercase transition-colors hover:opacity-85 ${RISE} [--rise:180ms]`}
        >
          {s.cta}
        </Link>
      </div>
    </div>
  );
}

// Over a scene, the page's paper runs in from the left behind the text and
// thins out past it, so the price and the small print stay legible whatever
// the photograph puts there. It hangs off the text column, so it follows the
// text at every width.
function SceneScrim() {
  return (
    <span
      aria-hidden
      className="absolute -inset-y-[100vh] -right-48 -left-[100vw] -z-10 hidden bg-[linear-gradient(to_right,hsl(var(--background)/0.9)_calc(100%-16rem),hsl(var(--background)/0.6)_calc(100%-8rem),transparent)] lg:block"
    />
  );
}

function Measure({ label, ticks }: { label: string; ticks: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-micro font-mono leading-3 tracking-[0.16em] uppercase">
        {label}
      </span>
      <TickScale value={ticks} label={label} />
    </div>
  );
}
