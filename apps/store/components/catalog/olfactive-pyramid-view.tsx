import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { notePicture } from '@/lib/catalog/note-picture';

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

// The notes, on the label itself, where the five accord measures used to be: a
// customer who has never met labdanum learns more from the picture of the resin
// than from a percentage. Three labelled rows, each note a picture in the glass
// bead the card orbit uses, so the notes that circled the bottle on the card are
// the same objects here.
//
// Our own cut-outs sit whole in the bead, as on the orbit. The square photographs
// mirrored from Fragrantica are clipped to it. 9% of note links have neither, and
// those beads carry the initial: a picture of nothing in particular teaches the
// reader nothing and makes the row look uniform when it is not.

function NoteBead({ note, locale }: { note: NoteItem; locale: string }) {
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
    </Link>
  );
}

function NoteRow({ title, notes, locale }: { title: string; notes?: NoteItem[]; locale: string }) {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-[7rem_1fr] md:gap-6">
      <span className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase md:pt-6">
        {title}
      </span>
      <div className="flex flex-wrap gap-x-2 gap-y-4">
        {notes.map((note) => (
          <NoteBead key={note.slug} note={note} locale={locale} />
        ))}
      </div>
    </div>
  );
}

export function OlfactivePyramidView({ notes, locale }: OlfactivePyramidProps) {
  const t = useTranslations('pdp.pyramid');
  const hasNotes = Boolean(notes.top?.length || notes.middle?.length || notes.base?.length);
  if (!hasNotes) return null;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="border-hairline dark:border-gunmetal border-b pb-3 text-lg font-semibold tracking-tight">
        {t('title')}
      </h3>
      <div className="flex flex-col gap-5">
        <NoteRow title={t('top')} notes={notes.top} locale={locale} />
        <NoteRow title={t('heart')} notes={notes.middle} locale={locale} />
        <NoteRow title={t('base')} notes={notes.base} locale={locale} />
      </div>
    </div>
  );
}
