import 'server-only';
import { applyTestingEnvironment } from '../../scripts/lib/testing-environment.mjs';

// This module exists only on the testing branch. Missing testing credentials
// stop the app rather than reusing production variables inherited from hosting.
applyTestingEnvironment();
