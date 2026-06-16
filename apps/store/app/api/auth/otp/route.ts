// OTP request endpoint. POST { phone } → issues a one-time code via SMS.
//
// The actual sign-in happens through the next-auth `phone-otp` credentials
// provider (POST /api/auth/callback/phone-otp with { phone, code }); this route
// only handles code *delivery*. Rate-limiting + hashing live in lib/auth/otp.
//
// We deliberately return a generic 200 on success and never echo the code or
// reveal whether the phone maps to an existing user.

import { NextRequest, NextResponse } from 'next/server';

import { requestOtp, OtpError } from '@/lib/auth/otp';

interface Body {
  phone?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof body.phone !== 'string' || body.phone.trim().length === 0) {
    return NextResponse.json({ error: 'phone_required' }, { status: 400 });
  }

  try {
    await requestOtp(body.phone);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OtpError) {
      const status = err.code === 'rate_limited' ? 429 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    console.error('[auth:otp] requestOtp failed', err);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}
