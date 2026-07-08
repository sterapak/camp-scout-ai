import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Keep OpenAI answer generation on the fake provider in unit tests.
process.env.OPENAI_ANSWER_PROVIDER = 'fake';
delete process.env.OPENAI_API_KEY;

// Protected AI routes require an internal token in middleware tests.
process.env.CAMP_SCOUT_API_TOKEN = 'test-api-token';

// Use an isolated audit log path in tests.
process.env.AI_AUDIT_LOG_PATH = '/tmp/camp-scout-ai-test-audit.jsonl'; 
// AI budget persistence: in-memory SQLite for tests (no file, no dev-db bleed)
process.env.DATABASE_PATH = ':memory:';
