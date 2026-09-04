'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { ArrowLeft, Check, RotateCcw, ShoppingBag, Sparkles, Award, Quote } from 'lucide-react';
import { formatRating, formatUzs } from '@/lib/money';
import { emitCartUpdated } from '@/components/cart/cart-events';

export interface FinderCandidate {
  id: number;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  avg_rating: number;
  top_accord?: { name: string; color_hex: string } | null | undefined;
  matchedFamilies: string[];
  matchedGender?: string;
}

type AnswerKey = 'style' | 'family' | 'occasion' | 'presence';

interface Choice {
  id: string;
  label: string;
  text: string;
  families?: string[];
  gender?: string;
  occasion?: 'day' | 'evening' | 'gift';
  presence?: 'quiet' | 'balanced' | 'bold';
}

interface Step {
  key: AnswerKey;
  eyebrow: string;
  title: string;
  helper: string;
  choices: Choice[];
}

export interface FinderCopy {
  eyebrow: string;
  title: string;
  intro: string;
  start: string;
  progress: string;
  back: string;
  restart: string;
  resultsEyebrow: string;
  resultsTitle: string;
  resultsIntro: string;
  match: string;
  view: string;
  add: string;
  added: string;
  emptyTitle: string;
  emptyBody: string;
  steps: Step[];
  reasons: {
    family: string;
    gender: string;
    occasion: string;
    presenceQuiet: string;
    presenceBalanced: string;
    presenceBold: string;
    rating: string;
  };
}

interface Props {
  locale: string;
  candidates: FinderCandidate[];
  copy: FinderCopy;
}

type Answers = Partial<Record<AnswerKey, Choice>>;

interface ScoredProduct {
  product: FinderCandidate;
  score: number;
  reasons: string[];
  breakdown: {
    accord: number;
    style: number;
    intensity: number;
  };
  sommelierNote: string;
}

interface Archetype {
  name: string;
  tagline: string;
  description: string;
  notes: string[];
}

const ARCHETYPES: Record<'en' | 'ru' | 'uz', Record<'bold' | 'minimalist' | 'muse' | 'romantic', Archetype>> = {
  en: {
    bold: {
      name: 'The Bold Enigma',
      tagline: 'Mysterious, commanding, and profoundly deep',
      description: 'You gravitate towards fragrances that make a memorable entrance. Your ideal scent signature is rich, structured, and carries a shadow of smoke, fine leather, and rich woods.',
      notes: ['Oud', 'Leather', 'Cedarwood', 'Tobacco'],
    },
    minimalist: {
      name: 'The Sun-Drenched Minimalist',
      tagline: 'Effortless, crisp, and clean',
      description: 'You appreciate clarity, order, and close-to-skin refinement. You prefer refreshing citrus, morning air, and bright aquatic notes that whisper rather than shout.',
      notes: ['Bergamot', 'Neroli', 'Sea Salt', 'White Musk'],
    },
    muse: {
      name: 'The Ethereal Muse',
      tagline: 'Radiant, natural, and delicately polished',
      description: 'You seek harmony and soft natural beauty. Your signature consists of velvet petals, green garden leaves, and clean air, radiating an aura of polished sophistication.',
      notes: ['Rose', 'Jasmine', 'Green Leaves', 'Iris'],
    },
    romantic: {
      name: 'The Midnight Romantic',
      tagline: 'Sweet, magnetic, and warm',
      description: 'You prefer intimate warmth and magnetic depth. Your signature is amber-driven, spiced, and leaves a lingering trail designed for dinner, low lights, and close conversations.',
      notes: ['Amber', 'Vanilla', 'Cardamom', 'Cinnamon'],
    },
  },
  ru: {
    bold: {
      name: 'Загадочный Силуэт',
      tagline: 'Таинственный, властный и глубокий',
      description: 'Вы выбираете ароматы, которые создают запоминающийся образ. Ваша идеальная парфюмерная подпись — насыщенная, плотная, со шлейфом из кожи, дыма и благородного дерева.',
      notes: ['Уд', 'Кожа', 'Кедр', 'Табак'],
    },
    minimalist: {
      name: 'Солнечный Минималист',
      tagline: 'Естественный, чистый и лаконичный',
      description: 'Вы цените ясность, гармонию и утонченность близко к коже. Вы предпочитаете освежающие цитрусы, утренний воздух и легкие морские брызги, которые шепчут, а не кричат.',
      notes: ['Бергамот', 'Нероли', 'Морская соль', 'Мускус'],
    },
    muse: {
      name: 'Эфирная Муза',
      tagline: 'Сияющая, природная и деликатная',
      description: 'Вы ищете природную гармонию и мягкую красоту. Ваша подпись соткана из бархатных лепестков, зеленых листьев и свежего ветра, создавая ореол утонченного изящества.',
      notes: ['Роза', 'Жасмин', 'Зеленые листья', 'Ирис'],
    },
    romantic: {
      name: 'Полуночный Романтик',
      tagline: 'Сладкий, притягательный и теплый',
      description: 'Вы предпочитаете интимное тепло и магнетическую глубину. Ваш аромат — амбровый, пряный, оставляющий притягательный шлейф для ужинов и близких бесед.',
      notes: ['Амбра', 'Ваниль', 'Кардамон', 'Корица'],
    },
  },
  uz: {
    bold: {
      name: 'Sirlu Enigma',
      tagline: 'Sirli, kuchli va chuqur ifor egasi',
      description: 'Siz esda qoladigan taassurot qoldiruvchi iforlarni tanlaysiz. Sizning ideal atiringiz — quyuq, terili, tutunli va olijanob daraxt ohanglaridan iborat.',
      notes: ['Udm daraxti', 'Charm', 'Kedr', 'Tamaki'],
    },
    minimalist: {
      name: 'Quyoshli Minimalist',
      tagline: 'Yengil, toza va tabiiy',
      description: 'Siz teriga yaqin bo‘lgan nozik va toza iforlarni qadrlaysiz. Siz shivirlovchi sitruslar, tonggi shabada va yorqin dengiz notalarini afzal ko‘rasiz.',
      notes: ['Bergamot', 'Neroli', 'Dengiz tuzi', 'Oq mushk'],
    },
    muse: {
      name: 'Efirli Muza',
      tagline: 'Yorqin, tabiiy va mayin joziba',
      description: 'Siz tabiiy uyg‘unlik va yumshoq go‘zallikni izlaysiz. Sizning signalingiz mayin gullar, yashil bog‘lar va toza havodan iborat nafislikdir.',
      notes: ['Atirgul', 'Yosmin', 'Yashil barglar', 'Iris'],
    },
    romantic: {
      name: 'Tungi Romantik',
      tagline: 'Shirin, maftunkor va iliq ifor egasi',
      description: 'Siz iliqlik va sehrli chuqurlikni afzal ko‘rasiz. Atiringiz ambrali, ziravorli bo‘lib, shinam uchrashuvlar va yaqin suhbatlar uchun unutilmas shleyf qoldiradi.',
      notes: ['Ambra', 'Vanil', 'Ziravorlar', 'Dolchin'],
    },
  },
};

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const hasFamily = (product: FinderCandidate, families: string[]): boolean => {
  const productFamilies = product.matchedFamilies.map(normalize);
  const accord = product.top_accord ? normalize(product.top_accord.name) : '';
  return families.some((family) => productFamilies.includes(family) || accord.includes(family));
};

const getChoiceSubChips = (choiceId: string, locale: string) => {
  const isRu = locale === 'ru';
  const isUz = locale === 'uz';

  switch (choiceId) {
    // Families
    case 'woods':
      return isRu ? ['Кедр', 'Сандал', 'Кожа'] : isUz ? ['Kedr', 'Sandal', 'Charm'] : ['Cedar', 'Sandalwood', 'Leather'];
    case 'flowers':
      return isRu ? ['Роза', 'Жасмин', 'Зеленый лист'] : isUz ? ['Atirgul', 'Yosmin', 'Yashil barg'] : ['Rose', 'Jasmine', 'Green Leaf'];
    case 'fresh':
      return isRu ? ['Бергамот', 'Морская соль', 'Мята'] : isUz ? ['Bergamot', 'Dengiz tuzi', 'Yalpiz'] : ['Bergamot', 'Sea Salt', 'Mint'];
    case 'warm':
      return isRu ? ['Амбра', 'Ваниль', 'Кардамон'] : isUz ? ['Ambra', 'Vanil', 'Dolchin'] : ['Amber', 'Vanilla', 'Cardamom'];
    
    // Gender / Style
    case 'unisex':
      return isRu ? ['Для всех', 'Гибкий'] : isUz ? ['Barcha uchun', 'Moslashuvchan'] : ['For Everyone', 'Adaptive'];
    case 'men':
      return isRu ? ['Древесный', 'Фулжерный'] : isUz ? ['Yog‘ochli', 'Fulerli'] : ['Woody', 'Fougere'];
    case 'women':
      return isRu ? ['Цветочный', 'Пудровый'] : isUz ? ['Gulli', 'Pudrali'] : ['Floral', 'Powdery'];
    case 'neutral':
      return isRu ? ['Свободный стиль'] : isUz ? ['Erkin uslub'] : ['Free Form'];

    // Moments
    case 'daily':
      return isRu ? ['Офис', 'Прогулка'] : isUz ? ['Ofis', 'Sayohat'] : ['Office', 'Casual'];
    case 'evening':
      return isRu ? ['Свидание', 'Театр'] : isUz ? ['Uchrashuv', 'Teatr'] : ['Date Night', 'Gala'];
    case 'gift':
      return isRu ? ['Безопасный выбор'] : isUz ? ['Xavfsiz tanlov'] : ['Safe & Elegant'];
    case 'statement':
      return isRu ? ['Шлейфовый', 'Яркий'] : isUz ? ['Shleyfli', 'Yorqin'] : ['High Projection', 'Bold Signature'];

    // Presence
    case 'quiet':
      return isRu ? ['Интимный', 'До 2 метров'] : isUz ? ['Intim', '2 metrgacha'] : ['Intimate', '< 2m'];
    case 'balanced':
      return isRu ? ['Универсальный', '2-4 метра'] : isUz ? ['Universal', '2-4 metr'] : ['Versatile', '2-4m'];
    case 'bold':
      return isRu ? ['Сверхстойкий', 'Более 4 метров'] : isUz ? ['Uzoq turuvchi', '4 metrdan ortiq'] : ['Ultra Lasting', '> 4m'];
    case 'surprise':
      return isRu ? ['Любая интенсивность'] : isUz ? ['Istalgan kuch'] : ['Any Sillage'];

    default:
      return [];
  }
};

const generateSommelierNote = (
  product: FinderCandidate,
  answers: Answers,
  locale: string,
): string => {
  const isRu = locale === 'ru';
  const isUz = locale === 'uz';
  const topAccord = product.top_accord?.name || (isRu ? 'аромат' : isUz ? 'ifor' : 'scent');
  const familyId = answers.family?.id;
  const occasionId = answers.occasion?.id;

  if (familyId === 'woods') {
    if (occasionId === 'evening' || occasionId === 'statement') {
      return isRu 
        ? `Этот глубокий древесный аромат с доминирующим аккордом ${topAccord} идеально подчеркивает вечерний образ, создавая магнетический шлейф.`
        : isUz
          ? `Ushbu quyuq yog‘ochli ifor, tarkibidagi ${topAccord} akkordi bilan, kechki tadbirlarda sizga sirlilik va alohida joziba bag‘ishlaydi.`
          : `This deep woody profile, characterized by its dominant ${topAccord} accord, is structured perfectly for evening statements, casting a powerful, magnetic trail.`;
    }
    return isRu
      ? `Благородные древесные ноты (${topAccord}) создают сухую, уверенную базу, которая звучит сдержанно и изысканно на протяжении всего дня.`
      : isUz
        ? `Olijanob yog‘ochli notalar (${topAccord}) kun davomida sizga bosiq va ishonchli hamrohlik qiluvchi quruq, salobatli asos yaratadi.`
        : `Noble dry woods (${topAccord}) form a structured, confident base that remains highly refined and composed for daily signature wear.`;
  }

  if (familyId === 'flowers') {
    return isRu
      ? `Воздушное цветочное сердце на основе ${topAccord} раскрывается мягким, изящным букетом, привнося в образ природную свежесть и утонченную элегантность.`
      : isUz
        ? `Tarkibidagi ${topAccord} notalari bilan boyitilgan gulli yurak tabiiy va mayin guldasta bo‘lib ochiladi va sizga nafis joziba beradi.`
        : `A radiant floral heart driven by ${topAccord} blooms with natural grace, conveying an atmosphere of polished, ethereal sophistication.`;
  }

  if (familyId === 'fresh') {
    return isRu
      ? `Взрыв бодрящего аккорда ${topAccord} дарит мгновенный прилив энергии. Отличный выбор для дневного ритма и безупречной чистоты.`
      : isUz
        ? `Tetiklashtiruvchi ${topAccord} akkordi sizga faol kun davomida toza va yengil energiya bag‘ishlaydi. Kunduzgi ritm uchun ideal tanlov.`
        : `An invigorating burst of ${topAccord} offers immediate clarity and freshness. An effortless, clean daily companion for the modern minimalist.`;
  }

  if (familyId === 'warm') {
    return isRu
      ? `Обволакивающее тепло ${topAccord} раскрывается интимно и чувственно, оставляя стойкий соблазнительный шлейф для особых моментов.`
      : isUz
        ? `Atirning ${topAccord} ohanglari terida juda mayin va jozibali ochiladi hamda yaqin suhbatlar uchun unutilmas shleyf qoldiradi.`
        : `The enveloping warmth of ${topAccord} opens with sensual, intimate depth, creating a lingering and irresistible amber trail.`;
  }

  return isRu
    ? `Элегантная композиция с выраженным аккордом ${topAccord}. Аромат идеально сбалансирован и готов подчеркнуть вашу индивидуальность.`
    : isUz
      ? `Yorqin ${topAccord} akkordiga ega nafis kompozitsiya. Ifor ajoyib tarzda muvozanatlangan bo‘lib, o‘ziga xosligingizni namoyon etadi.`
      : `An elegant composition highlighted by a refined ${topAccord} accord. Beautifully balanced to amplify your personal scent signature.`;
};

const scoreProduct = (
  product: FinderCandidate,
  answers: Answers,
  copy: FinderCopy,
  locale: string,
): ScoredProduct => {
  let score = 42;
  const reasons: string[] = [];
  const familyChoice = answers.family;
  const styleChoice = answers.style;
  const occasionChoice = answers.occasion;
  const presenceChoice = answers.presence;

  let accordMatch = 60;
  let styleMatch = 65;
  let intensityMatch = 60;

  if (familyChoice?.families && hasFamily(product, familyChoice.families)) {
    score += 24;
    accordMatch += 35;
    reasons.push(copy.reasons.family.replace('{family}', familyChoice.label));
  }

  if (styleChoice?.gender && product.matchedGender === styleChoice.gender) {
    score += 16;
    styleMatch += 30;
    reasons.push(copy.reasons.gender.replace('{style}', styleChoice.label));
  } else if (styleChoice?.gender === 'unisex' && !product.matchedGender) {
    score += 8;
    styleMatch += 15;
  }

  if (occasionChoice?.families && hasFamily(product, occasionChoice.families)) {
    score += 14;
    accordMatch = Math.min(accordMatch + 15, 100);
    reasons.push(copy.reasons.occasion.replace('{occasion}', occasionChoice.label));
  }

  if (presenceChoice?.presence === 'quiet') {
    if (product.price <= 1_000_000) {
      score += 10;
      intensityMatch += 35;
    } else {
      score += 4;
      intensityMatch += 15;
    }
    reasons.push(copy.reasons.presenceQuiet);
  }

  if (presenceChoice?.presence === 'balanced') {
    if (product.avg_rating >= 7) {
      score += 12;
      intensityMatch += 30;
    } else {
      score += 6;
      intensityMatch += 15;
    }
    reasons.push(copy.reasons.presenceBalanced);
  }

  if (presenceChoice?.presence === 'bold') {
    const boldFamilies = ['leather', 'smoky', 'amber', 'woody', 'oriental', 'spicy'];
    if (hasFamily(product, boldFamilies)) {
      score += 16;
      intensityMatch += 35;
    } else {
      score += 6;
      intensityMatch += 15;
    }
    reasons.push(copy.reasons.presenceBold);
  }

  if (product.avg_rating >= 7.5) {
    score += 8;
    reasons.push(copy.reasons.rating);
  }

  return {
    product,
    score: Math.min(score, 98),
    reasons: Array.from(new Set(reasons)).slice(0, 3),
    breakdown: {
      accord: Math.min(accordMatch, 98),
      style: Math.min(styleMatch, 98),
      intensity: Math.min(intensityMatch, 98),
    },
    sommelierNote: generateSommelierNote(product, answers, locale),
  };
};

export function PerfumeFinderClient({ locale, candidates, copy }: Props) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [addedId, setAddedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentStep = copy.steps[stepIndex];
  const isComplete = copy.steps.every((step) => Boolean(answers[step.key]));

  const results = useMemo(() => {
    return candidates
      .map((product) => scoreProduct(product, answers, copy, locale))
      .sort((a, b) => b.score - a.score || b.product.avg_rating - a.product.avg_rating)
      .slice(0, 3);
  }, [answers, candidates, copy, locale]);

  // Determine Archetype
  const archetypeKey = useMemo((): 'bold' | 'minimalist' | 'muse' | 'romantic' => {
    if (!isComplete) return 'minimalist';
    const family = answers.family?.id;
    const occasion = answers.occasion?.id;

    if (family === 'woods' || (family === 'warm' && (occasion === 'evening' || occasion === 'statement'))) {
      return 'bold';
    }
    if (family === 'flowers') {
      return 'muse';
    }
    if (family === 'warm') {
      return 'romantic';
    }
    return 'minimalist';
  }, [answers, isComplete]);

  const localArchetype = useMemo((): Archetype => {
    const lang = (['ru', 'en', 'uz'].includes(locale) ? locale : 'en') as 'en' | 'ru' | 'uz';
    return ARCHETYPES[lang][archetypeKey];
  }, [archetypeKey, locale]);

  const getArchetypeStyle = (key: 'bold' | 'minimalist' | 'muse' | 'romantic') => {
    switch (key) {
      case 'bold':
        return {
          cardBg: 'bg-gradient-to-br from-neutral-950 via-stone-950 to-amber-950/40 border-amber-500/20 text-neutral-100',
          badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          iconColor: 'text-amber-400',
          textColor: 'text-stone-300',
          accentBorder: 'border-amber-500/30'
        };
      case 'muse':
        return {
          cardBg: 'bg-gradient-to-br from-rose-50/40 via-background to-emerald-50/20 dark:from-rose-950/10 dark:via-stone-950 dark:to-emerald-950/10 border-rose-500/10 dark:border-rose-500/20 text-foreground',
          badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400',
          iconColor: 'text-rose-500 dark:text-rose-400',
          textColor: 'text-ink-muted dark:text-stone-300',
          accentBorder: 'border-rose-500/20'
        };
      case 'romantic':
        return {
          cardBg: 'bg-gradient-to-br from-amber-500/5 via-background to-rose-950/10 dark:from-amber-950/20 dark:via-stone-950 dark:to-rose-950/20 border-orange-500/10 dark:border-orange-500/20 text-foreground',
          badgeBg: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
          iconColor: 'text-orange-600 dark:text-orange-400',
          textColor: 'text-ink-muted dark:text-stone-300',
          accentBorder: 'border-orange-500/20'
        };
      case 'minimalist':
      default:
        return {
          cardBg: 'bg-gradient-to-br from-neutral-50 via-background to-stone-100 dark:from-neutral-950 dark:via-stone-950 dark:to-stone-900/30 border-stone-200 dark:border-stone-800 text-foreground',
          badgeBg: 'bg-stone-500/10 border-stone-500/20 text-stone-600 dark:text-stone-400',
          iconColor: 'text-stone-500 dark:text-stone-400',
          textColor: 'text-ink-muted dark:text-stone-300',
          accentBorder: 'border-stone-300 dark:border-stone-800'
        };
    }
  };

  const arcStyle = getArchetypeStyle(archetypeKey);

  const choose = (choice: Choice) => {
    if (!currentStep) return;
    setAnswers((next) => ({ ...next, [currentStep.key]: choice }));
    if (stepIndex < copy.steps.length - 1) {
      setStepIndex((index) => index + 1);
    }
  };

  const restart = () => {
    setStarted(false);
    setStepIndex(0);
    setAnswers({});
    setAddedId(null);
  };

  const addProduct = (product: FinderCandidate) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/cart?locale=${locale}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ productId: product.id, isSample: false, quantity: 1 }),
        });
        if (!res.ok) throw new Error('request failed');
        const cart = await res.json();
        emitCartUpdated(cart);
        setAddedId(product.id);
      } catch (err) {
        console.error('Failed to add to cart:', err);
      }
    });
  };

  if (candidates.length === 0) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-brass text-[10px] font-bold tracking-[0.32em] uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="text-ink dark:text-bone mt-4 font-sans text-4xl font-bold tracking-tight md:text-6xl">
          {copy.emptyTitle}
        </h1>
        <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-sm leading-7 dark:text-stone-300">
          {copy.emptyBody}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        {/* Left Side: Header, Progress & Scent Signature Tracker */}
        <div className="lg:sticky lg:top-32 space-y-8">
          <div>
            <p className="text-brass text-[10px] font-bold tracking-[0.34em] uppercase flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.eyebrow}
            </p>
            <h1 className="text-ink dark:text-bone mt-5 max-w-xl font-sans text-4xl leading-[1.15] font-bold tracking-tight md:text-6xl">
              {copy.title}
            </h1>
            <p className="text-ink-muted mt-6 max-w-md text-sm leading-7 md:text-base dark:text-stone-300">
              {copy.intro}
            </p>
          </div>

          {/* Scent Profile Signature Panel (Smart live-updating element) */}
          {started && (
            <div className="bg-bone/80 border border-brass/10 rounded-2xl p-6 space-y-4 shadow-sm dark:bg-[#1A1714]/30 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none -z-10">
                <div className="absolute -top-16 -left-16 w-32 h-32 rounded-full bg-brass/5 blur-[50px]" />
                <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-brass/5 blur-[50px]" />
              </div>

              <h3 className="text-xs font-bold uppercase tracking-widest text-brass border-b border-brass/15 pb-2">
                {locale === 'ru' ? 'Ваша Парфюмерная Сигнатура' : locale === 'uz' ? 'Sizning Ifor Signalingiz' : 'Your Scent Profile'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">{locale === 'ru' ? 'Направление:' : locale === 'uz' ? 'Yo‘nalish:' : 'Direction:'}</span>
                  <span className="font-semibold text-ink dark:text-bone">
                    {answers.family ? answers.family.label : '...'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">{locale === 'ru' ? 'Стиль:' : locale === 'uz' ? 'Uslub:' : 'Style:'}</span>
                  <span className="font-semibold text-ink dark:text-bone">
                    {answers.style ? answers.style.label : '...'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">{locale === 'ru' ? 'Окружение:' : locale === 'uz' ? 'Vaziyat:' : 'Moment:'}</span>
                  <span className="font-semibold text-ink dark:text-bone">
                    {answers.occasion ? answers.occasion.label : '...'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-400">{locale === 'ru' ? 'Интенсивность:' : locale === 'uz' ? 'Kuch:' : 'Presence:'}</span>
                  <span className="font-semibold text-ink dark:text-bone">
                    {answers.presence ? answers.presence.label : '...'}
                  </span>
                </div>
              </div>

              {/* Scent Spectrum Visualization */}
              <div className="space-y-2 pt-2 border-t border-brass/10">
                <span className="text-[10px] uppercase font-bold tracking-widest text-brass block">
                  {locale === 'ru' ? 'Сенсорный баланс' : locale === 'uz' ? 'Sensor balans' : 'Sensory Spectrum'}
                </span>
                <div className="grid grid-cols-4 gap-1 h-2.5 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-800/50 border border-stone-200/50 dark:border-stone-700/30">
                  <div 
                    className={['h-full transition-all duration-750', 
                      answers.family?.id === 'fresh' || answers.occasion?.id === 'daily' ? 'bg-teal-500/80 shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'bg-stone-200 dark:bg-stone-800'
                    ].join(' ')} 
                    title="Fresh"
                  />
                  <div 
                    className={['h-full transition-all duration-750', 
                      answers.family?.id === 'flowers' || answers.occasion?.id === 'gift' ? 'bg-rose-400/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-stone-200 dark:bg-stone-800'
                    ].join(' ')} 
                    title="Floral"
                  />
                  <div 
                    className={['h-full transition-all duration-750', 
                      answers.family?.id === 'woods' || answers.occasion?.id === 'statement' ? 'bg-amber-700/80 shadow-[0_0_8px_rgba(180,83,9,0.5)]' : 'bg-stone-200 dark:bg-stone-800'
                    ].join(' ')} 
                    title="Woody"
                  />
                  <div 
                    className={['h-full transition-all duration-750', 
                      answers.family?.id === 'warm' || answers.occasion?.id === 'evening' ? 'bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-stone-200 dark:bg-stone-800'
                    ].join(' ')} 
                    title="Warm"
                  />
                </div>
                <div className="flex justify-between text-[8px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-0.5">
                  <span>{locale === 'ru' ? 'Свеж' : locale === 'uz' ? 'Fresh' : 'Fresh'}</span>
                  <span>{locale === 'ru' ? 'Цвет' : locale === 'uz' ? 'Gulli' : 'Floral'}</span>
                  <span>{locale === 'ru' ? 'Древ' : locale === 'uz' ? 'Yog‘och' : 'Woody'}</span>
                  <span>{locale === 'ru' ? 'Тепл' : locale === 'uz' ? 'Iliq' : 'Warm'}</span>
                </div>
              </div>

              {/* Progress meters for matches */}
              <div className="pt-2 space-y-1 border-t border-brass/10">
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider text-brass">
                  <span>{locale === 'ru' ? 'Профиль настроен' : locale === 'uz' ? 'Profil tayyor' : 'Profile Complete'}</span>
                  <span>{Math.round((Object.keys(answers).length / 4) * 100)}%</span>
                </div>
                <div className="h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brass transition-all duration-500"
                    style={{ width: `${(Object.keys(answers).length / 4) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Progress Indicators & Navigation */}
          <div className="space-y-4">
            {started && !isComplete && (
              <div className="grid grid-cols-4 gap-2">
                {copy.steps.map((step, index) => (
                  <div key={step.key} className="space-y-2">
                    <div
                      className={[
                        'h-1 rounded-full transition-all duration-500',
                        index <= stepIndex || answers[step.key]
                          ? 'bg-brass'
                          : 'bg-stone-200 dark:bg-stone-800',
                      ].join(' ')}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!started ? (
                <button
                  type="button"
                  onClick={() => setStarted(true)}
                  className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink rounded-full px-8 py-4 text-xs font-bold tracking-[0.2em] uppercase transition duration-300 hover:shadow-lg cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {copy.start}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
                    disabled={stepIndex === 0 || isComplete}
                    className="border-border text-ink hover:border-brass hover:text-brass dark:text-bone inline-flex items-center gap-2 rounded-full border px-6 py-3 text-xs font-bold tracking-widest uppercase transition cursor-pointer disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {copy.back}
                  </button>
                  <button
                    type="button"
                    onClick={restart}
                    className="border-border text-ink hover:border-brass hover:text-brass dark:text-bone inline-flex items-center gap-2 rounded-full border px-6 py-3 text-xs font-bold tracking-widest uppercase transition cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {copy.restart}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Immersive Question Cards & Smart Matches */}
        <div className="border border-brass/15 bg-bone/70 backdrop-blur-md rounded-2xl min-h-[580px] p-6 shadow-md md:p-10 dark:bg-stone-950/20 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none -z-10">
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-brass/5 blur-[60px]" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-brass/5 blur-[60px]" />
          </div>

          {!started && (
            <div className="border-brass/20 bg-brass/5 rounded-xl grid min-h-[500px] place-items-center border border-dashed p-8 text-center">
              <div className="max-w-md space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-brass/10 flex items-center justify-center text-brass">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-ink dark:text-bone font-sans text-3xl font-bold tracking-tight">
                  {locale === 'ru' ? 'Персональный Стилист' : locale === 'uz' ? 'Shaxsiy Parfyumer' : 'Curated Olfactive Matcher'}
                </h2>
                <p className="text-ink-muted text-sm leading-6 dark:text-stone-300">
                  {locale === 'ru' ? 'Наш мастер сопоставит ваши тактильные предпочтения с аккордами и нотами каждого аромата в нашей коллекции.' : locale === 'uz' ? 'Bizning tizim sizning afzalliklaringizni to‘plamdagi har bir iforning notalari bilan taqqoslaydi.' : 'Our matcher cross-references your physical preferences with the precise notes, accords, sillage, and timing properties of our collection.'}
                </p>
              </div>
            </div>
          )}

          {started && !isComplete && currentStep && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <p className="text-brass text-[10px] font-bold tracking-[0.32em] uppercase">
                  {copy.progress
                    .replace('{current}', String(stepIndex + 1))
                    .replace('{total}', String(copy.steps.length))}
                </p>
                <h2 className="text-ink dark:text-bone mt-3 font-sans text-3xl leading-tight font-bold tracking-tight md:text-5xl">
                  {currentStep.title}
                </h2>
                <p className="text-ink-muted mt-3 max-w-2xl text-sm leading-7 dark:text-stone-300">
                  {currentStep.helper}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {currentStep.choices.map((choice) => {
                  const chips = getChoiceSubChips(choice.id, locale);
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => choose(choice)}
                      className="group border border-brass/10 bg-background hover:border-brass/70 hover:bg-brass/5 rounded-xl min-h-40 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brass/5 cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <span className="text-brass text-[9px] font-bold tracking-[0.26em] uppercase">
                          {choice.label}
                        </span>
                        <span className="text-ink group-hover:text-brass dark:text-bone block font-sans text-xl leading-tight font-bold">
                          {choice.text}
                        </span>
                      </div>
                      
                      {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-4">
                          {chips.map((chip) => (
                            <span 
                              key={chip} 
                              className="text-[9px] px-2 py-0.5 rounded bg-brass/5 group-hover:bg-brass/10 border border-brass/10 dark:border-brass/20 text-ink-muted group-hover:text-brass transition-colors font-sans"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results Screen: Smart Personalized Match Report */}
          {started && isComplete && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              {/* Archetype Header */}
              <div className={['border rounded-2xl p-6 md:p-8 space-y-4 transition-all duration-500 shadow-md', arcStyle.cardBg].join(' ')}>
                <div className="flex items-center gap-3">
                  <div className={['w-10 h-10 rounded-full flex items-center justify-center', arcStyle.badgeBg].join(' ')}>
                    <Award className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <span className="text-brass text-[9px] font-bold tracking-[0.3em] uppercase">
                      {locale === 'ru' ? 'Ваш Архетип' : locale === 'uz' ? 'Sizning Arxetipingiz' : 'Your Scent Archetype'}
                    </span>
                    <h2 className="font-sans text-2xl font-bold md:text-3xl leading-none mt-0.5">
                      {localArchetype.name}
                    </h2>
                  </div>
                </div>
                <p className={['font-display text-2xl italic border-l-2 pl-4 leading-relaxed', arcStyle.iconColor, arcStyle.accentBorder].join(' ')}>
                  "{localArchetype.tagline}"
                </p>
                <p className={['text-sm leading-7', arcStyle.textColor].join(' ')}>
                  {localArchetype.description}
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {localArchetype.notes.map((note) => (
                    <span
                      key={note}
                      className={['px-3 py-1 border rounded-full text-xs font-semibold', arcStyle.badgeBg].join(' ')}
                    >
                      {note}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Matches */}
              <div className="space-y-6">
                <div className="border-b border-brass/15 pb-2">
                  <p className="text-brass text-[10px] font-bold tracking-[0.32em] uppercase">
                    {copy.resultsEyebrow}
                  </p>
                  <h3 className="text-ink dark:text-bone font-sans text-xl font-bold tracking-tight">
                    {copy.resultsTitle}
                  </h3>
                </div>

                <div className="grid gap-6">
                  {results.map(({ product, score, reasons, breakdown, sommelierNote }, index) => (
                    <article
                      key={product.id}
                      className="border border-brass/10 bg-background rounded-2xl overflow-hidden grid gap-6 p-5 sm:grid-cols-[140px_1fr] hover:border-brass/30 transition-colors duration-300"
                    >
                      {/* Product Image */}
                      <Link
                        href={`/${locale}/product/${product.slug}`}
                        className="relative aspect-[4/5] overflow-hidden bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center"
                      >
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            sizes="140px"
                            className="object-contain p-3 transition-transform duration-500 hover:scale-105"
                            unoptimized
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-center text-[10px] tracking-widest text-stone-400 uppercase">
                            {product.brand}
                          </div>
                        )}
                      </Link>

                      {/* Details & Match Metrics */}
                      <div className="min-w-0 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold tracking-[0.24em] text-stone-500 uppercase">
                                {index + 1}. {product.brand}
                              </p>
                              <Link
                                href={`/${locale}/product/${product.slug}`}
                                className="text-ink hover:text-brass dark:text-bone mt-1 block font-sans text-2xl leading-none font-bold tracking-tight transition"
                              >
                                {product.name}
                              </Link>
                            </div>
                            <div className="text-right">
                              <p className="text-brass font-sans text-3xl font-bold leading-none">{score}%</p>
                              <p className="text-[9px] tracking-widest text-stone-500 uppercase mt-1">
                                {copy.match}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-stone-500 dark:text-stone-400">
                            <span>{formatUzs(product.price, locale)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <span className="text-amber-500">★</span>
                              {formatRating(product.avg_rating)}
                            </span>
                            {product.top_accord && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: product.top_accord.color_hex }}
                                  />
                                  {product.top_accord.name}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Explainable Match Breakdown Meters */}
                        <div className="bg-stone-50/70 border border-stone-100 rounded-xl p-4 space-y-3 dark:bg-[#1A1714]/20 dark:border-stone-800">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] uppercase tracking-wider font-semibold text-stone-500">
                              <span>{locale === 'ru' ? 'Соответствие Нотам' : locale === 'uz' ? 'Notalar Mosligi' : 'Accord Match'}</span>
                              <span>{breakdown.accord}%</span>
                            </div>
                            <div className="h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                              <div className="h-full bg-brass/80" style={{ width: `${breakdown.accord}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] uppercase tracking-wider font-semibold text-stone-500">
                              <span>{locale === 'ru' ? 'Шлейф / Стойкость' : locale === 'uz' ? 'Shleyf va Kuchi' : 'Intensity Match'}</span>
                              <span>{breakdown.intensity}%</span>
                            </div>
                            <div className="h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                              <div className="h-full bg-brass/80" style={{ width: `${breakdown.intensity}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] uppercase tracking-wider font-semibold text-stone-500">
                              <span>{locale === 'ru' ? 'Стиль / Пол' : locale === 'uz' ? 'Uslub va Jins' : 'Style Fit'}</span>
                              <span>{breakdown.style}%</span>
                            </div>
                            <div className="h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                              <div className="h-full bg-brass/80" style={{ width: `${breakdown.style}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Alignment bullet explanations */}
                        <ul className="text-ink-muted space-y-2 text-sm leading-6 dark:text-stone-300">
                          {(reasons.length > 0 ? reasons : [copy.reasons.rating]).map((reason) => (
                            <li key={reason} className="flex gap-2">
                              <Check className="text-brass mt-1.5 h-3.5 w-3.5 shrink-0" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Sommelier Note (Luxurious touch) */}
                        <div className="bg-brass/5 border-l-2 border-brass/40 rounded-r-xl p-4 text-xs italic text-ink-muted dark:text-stone-300 flex gap-3">
                          <Quote className="h-4 w-4 text-brass/75 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[9px] uppercase font-bold tracking-widest text-brass not-italic mb-1">
                              {locale === 'ru' ? 'Заметка Сомелье' : locale === 'uz' ? 'Somelye qaydi' : 'Sommelier Note'}
                            </span>
                            "{sommelierNote}"
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3 pt-2">
                          <Link
                            href={`/${locale}/product/${product.slug}`}
                            className="border border-brass/20 hover:border-brass hover:text-brass inline-flex h-11 items-center justify-center rounded-full px-6 text-xs font-bold tracking-widest uppercase transition-colors"
                          >
                            {copy.view}
                          </Link>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => addProduct(product)}
                            className="bg-ink text-bone hover:bg-brass dark:bg-bone dark:text-ink inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-xs font-bold tracking-widest uppercase transition cursor-pointer disabled:opacity-50"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            {addedId === product.id ? copy.added : copy.add}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
