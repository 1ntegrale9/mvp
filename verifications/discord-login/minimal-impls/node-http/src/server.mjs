import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE_URL = 'https://discord.com/api/v10';
const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = `${API_BASE_URL}/oauth2/token`;
const CURRENT_USER_URL = `${API_BASE_URL}/users/@me`;
const STATE_COOKIE = 'discord_oauth_state';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const verificationResultPath = join(appRoot, 'verification-result.local.json');
loadEnvFile(join(appRoot, '.env'));

const config = {
  port: Number(process.env.PORT || 8787),
  clientId: process.env.DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  redirectUri:
    process.env.DISCORD_REDIRECT_URI ||
    `http://localhost:${Number(process.env.PORT || 8787)}/callback`,
  scopes: process.env.DISCORD_SCOPES || 'identify',
  prompt: process.env.DISCORD_PROMPT || 'consent',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/') {
      return sendHtml(res, renderHome());
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/result') {
      return sendVerificationResult(res);
    }

    if (req.method === 'GET' && url.pathname === '/login') {
      return startLogin(res);
    }

    if (req.method === 'GET' && url.pathname === '/callback') {
      return handleCallback(req, res, url);
    }

    if (req.method === 'GET' && url.pathname === '/logout') {
      setCookie(res, STATE_COOKIE, '', { maxAge: 0 });
      return redirect(res, '/');
    }

    return sendHtml(res, renderError('Not found'), 404);
  } catch (error) {
    console.error(error);
    return sendHtml(res, renderError(error.message || 'Unexpected error'), 500);
  }
});

server.listen(config.port, () => {
  console.log(`Discord login verification listening on http://localhost:${config.port}`);
  console.log(`Callback URL: ${config.redirectUri}`);
});

function startLogin(res) {
  ensureConfigured();

  const state = randomBytes(32).toString('base64url');
  const authorizeUrl = new URL(AUTHORIZE_URL);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizeUrl.searchParams.set('scope', config.scopes);
  authorizeUrl.searchParams.set('state', state);

  if (config.prompt) {
    authorizeUrl.searchParams.set('prompt', config.prompt);
  }

  setCookie(res, STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.redirectUri.startsWith('https://'),
    maxAge: 600,
  });
  return redirect(res, authorizeUrl.toString());
}

async function handleCallback(req, res, url) {
  ensureConfigured();

  const error = url.searchParams.get('error');
  if (error) {
    const description = url.searchParams.get('error_description') || 'Discord returned an error.';
    throw new Error(`${error}: ${description}`);
  }

  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const expectedState = parseCookies(req.headers.cookie || '')[STATE_COOKIE];

  if (!code) {
    throw new Error('Missing code in callback URL.');
  }

  if (!expectedState || !returnedState || !safeEqual(expectedState, returnedState)) {
    throw new Error('OAuth state mismatch. Check cookies, callback host, and port.');
  }

  const token = await exchangeCodeForToken(code);
  const user = await fetchCurrentUser(token.access_token);

  writeVerificationResult(user, token);
  console.log('Verification success for Discord user.');

  setCookie(res, STATE_COOKIE, '', { maxAge: 0 });
  return sendHtml(res, renderSuccess(user, token));
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function fetchCurrentUser(accessToken) {
  const response = await fetch(CURRENT_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Current user fetch failed: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function ensureConfigured() {
  const missing = [];
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.clientSecret) missing.push('DISCORD_CLIENT_SECRET');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function sendVerificationResult(res) {
  if (!existsSync(verificationResultPath)) {
    return sendJson(res, 404, { ok: false, message: 'No successful verification recorded yet.' });
  }

  const result = JSON.parse(readFileSync(verificationResultPath, 'utf8'));
  return sendJson(res, 200, result);
}

function writeVerificationResult(user, token) {
  const result = {
    ok: true,
    verifiedAt: new Date().toISOString(),
    redirectUri: config.redirectUri,
    scopes: token.scope || config.scopes,
    tokenType: token.token_type || '',
    expiresIn: token.expires_in || null,
    accessTokenReceived: Boolean(token.access_token),
    refreshTokenReceived: Boolean(token.refresh_token),
    user: {
      id: user.id,
      username: user.username,
      globalName: user.global_name || null,
      emailReceived: Object.prototype.hasOwnProperty.call(user, 'email'),
      avatarReceived: Boolean(user.avatar),
    },
  };

  writeFileSync(verificationResultPath, `${JSON.stringify(result, null, 2)}\n`);
}

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

function parseCookies(cookieHeader) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separator = cookie.indexOf('=');
        if (separator === -1) {
          return [cookie, ''];
        }
        return [
          decodeURIComponent(cookie.slice(0, separator)),
          decodeURIComponent(cookie.slice(separator + 1)),
        ];
      }),
  );
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, 'Path=/'];

  if (options.httpOnly) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`);

  res.setHeader('Set-Cookie', parts.join('; '));
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function sendHtml(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>${body}`);
}

function renderHome() {
  const missing = [];
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.clientSecret) missing.push('DISCORD_CLIENT_SECRET');

  return html`
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Discord Login Verification</title>
        <style>${styles()}</style>
      </head>
      <body>
        <main>
          <h1>Discord Login Verification</h1>
          <p>Authorization Code Grant with state validation and /users/@me fetch.</p>
          <dl>
            <dt>Redirect URI</dt>
            <dd>${escapeHtml(config.redirectUri)}</dd>
            <dt>Scopes</dt>
            <dd>${escapeHtml(config.scopes)}</dd>
          </dl>
          ${
            missing.length > 0
              ? `<p class="warning">Missing env: ${missing.map(escapeHtml).join(', ')}</p>`
              : '<a class="button" href="/login">Login with Discord</a>'
          }
        </main>
      </body>
    </html>
  `;
}

function renderSuccess(user, token) {
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : '';

  return html`
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Discord Login Success</title>
        <style>${styles()}</style>
      </head>
      <body>
        <main>
          <h1>Login OK</h1>
          ${avatarUrl ? `<img class="avatar" src="${escapeHtml(avatarUrl)}" alt="" />` : ''}
          <dl>
            <dt>User ID</dt>
            <dd>${escapeHtml(user.id)}</dd>
            <dt>Username</dt>
            <dd>${escapeHtml(user.username)}</dd>
            <dt>Global name</dt>
            <dd>${escapeHtml(user.global_name || '-')}</dd>
            <dt>Scopes</dt>
            <dd>${escapeHtml(token.scope || '-')}</dd>
            <dt>Expires in</dt>
            <dd>${escapeHtml(token.expires_in || '-')} seconds</dd>
          </dl>
          <p class="muted">Access token and refresh token were received but are not rendered.</p>
          <a class="button" href="/logout">Back</a>
        </main>
      </body>
    </html>
  `;
}

function renderError(message) {
  return html`
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Discord Login Error</title>
        <style>${styles()}</style>
      </head>
      <body>
        <main>
          <h1>Error</h1>
          <p class="warning">${escapeHtml(message)}</p>
          <a class="button" href="/">Back</a>
        </main>
      </body>
    </html>
  `;
}

function html(strings, ...values) {
  return strings.reduce((result, current, index) => {
    const value = values[index] === undefined ? '' : values[index];
    return `${result}${current}${value}`;
  }, '');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function styles() {
  return `
    :root {
      color-scheme: light dark;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: Canvas;
      color: CanvasText;
    }
    main {
      width: min(560px, calc(100vw - 32px));
      border: 1px solid color-mix(in srgb, CanvasText 16%, transparent);
      border-radius: 8px;
      padding: 28px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      letter-spacing: 0;
    }
    p {
      line-height: 1.5;
    }
    dl {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 10px 16px;
      margin: 24px 0;
    }
    dt {
      font-weight: 700;
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .button {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 14px;
      border-radius: 6px;
      background: #5865f2;
      color: white;
      font-weight: 700;
      text-decoration: none;
    }
    .warning {
      color: #b42318;
      font-weight: 700;
    }
    .muted {
      opacity: 0.72;
    }
    .avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      margin-top: 16px;
    }
  `;
}
