// Eskiz SMS gateway, ported by reference from bebio (lib/sms.ts).
// https://documenter.getpostman.com/view/663428/RzfmES4z (Eskiz Notify API)
//
// Auth flow: POST /api/auth/login -> JWT token; then POST /api/message/sms/send
// with `Authorization: Bearer <token>`. Falls back to a logged mock when
// credentials are unset (dev/test), returning true so callers proceed.
//
// Env: ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_FROM (sender id; default 4546).

const ESKIZ_BASE = 'https://notify.eskiz.uz/api';

interface EskizAuthResponse {
  data?: { token?: string };
}

interface EskizSendResponse {
  status?: string;
  id?: string;
  message?: string;
}

function credentialsConfigured(email: string | undefined, password: string | undefined): email is string {
  return Boolean(email && password && !email.includes('example.com'));
}

/// Send a single SMS. Returns true on accepted/queued, false on failure.
/// In dev (NODE_ENV !== 'production') a transport error still resolves true so
/// the calling flow (e.g. OTP issuance) is not blocked by SMS provider hiccups.
export async function sendSMS(phone: string, text: string): Promise<boolean> {
  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;
  const from = process.env.ESKIZ_FROM ?? '4546';

  if (!credentialsConfigured(email, password)) {
    console.log(`[SMS:mock] -> ${phone}: ${text}`);
    return true;
  }

  try {
    const authRes = await fetch(`${ESKIZ_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const authData = (await authRes.json()) as EskizAuthResponse;
    const token = authData.data?.token;
    if (!token) throw new Error('Eskiz auth failed: no token');

    const sendRes = await fetch(`${ESKIZ_BASE}/message/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mobile_phone: phone.replace(/\D/g, ''),
        message: text,
        from,
      }),
    });
    const sendData = (await sendRes.json()) as EskizSendResponse;
    return sendData.status === 'waiting' || sendData.status === 'success';
  } catch (error) {
    console.error('[SMS:eskiz] send failed', error);
    return process.env.NODE_ENV !== 'production';
  }
}
