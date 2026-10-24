// Admin-only download of a customer list for Meta Ads Manager (lib/admin/audience.ts).
// ?list=buyers (default) or ?list=leads. Personal data: staff without the admin
// role get 403, and the response is never cached.

import { NextRequest, NextResponse } from 'next/server';

import { isAdmin, requireStaff } from '@/lib/admin/guard';
import { buildAudienceCsv, loadAudience, type AudienceList } from '@/lib/admin/audience';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await requireStaff();
  if (!isAdmin(user)) return new NextResponse('Forbidden', { status: 403 });

  const list: AudienceList = req.nextUrl.searchParams.get('list') === 'leads' ? 'leads' : 'buyers';
  const rows = await loadAudience(list);
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(buildAudienceCsv(rows, list), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="labor-meta-${list}-${day}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
