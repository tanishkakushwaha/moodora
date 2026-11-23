import 'dotenv/config';
import { testingEnvironmentErrors } from './lib/testing-environment.mjs';
const errors = testingEnvironmentErrors(process.env);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else console.log('Testing configuration validated. Separate database name and test-only Stripe configuration checked; no migration performed.');
