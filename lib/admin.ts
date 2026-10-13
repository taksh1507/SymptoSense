import type { Session } from 'next-auth';
export function isAdmin(session: Session | null): boolean {
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  return allowed.length > 0 && !!session?.user?.email && allowed.includes(session.user.email.toLowerCase());
}
