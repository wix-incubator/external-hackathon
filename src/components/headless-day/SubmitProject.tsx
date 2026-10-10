import { useState } from 'react';
import { submitSite } from '@/lib/headlessDayApi';
import type { MemberProfile } from '@/lib/currentUser';
import { SOLUTIONS, solutionLabel, type GallerySite, type SolutionId } from '@/lib/headlessDayData';
import { HEADLESS_DAY_ROUTES } from '@/components/headless-day/routes';
import celebrate from '../../assets/figma/celebrate.svg';

// ---- Submit ----
interface SubmitForm {
  id: string;
  siteName: string;
  headlessSiteId: string;
  siteUrl: string;
  repoUrl: string;
  solutions: SolutionId[];
}
const EMPTY_SUBMIT: SubmitForm = {
  id: '',
  siteName: '',
  headlessSiteId: '',
  siteUrl: '',
  repoUrl: '',
  solutions: [],
};

/** The home page's submit form. `user` is the signed-in member, resolved in SSR
 *  (the page is members-only). */
export function SubmitProject({ user }: { user: MemberProfile }) {
  const [existing, setExisting] = useState<GallerySite | null>(null);
  const [form, setForm] = useState<SubmitForm>(EMPTY_SUBMIT);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const set = <K extends keyof SubmitForm>(key: K, value: SubmitForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleSolution = (id: SolutionId) =>
    setForm((f) => ({
      ...f,
      solutions: f.solutions.includes(id)
        ? f.solutions.filter((s) => s !== id)
        : [...f.solutions, id],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    try {
      const { id } = await submitSite({
        id: form.id || undefined,
        userName: user.userName,
        image: user.image,
        siteName: form.siteName,
        siteUrl: form.siteUrl,
        headlessSiteId: form.headlessSiteId,
        repoUrl: form.repoUrl,
        solutions: form.solutions,
      });
      setForm((f) => ({ ...f, id }));
      setExisting({
        id,
        siteName: form.siteName,
        ownerName: user.userName,
        ownerEmail: user.email,
        ownerImage: user.image,
        siteUrl: form.siteUrl,
        headlessSiteId: form.headlessSiteId,
        repoUrl: form.repoUrl,
        solutions: form.solutions,
        likesCount: 0,
        createdAt: 0,
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'failed');
      setStatus('error');
    }
  };

  // Section heading — shown above the form, but not on the success screen
  // (which is its own centered celebration, per Figma 75:219).
  const heading = <h2 className="hcf-hd-h2 hcf-hd-center">Submit Your Project!</h2>;

  if (existing) {
    return (
      <div className="hcf-hd-submitted">
        <img src={celebrate.src} alt="" aria-hidden="true" className="hcf-hd-submitted-icon" />
        <h2 className="hcf-hd-submitted-title">Your Project Has Been Submitted!</h2>
        <p className="hcf-hd-submitted-sub">Stay tuned — you might win the prize!</p>
        <div className="hcf-hd-submitted-actions">
          <a href={HEADLESS_DAY_ROUTES.mySubmission} className="hcf-hd-btn-dark">
            Update Submission
          </a>
          <button
            type="button"
            className="hcf-hd-textlink"
            onClick={() => {
              // Fresh, cleared form for another submission.
              setForm(EMPTY_SUBMIT);
              setExisting(null);
              setStatus('idle');
            }}
          >
            Submit another Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {heading}
      <form className="hcf-hd-form" onSubmit={handleSubmit}>
        <label className="hcf-hd-field">
          <span className="hcf-hd-label">Site Name*</span>
          <input
            className="hcf-hd-input"
            type="text"
            required
            value={form.siteName}
            onChange={(e) => set('siteName', e.target.value)}
          />
        </label>
        <label className="hcf-hd-field">
          <span className="hcf-hd-label">Site ID*</span>
          <input
            className="hcf-hd-input"
            type="text"
            required
            value={form.headlessSiteId}
            onChange={(e) => set('headlessSiteId', e.target.value)}
          />
        </label>
        <label className="hcf-hd-field">
          <span className="hcf-hd-label">Site URL*</span>
          <input
            className="hcf-hd-input"
            type="url"
            required
            placeholder="https://your-site.com"
            value={form.siteUrl}
            onChange={(e) => set('siteUrl', e.target.value)}
          />
        </label>
        <label className="hcf-hd-field">
          <span className="hcf-hd-label">
            GitHub Repo <span className="hcf-hd-optional">(Optional)</span>
          </span>
          <input
            className="hcf-hd-input"
            type="url"
            placeholder="https://github.com/you/your-repo"
            value={form.repoUrl}
            onChange={(e) => set('repoUrl', e.target.value)}
          />
        </label>
        <div className="hcf-hd-field">
          <span className="hcf-hd-label">Business Solutions</span>
          <div className="hcf-hd-solpicker">
            {SOLUTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className="hcf-hd-tag"
                data-active={form.solutions.includes(s.id)}
                onClick={() => toggleSolution(s.id)}
              >
                {solutionLabel(s.id)}
              </button>
            ))}
          </div>
        </div>
        <div className="hcf-hd-form-actions">
          <button type="submit" className="hcf-hd-btn-dark" disabled={status === 'saving'}>
            {status === 'saving' ? 'Submitting…' : 'Submit Your Project'}
          </button>
          {status === 'error' && (
            <span className="hcf-hday-error" role="status">
              Something went wrong ({message}).
            </span>
          )}
        </div>
      </form>
    </>
  );
}
