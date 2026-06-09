import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDiscordRestClient } from "./lib/discord-rest-client.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "apps", "web");

const channelTypes = {
  10: "announcement_thread",
  11: "public_thread",
  12: "private_thread",
};

await loadEnv(path.join(rootDir, ".env"));

const token = process.env.DISCORD_BOT_TOKEN;
const port = Number(process.env.PORT || 5173);
const requestTimeoutMs = Number(process.env.DISCORD_API_TIMEOUT_MS || 15000);
const requestDelayMs = Number(process.env.DISCORD_API_DELAY_MS || 1500);
const requestJitterMs = Number(process.env.DISCORD_API_JITTER_MS || 250);
const activeThreadsCacheMs = Number(process.env.DISCORD_ACTIVE_THREADS_CACHE_MS || 600000);
const maxRetries = Number(process.env.DISCORD_API_MAX_RETRIES || 3);
const invalidRequestAbortAfter = Number(process.env.DISCORD_INVALID_REQUEST_ABORT_AFTER || 25);
const discord = token ? createDiscordRestClient({
  token,
  requestTimeoutMs,
  minRequestDelayMs: requestDelayMs,
  requestJitterMs,
  maxRetries,
  invalidRequestAbortAfter,
  logger: (message) => console.log(message),
}) : null;
const activeThreadCache = new Map();
const threadButtonQueue = createAsyncJobQueue();

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    sendJson(response, error.status || 500, {
      status: "failed",
      message: safeErrorMessage(error),
      retryAfterMs: error.retryAfterMs || null,
    });
  });
});

server.listen(port, () => {
  console.log(`Discord structure manager is running at http://localhost:${port}`);
  console.log("Discord API access is GET-only. Thread data is fetched only when requested from the screen.");
});

async function handleRequest(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (url.pathname === "/api/discord/threads") {
    await handleThreadsRequest(request, response, url);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { status: "failed", message: "Unknown local API endpoint" });
    return;
  }

  await serveStatic(request, response, url);
}

async function handleThreadsRequest(request, response, url) {
  if (request.method !== "GET") {
    sendJson(response, 405, { status: "failed", message: "Only GET is allowed" });
    return;
  }
  if (!token) {
    sendJson(response, 500, { status: "failed", message: "DISCORD_BOT_TOKEN is missing in .env" });
    return;
  }
  if (!discord) {
    sendJson(response, 500, { status: "failed", message: "Discord API client is not initialized" });
    return;
  }

  const guildId = url.searchParams.get("guildId") || "";
  const channelId = url.searchParams.get("channelId") || "";
  const includeArchived = url.searchParams.get("archived") !== "false";

  if (!isDiscordId(guildId) || !isDiscordId(channelId)) {
    sendJson(response, 400, { status: "failed", message: "guildId and channelId must be Discord snowflake IDs" });
    return;
  }

  const result = await fetchThreadsWithButtonQueue({ guildId, channelId, includeArchived });
  const threads = uniqueById([...result.activeThreads, ...result.archivedThreads]).map(normalizeThread);

  sendJson(response, 200, {
    status: "ok",
    source: "discord-api-read-only",
    guildId,
    channelId,
    fetchedAt: new Date().toISOString(),
    cache: {
      activeThreads: result.activeCache,
      activeThreadsCacheMs,
    },
    archivedIncluded: includeArchived,
    queue: {
      jobsEnqueued: result.jobsEnqueued,
      jobsProcessed: result.jobsProcessed,
    },
    counts: {
      activeThreads: result.activeThreads.length,
      archivedThreads: result.archivedThreads.length,
      totalThreads: threads.length,
    },
    threads,
  });
}

async function fetchThreadsWithButtonQueue({ guildId, channelId, includeArchived }) {
  const result = await threadButtonQueue.enqueue({
    kind: "thread_bundle",
    label: `${guildId}/${channelId}`,
    run: async () => {
      const activeResult = await getActiveThreads(guildId);
      const archivedThreads = includeArchived ? await fetchPublicArchivedThreads(channelId) : [];
      return {
        activeCache: activeResult.cache,
        activeThreads: activeResult.threads.filter((thread) => thread.parent_id === channelId),
        archivedThreads,
      };
    },
  });

  return {
    ...result,
    jobsEnqueued: 1,
    jobsProcessed: 1,
  };
}

async function getActiveThreads(guildId) {
  const now = Date.now();
  const cached = activeThreadCache.get(guildId);
  if (cached?.value && cached.expiresAt > now) {
    return { threads: cached.value, cache: "hit" };
  }
  if (cached?.promise) {
    const threads = await cached.promise;
    return { threads, cache: "shared-pending" };
  }

  const promise = discord.get(`/guilds/${guildId}/threads/active`)
    .then((payload) => Array.isArray(payload.threads) ? payload.threads : []);
  activeThreadCache.set(guildId, { promise });

  try {
    const threads = await promise;
    activeThreadCache.set(guildId, {
      value: threads,
      expiresAt: Date.now() + activeThreadsCacheMs,
    });
    return { threads, cache: "miss" };
  } catch (error) {
    activeThreadCache.delete(guildId);
    throw error;
  }
}

async function fetchPublicArchivedThreads(channelId) {
  const threads = [];
  let before = null;

  for (;;) {
    const query = new URLSearchParams({ limit: "100" });
    if (before) query.set("before", before);
    const page = await discord.get(`/channels/${channelId}/threads/archived/public?${query}`);
    const pageThreads = Array.isArray(page.threads) ? page.threads : [];
    threads.push(...pageThreads);
    if (!page.has_more || pageThreads.length === 0) break;
    before = pageThreads[pageThreads.length - 1]?.thread_metadata?.archive_timestamp;
    if (!before) break;
  }

  return threads;
}

async function serveStatic(request, response, url) {
  if (!["GET", "HEAD"].includes(request.method || "GET")) {
    response.writeHead(405);
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(webDir, relativePath);
  if (!filePath.startsWith(`${webDir}${path.sep}`) && filePath !== webDir) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    const finalPath = stat.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const body = await fs.readFile(finalPath);
    response.writeHead(200, {
      "Content-Type": contentType(finalPath),
      "Cache-Control": "no-store",
    });
    if (request.method !== "HEAD") response.end(body);
    else response.end();
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function normalizeThread(thread) {
  return {
    id: thread.id,
    type: channelTypes[thread.type] || "thread",
    name: thread.name,
    parentId: thread.parent_id || null,
    position: Number.isFinite(thread.position) ? thread.position : 0,
    archived: Boolean(thread.thread_metadata?.archived),
    locked: Boolean(thread.thread_metadata?.locked),
  };
}

function uniqueById(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function createAsyncJobQueue() {
  const jobs = [];
  let cursor = 0;
  let running = false;
  let processed = 0;

  return {
    enqueue(job) {
      let resolveJob;
      let rejectJob;
      const promise = new Promise((resolve, reject) => {
        resolveJob = resolve;
        rejectJob = reject;
      });
      jobs.push({ ...job, resolve: resolveJob, reject: rejectJob });
      void drain();
      return promise;
    },
    get stats() {
      return {
        enqueued: jobs.length,
        processed,
        pending: jobs.length - cursor,
      };
    },
  };

  async function drain() {
    if (running) return;
    running = true;
    try {
      while (cursor < jobs.length) {
        const job = jobs[cursor];
        cursor += 1;
        console.log(`Thread button queue ${cursor}/${jobs.length} [${job.kind}]: ${job.label}`);
        try {
          const result = await job.run();
          processed += 1;
          job.resolve(result);
        } catch (error) {
          processed += 1;
          job.reject(error);
        }
      }
    } finally {
      running = false;
    }
  }
}

function isDiscordId(value) {
  return /^\d{18,20}$/.test(value);
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

function safeErrorMessage(error) {
  if (error.status === 429 && error.retryAfterMs) {
    return `Discord API rate limited. Retry after ${Math.ceil(error.retryAfterMs / 1000)} seconds.`;
  }
  return error.message || "Unknown error";
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  }[ext] || "application/octet-stream";
}

async function loadEnv(envPath) {
  let text = "";
  try {
    text = await fs.readFile(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
