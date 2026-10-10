import { useCopy } from '@/hooks/useCopy';
import { SKILL_URL, SKILL_URL_DISPLAY } from '@/lib/constants';

/** Read-only skill URL with a Copy button (lime-edged box). */
export function CopySkill() {
  const { copied, copy } = useCopy(SKILL_URL);
  return (
    <div className="hcf-hd-skill">
      <code className="hcf-hd-skill-url">{SKILL_URL_DISPLAY}</code>
      <button type="button" className="hcf-hd-skill-copy" data-copied={copied} onClick={copy}>
        {copied ? 'Copied' : 'Copy Skill'}
      </button>
    </div>
  );
}
