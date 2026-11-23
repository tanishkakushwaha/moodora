export type DeploymentEnvironment = Readonly<Record<string, string | undefined>>;

function originOf(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('The application URL must be an HTTP or HTTPS origin without credentials.');
  }
  return url.origin;
}

export function trustedOrigins(requestUrl: string, env: DeploymentEnvironment = process.env): string[] {
  if (env.VERCEL !== '1') return [originOf(env.AUTH_URL || requestUrl)];

  // Use only this deployment's configured domains. Preview deployments must
  // not silently trust the production domain or a wildcard *.vercel.app.
  const origins = new Set<string>();
  if (env.AUTH_URL) origins.add(originOf(env.AUTH_URL));
  if (env.VERCEL_URL) origins.add(originOf(`https://${env.VERCEL_URL}`));
  if (env.VERCEL_BRANCH_URL) origins.add(originOf(`https://${env.VERCEL_BRANCH_URL}`));
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.add(originOf(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`));
  }
  return [...origins].filter(origin => new URL(origin).hostname !== 'my-moodora.vercel.app');
}

export function usesSecureCookies(env: DeploymentEnvironment = process.env): boolean {
  if (env.VERCEL === '1') return true;
  if (env.AUTH_URL) return new URL(env.AUTH_URL).protocol === 'https:';
  return env.NODE_ENV === 'production';
}

function checkDatabaseUrl(value: string | undefined, key: string, errors: string[]) {
  if (!value) {
    errors.push(`${key} is required. Connect a hosted PostgreSQL database in Vercel Storage.`);
    return;
  }
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      errors.push(`${key} must be a PostgreSQL connection string.`);
    } else if (['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(url.hostname) || url.hostname.endsWith('.localhost')) {
      errors.push(`${key} points to a local database. Vercel needs a hosted PostgreSQL database.`);
    } else if (!url.hostname || url.pathname.length < 2 || !url.username || !url.password) {
      errors.push(`${key} must include its database host, name, user, and password.`);
    }
  } catch {
    errors.push(`${key} is not a valid PostgreSQL connection string.`);
  }
}

export function vercelEnvironmentErrors(env: DeploymentEnvironment): string[] {
  const errors: string[] = [];
  checkDatabaseUrl(env.DATABASE_URL, 'DATABASE_URL', errors);
  const direct = env.DIRECT_DATABASE_URL || env.DATABASE_URL_UNPOOLED;
  if (direct) checkDatabaseUrl(direct, env.DIRECT_DATABASE_URL ? 'DIRECT_DATABASE_URL' : 'DATABASE_URL_UNPOOLED', errors);
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32 || env.AUTH_SECRET === 'generate-with-openssl-rand-base64-32') {
    errors.push('AUTH_SECRET must be a random secret of at least 32 characters. Import the prepared .env.vercel file.');
  }
  if (env.AUTH_URL) {
    try {
      const url = new URL(env.AUTH_URL);
      if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
        errors.push('AUTH_URL must be the HTTPS origin of your hosted app, without a path. Leave it unset to use Vercel domain detection.');
      }
    } catch {
      errors.push('AUTH_URL must be a valid HTTPS origin.');
    }
  } else if (!env.VERCEL_URL && !(env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL)) {
    errors.push('Enable Vercel system environment variables or set AUTH_URL to your HTTPS app origin.');
  }
  if (!!env.AUTH_GOOGLE_ID !== !!env.AUTH_GOOGLE_SECRET) {
    errors.push('Set both Google OAuth variables, or leave both unset to use email/password login.');
  }
  return errors;
}
