import { useEffect, useState } from 'react';
import { fetchMySubmissions, submitSite } from '@/lib/headlessDayApi';
import type { MemberProfile } from '@/lib/currentUser';
import { siteThumbUrl, thumbFor } from '@/lib/siteThumb';
import { SOLUTIONS, solutionLabel, type GallerySite, type SolutionId } from '@/lib/headlessDayData';
import { hueFromSeed, thumbGradient } from '@/lib/headlessDayVisuals';

interface FormState {
  siteName: string;
  siteUrl: string;
  headlessSiteId: string;
  repoUrl: string;
  solutions: SolutionId[];
}

const EMPTY_FORM: FormState = {
  siteName: '',
  siteUrl: '',
  headlessSiteId: '',
  repoUrl: '',
  solutions: [],
};

const toForm = (s: GallerySite): FormState => ({
  siteName: s.siteName,
  siteUrl: s.siteUrl,
  headlessSiteId: s.headlessSiteId,
  repoUrl: s.repoUrl,
  solutions: s.solutions,
});

/** One always-open submission block: live preview (left) + edit form (right). */
function SubmissionEditor({
  submission,
  user,
  onSaved,
  onCancel,
}: {
  submission?: GallerySite;
  user: MemberProfile;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const isNew = !submission;
  const [form, setForm] = useState<FormState>(submission ? toForm(submission) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setJustSaved(false);
  };

  const toggleSolution = (id: SolutionId) => {
    setForm((f) => ({
      ...f,
      solutions: f.solutions.includes(id)
        ? f.solutions.filter((s) => s !== id)
        : [...f.solutions, id],
    }));
    setJustSaved(false);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await submitSite({
        id: submission?.id,
        userName: user.userName,
        image: user.image,
        ...form,
      });
      setJustSaved(true);
      if (isNew) setForm(EMPTY_FORM);
      onSaved();
    } catch {
      /* keep the form as-is on failure */
    } finally {
      setSaving(false);
    }
  };

  const heading = form.siteName.trim() || (isNew ? 'New submission' : 'Untitled site');

  return (
    <section className="hcf-hday-mysub-item">
      <h2 className="hcf-hday-mysub-heading">{heading}</h2>
      <div className="hcf-hday-mysub">
        {/* Live preview */}
        <aside className="hcf-hday-mysub-preview">
          <span
            className="hcf-hday-thumb"
            style={{ background: thumbGradient(hueFromSeed(submission?.id ?? form.siteName)) }}
            aria-hidden="true"
          >
            <span className="hcf-hday-thumb-initial">{(form.siteName || '?').charAt(0)}</span>
            {form.headlessSiteId && (
              <img
                className="hcf-hday-thumb-img"
                src={
                  // The SSR-resolved CDN URL, unless the Site ID has been edited.
                  submission && form.headlessSiteId === submission.headlessSiteId
                    ? thumbFor(submission)
                    : siteThumbUrl(form.headlessSiteId)
                }
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </span>
          <div className="hcf-hday-mysub-previewbody">
            <div className="hcf-hday-sitecard-head">
              <span className="hcf-hday-sitecard-name">{form.siteName || 'Untitled site'}</span>
              <span className="hcf-hday-likes">
                <span aria-hidden="true">♥</span> {submission?.likesCount ?? 0}
              </span>
            </div>
            <a
              className="hcf-hday-mysub-link"
              href={form.siteUrl || undefined}
              target="_blank"
              rel="noreferrer"
            >
              {form.siteUrl || 'No URL yet'}
            </a>
            <span className="hcf-hday-solutions">
              {form.solutions.length === 0 ? (
                <span className="hcf-hday-sitecard-owner">No solutions selected</span>
              ) : (
                form.solutions.map((id) => (
                  <span key={id} className="hcf-hday-solchip">
                    {solutionLabel(id)}
                  </span>
                ))
              )}
            </span>
          </div>
        </aside>

        {/* Edit form */}
        <form className="hcf-hday-form hcf-hday-mysub-form" onSubmit={handleSubmit}>
          <div className="hcf-hday-field">
            <label className="hcf-hday-label" htmlFor={`sn-${submission?.id ?? 'new'}`}>
              Site name
            </label>
            <input
              id={`sn-${submission?.id ?? 'new'}`}
              className="hcf-hday-input"
              type="text"
              required
              value={form.siteName}
              onChange={(e) => set('siteName', e.target.value)}
            />
          </div>

          <div className="hcf-hday-field">
            <label className="hcf-hday-label" htmlFor={`su-${submission?.id ?? 'new'}`}>
              Site URL
            </label>
            <input
              id={`su-${submission?.id ?? 'new'}`}
              className="hcf-hday-input"
              type="url"
              required
              placeholder="https://your-site.com"
              value={form.siteUrl}
              onChange={(e) => set('siteUrl', e.target.value)}
            />
          </div>

          <div className="hcf-hday-field">
            <label className="hcf-hday-label" htmlFor={`si-${submission?.id ?? 'new'}`}>
              Site ID
            </label>
            <input
              id={`si-${submission?.id ?? 'new'}`}
              className="hcf-hday-input"
              type="text"
              required
              value={form.headlessSiteId}
              onChange={(e) => set('headlessSiteId', e.target.value)}
            />
          </div>

          <div className="hcf-hday-field">
            <label className="hcf-hday-label" htmlFor={`sr-${submission?.id ?? 'new'}`}>
              GitHub repo <span className="hcf-hday-optional">Optional</span>
            </label>
            <input
              id={`sr-${submission?.id ?? 'new'}`}
              className="hcf-hday-input"
              type="url"
              placeholder="https://github.com/you/your-repo"
              value={form.repoUrl}
              onChange={(e) => set('repoUrl', e.target.value)}
            />
          </div>

          <div className="hcf-hday-field">
            <span className="hcf-hday-label">Business solutions used</span>
            <div className="hcf-hday-filters" role="group" aria-label="Business solutions used">
              {SOLUTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="hcf-hd-tag"
                  data-active={form.solutions.includes(s.id)}
                  aria-pressed={form.solutions.includes(s.id)}
                  onClick={() => toggleSolution(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hcf-hday-mysub-actions">
            <button type="submit" className="hcf-hday-submit" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Submit site' : 'Save changes'}
            </button>
            {onCancel && (
              <button
                type="button"
                className="hcf-hday-filter"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </button>
            )}
            {justSaved && (
              <span className="hcf-hday-saved" role="status">
                Saved
              </span>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

/**
 * The member's submissions, each as an inline editor, plus "Add submission".
 * `user` and the `initial` list are resolved in SSR (the page is members-only);
 * `initial` is null when that read failed, so the list loads client-side instead.
 */
export function MySubmissions({
  user,
  initial,
}: {
  user: MemberProfile;
  initial: GallerySite[] | null;
}) {
  const [list, setList] = useState<GallerySite[]>(initial ?? []);
  const [loading, setLoading] = useState(initial == null);
  const [adding, setAdding] = useState(false);

  const refresh = async () => setList(await fetchMySubmissions(user.email));

  useEffect(() => {
    if (initial != null) return;
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="hcf-hday-empty">Loading your submissions…</p>;

  return (
    <div className="hcf-hday-mysub-list">
      {list.length === 0 && !adding && (
        <p className="hcf-hday-empty">
          You haven&rsquo;t submitted any sites yet — add your first one.
        </p>
      )}

      {list.map((s) => (
        <SubmissionEditor key={s.id} submission={s} user={user} onSaved={() => void refresh()} />
      ))}

      {adding && (
        <SubmissionEditor
          user={user}
          onSaved={() => {
            setAdding(false);
            void refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {!adding && (
        <div className="hcf-hday-mysub-add">
          <button type="button" className="hcf-hday-submit" onClick={() => setAdding(true)}>
            Add submission
          </button>
        </div>
      )}
    </div>
  );
}
