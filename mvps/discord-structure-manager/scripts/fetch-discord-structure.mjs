import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "apps", "web", "data", "discord-guilds.json");
const apiBase = "https://discord.com/api/v10";

const permissionBits = {
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  ADD_REACTIONS: 1n << 6n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  STREAM: 1n << 9n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  MANAGE_THREADS: 1n << 34n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_ROLES: 1n << 28n,
};

const channelTypes = {
  0: "text",
  2: "voice",
  4: "category",
  5: "announcement",
  10: "announcement_thread",
  11: "public_thread",
  12: "private_thread",
  13: "stage",
  15: "forum",
  16: "media",
};

await loadEnv(path.join(rootDir, ".env"));

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  throw new Error("DISCORD_BOT_TOKEN is missing in .env");
}

const includeActiveThreads = process.env.DISCORD_FETCH_ACTIVE_THREADS === "true";
const includeArchivedThreads = process.env.DISCORD_FETCH_ARCHIVED_THREADS === "true";
const requestTimeoutMs = Number(process.env.DISCORD_API_TIMEOUT_MS || 15000);
const requestDelayMs = Number(process.env.DISCORD_API_DELAY_MS || 1500);
let fetchedAt = null;
let lastRequestAt = 0;

try {
  await main();
} catch (error) {
  console.error(JSON.stringify({
    status: "failed",
    errorStatus: error.status || null,
    message: error.message,
    outputPath: null,
  }, null, 2));
  process.exitCode = 1;
}

async function main() {
  fetchedAt = new Date().toISOString();
  const bot = await discordGet("/users/@me");
  const guildSummaries = await fetchAllGuilds();
  const guilds = [];
  const accessIssues = [];

  for (const [index, guildSummary] of guildSummaries.entries()) {
    try {
      console.error(`Fetching guild ${index + 1}/${guildSummaries.length}: ${guildSummary.id}`);
      const guild = await fetchGuildStructure(guildSummary);
      guilds.push(guild);
    } catch (error) {
      accessIssues.push({
        guildId: guildSummary.id,
        guildName: guildSummary.name,
        status: error.status || null,
        message: error.message,
      });
    }
  }

  const output = {
    fetchedAt,
    source: "discord-api-read-only",
    bot: {
      id: bot.id,
      username: bot.username,
    },
    guilds,
    accessIssues,
    summary: {
      guildsDiscovered: guildSummaries.length,
      guildsFetched: guilds.length,
      channels: guilds.reduce((sum, guild) => sum + guild.channels.length, 0),
      roles: guilds.reduce((sum, guild) => sum + guild.roles.length, 0),
      permissionOverwriteTargets: guilds.reduce((sum, guild) => sum + Object.keys(guild.overrides).length, 0),
      activeThreadsFetched: includeActiveThreads,
      archivedThreadsFetched: includeArchivedThreads,
      requestDelayMs,
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(JSON.stringify({
    status: "ok",
    fetchedAt,
    botId: bot.id,
    guildsDiscovered: output.summary.guildsDiscovered,
    guildsFetched: output.summary.guildsFetched,
    channels: output.summary.channels,
    roles: output.summary.roles,
    permissionOverwriteTargets: output.summary.permissionOverwriteTargets,
    accessIssueCount: accessIssues.length,
    activeThreadsFetched: includeActiveThreads,
    archivedThreadsFetched: includeArchivedThreads,
    requestDelayMs,
    outputPath,
  }, null, 2));
}

async function fetchAllGuilds() {
  const guilds = [];
  let after = null;

  for (;;) {
    const query = new URLSearchParams({ limit: "200", with_counts: "true" });
    if (after) query.set("after", after);
    const page = await discordGet(`/users/@me/guilds?${query}`);
    guilds.push(...page);
    if (page.length < 200) break;
    after = page[page.length - 1].id;
  }

  return guilds;
}

async function fetchGuildStructure(guildSummary) {
  const guildIssues = [];
  const channelsRaw = await discordGet(`/guilds/${guildSummary.id}/channels`);
  const rolesRaw = await discordGet(`/guilds/${guildSummary.id}/roles`);
  let activeThreads = [];
  if (includeActiveThreads) {
    try {
      const activeThreadsResult = await discordGet(`/guilds/${guildSummary.id}/threads/active`);
      activeThreads = Array.isArray(activeThreadsResult.threads) ? activeThreadsResult.threads : [];
    } catch (error) {
      guildIssues.push({
        scope: "active_threads",
        status: error.status || null,
        message: error.message,
      });
    }
  }

  const threadableChannels = channelsRaw.filter((channel) => ["text", "announcement", "forum", "media"].includes(toChannelType(channel.type)));
  const archivedThreadResults = [];
  if (includeArchivedThreads) {
    for (const channel of threadableChannels) {
      try {
        archivedThreadResults.push(await fetchPublicArchivedThreads(channel.id));
      } catch (error) {
        guildIssues.push({
          scope: "public_archived_threads",
          channelId: channel.id,
          status: error.status || null,
          message: error.message,
        });
      }
    }
  }

  const threadsRaw = uniqueById([...activeThreads, ...archivedThreadResults.flat()]);
  const channels = normalizeChannels(channelsRaw, threadsRaw);
  const roles = normalizeRoles(rolesRaw);
  const overrides = buildOverrides([...channelsRaw, ...threadsRaw], roles.map((role) => role.id));
  applyCategorySync(channels, channelsRaw);

  return {
    id: guildSummary.id,
    guildName: guildSummary.name,
    icon: guildSummary.icon || null,
    approximateMemberCount: guildSummary.approximate_member_count || null,
    approximatePresenceCount: guildSummary.approximate_presence_count || null,
    source: "discord-api-read-only",
    fetchedAt,
    channels,
    roles,
    overrides,
    accessIssues: guildIssues,
    limitations: [
      ...(includeActiveThreads ? [] : ["Active threads were not fetched during bulk import. Use the screen-level thread fetch button to load them per channel."]),
      ...(includeArchivedThreads ? [] : ["Archived threads were not fetched by default. Set DISCORD_FETCH_ARCHIVED_THREADS=true to include public archived threads."]),
    ],
    lastSavedAt: null,
  };
}

async function fetchPublicArchivedThreads(channelId) {
  const threads = [];
  let before = null;

  for (;;) {
    const query = new URLSearchParams({ limit: "100" });
    if (before) query.set("before", before);
    const page = await discordGet(`/channels/${channelId}/threads/archived/public?${query}`);
    const pageThreads = Array.isArray(page.threads) ? page.threads : [];
    threads.push(...pageThreads);
    if (!page.has_more || pageThreads.length === 0) break;
    before = pageThreads[pageThreads.length - 1]?.thread_metadata?.archive_timestamp;
    if (!before) break;
  }

  return threads;
}

function normalizeChannels(channelsRaw, threadsRaw) {
  const normalChannels = channelsRaw
    .map((channel) => ({
      id: channel.id,
      type: toChannelType(channel.type),
      name: channel.name,
      parentId: channel.parent_id || null,
      position: Number.isFinite(channel.position) ? channel.position : 0,
      nsfw: Boolean(channel.nsfw),
    }));

  const threadChannels = threadsRaw
    .map((thread) => ({
      id: thread.id,
      type: toChannelType(thread.type),
      name: thread.name,
      parentId: thread.parent_id || null,
      position: Number.isFinite(thread.position) ? thread.position : 0,
      archived: Boolean(thread.thread_metadata?.archived),
      locked: Boolean(thread.thread_metadata?.locked),
    }));

  return orderChannels([...normalChannels, ...threadChannels]);
}

function normalizeRoles(rolesRaw) {
  return rolesRaw
    .map((role) => ({
      id: role.id,
      name: role.name,
      color: intToHex(role.color),
      position: role.position,
      managed: Boolean(role.managed),
      mentionable: Boolean(role.mentionable),
    }))
    .sort((a, b) => b.position - a.position || b.id.localeCompare(a.id));
}

function buildOverrides(channelsRaw, roleIds) {
  const roleIdSet = new Set(roleIds);
  const overrides = {};

  for (const channel of channelsRaw) {
    for (const overwrite of channel.permission_overwrites || []) {
      if (overwrite.type !== 0 || !roleIdSet.has(overwrite.id)) continue;
      const mapped = mapOverwrite(overwrite.allow || "0", overwrite.deny || "0");
      if (Object.keys(mapped).length === 0) continue;
      overrides[channel.id] ||= {};
      overrides[channel.id][overwrite.id] = mapped;
    }
  }

  return overrides;
}

function mapOverwrite(allowValue, denyValue) {
  const allow = BigInt(allowValue);
  const deny = BigInt(denyValue);
  const mapped = {};

  for (const [permission, bit] of Object.entries(permissionBits)) {
    if ((allow & bit) === bit) mapped[permission] = "allow";
    else if ((deny & bit) === bit) mapped[permission] = "deny";
  }

  return mapped;
}

function applyCategorySync(channels, channelsRaw) {
  const rawById = new Map(channelsRaw.map((channel) => [channel.id, channel]));
  const categoryIds = new Set(channels.filter((channel) => channel.type === "category").map((channel) => channel.id));

  for (const channel of channels) {
    if (!categoryIds.has(channel.parentId)) continue;
    const raw = rawById.get(channel.id);
    const parentRaw = rawById.get(channel.parentId);
    channel.synced = sameOverwrites(raw?.permission_overwrites || [], parentRaw?.permission_overwrites || []);
  }
}

function sameOverwrites(a, b) {
  return JSON.stringify(normalizeOverwriteList(a)) === JSON.stringify(normalizeOverwriteList(b));
}

function normalizeOverwriteList(overwrites) {
  return [...overwrites]
    .map((overwrite) => ({
      id: overwrite.id,
      type: overwrite.type,
      allow: String(overwrite.allow || "0"),
      deny: String(overwrite.deny || "0"),
    }))
    .sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));
}

function orderChannels(channels) {
  const byParent = new Map();
  for (const channel of channels) {
    const key = channel.parentId || "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(channel);
  }

  for (const list of byParent.values()) {
    list.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  }

  const ordered = [];
  const roots = byParent.get("") || [];
  const categories = roots.filter((channel) => channel.type === "category");
  const uncategorized = roots.filter((channel) => channel.type !== "category");

  for (const root of [...categories, ...uncategorized]) {
    appendWithChildren(root);
  }

  return ordered;

  function appendWithChildren(channel) {
    ordered.push(channel);
    const children = byParent.get(channel.id) || [];
    for (const child of children) appendWithChildren(child);
  }
}

function toChannelType(type) {
  return channelTypes[type] || `unknown_${type}`;
}

function intToHex(value) {
  if (!value) return "#8b8f9a";
  return `#${Number(value).toString(16).padStart(6, "0")}`;
}

function uniqueById(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

async function discordGet(route) {
  await throttleDiscordRequest();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response;

  try {
    response = await fetch(`${apiBase}${route}`, {
      method: "GET",
      headers: {
        Authorization: `Bot ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`Discord GET ${route} timed out after ${requestTimeoutMs}ms`);
      timeoutError.status = "timeout";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 429) {
    const body = await response.json().catch(() => ({}));
    if (!body.retry_after) {
      const error = new Error(body.message || `Discord GET ${route} failed with 429`);
      error.status = 429;
      throw error;
    }
    const delay = Math.ceil((body.retry_after || 1) * 1000);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return discordGet(route);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(`Discord GET ${route} failed with ${response.status}`);
    error.status = response.status;
    error.body = text.slice(0, 300);
    throw error;
  }

  return response.json();
}

async function throttleDiscordRequest() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < requestDelayMs) {
    await new Promise((resolve) => setTimeout(resolve, requestDelayMs - elapsed));
  }
  lastRequestAt = Date.now();
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
