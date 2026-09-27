'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

// The phone header has room for four 44 px targets and the seal, so the pages
// the desktop header lists inline sit behind one button here. A plain panel
// under the header, not a drawer: nothing on the site slides in from a side.
export function SiteMenu({
  items,
  openLabel,
  closeLabel,
}: {
  items: { href: string; label: string }[];
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center xl:hidden"
      >
        {open ? (
          <X className="h-[22px] w-[22px]" strokeWidth={1.4} />
        ) : (
          <Menu className="h-[22px] w-[22px]" strokeWidth={1.4} />
        )}
      </button>

      {open && (
        <>
          {/* A tap anywhere below the panel closes it; the header stays live. */}
          <div
            aria-hidden="true"
            className="fixed inset-x-0 top-14 bottom-0 md:top-16 xl:hidden"
            onClick={() => setOpen(false)}
          />
          <nav
            id="site-menu"
            className="border-border bg-background absolute inset-x-0 top-full border-b xl:hidden"
          >
            <ul className="container">
              {items.map((item) => (
                <li key={item.href} className="border-border border-b last:border-b-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center text-base font-medium"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </>
  );
}
