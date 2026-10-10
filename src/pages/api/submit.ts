import type { APIRoute } from 'astro';
import { json, resolveSessionEmail, submitSubmission } from '@/lib/server/submissions';

// Create a new submission (no id), or update the caller's existing one by id
// (ownership-guarded). GET with query params, matching the original API shape.
// The business logic lives in @/lib/server/submissions; this route only parses
// and formats.
//
// The submitter is resolved server-side from the member session (same as
// /api/whoami and /api/vote) — never trusted from the request, so a caller
// can't submit as someone else.
export const GET: APIRoute = async ({ request }) => {
  const p = new URL(request.url).searchParams;
  const email = await resolveSessionEmail();
  if (!email) return json({ error: 'You must be signed in to submit.' }, 401);

  const { status, body } = await submitSubmission({
    email,
    id: (p.get('id') ?? '').trim(),
    userName: (p.get('userName') ?? '').trim(),
    image: (p.get('image') ?? '').trim(),
    siteName: (p.get('siteName') ?? '').trim(),
    siteUrl: (p.get('siteUrl') ?? '').trim(),
    headlessSiteId: (p.get('headlessSiteId') ?? '').trim(),
    repoUrl: (p.get('repoUrl') ?? '').trim(),
    solutions: (p.get('solutions') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  });
  return json(body, status);
};
