'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, RotateCcw, ShoppingBag } from 'lucide-react';
import { formatRating, formatUzs } from '@/lib/format';
import { useCartStore } from '@/lib/stores/cart-store';

export interface FinderCandidate {
  id: number;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  avg_rating: number;
  top_accord?: { name: string; color_hex: string };
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
}

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const hasFamily = (product: FinderCandidate, families: string[]): boolean => {
  const productFamilies = product.matchedFamilies.map(normalize);
  const accord = product.top_accord ? normalize(product.top_accord.name) : '';
  return families.some((family) => productFamilies.includes(family) || accord.includes(family));
};

const scoreProduct = (product: FinderCandidate, answers: Answers, copy: FinderCopy): ScoredProduct => {
  let score = 42;
  const reasons: string[] = [];
  const familyChoice = answers.family;
  const styleChoice = answers.style;
  const occasionChoice = answers.occasion;
  const presenceChoice = answers.presence;

  if (familyChoice?.families && hasFamily(product, familyChoice.families)) {
    score += 24;
    reasons.push(copy.reasons.family.replace('{family}', familyChoice.label));
  }

  if (styleChoice?.gender && product.matchedGender === styleChoice.gender) {
    score += 16;
    reasons.push(copy.reasons.gender.replace('{style}', styleChoice.label));
  } else if (styleChoice?.gender === 'unisex' && !product.matchedGender) {
    score += 8;
  }

  if (occasionChoice?.families && hasFamily(product, occasionChoice.families)) {
    score += 14;
    reasons.push(copy.reasons.occasion.replace('{occasion}', occasionChoice.label));
  }

  if (presenceChoice?.presence === 'quiet') {
    score += product.price <= 1_000_000 ? 10 : 4;
    reasons.push(copy.reasons.presenceQuiet);
  }

  if (presenceChoice?.presence === 'balanced') {
    score += product.avg_rating >= 7 ? 12 : 6;
    reasons.push(copy.reasons.presenceBalanced);
  }

  if (presenceChoice?.presence === 'bold') {
    const boldFamilies = ['leather', 'smoky', 'oud', 'amber', 'woody', 'oriental', 'spicy'];
    score += hasFamily(product, boldFamilies) ? 16 : 6;
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
  };
};

export function PerfumeFinderClient({ locale, candidates, copy }: Props) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [addedId, setAddedId] = useState<number | null>(null);
  const addLine = useCartStore((s) => s.addLine);

  const currentStep = copy.steps[stepIndex];
  const isComplete = copy.steps.every((step) => Boolean(answers[step.key]));

  const results = useMemo(() => {
    return candidates
      .map((product) => scoreProduct(product, answers, copy))
      .sort((a, b) => b.score - a.score || b.product.avg_rating - a.product.avg_rating)
      .slice(0, 3);
  }, [answers, candidates, copy]);

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
    addLine({
      product_id: product.id,
      variant_id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      volume_ml: 0,
      image: product.image,
      price: product.price,
      quantity: 1,
    });
    setAddedId(product.id);
  };

  if (candidates.length === 0) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-brass">{copy.eyebrow}</p>
        <h1 className="mt-4 font-sans text-4xl font-bold tracking-tight text-ink dark:text-bone md:text-6xl">
          {copy.emptyTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-ink-muted dark:text-stone-300">
          {copy.emptyBody}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div className="lg:sticky lg:top-32">
          <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-brass">{copy.eyebrow}</p>
          <h1 className="mt-5 max-w-xl font-sans text-4xl font-bold leading-none tracking-tight text-ink dark:text-bone md:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-ink-muted dark:text-stone-300 md:text-base">
            {copy.intro}
          </p>

          <div className="mt-9 border-y border-border py-5">
            <div className="grid grid-cols-4 gap-2">
              {copy.steps.map((step, index) => (
                <div key={step.key} className="space-y-2">
                  <div
                    className={[
                      'h-1.5 rounded-full transition-colors',
                      index <= stepIndex || answers[step.key] ? 'bg-brass' : 'bg-stone-200 dark:bg-stone-800',
                    ].join(' ')}
                  />
                  <p className="hidden text-[10px] uppercase tracking-widest text-stone-500 sm:block">
                    {step.eyebrow}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!started ? (
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="rounded-full bg-ink px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-bone transition hover:bg-brass dark:bg-bone dark:text-ink"
              >
                {copy.start}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-xs font-bold uppercase tracking-widest text-ink transition hover:border-brass hover:text-brass disabled:pointer-events-none disabled:opacity-35 dark:text-bone"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {copy.back}
                </button>
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-xs font-bold uppercase tracking-widest text-ink transition hover:border-brass hover:text-brass dark:text-bone"
                >
                  <RotateCcw className="h-4 w-4" />
                  {copy.restart}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="min-h-[560px] border border-border bg-bone/80 p-4 shadow-sm dark:bg-stone-950/30 md:p-8">
          {!started && (
            <div className="grid min-h-[500px] place-items-center border border-dashed border-brass/30 bg-brass/5 p-8 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brass">{copy.progress}</p>
                <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-ink dark:text-bone">
                  {copy.steps[0]?.title}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-muted dark:text-stone-300">
                  {copy.steps[0]?.helper}
                </p>
              </div>
            </div>
          )}

          {started && !isComplete && currentStep && (
            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-brass">
                  {copy.progress.replace('{current}', String(stepIndex + 1)).replace('{total}', String(copy.steps.length))}
                </p>
                <h2 className="mt-4 font-sans text-3xl font-bold leading-tight tracking-tight text-ink dark:text-bone md:text-5xl">
                  {currentStep.title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-muted dark:text-stone-300">
                  {currentStep.helper}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {currentStep.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => choose(choice)}
                    className="group min-h-36 border border-border bg-background p-5 text-left transition hover:-translate-y-0.5 hover:border-brass hover:bg-brass/5"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-brass">
                      {choice.label}
                    </span>
                    <span className="mt-4 block font-sans text-xl font-bold leading-tight text-ink group-hover:text-brass dark:text-bone">
                      {choice.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {started && isComplete && (
            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-brass">
                  {copy.resultsEyebrow}
                </p>
                <h2 className="mt-4 font-sans text-3xl font-bold leading-tight tracking-tight text-ink dark:text-bone md:text-5xl">
                  {copy.resultsTitle}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-muted dark:text-stone-300">
                  {copy.resultsIntro}
                </p>
              </div>

              <div className="grid gap-4">
                {results.map(({ product, score, reasons }, index) => (
                  <article
                    key={product.id}
                    className="grid gap-5 border border-border bg-background p-4 sm:grid-cols-[132px_1fr] md:p-5"
                  >
                    <Link
                      href={`/${locale}/product/${product.slug}`}
                      className="relative aspect-[4/5] overflow-hidden bg-stone-50"
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="132px"
                          className="object-contain p-3"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-center text-[10px] uppercase tracking-widest text-stone-400">
                          {product.brand}
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-500">
                            {index + 1}. {product.brand}
                          </p>
                          <Link
                            href={`/${locale}/product/${product.slug}`}
                            className="mt-1 block font-sans text-2xl font-bold leading-tight tracking-tight text-ink transition hover:text-brass dark:text-bone"
                          >
                            {product.name}
                          </Link>
                        </div>
                        <div className="text-right">
                          <p className="font-sans text-2xl font-bold text-brass">
                            {score}%
                          </p>
                          <p className="text-[10px] uppercase tracking-widest text-stone-500">{copy.match}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-300">
                        <span>{formatUzs(product.price, locale)}</span>
                        <span>Rating {formatRating(product.avg_rating)}</span>
                        {product.top_accord && (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: product.top_accord.color_hex }}
                            />
                            {product.top_accord.name}
                          </span>
                        )}
                      </div>

                      <ul className="mt-4 space-y-2 text-sm leading-6 text-ink-muted dark:text-stone-300">
                        {(reasons.length > 0 ? reasons : [copy.reasons.rating]).map((reason) => (
                          <li key={reason} className="flex gap-2">
                            <Check className="mt-1 h-4 w-4 shrink-0 text-brass" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={`/${locale}/product/${product.slug}`}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-xs font-bold uppercase tracking-widest transition hover:border-brass hover:text-brass"
                        >
                          {copy.view}
                        </Link>
                        <button
                          type="button"
                          onClick={() => addProduct(product)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-xs font-bold uppercase tracking-widest text-bone transition hover:bg-brass dark:bg-bone dark:text-ink"
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
          )}
        </div>
      </div>
    </section>
  );
}
