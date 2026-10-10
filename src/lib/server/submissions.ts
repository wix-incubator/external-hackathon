import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { members } from '@wix/members';
import { COLLECTIONS } from '@/lib/headlessDayData';

// Server-side business logic for the Headless Day gallery submissions + votes.
// The /api/submit and /api/vote routes stay thin adapters: parse request → call
// one of these → format the Response. SERVER ONLY.
//
// Submissions is public-read but admin-write, and Votes is admin-only, so every
// data call here runs with app permissions via auth.elevate(). Because these
// routes expose elevated writes, each one checks who the caller is (the member
// session) and what they may touch (ownership) before writing.

type Item = Record<string, unknown>;

const elevated = {
  get: auth.elevate(items.get),
  insert: auth.elevate(items.insert),
  update: auth.elevate(items.update),
  remove: auth.elevate(items.remove),
  query: auth.elevate(items.query),
};

/** Status + JSON body a route turns into a Response. */
export interface ApiResult {
  status: number;
  body: unknown;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export interface SessionMember {
  email: string;
  userName: string | null;
  image: string | null;
}

/** The logged-in member (from the @wix/astro member session), or null for an
 *  anonymous visitor. The identity for every write (submit, vote) — never
 *  trusted from the request. Email is normalized to lowercase. */
export async function resolveSessionMember(): Promise<SessionMember | null> {
  try {
    const { member } = await members.getCurrentMember({ fieldsets: ['FULL'] });
    const email = member?.loginEmail?.trim().toLowerCase();
    if (!email) return null;
    const fullName = [member?.contact?.firstName, member?.contact?.lastName]
      .filter(Boolean)
      .join(' ');
    return {
      email,
      userName: fullName || member?.profile?.nickname || null,
      image: member?.profile?.photo?.url || null,
    };
  } catch {
    return null;
  }
}

export async function resolveSessionEmail(): Promise<string | null> {
  return (await resolveSessionMember())?.email ?? null;
}

export interface SubmitParams {
  email: string;
  id: string;
  userName: string;
  image: string;
  siteName: string;
  siteUrl: string;
  headlessSiteId: string;
  repoUrl: string;
  solutions: string[];
}

/**
 * Create a new submission (no id), or update the caller's existing one by id
 * (ownership-guarded). Values are already trimmed/parsed by the caller.
 */
export async function submitSubmission(p: SubmitParams): Promise<ApiResult> {
  const { email, id, userName, image, siteName, siteUrl, headlessSiteId, repoUrl, solutions } = p;

  if (!email || !siteName || !siteUrl || !headlessSiteId) {
    return {
      status: 400,
      body: { error: 'Missing required fields (user, site name, URL, site ID).' },
    };
  }

  try {
    if (id) {
      // Edit an existing row. Guard ownership: the client names the target,
      // so the elevated write must verify the caller owns it.
      const current = ((await elevated.get(COLLECTIONS.submissions, id)) ?? {}) as Item;
      if (!current._id) {
        return { status: 404, body: { error: 'Submission not found.' } };
      }
      if (String(current.ownerEmail ?? '').toLowerCase() !== email) {
        return { status: 403, body: { error: "You can't edit someone else's submission." } };
      }
      const payload = {
        ...current,
        _id: String(current._id),
        siteName,
        ownerName: userName || (current.ownerName as string | undefined) || email,
        ownerEmail: email,
        ownerImage: image || (current.ownerImage as string | undefined) || '',
        siteUrl,
        headlessSiteId,
        repoUrl: repoUrl || (current.repoUrl as string | undefined) || '',
        solutions: solutions.length ? solutions : ((current.solutions as string[] | undefined) ?? []),
        likesCount: (current.likesCount as number | undefined) ?? 0,
      };
      await elevated.update(COLLECTIONS.submissions, payload);
      return { status: 200, body: { id: String(current._id), updated: true } };
    }

    // No id → always create a new submission.
    const inserted = (await elevated.insert(COLLECTIONS.submissions, {
      siteName,
      ownerName: userName || email,
      ownerEmail: email,
      ownerImage: image || '',
      siteUrl,
      headlessSiteId,
      repoUrl: repoUrl || '',
      solutions,
      likesCount: 0,
    })) as Item;
    return { status: 200, body: { id: String(inserted._id ?? ''), updated: false } };
  } catch (err) {
    console.error('[api/submit] request failed', {
      email,
      id: id || '(new)',
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 500, body: { error: err instanceof Error ? err.message : 'Submit failed' } };
  }
}

/**
 * The submission IDs a (normalized) voter email has liked, read from the Votes
 * collection with app permissions. This is the server truth for the filled-heart
 * state — the client's localStorage cache is only a hint and can drift (cleared
 * storage, a different browser/device), so views reconcile against this. Throws
 * on query failure so the caller can distinguish "no likes" from "unknown".
 */
export async function listVotedIds(voterEmail: string): Promise<string[]> {
  const voter = voterEmail.trim().toLowerCase();
  if (!voter) return [];
  const ids = new Set<string>();
  const collect = (rows: unknown[]) => {
    for (const v of rows as Item[]) if (v.submissionId) ids.add(String(v.submissionId));
  };
  let res = await elevated.query(COLLECTIONS.votes).eq('voterEmail', voter).limit(1000).find();
  collect(res.items);
  while (res.hasNext()) {
    res = await res.next();
    collect(res.items);
  }
  return [...ids];
}

/**
 * Toggle the caller's like on a single submission. Likes are independent per
 * site; liking an already-liked submission removes the like. A user cannot like
 * their own submission. Returns { liked, likesCount }.
 */
export async function toggleVote(submissionId: string, voter: string): Promise<ApiResult> {
  try {
    const target = ((await elevated.get(COLLECTIONS.submissions, submissionId)) ?? {}) as Item;
    if (!target._id) return { status: 404, body: { error: 'Submission not found.' } };
    if (String(target.ownerEmail ?? '').toLowerCase() === voter) {
      return { status: 403, body: { error: "You can't like your own submission." } };
    }

    // Toggle this voter's like on THIS submission only. (limit(50) also
    // sweeps up any duplicate rows for the same pair.)
    const existing = await elevated
      .query(COLLECTIONS.votes)
      .eq('voterEmail', voter)
      .eq('submissionId', submissionId)
      .limit(50)
      .find();

    if (existing.items.length > 0) {
      // Unlike: remove the vote row(s) and decrement.
      for (const v of existing.items as Item[]) {
        await elevated.remove(COLLECTIONS.votes, String(v._id));
      }
      const next = Math.max(0, Number(target.likesCount ?? 0) - existing.items.length);
      await elevated.update(COLLECTIONS.submissions, {
        ...target,
        _id: submissionId,
        likesCount: next,
      });
      return { status: 200, body: { liked: false, likesCount: next } };
    }

    // Like: add a vote and increment.
    const next = Number(target.likesCount ?? 0) + 1;
    await elevated.insert(COLLECTIONS.votes, { submissionId, voterEmail: voter });
    await elevated.update(COLLECTIONS.submissions, { ...target, _id: submissionId, likesCount: next });
    return { status: 200, body: { liked: true, likesCount: next } };
  } catch (err) {
    console.error('[api/vote] request failed', {
      submissionId,
      voter,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 500, body: { error: err instanceof Error ? err.message : 'Vote failed' } };
  }
}
