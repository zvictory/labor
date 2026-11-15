'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { formatUzs, SAMPLE_ML, SAMPLE_PRICE } from '@/lib/money';
import { AddSamples } from '@/components/cart/add-to-cart';
import { useHydrated } from '@/lib/use-hydrated';
import { rankProducts, type FinderCandidate, type FinderCopy } from './finder-model';
import {
  FINDER_SESSION_KEY,
  finderAnswers,
  parseFinderSession,
  type FinderSession,
} from './finder-session';

export type { FinderCandidate, FinderCopy } from './finder-model';

const button =
  'inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-40';
const primary = `${button} bg-foreground text-background`;
const secondary = `${button} border border-border hover:border-foreground`;
const benchIntro = '/finder/labor-atelier-v1.webp';
const benchPrep = '/finder/labor-preparation-v1.webp';
const emptySession: FinderSession = { ids: {}, step: 0, complete: false, updatedAt: 0 };
const SCENE_MS = 1800;
const PREPARATION_MS = 3 * SCENE_MS;
type Phase = 'intro' | 'question' | 'prepare' | 'results';

export function PerfumeFinderClient({
  locale,
  candidates,
  copy,
  materialImages,
}: {
  locale: string;
  candidates: FinderCandidate[];
  copy: FinderCopy;
  materialImages: Record<string, string>;
}) {
  const t = useTranslations('finderAtelier');
  const tpdp = useTranslations('pdp');
  const hydrated = useHydrated();
  const heading = useRef<HTMLHeadingElement>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<FinderSession>(emptySession);
  const [phase, setPhase] = useState<Phase>('intro');
  const [serve, setServe] = useState(false);
  const [prepareStage, setPrepareStage] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FINDER_SESSION_KEY);
      if (stored) {
        const restored = parseFinderSession(stored, copy.steps);
        if (restored) setSession(restored);
        else localStorage.removeItem(FINDER_SESSION_KEY);
      }
    } catch {
      /* Storage is optional. */
    }
    setLoaded(true);
  }, [copy.steps]);

  useEffect(() => {
    if (phase === 'intro') return;
    // Keep the new title below the sticky storefront header.
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [phase, session.step]);

  useEffect(() => {
    if (phase !== 'question' || session.step !== copy.steps.length - 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const image = new window.Image();
    image.src = benchPrep;
  }, [phase, session.step, copy.steps.length]);

  useEffect(() => {
    if (phase !== 'prepare') return;
    const timers = [
      window.setTimeout(() => setPrepareStage(1), SCENE_MS),
      window.setTimeout(() => setPrepareStage(2), 2 * SCENE_MS),
      window.setTimeout(() => setPhase('results'), PREPARATION_MS),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [phase]);

  const answers = useMemo(() => finderAnswers(session.ids, copy.steps), [session.ids, copy.steps]);
  const results = useMemo(
    () => rankProducts(candidates, answers, copy),
    [candidates, answers, copy],
  );
  const currentStep = copy.steps[session.step];
  const presentCount = Object.keys(answers).length;
  const resumable = Boolean(session.updatedAt);

  function save(next: FinderSession) {
    const snapshot = { ...next, updatedAt: Date.now() };
    setSession(snapshot);
    try {
      localStorage.setItem(FINDER_SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      /* Optional. */
    }
  }

  function start() {
    if (!resumable) save(emptySession);
    setServe(false);
    setPhase(session.complete ? 'results' : 'question');
  }

  function goToStep(step: number) {
    save({ ...session, step, complete: false });
    setServe(false);
    setPhase('question');
  }

  function next() {
    if (!currentStep || !answers[currentStep.key]) return;
    if (session.step < copy.steps.length - 1) {
      goToStep(session.step + 1);
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    save({ ...session, complete: true });
    setPrepareStage(0);
    setServe(!reduceMotion);
    setPhase(reduceMotion ? 'results' : 'prepare');
  }

  function reset() {
    resetDialog.current?.close();
    try {
      localStorage.removeItem(FINDER_SESSION_KEY);
    } catch {
      /* Optional. */
    }
    setSession(emptySession);
    setServe(false);
    setPhase('intro');
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  function requestReset() {
    if (presentCount) resetDialog.current?.showModal();
    else reset();
  }

  const editChoices = (
    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
      {copy.steps.map((step, index) => {
        const choice = answers[step.key];
        const material = choice ? materialImages[choice.id] : undefined;
        return choice ? (
          <li key={step.key}>
            <button
              type="button"
              onClick={() => goToStep(index)}
              className="border-border hover:border-foreground flex min-h-12 w-full items-center gap-2 border pr-2 text-left text-xs focus-visible:outline-2"
            >
              <span
                className="bg-muted/45 relative flex h-12 w-10 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                {material ? (
                  <Image src={material} alt="" fill sizes="40px" className="object-contain p-1" />
                ) : (
                  <span className="font-mono">0{index + 1}</span>
                )}
              </span>
              <span className="min-w-0 space-y-1 py-2 break-words">
                <span className="text-muted-foreground block leading-snug">{step.title}</span>
                <span className="block font-semibold">{choice.label}</span>
              </span>
            </button>
          </li>
        ) : null;
      })}
    </ul>
  );

  if (candidates.length < 3)
    return (
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="page-title">{copy.emptyTitle}</h1>
        <p className="body-copy mt-4">{copy.emptyBody}</p>
      </section>
    );

  return (
    <section className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-8">
      <dialog
        ref={resetDialog}
        aria-labelledby="finder-reset-title"
        className="border-border bg-background text-foreground m-auto w-[min(90vw,25rem)] border p-6 backdrop:bg-black/35"
      >
        <h2 id="finder-reset-title" className="section-title">
          {copy.restart}
        </h2>
        <p className="mt-2 text-sm">{t('resetBody')}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            autoFocus
            className={secondary}
            onClick={() => resetDialog.current?.close()}
          >
            {t('cancel')}
          </button>
          <button type="button" className={primary} onClick={reset}>
            {copy.restart}
          </button>
        </div>
      </dialog>

      {phase === 'intro' ? (
        <div className="border-border grid overflow-hidden border md:grid-cols-[1.35fr_1fr]">
          <div className="bg-muted relative aspect-[16/9] md:aspect-auto md:min-h-88">
            <Image
              src={benchIntro}
              alt=""
              fill
              sizes="(min-width:768px) 55vw, 100vw"
              priority
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-start justify-center gap-4 p-5 md:p-10">
            <h1 ref={heading} tabIndex={-1} className="page-title">
              {copy.title}
            </h1>
            <p className="body-copy font-serif">{copy.intro}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                disabled={!hydrated || !loaded}
                className={primary}
                onClick={start}
              >
                {resumable ? t('resume') : copy.start}
                <ArrowRight aria-hidden="true" size={16} />
              </button>
              {resumable ? (
                <button
                  type="button"
                  onClick={requestReset}
                  className="min-h-11 text-sm underline underline-offset-4"
                >
                  {copy.restart}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="border-border mb-4 flex min-h-11 flex-wrap items-center justify-between gap-x-3 border-b">
            <p className="flex flex-wrap items-baseline gap-3">
              <span className="eyebrow">{t('workbench')}</span>
              {phase === 'question' ? (
                <span className="font-mono text-xs">
                  {session.step + 1}/{copy.steps.length}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={requestReset}
              className="min-h-11 text-sm underline underline-offset-4"
            >
              {copy.restart}
            </button>
          </header>

          {phase === 'prepare' ? (
            <div className="relative isolate mx-auto grid min-h-80 max-w-4xl items-center overflow-hidden border bg-[#ede4d4] md:min-h-[30rem]">
              <Image
                src={benchPrep}
                alt=""
                fill
                sizes="(min-width:768px) 896px,100vw"
                unoptimized
                className="-z-10 object-cover"
              />
              <div className="mx-auto my-8 w-full max-w-[90%] text-center">
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className="bg-background/95 mx-auto w-fit px-4 py-2 text-base font-semibold"
                >
                  {t('preparing')}
                </h1>
                <div className="my-4 grid h-32 place-items-center sm:h-40" aria-hidden="true">
                  {prepareStage === 0 ? (
                    <div key="notes" className="flex items-center gap-2 sm:gap-3">
                      {copy.steps.map((step, index) => {
                        const choice = answers[step.key];
                        const src = choice ? materialImages[choice.id] : undefined;
                        return (
                          <span
                            key={step.key}
                            className="finder-arrive relative inline-block size-14 border border-stone-300 bg-[#fbf8ef] sm:size-20"
                            style={{ animationDelay: `${index * 130}ms` }}
                          >
                            {src ? (
                              <Image
                                src={src}
                                fill
                                alt=""
                                sizes="80px"
                                className="object-contain p-1"
                              />
                            ) : null}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div key="strips" className="flex items-center gap-3 sm:gap-5">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="finder-arrive inline-flex h-28 w-9 items-end justify-center border border-stone-300 bg-[#fbf8ef] pb-2 font-mono text-xs text-stone-700 shadow-sm sm:h-36 sm:w-11"
                          style={{ animationDelay: `${index * 500}ms` }}
                        >
                          0{index + 1}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-background/95 mx-auto w-fit max-w-full px-4 pt-3 text-sm">
                  <p key={prepareStage} className="finder-arrive" role="status">
                    {t(`scene${prepareStage}`)}
                  </p>
                  <div
                    className="bg-muted mx-auto mt-3 h-0.5 w-full max-w-52 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className="finder-preparing-progress bg-foreground h-full"
                      style={{ animationDuration: `${PREPARATION_MS}ms` }}
                    />
                  </div>
                  <button
                    type="button"
                    className="min-h-11 text-sm underline underline-offset-4"
                    onClick={() => {
                      setServe(false);
                      setPhase('results');
                    }}
                  >
                    {t('skip')}
                  </button>
                </div>
              </div>
            </div>
          ) : phase === 'results' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 ref={heading} tabIndex={-1} className="section-title">
                  {copy.resultsTitle}
                </h1>
                <AddSamples
                  productIds={results.map(({ product }) => product.id)}
                  locale={locale}
                  label={t('samples', { price: formatUzs(results.length * SAMPLE_PRICE, locale) })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {results.map(({ product, reasons }, index) => {
                  const href = `/${locale}/product/${product.slug}`;
                  const options = [
                    { ml: SAMPLE_ML, href: `${href}?size=${SAMPLE_ML}` },
                    ...(product.volumeOptions ?? [])
                      .filter((option) => option.ml !== SAMPLE_ML)
                      .map((option) => ({
                        ml: option.ml,
                        href: option.useDefault ? href : `${href}?size=${option.ml}`,
                      })),
                  ];
                  return (
                    <article
                      key={product.id}
                      className={`border-border relative grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] border sm:block ${serve ? 'finder-arrive' : ''}`}
                      style={serve ? { animationDelay: `${index * 100}ms` } : undefined}
                    >
                      <div className="bg-muted/30 relative min-h-28 sm:aspect-[2/1]">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="(min-width:640px) 30vw,104px"
                            className="object-contain p-2 mix-blend-multiply sm:p-3 dark:mix-blend-normal"
                          />
                        ) : null}
                      </div>
                      <div className="space-y-1.5 p-3 md:p-4">
                        <p className="eyebrow break-words">{product.brand}</p>
                        <h2 className="text-base font-semibold break-words">
                          <Link
                            href={href}
                            className="after:absolute after:inset-0 hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-2"
                          >
                            {product.name}
                          </Link>
                        </h2>
                        <p className="font-mono text-xs">{formatUzs(product.price, locale)}</p>
                        <p className="text-muted-foreground text-sm">{reasons[0]}</p>
                        <div className="relative z-10 flex w-fit flex-wrap gap-1.5">
                          {options.map((option) => (
                            <Link
                              key={option.ml}
                              href={option.href}
                              aria-label={`${product.name} · ${tpdp('packageMl', { amount: option.ml })}`}
                              className="border-border bg-background hover:border-foreground inline-flex min-h-9 items-center border px-2 font-mono text-xs"
                            >
                              {tpdp('packageMl', { amount: option.ml })}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <details open className="border-border border-y py-2">
                <summary className="min-h-9 cursor-pointer py-2 text-sm font-medium">
                  {t('choices', { count: presentCount })}
                </summary>
                <div className="pb-2">{editChoices}</div>
              </details>
            </div>
          ) : currentStep ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-8">
              <div>
                <h1 ref={heading} tabIndex={-1} className="section-title mb-3">
                  {currentStep.title}
                </h1>
                <div
                  aria-label={currentStep.title}
                  role="group"
                  className="grid grid-cols-2 gap-2 sm:gap-3"
                >
                  {currentStep.choices.map((choice) => {
                    const selected = answers[currentStep.key]?.id === choice.id;
                    const material = materialImages[choice.id];
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          save({
                            ...session,
                            complete: false,
                            ids: { ...session.ids, [currentStep.key]: choice.id },
                          })
                        }
                        className={`relative flex min-w-0 flex-col items-center border px-2 pb-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 sm:grid sm:min-h-28 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3 sm:p-2 ${selected ? 'border-foreground bg-muted/55' : 'border-border hover:border-foreground'}`}
                      >
                        <span className="relative block h-20 w-full sm:h-24">
                          {material ? (
                            <Image
                              src={material}
                              alt=""
                              fill
                              sizes="(min-width:640px) 96px,45vw"
                              className="object-contain p-1"
                            />
                          ) : null}
                        </span>
                        <span className="w-full min-w-0 px-1 sm:pr-5">
                          <span className="block text-sm font-semibold break-words md:text-base">
                            {choice.label}
                          </span>
                          <span className="text-muted-foreground mt-1 block text-xs leading-snug">
                            {choice.text}
                          </span>
                        </span>
                        {selected ? (
                          <Check aria-hidden="true" size={16} className="absolute top-2 right-2" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className={secondary}
                    onClick={() => (session.step ? goToStep(session.step - 1) : setPhase('intro'))}
                  >
                    <ArrowLeft aria-hidden="true" size={16} />
                    {copy.back}
                  </button>
                  <button
                    type="button"
                    className={primary}
                    disabled={!answers[currentStep.key]}
                    onClick={next}
                  >
                    {copy.continue}
                    <ArrowRight aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>
              {presentCount ? (
                <aside aria-label={copy.cardTitle}>
                  <div className="hidden lg:block">
                    <h2 className="eyebrow mb-2">{copy.cardTitle}</h2>
                    {editChoices}
                  </div>
                  <details className="border-border border-y lg:hidden">
                    <summary className="min-h-11 cursor-pointer py-3 text-sm">
                      {t('choices', { count: presentCount })}
                    </summary>
                    <div className="pb-3">{editChoices}</div>
                  </details>
                </aside>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
