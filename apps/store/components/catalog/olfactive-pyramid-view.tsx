import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { noteRepresentativeLabel } from '@/lib/catalog/note-pilot';
import { notePicture } from '@/lib/catalog/note-picture';
import { taxonomyHref } from '@/lib/catalog/taxonomy-href';

import { BEAD, GLINT } from './glass-bead';
import { NoteFace } from './note-face';

export interface NoteItem {
  slug: string;
  name: string;
  icon_url?: string;
  color_hex?: string;
}

export interface OlfactivePyramidProps {
  notes: {
    top?: NoteItem[];
    middle?: NoteItem[];
    base?: NoteItem[];
  };
  locale: string;
}

export function NoteBead({ note, locale }: { note: NoteItem; locale: string }) {
  const picture = notePicture(note);

  return (
    <Link
      href={`/${locale}/catalog?note=${note.slug}`}
      className="group/note flex w-20 flex-col items-center gap-1 text-center"
    >
      <span className="relative block size-16 transition-transform duration-300 group-hover/note:-translate-y-0.5 motion-reduce:transition-none">
        <span className={BEAD} />
        {picture ? (
          <NoteFace picture={picture} sizes="64px" />
        ) : (
          <span className="text-muted-foreground absolute inset-0 flex items-center justify-center font-mono text-sm uppercase">
            {note.name.charAt(0)}
          </span>
        )}
        <span className={GLINT} />
      </span>
      <span className="text-xs leading-snug underline-offset-4 group-hover/note:underline">
        {note.name}
      </span>
      {picture?.representative && (
        <span className="text-muted-foreground text-[10px] leading-3">
          {noteRepresentativeLabel(locale)}
        </span>
      )}
    </Link>
  );
}

function PyramidNote({ note, locale }: { note: NoteItem; locale: string }) {
  const picture = notePicture(note);
  return (
    <Link
      href={taxonomyHref('note', locale, note.slug)}
      className="flex h-full flex-col items-center text-center hover:opacity-75 focus-visible:outline-offset-4 motion-safe:transition-opacity motion-safe:duration-150"
    >
      <span className="relative flex aspect-square w-full items-center justify-center">
        {picture ? (
          <Image
            src={picture.src}
            alt=""
            fill
            sizes="(min-width: 768px) 96px, 80px"
            className={
              picture.cutout
                ? 'object-contain p-1.5'
                : 'object-contain mix-blend-multiply dark:mix-blend-normal'
            }
          />
        ) : (
          <span aria-hidden="true" className="text-muted-foreground font-serif text-xl">
            {note.name.slice(0, 2)}
          </span>
        )}
      </span>
      <span className="mt-1 text-xs leading-snug font-medium break-words sm:text-sm">
        {note.name}
      </span>
      {picture?.representative ? (
        <span className="text-muted-foreground mt-1 text-[10px] leading-3">
          {noteRepresentativeLabel(locale)}
        </span>
      ) : null}
    </Link>
  );
}

function NoteRow({ title, notes, locale }: { title: string; notes?: NoteItem[]; locale: string }) {
  if (!notes || notes.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="eyebrow">{title}</h3>
      <ul className="flex flex-wrap gap-x-3 gap-y-3 sm:gap-x-4">
        {notes.map((note) => (
          <li key={note.slug} className="w-20 min-w-0 sm:w-24">
            <PyramidNote note={note} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OlfactivePyramidView({ notes, locale }: OlfactivePyramidProps) {
  const t = useTranslations('pdp.pyramid');
  const hasNotes = Boolean(notes.top?.length || notes.middle?.length || notes.base?.length);
  if (!hasNotes) return null;

  return (
    <section className="min-w-0 space-y-4">
      <h2 className="section-title">{t('title')}</h2>
      <div className="flex flex-col gap-5">
        <NoteRow title={t('top')} notes={notes.top} locale={locale} />
        <NoteRow title={t('heart')} notes={notes.middle} locale={locale} />
        <NoteRow title={t('base')} notes={notes.base} locale={locale} />
      </div>
    </section>
  );
}
