/** Testing-branch configuration: never fall back to the live app's credentials. */
export const TESTING_DATABASE_NAME = 'moodora_testing';
export const PRODUCTION_HOST = 'my-moodora.vercel.app';

/** @param {Record<string, string | undefined>} input */
export function testingEnvironmentErrors(input) {
  const errors = [];
  const branch = input.VERCEL_GIT_COMMIT_REF;
  if (branch && branch !== 'testing') errors.push('This checkout may deploy only the testing Git branch.');
  for (const field of ['TESTING_DATABASE_URL', 'TESTING_DIRECT_DATABASE_URL']) {
    const value = input[field];
    if (!value && field === 'TESTING_DIRECT_DATABASE_URL') continue;
    try {
      const url = new URL(value || '');
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || decodeURIComponent(url.pathname.slice(1)) !== TESTING_DATABASE_NAME) {
        errors.push(`${field} must reference a separate PostgreSQL database named moodora_testing with dedicated credentials.`);
      }
      if (input.VERCEL === '1' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) errors.push(`${field} must use hosted PostgreSQL on Vercel.`);
    } catch { errors.push(`${field} must be a valid PostgreSQL URL for moodora_testing.`); }
  }
  if (!input.TESTING_AUTH_SECRET || input.TESTING_AUTH_SECRET.length < 32 || input.TESTING_AUTH_SECRET.startsWith('generate-')) errors.push('TESTING_AUTH_SECRET requires a new random secret of at least 32 characters.');
  const origin = input.TESTING_AUTH_URL || (input.VERCEL_URL ? `https://${input.VERCEL_URL}` : 'http://localhost:3100');
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) errors.push('TESTING_AUTH_URL must be an application origin without a path or credentials.');
    if ([PRODUCTION_HOST, 'trfyx.com', 'www.trfyx.com', 'app.trfyx.com'].includes(url.hostname)) errors.push('TESTING_AUTH_URL must not be a production website or the TRFYX dashboard.');
    if (input.VERCEL === '1' && url.protocol !== 'https:') errors.push('Hosted testing requires HTTPS.');
  } catch { errors.push('TESTING_AUTH_URL is not a valid URL.'); }
  if (!!input.TESTING_AUTH_GOOGLE_ID !== !!input.TESTING_AUTH_GOOGLE_SECRET) errors.push('Set both TESTING_AUTH_GOOGLE_ID and TESTING_AUTH_GOOGLE_SECRET, or neither.');
  const stripe = ['TESTING_STRIPE_SECRET_KEY', 'TESTING_STRIPE_WEBHOOK_SECRET', 'TESTING_STRIPE_MONTHLY_PRICE_ID', 'TESTING_STRIPE_YEARLY_PRICE_ID'];
  if (stripe.some(key => !!input[key])) {
    if (!/^(sk|rk)_test_/.test(input.TESTING_STRIPE_SECRET_KEY || '')) errors.push('Only a Stripe sandbox/test secret key is allowed.');
    if (!input.TESTING_STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) errors.push('A separate testing Stripe webhook signing secret is required.');
    if (!input.TESTING_STRIPE_MONTHLY_PRICE_ID && !input.TESTING_STRIPE_YEARLY_PRICE_ID) errors.push('Configure at least one testing recurring Stripe Price ID.');
  }
  if (input.NEXT_PUBLIC_TESTING_TRFYX_WEBSITE_ID === 'wwfhn43v8pg5') errors.push('Use a separate TRFYX testing website ID, never the live Moodora tracker.');
  if (input.NEXT_PUBLIC_TESTING_TRFYX_DOMAIN === PRODUCTION_HOST) errors.push('The testing TRFYX domain cannot be the production Moodora domain.');
  return errors;
}

/** @param {Record<string, string | undefined>} input */
export function testingEnvironment(input) {
  const errors = testingEnvironmentErrors(input);
  if (errors.length) throw new Error(`Testing configuration blocked: ${errors.join(' ')}`);
  return {
    ...input,
    APP_ENV: 'testing',
    DATABASE_URL: input.TESTING_DATABASE_URL,
    DIRECT_DATABASE_URL: input.TESTING_DIRECT_DATABASE_URL,
    DATABASE_URL_UNPOOLED: undefined,
    AUTH_SECRET: input.TESTING_AUTH_SECRET,
    AUTH_URL: input.TESTING_AUTH_URL || (input.VERCEL_URL ? `https://${input.VERCEL_URL}` : 'http://localhost:3100'),
    AUTH_TRUST_HOST: 'true',
    AUTH_REDIRECT_PROXY_URL: undefined,
    NEXTAUTH_URL: undefined,
    NEXTAUTH_SECRET: undefined,
    AUTH_GOOGLE_ID: input.TESTING_AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: input.TESTING_AUTH_GOOGLE_SECRET,
    STRIPE_SECRET_KEY: input.TESTING_STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: input.TESTING_STRIPE_WEBHOOK_SECRET,
    STRIPE_PREMIUM_PRICE_ID: undefined,
    STRIPE_MONTHLY_PRICE_ID: input.TESTING_STRIPE_MONTHLY_PRICE_ID,
    STRIPE_YEARLY_PRICE_ID: input.TESTING_STRIPE_YEARLY_PRICE_ID,
    STRIPE_PORTAL_CONFIGURATION_ID: input.TESTING_STRIPE_PORTAL_CONFIGURATION_ID,
  };
}

/** @param {NodeJS.ProcessEnv} target */
export function applyTestingEnvironment(target = process.env) {
  const isolated = testingEnvironment(target);
  for (const [name, value] of Object.entries(isolated)) {
    if (value === undefined) delete target[name];
    else target[name] = value;
  }
  return target;
}
