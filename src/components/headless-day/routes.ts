// Route paths for the Headless Day pages (top-level pages in src/pages/).
export const HEADLESS_DAY_ROUTES = {
  home: '/',
  information: '/information',
  gallery: '/gallery',
  reels: '/reels',
  mySubmission: '/my-submission',
} as const;

export type HeadlessDayPage = keyof typeof HEADLESS_DAY_ROUTES;

/** Built-in @wix/astro logout (POST), landing back on the login page. */
export const LOGOUT_ACTION = `/api/auth/logout?returnToUrl=${encodeURIComponent('/login')}`;
