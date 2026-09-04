import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface PerfumerInfo {
  slug: string;
  name: string;
  photo?: string | null;
  bio?: string | null;
}

// The nose, credited the way a formula credits its author: mono label, square
// portrait, name in the page's own face. No round avatar, no amber link.
export function PerfumerCard({ perfumer, locale }: { perfumer: PerfumerInfo; locale: string }) {
  if (!perfumer) return null;

  return (
    <div className="border-border flex items-center gap-4 border p-4">
      <div className="border-border relative h-14 w-14 shrink-0 overflow-hidden border">
        {perfumer.photo ? (
          <Image src={perfumer.photo} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center font-mono text-sm">
            {perfumer.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-muted-foreground text-micro font-mono tracking-[0.16em] uppercase">
          Nose
        </p>
        <Link
          href={`/${locale}/catalog?perfumer=${perfumer.slug}`}
          className="hover:text-muted-foreground block truncate text-sm font-semibold tracking-[-0.01em] transition-colors"
        >
          {perfumer.name}
        </Link>
        {perfumer.bio && (
          <p className="text-muted-foreground line-clamp-1 text-xs">{perfumer.bio}</p>
        )}
      </div>
    </div>
  );
}
