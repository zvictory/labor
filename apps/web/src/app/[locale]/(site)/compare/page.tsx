'use client';

import dynamic from 'next/dynamic';

const CompareView = dynamic(
  () => import('./compare-view').then((m) => m.CompareView),
  { ssr: false },
);

export default function ComparePage() {
  return <CompareView />;
}
