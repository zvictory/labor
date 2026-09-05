'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';

interface FilterItem {
  slug: string;
  name: string;
}

interface QuickFilterProps {
  brands: FilterItem[];
  notes: FilterItem[];
  families: FilterItem[];
  locale: string;
}

type Lang = 'en' | 'ru' | 'uz';

const GENDERS = [
  { slug: 'men', ru: 'Мужские', en: 'Men', uz: 'Erkaklar' },
  { slug: 'women', ru: 'Женские', en: 'Women', uz: 'Ayollar' },
  { slug: 'unisex', ru: 'Унисекс', en: 'Unisex', uz: 'Uniseks' },
];

const COPY: Record<Lang, Record<string, string>> = {
  ru: {
    title: 'Быстрый подбор аромата',
    subtitle: 'Выберите параметры, чтобы мгновенно отфильтровать каталог',
    searchPlaceholder: 'Поиск аромата, бренда...',
    brandLabel: 'Бренд',
    brandAll: 'Все бренды',
    noteLabel: 'Нота',
    noteAll: 'Все ноты',
    familyLabel: 'Категория',
    familyAll: 'Все категории',
    genderLabel: 'Пол',
    genderAll: 'Любой пол',
    submit: 'Найти ароматы',
  },
  en: {
    title: 'Quick Scent Finder',
    subtitle: 'Select parameters to filter the catalog instantly',
    searchPlaceholder: 'Search fragrance, brand...',
    brandLabel: 'Brand',
    brandAll: 'All brands',
    noteLabel: 'Note',
    noteAll: 'All notes',
    familyLabel: 'Category',
    familyAll: 'All categories',
    genderLabel: 'Gender',
    genderAll: 'All genders',
    submit: 'Find Fragrances',
  },
  uz: {
    title: 'Tezkor hid tanlash',
    subtitle: 'Katalogni bir zumda filtrlash uchun parametrlarni tanlang',
    searchPlaceholder: 'Atir, brend qidiruvi...',
    brandLabel: 'Brend',
    brandAll: 'Barcha brendlar',
    noteLabel: 'Nota',
    noteAll: 'Barcha notalar',
    familyLabel: 'Kategoriya',
    familyAll: 'Barcha kategoriyalar',
    genderLabel: 'Jins',
    genderAll: 'Barcha jinslar',
    submit: 'Atirlarni topish',
  },
};

export function QuickFilter({ brands, notes, families, locale }: QuickFilterProps) {
  const router = useRouter();
  const lang = (['ru', 'uz', 'en'].includes(locale) ? locale : 'ru') as Lang;
  const c = COPY[lang];

  const [q, setQ] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedNote, setSelectedNote] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (selectedBrand) sp.set('brand', selectedBrand);
    if (selectedNote) sp.set('note', selectedNote);
    if (selectedFamily) sp.set('family', selectedFamily);
    if (selectedGender) sp.set('gender', selectedGender);

    const qs = sp.toString();
    router.push(`/${locale}/catalog${qs ? `?${qs}` : ''}`);
  };

  return (
    <section className="border-border border-y py-12 dark:bg-stone-900/10">
      <div className="container max-w-5xl">
        <div className="mb-8 space-y-2 text-center">
          <span className="text-micro text-foreground flex items-center justify-center gap-2 font-bold tracking-[0.3em] uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            {c.title}
          </span>
          <p className="text-ink-muted text-xs">{c.subtitle}</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Main search input */}
          <div className="relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.searchPlaceholder}
              className="border-border bg-background text-ink focus:ring-brass dark:bg-ink/60 dark:text-bone w-full border px-5 py-3.5 pl-12 text-sm placeholder:text-stone-400 focus:ring-1 focus:outline-none"
            />
            <Search className="text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
          </div>

          {/* Quick Select Rails */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Brands */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-muted-foreground font-bold tracking-wider uppercase">
                {c.brandLabel}
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="border-border/80 bg-background text-ink dark:bg-ink/80 dark:text-bone w-full cursor-pointer appearance-none border px-3 py-2.5 text-xs tracking-widest uppercase focus:outline-none"
              >
                <option value="">{c.brandAll}</option>
                {brands.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-muted-foreground font-bold tracking-wider uppercase">
                {c.noteLabel}
              </label>
              <select
                value={selectedNote}
                onChange={(e) => setSelectedNote(e.target.value)}
                className="border-border/80 bg-background text-ink dark:bg-ink/80 dark:text-bone w-full cursor-pointer appearance-none border px-3 py-2.5 text-xs tracking-widest uppercase focus:outline-none"
              >
                <option value="">{c.noteAll}</option>
                {notes.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categories (Families) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-muted-foreground font-bold tracking-wider uppercase">
                {c.familyLabel}
              </label>
              <select
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="border-border/80 bg-background text-ink dark:bg-ink/80 dark:text-bone w-full cursor-pointer appearance-none border px-3 py-2.5 text-xs tracking-widest uppercase focus:outline-none"
              >
                <option value="">{c.familyAll}</option>
                {families.map((f) => (
                  <option key={f.slug} value={f.slug}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Genders */}
            <div className="flex flex-col gap-1.5">
              <label className="text-micro text-muted-foreground font-bold tracking-wider uppercase">
                {c.genderLabel}
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="border-border/80 bg-background text-ink dark:bg-ink/80 dark:text-bone w-full cursor-pointer appearance-none border px-3 py-2.5 text-xs tracking-widest uppercase focus:outline-none"
              >
                <option value="">{c.genderAll}</option>
                {GENDERS.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g[lang as 'ru' | 'en' | 'uz'] || g.ru}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-center pt-2">
            <button
              type="submit"
              className="bg-ink text-bone dark:bg-bone dark:text-ink dark:hover:bg-brass inline-flex h-12 items-center justify-center px-10 text-xs font-semibold tracking-widest uppercase transition-colors hover:opacity-80"
            >
              {c.submit}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
