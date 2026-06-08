import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = 8799;
const baseUrl = `http://localhost:${port}`;

const child = spawn(process.execPath, ['src/server.mjs'], {
  cwd: appRoot,
  env: {
    ...process.env,
    PORT: String(port),
    DISCORD_CLIENT_ID: 'smoke-client',
    DISCORD_CLIENT_SECRET: 'smoke-secret',
    DISCORD_REDIRECT_URI: `${baseUrl}/callback`,
    DISCORD_SCOPES: 'identify',
    DISCORD_PROMPT: 'consent',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

try {
  await waitForHealth();
  await assertHome();
  await assertLoginRedirect();
  console.log('Discord login smoke test OK');
} finally {
  child.kill('SIGTERM');
}

async function waitForHealth() {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      const body = await response.json();
      if (response.ok && body.ok === true) {
        return;
      }
    } catch {
      await sleep(100);
    }
  }

  throw new Error(`Server did not become healthy.\n${output}`);
}

async function assertHome() {
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert(response.ok, 'Home page should return 200.');
  assert(html.includes('Discord Login Verification'), 'Home page should include title.');
  assert(html.includes('Login with Discord'), 'Home page should show login link when env is configured.');
}

async function assertLoginRedirect() {
  const response = await fetch(`${baseUrl}/login`, { redirect: 'manual' });
  const location = response.headers.get('location') || '';
  const setCookie = response.headers.get('set-cookie') || '';
  const redirectUrl = new URL(location);

  assert(response.status === 302, 'Login should return 302.');
  assert(setCookie.includes('discord_oauth_state='), 'Login should set state cookie.');
  assert(redirectUrl.origin === 'https://discord.com', 'Login should redirect to Discord.');
  assert(redirectUrl.pathname === '/oauth2/authorize', 'Login should use Discord authorize endpoint.');
  assert(redirectUrl.searchParams.get('response_type') === 'code', 'response_type should be code.');
  assert(redirectUrl.searchParams.get('client_id') === 'smoke-client', 'client_id should be passed.');
  assert(redirectUrl.searchParams.get('redirect_uri') === `${baseUrl}/callback`, 'redirect_uri should match env.');
  assert(redirectUrl.searchParams.get('scope') === 'identify', 'scope should match env.');
  assert(Boolean(redirectUrl.searchParams.get('state')), 'state should be present.');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
