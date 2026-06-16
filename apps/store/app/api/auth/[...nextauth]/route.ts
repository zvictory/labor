// Auth.js (next-auth v5) catch-all route. Exposes the sign-in/callback/CSRF/
// session endpoints under /api/auth/*. All wiring lives in lib/auth.
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
