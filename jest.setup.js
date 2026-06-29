import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock @supabase/supabase-js globally for all tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: async () => ({ data: [], error: null }),
    }),
  }),
}));

// Set dummy env vars for Supabase
process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
process.env.VITE_SUPABASE_KEY = 'dummy-key';

// Keep OpenAI answer generation on the fake provider in unit tests.
process.env.OPENAI_ANSWER_PROVIDER = 'fake';
delete process.env.OPENAI_API_KEY;

// Protected AI routes require an internal token in middleware tests.
process.env.CAMP_SCOUT_API_TOKEN = 'test-api-token';

// Use an isolated audit log path in tests.
process.env.AI_AUDIT_LOG_PATH = '/tmp/camp-scout-ai-test-audit.jsonl'; 