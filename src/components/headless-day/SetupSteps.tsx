import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useCopy } from '@/hooks/useCopy';

// Headless Day setup instructions as two accordions (AI-agent / manual). The
// "you're ready" terminal output lives in the section's right gradient panel.

// Public skill — no Wix VPN / internal npm registry steps.
const SETUP_PROMPT =
  'Set up my computer to create Wix headless sites using the following skill: https://www.wix.com/headless/skill.md';

/** Read-only, selectable setup prompt with a Copy button; auto-sizes to content. */
function PromptField({ text }: { text: string }) {
  const { copied, copy } = useCopy(text);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const fit = () => {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [text]);

  return (
    <div className="hcf-hday-promptfield">
      <textarea
        ref={taRef}
        className="hcf-hday-promptinput"
        readOnly
        rows={1}
        value={text}
        aria-label="Setup prompt"
      />
      <button type="button" className="hcf-hday-copy" data-copied={copied} onClick={copy}>
        {copied ? 'Prompt Copied' : 'Copy Prompt'}
      </button>
    </div>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="hcf-hd-acc" data-open={open}>
      <button type="button" className="hcf-hd-acc-head" aria-expanded={open} onClick={onToggle}>
        <svg className="hcf-hd-acc-chev" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {title}
      </button>
      {open && <div className="hcf-hd-acc-body">{children}</div>}
    </div>
  );
}

export function SetupSteps() {
  const [open, setOpen] = useState<'agent' | 'manual' | null>('agent');
  const toggle = (which: 'agent' | 'manual') => setOpen((cur) => (cur === which ? null : which));

  return (
    <div className="hcf-hd-accs">
      <Accordion
        title="Option 1: AI Coding Agent Setup (Recommended)"
        open={open === 'agent'}
        onToggle={() => toggle('agent')}
      >
        <ol className="hcf-hday-list">
          <li>
            <strong>Install an AI coding agent.</strong> Choose from Claude Code, Codex, Cursor, or
            VS Code.
          </li>
          <li>
            <strong>Run the setup prompt.</strong> In your coding agent (or its terminal), run the
            following prompt:
            <PromptField text={SETUP_PROMPT} />
            <p className="hcf-hday-note">
              This skill automatically installs prerequisites. When the Wix CLI is installed you&rsquo;ll be prompted to log in to your Wix account and paste a
              confirmation code from your agent. You&rsquo;re ready when the output confirms the
              environment is configured.
            </p>
          </li>
        </ol>
      </Accordion>

      <Accordion
        title="Option 2: Manual Installation"
        open={open === 'manual'}
        onToggle={() => toggle('manual')}
      >
        <ol className="hcf-hday-list">
          <li>
            <strong>Install an AI coding agent.</strong> Choose from Claude Code, Codex, Cursor, or
            VS Code and log in with your account.
          </li>
          <li>
            <strong>Install Node.js.</strong> Make sure you have Node.js v20.11.0 or higher.
          </li>
          <li>
            <strong>Install npm.</strong> npm comes bundled with Node.js — run{' '}
            <code className="hcf-hday-inline">npm -v</code> to confirm it&rsquo;s installed.
          </li>
          <li>
            <strong>Install the Wix CLI.</strong> Run{' '}
            <code className="hcf-hday-inline">npm install -g @wix/cli@latest</code>.
          </li>
          <li>
            <strong>Log in to your Wix account.</strong> Run{' '}
            <code className="hcf-hday-inline">wix login</code> and confirm by pasting the
            confirmation code on the Wix login page.
          </li>
          <li>
            <strong>Confirm your login.</strong> Run{' '}
            <code className="hcf-hday-inline">wix whoami</code> to check you&rsquo;re logged in.
          </li>
        </ol>
      </Accordion>
    </div>
  );
}
