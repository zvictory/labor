import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

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

// The pyramid as three labelled rows, not a decorated panel. It no longer
// carries its own frame or heading — it sits inside the full record, which
// supplies both, so the page reads as one document rather than a stack of
// cards. Note thumbnails are square: nothing in this system is a round avatar.

const FALLBACK_ICON = 'https://fimgs.net/mdimg/sastojci/t.75.jpg';

function NoteRow({ title, notes, locale }: { title: string; notes?: NoteItem[]; locale: string }) {
  if (!notes || notes.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-[7rem_1fr] md:gap-6">
      <span className="text-muted-foreground text-micro pt-1.5 font-mono tracking-[0.16em] uppercase">
        {title}
      </span>
      <div className="flex flex-wrap gap-2">
        {notes.map((note) => (
          <Link
            key={note.slug}
            href={`/${locale}/catalog?note=${note.slug}`}
            className="border-border hover:border-foreground flex items-center gap-2.5 border px-2.5 py-1.5 transition-colors"
          >
            <span className="border-border relative h-5 w-5 shrink-0 overflow-hidden border">
              <Image
                src={note.icon_url || FALLBACK_ICON}
                alt=""
                fill
                sizes="20px"
                className="object-cover"
              />
            </span>
            <span className="text-sm">{note.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function OlfactivePyramidView({ notes, locale }: OlfactivePyramidProps) {
  const hasNotes = Boolean(notes.top?.length || notes.middle?.length || notes.base?.length);
  if (!hasNotes) return null;

  return (
    <div className="flex flex-col gap-5">
      <NoteRow title="Top" notes={notes.top} locale={locale} />
      <NoteRow title="Heart" notes={notes.middle} locale={locale} />
      <NoteRow title="Base" notes={notes.base} locale={locale} />
    </div>
  );
}
