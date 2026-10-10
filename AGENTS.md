## CLI Commands

All CLI instructions can be found at:
node_modules/@wix/cli/agents/instructions.md

## Skills

This project comes with a set of skills that can be used when the user asks for help with specific tasks.
If you're using the instructions provided by a skill and fail, or if you do not find a relevant skill for the task,
you can try updating the skills by running the following command:

`wix skills update`

This will update the skills to the latest version.

## Top Level Pages

- Pages: `src/pages/{index,information,gallery,reels,my-submission}.astro` (members only, gated in SSR via
`requireMember`; anonymous visitors go to `src/pages/login.astro`). Static markup lives in the pages and in
Astro components (`Header.astro`, `HeroPills.astro`, `layouts/HeadlessDayLayout.astro`); only the interactive
parts are React islands in `src/components/headless-day/*.tsx` (setup accordions, copy buttons, FAQ, submit
form, gallery browser, rolling count, Reels, My Submissions editors). Data the page can know up front (the
member, the gallery count, the member's submissions) is resolved in SSR and passed to the islands as props.
- Thumbnails: Wix's `site-thumbnail` service redirects twice (uncacheable) before the CDN image, so
`src/lib/server/siteThumbs.ts` resolves it server-side (cached 10 min). SSR-rendered items carry the CDN URL
(`thumbUrl`); browser-loaded ones use `/api/site-thumb?siteId=`, one cacheable redirect. Use `thumbFor(site)`.
- Styles: the `headless-day.css` barrel + `src/styles/base.css` tokens, loaded only by `HeadlessDayLayout`.
- CMS: `Submissions` (read ANYONE, write ADMIN) and `Votes` (ADMIN only). The browser reads `Submissions` directly
with `@wix/data`; every write goes through `src/pages/api/{submit,vote}.ts`, which use `auth.elevate` in
`src/lib/server/submissions.ts`.
- Identity is the member session (`@wix/members` `getCurrentMember`, Members Area app installed). The submitter /
voter email is always resolved server-side, never taken from the request. Login is the custom `/login` page
(Google / Facebook only), which hands off to the built-in `/api/auth/login?idp=…&returnToUrl=…`.
