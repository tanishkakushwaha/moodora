import 'dotenv/config';
import { vercelEnvironmentErrors } from '../src/lib/deployment.ts';

const errors = vercelEnvironmentErrors(process.env);
if (errors.length) {
  console.error('\nVercel deployment configuration needs attention:');
  for (const error of errors) console.error(`- ${error}`);
  console.error('\nSee docs/VERCEL.md. No migration was run.');
  process.exitCode = 1;
} else {
  console.log('Hosted PostgreSQL, authentication secret, and HTTPS domain configuration are ready.');
}
