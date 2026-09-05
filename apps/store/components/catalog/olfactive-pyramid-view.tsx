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

// The pyramid as three labelled rows, not a decorated panel. It carries no
// frame or heading of its own — it sits inside the full record, which supplies
// both, so the page reads as one document rather than a stack of cards.
//
// The material photographs are back. A customer who has never met labdanum
// learns more from the picture of the resin than from the word, and that is the
// whole job of a note list. They are square, inside the chip's own hairline,
// and served from public/notes/prod — mirrored by scripts/mirror-note-icons.ts
// rather than hotlinked, so no third-party host sits on the critical path of a
// product page.
//
// 177 of the 418 notes have no photograph. Those render as plain chips instead
// of a generic stand-in image: a picture of nothing in particular teaches the
// reader nothing and makes the row look uniform when it is not.

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
            className="border-border hover:border-foreground flex items-center gap-2.5 border py-1.5 pr-3 pl-1.5 transition-colors"
          >
            {note.icon_url ? (
              <span className="border-border relative h-7 w-7 shrink-0 overflow-hidden border">
                <Image src={note.icon_url} alt="" fill sizes="28px" className="object-cover" />
              </span>
            ) : (
              <span className="border-border text-muted-foreground text-micro flex h-7 w-7 shrink-0 items-center justify-center border font-mono uppercase">
                {note.name.charAt(0)}
              </span>
            )}
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
