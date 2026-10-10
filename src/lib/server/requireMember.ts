import type { AstroGlobal } from 'astro';
import { resolveSessionMember, type SessionMember } from '@/lib/server/submissions';
import type { MemberProfile } from '@/lib/currentUser';

/** Same-site relative path only ("/x", not "//host" or "https://…") — the
 *  built-in /api/auth/login refuses anything else with a 400. */
export function safeReturnTo(raw: string | null | undefined, fallback: string): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')
    ? raw
    : fallback;
}

/** The custom login page, returning to `returnToUrl` once signed in. */
export function loginPageUrl(returnToUrl: string): string {
  return `/login?returnToUrl=${encodeURIComponent(returnToUrl)}`;
}

/**
 * SSR gate for a page's frontmatter: the logged-in member, or a redirect
 * Response to the login page (back to this exact URL afterwards). Usage:
 *
 *   const member = await requireMember(Astro);
 *   if (member instanceof Response) return member;
 */
export async function requireMember(astro: AstroGlobal): Promise<SessionMember | Response> {
  const member = await resolveSessionMember();
  if (member) return member;
  return astro.redirect(loginPageUrl(astro.url.pathname + astro.url.search), 302);
}

/** The member as the client islands' display profile (name falls back to email). */
export function toMemberProfile(member: SessionMember): MemberProfile {
  return { email: member.email, userName: member.userName ?? member.email, image: member.image ?? '' };
}
