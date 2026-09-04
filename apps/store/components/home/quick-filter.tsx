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
    <section className="bg-stone-50 border-y border-border py-12 dark:bg-stone-900/10">
      <div className="container max-w-5xl">
        <div className="mb-8 text-center space-y-2">
          <span className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-brass">
            <Sparkles className="h-3.5 w-3.5" />
            {c.title}
          </span>
          <p className="text-xs text-ink-muted dark:text-stone-400">
            {c.subtitle}
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Main search input */}
          <div className="relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.searchPlaceholder}
              className="w-full border border-border bg-white px-5 py-3.5 pl-12 text-sm text-ink placeholder:text-stone-400 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass dark:bg-ink/60 dark:text-bone"
            />
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Quick Select Rails */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Brands */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {c.brandLabel}
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full cursor-pointer appearance-none border border-border/80 bg-white px-3 py-2.5 text-xs uppercase tracking-widest text-ink focus:border-brass focus:outline-none dark:bg-ink/80 dark:text-bone"
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {c.noteLabel}
              </label>
              <select
                value={selectedNote}
                onChange={(e) => setSelectedNote(e.target.value)}
                className="w-full cursor-pointer appearance-none border border-border/80 bg-white px-3 py-2.5 text-xs uppercase tracking-widest text-ink focus:border-brass focus:outline-none dark:bg-ink/80 dark:text-bone"
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {c.familyLabel}
              </label>
              <select
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="w-full cursor-pointer appearance-none border border-border/80 bg-white px-3 py-2.5 text-xs uppercase tracking-widest text-ink focus:border-brass focus:outline-none dark:bg-ink/80 dark:text-bone"
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
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {c.genderLabel}
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full cursor-pointer appearance-none border border-border/80 bg-white px-3 py-2.5 text-xs uppercase tracking-widest text-ink focus:border-brass focus:outline-none dark:bg-ink/80 dark:text-bone"
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
              className="inline-flex h-12 items-center justify-center bg-ink px-10 text-xs font-semibold uppercase tracking-widest text-bone transition-colors hover:bg-brass dark:bg-bone dark:text-ink dark:hover:bg-brass"
            >
              {c.submit}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
