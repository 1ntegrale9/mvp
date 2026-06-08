import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(appRoot, '.env');

loadEnvFile(envPath);

const required = ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('');
  console.error('Human action required:');
  console.error('1. Create a Discord Application in the Developer Portal.');
  console.error('2. Add this redirect URL under OAuth2 Redirects: http://localhost:8787/callback');
  console.error('3. Copy .env.example to .env and fill DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET.');
  process.exit(1);
}

const redirectUri = new URL(process.env.DISCORD_REDIRECT_URI);
if (redirectUri.protocol !== 'http:' && redirectUri.protocol !== 'https:') {
  console.error(`Invalid DISCORD_REDIRECT_URI protocol: ${redirectUri.protocol}`);
  process.exit(1);
}

const scopes = process.env.DISCORD_SCOPES || 'identify';
if (!scopes.split(/\s+/).includes('identify')) {
  console.error('DISCORD_SCOPES must include identify to fetch /users/@me.');
  process.exit(1);
}

console.log('Discord login preflight OK');
console.log(`Redirect URI: ${redirectUri.toString()}`);
console.log(`Scopes: ${scopes}`);

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
