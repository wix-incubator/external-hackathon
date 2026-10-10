import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import chevron from '../../assets/figma/sec2-chevron-down.svg';
import { SLACK_CHANNEL_URL } from '@/lib/constants';

// The Information page's FAQ: a single-open accordion with animated expand.
// (The rest of the page is static — src/pages/information.astro.)

const HELP_CENTER_DOMAIN_URL = 'https://support.wix.com/en/connecting-a-domain';
const GIT_INSTALL_URL = 'https://git-scm.com/downloads';
const GITHUB_URL = 'https://github.com';
const HOMEBREW_URL = 'https://brew.sh';

// ---- FAQ ----
interface Faq {
  id: string;
  q: string;
  a: ReactNode;
}
const FAQS: Faq[] = [
  {
    id: 'get-started',
    q: 'How do I get started?',
    a: (
      <>
        Run the prerequisite <a href="/#setup">set up steps</a> to ensure your system is
        ready to create Wix Headless sites locally. Once you get confirmation that you&rsquo;re good
        to go, refer to the <a href="/#scratch">&ldquo;Build your Site&rdquo;</a> guide to
        start working on your Headless dream site.
      </>
    ),
  },
  {
    id: 'which-agent',
    q: 'Which coding agent should I use if I have never used one before?',
    a: (
      <>
        While it&rsquo;s often a personal preference, we recommend using Claude Code or Codex if
        this is your first time using an AI coding agent. If you need help setting up your AI
        environment, let someone from the Headless team know, and we&rsquo;ll be happy to help.
      </>
    ),
  },
  {
    id: 'paid-account',
    q: 'Do I need a paid account for the coding agent?',
    a: (
      <>
        For Codex, Claude Code, Cursor, and VSCode, you should use your Wix account and
        automatically have access to all the features you need. There is no need to use any other
        premium or paid accounts for other tools.
      </>
    ),
  },
  {
    id: 'vibe-tools',
    q: 'Can I build a Headless site on vibe tools like Base44 or Lovable?',
    a: <>This is a work in progress and is not in scope for today.</>,
  },
  {
    id: 'domain',
    q: 'I want to connect a domain to my site. How do I do this?',
    a: (
      <>
        Connecting a domain is done in the same way you connect any other website on Wix to a
        domain. You can follow{' '}
        <a href={HELP_CENTER_DOMAIN_URL} target="_blank" rel="noreferrer">
          this guide in our Help Center
        </a>
        .
        <p className="hcf-hday-callout" role="note">
          <strong>Important:</strong> when you upgrade your site you&rsquo;ll be eligible for a free
          domain for a year, but you must enter real credit-card info. To avoid any charges down the
          line, make sure to disconnect the auto-renewal option.
        </p>
      </>
    ),
  },
  {
    id: 'upgrade-checkout',
    q: 'How to upgrade my site so I can connect a domain and test checkout flows?',
    a: (
      <>
        Upgrade your site using the{' '}
        <a href="https://wix.slack.com/archives/D016230NRN0" target="_blank" rel="noreferrer">
          wix-assistant
        </a>{' '}
        bot in Slack. To upgrade your site, enter the command{' '}
        <code className="hcf-hday-inline">/wa dashboard {'{MSID}'}</code> (found in the site&rsquo;s
        URL).
      </>
    ),
  },
  {
    id: 'git',
    q: 'How do I set up a git / GitHub account?',
    a: (
      <>
        If you&rsquo;ve never set one up, follow these steps:
        <ul className="hcf-hday-faq-sublist">
          <li>
            <strong>GitHub</strong> &mdash; open a GitHub account at{' '}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              github.com
            </a>{' '}
            using your Wix account. You&rsquo;ll need to verify your account via email.
          </li>
          <li>
            <strong>git</strong> &mdash; follow the{' '}
            <a href={GIT_INSTALL_URL} target="_blank" rel="noreferrer">
              instructions for your operating system
            </a>
            .
          </li>
        </ul>
        <p className="hcf-hday-callout" role="note">
          <strong>Important:</strong> on Mac, git is installed from the terminal &mdash; you may
          need to first install{' '}
          <a href={HOMEBREW_URL} target="_blank" rel="noreferrer">
            Homebrew
          </a>
          .
        </p>
        <p className="hcf-hday-faq-p">
          Once git is installed, connect it to your GitHub credentials by running{' '}
          <code className="hcf-hday-inline">
            git config --global user.name &quot;YourGitHubUsername&quot;
          </code>{' '}
          in your terminal.
        </p>
        <p className="hcf-hday-faq-p">
          Need help? Let us know in the <a href={SLACK_CHANNEL_URL}>Slack channel</a> or find a
          Headless team member.
        </p>
      </>
    ),
  },
];

export function Faqs() {
  const [openIndex, setOpenIndex] = useState(-1);
  return (
    <section className="hcf-hday-faq" id="faq">
      <div className="hcf-hday-faq-inner">
        <h2 className="hcf-hday-step-title">Got a question? We&rsquo;ve got you covered.</h2>
        <p className="hcf-hday-faq-intro">
          Didn&rsquo;t find the answer? Find a Headless team member or ask in the{' '}
          <a href={SLACK_CHANNEL_URL}>Slack channel</a>.
        </p>
        <div className="hcf-hday-faq-list">
          {FAQS.map((item, i) => {
            const expanded = i === openIndex;
            return (
              <div key={item.id} id={`faq-${item.id}`} className="hcf-hday-faq-item">
                <button
                  type="button"
                  className="hcf-hday-faq-row"
                  aria-expanded={expanded}
                  onClick={() => setOpenIndex(expanded ? -1 : i)}
                >
                  <span>{item.q}</span>
                  <motion.img
                    className="hcf-hday-faq-chevron"
                    src={chevron.src}
                    alt=""
                    aria-hidden="true"
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      className="hcf-hday-faq-body-wrap"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="hcf-hday-faq-body">{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
