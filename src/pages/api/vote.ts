import type { APIRoute } from 'astro';
import { json, resolveSessionEmail, toggleVote } from '@/lib/server/submissions';

// Toggle the caller's like on a single submission. Likes are independent per
// site — a user can like as many submissions as they want; liking one never
// touches another. Liking an already-liked submission removes the like. A user
// cannot like their own submission.
//   /api/vote?submissionId=
//
// The voter is resolved server-side from the member session — it is never
// trusted from the request, so a caller can't vote as someone else.
export const GET: APIRoute = async ({ request }) => {
  const p = new URL(request.url).searchParams;
  const submissionId = (p.get('submissionId') ?? '').trim();
  if (!submissionId) return json({ error: 'Missing submissionId' }, 400);

  const voter = await resolveSessionEmail();
  if (!voter) return json({ error: 'You must be signed in to like.' }, 401);

  const { status, body } = await toggleVote(submissionId, voter);
  return json(body, status);
};
