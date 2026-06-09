import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDiscordRestClient, shouldAbortDiscordImport } from "./lib/discord-rest-client.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputPath = path.join(rootDir, "apps", "web", "data", "discord-guilds.json");

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

const includeArchivedThreads = process.env.DISCORD_FETCH_ARCHIVED_THREADS === "true";
const requestTimeoutMs = Number(process.env.DISCORD_API_TIMEOUT_MS || 15000);
const requestDelayMs = Number(process.env.DISCORD_API_DELAY_MS || 1500);
const requestJitterMs = Number(process.env.DISCORD_API_JITTER_MS || 250);
const maxRetries = Number(process.env.DISCORD_API_MAX_RETRIES || 3);
const invalidRequestAbortAfter = Number(process.env.DISCORD_INVALID_REQUEST_ABORT_AFTER || 25);
const importMaxGuilds = optionalPositiveInteger(process.env.DISCORD_IMPORT_MAX_GUILDS);
const discord = createDiscordRestClient({
  token,
  requestTimeoutMs,
  minRequestDelayMs: requestDelayMs,
  requestJitterMs,
  maxRetries,
  invalidRequestAbortAfter,
  logger: (message) => console.error(message),
});
let fetchedAt = null;

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
  const bot = await discord.get("/users/@me");
  let guildSummaries = await fetchAllGuilds();
  const guildsDiscovered = guildSummaries.length;
  if (importMaxGuilds) {
    guildSummaries = guildSummaries.slice(0, importMaxGuilds);
  }
  const accessIssues = [];
  const guildRecords = guildSummaries.map((guildSummary) => createGuildRecord(guildSummary));
  const importQueue = createImportQueueLanes();
  const queueSummary = createQueueSummary();

  for (const [index, record] of guildRecords.entries()) {
    const labelSuffix = `${index + 1}/${guildRecords.length}: ${record.guildSummary.id}`;
    importQueue.enqueue("channel_structure", {
      kind: "channels",
      label: `channels ${labelSuffix}`,
      run: () => runChannelLaneJob({ record, accessIssues, queueSummary }),
    });
    importQueue.enqueue("role_list", {
      kind: "roles",
      label: `roles ${labelSuffix}`,
      run: () => runRoleLaneJob({ record, accessIssues, queueSummary }),
    });
    importQueue.enqueue("thread_fetch", {
      kind: "active_threads",
      label: `active threads ${labelSuffix}`,
      run: () => runActiveThreadLaneJob({ record, queueSummary }),
    });
    if (includeArchivedThreads) {
      importQueue.enqueue("thread_fetch", {
        kind: "archived_threads",
        label: `public archived threads ${labelSuffix}`,
        run: () => runArchivedThreadLaneJob({ record, queueSummary }),
      });
    }
  }

  await importQueue.run();
  const guilds = buildGuildsFromRecords(guildRecords, accessIssues);

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
      guildsDiscovered,
      guildsPlanned: guildSummaries.length,
      guildsFetched: guilds.length,
      channels: guilds.reduce((sum, guild) => sum + guild.channels.length, 0),
      roles: guilds.reduce((sum, guild) => sum + guild.roles.length, 0),
      permissionOverwriteTargets: guilds.reduce((sum, guild) => sum + Object.keys(guild.overrides).length, 0),
      activeThreadsFetched: true,
      archivedThreadsFetched: includeArchivedThreads,
      activeThreadFetchMode: "three-fifo-lanes",
      importQueuePlan: "channel_structure -> role_list -> thread_fetch",
      importQueueLanes: importQueue.summary(),
      importQueueJobsEnqueued: importQueue.enqueued,
      importQueueJobsProcessed: importQueue.processed,
      ...queueSummary,
      requestDelayMs,
      requestJitterMs,
      maxRetries,
      invalidRequestAbortAfter,
      discordRequests: discord.getMetrics(),
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(JSON.stringify({
    status: "ok",
    fetchedAt,
    botId: bot.id,
    guildsDiscovered,
    guildsPlanned: guildSummaries.length,
    guildsFetched: output.summary.guildsFetched,
    channels: output.summary.channels,
    roles: output.summary.roles,
    permissionOverwriteTargets: output.summary.permissionOverwriteTargets,
    accessIssueCount: accessIssues.length,
    activeThreadsFetched: true,
    archivedThreadsFetched: includeArchivedThreads,
    activeThreadFetchMode: output.summary.activeThreadFetchMode,
    importQueuePlan: output.summary.importQueuePlan,
    activeThreadGuildsFetched: output.summary.activeThreadGuildsFetched,
    activeThreads: output.summary.activeThreads,
    importQueueJobsProcessed: output.summary.importQueueJobsProcessed,
    requestDelayMs,
    requestJitterMs,
    discordRequests: discord.getMetrics(),
    outputPath,
  }, null, 2));
}

async function fetchAllGuilds() {
  const guilds = [];
  let after = null;

  for (;;) {
    const query = new URLSearchParams({ limit: "200", with_counts: "true" });
    if (after) query.set("after", after);
    const page = await discord.get(`/users/@me/guilds?${query}`);
    guilds.push(...page);
    if (page.length < 200) break;
    after = page[page.length - 1].id;
  }

  return guilds;
}

function createGuildRecord(guildSummary) {
  return {
    guildSummary,
    channelsRaw: null,
    rolesRaw: null,
    activeThreadsRaw: [],
    archivedThreadsRaw: [],
    activeThreadsFailed: false,
    accessIssues: [],
  };
}

async function runChannelLaneJob({ record, accessIssues, queueSummary }) {
  queueSummary.channelGuildsAttempted += 1;
  try {
    record.channelsRaw = await discord.get(`/guilds/${record.guildSummary.id}/channels`);
    queueSummary.channelGuildsFetched += 1;
  } catch (error) {
    if (shouldAbortDiscordImport(error)) throw error;
    const issue = {
      scope: "channels",
      guildId: record.guildSummary.id,
      guildName: record.guildSummary.name,
      status: error.status || null,
      message: error.message,
    };
    record.accessIssues.push(issue);
    accessIssues.push(issue);
  }
}

async function runRoleLaneJob({ record, accessIssues, queueSummary }) {
  queueSummary.roleGuildsAttempted += 1;
  try {
    record.rolesRaw = await discord.get(`/guilds/${record.guildSummary.id}/roles`);
    queueSummary.roleGuildsFetched += 1;
  } catch (error) {
    if (shouldAbortDiscordImport(error)) throw error;
    const issue = {
      scope: "roles",
      guildId: record.guildSummary.id,
      guildName: record.guildSummary.name,
      status: error.status || null,
      message: error.message,
    };
    record.accessIssues.push(issue);
    accessIssues.push(issue);
  }
}

async function runActiveThreadLaneJob({ record, queueSummary }) {
  if (!hasBaseGuildData(record)) {
    queueSummary.activeThreadGuildsSkipped += 1;
    return;
  }

  queueSummary.activeThreadGuildsAttempted += 1;
  try {
    const activeThreadsResult = await discord.get(`/guilds/${record.guildSummary.id}/threads/active`);
    const threadsRaw = Array.isArray(activeThreadsResult.threads) ? activeThreadsResult.threads : [];
    record.activeThreadsRaw = threadsRaw;
    queueSummary.activeThreadGuildsFetched += 1;
    queueSummary.activeThreads += threadsRaw.length;
  } catch (error) {
    if (shouldAbortDiscordImport(error)) throw error;
    record.activeThreadsFailed = true;
    record.accessIssues.push({
      scope: "active_threads",
      status: error.status || null,
      message: error.message,
    });
  }
}

async function runArchivedThreadLaneJob({ record, queueSummary }) {
  if (!hasBaseGuildData(record) || record.activeThreadsFailed) {
    queueSummary.archivedThreadGuildsSkipped += 1;
    return;
  }

  queueSummary.archivedThreadGuildsAttempted += 1;
  const threadableChannels = normalizeBaseChannels(record.channelsRaw)
    .filter((channel) => ["text", "announcement", "forum", "media"].includes(channel.type));

  for (const channel of threadableChannels) {
    queueSummary.archivedThreadChannelsAttempted += 1;
    try {
      const channelThreads = await fetchPublicArchivedThreads(channel.id);
      record.archivedThreadsRaw.push(...channelThreads);
      queueSummary.archivedThreadChannelsFetched += 1;
      queueSummary.archivedThreads += channelThreads.length;
    } catch (error) {
      if (shouldAbortDiscordImport(error)) throw error;
      record.accessIssues.push({
        scope: "public_archived_threads",
        channelId: channel.id,
        status: error.status || null,
        message: error.message,
      });
    }
  }

  queueSummary.archivedThreadGuildsFetched += 1;
}

function hasBaseGuildData(record) {
  return Array.isArray(record.channelsRaw) && Array.isArray(record.rolesRaw);
}

function buildGuildsFromRecords(records, accessIssues) {
  const guilds = [];

  for (const record of records) {
    if (!hasBaseGuildData(record)) {
      if (record.accessIssues.length === 0) {
        accessIssues.push({
          scope: "guild_output",
          guildId: record.guildSummary.id,
          guildName: record.guildSummary.name,
          status: null,
          message: "Skipped guild output because channels or roles were not available.",
        });
      }
      continue;
    }
    guilds.push(buildGuildFromRecord(record));
  }

  return guilds;
}

function buildGuildFromRecord(record) {
  const roles = normalizeRoles(record.rolesRaw);
  const threadsRaw = uniqueById([...record.activeThreadsRaw, ...record.archivedThreadsRaw]);
  const channels = orderChannels([
    ...normalizeBaseChannels(record.channelsRaw),
    ...normalizeThreadChannels(threadsRaw),
  ]);
  const overrides = buildOverrides([...record.channelsRaw, ...threadsRaw], roles.map((role) => role.id));
  applyCategorySync(channels, record.channelsRaw);

  return {
    id: record.guildSummary.id,
    guildName: record.guildSummary.name,
    icon: record.guildSummary.icon || null,
    approximateMemberCount: record.guildSummary.approximate_member_count || null,
    approximatePresenceCount: record.guildSummary.approximate_presence_count || null,
    source: "discord-api-read-only",
    fetchedAt,
    channels,
    roles,
    overrides,
    accessIssues: record.accessIssues,
    limitations: [
      "Read-only import uses three FIFO Queue lanes: channel_structure, role_list, then thread_fetch.",
      "Thread lane jobs are planned up front and are not appended after the channel lane drains.",
      ...(includeArchivedThreads ? [] : ["Archived threads were not fetched by default. Set DISCORD_FETCH_ARCHIVED_THREADS=true to include public archived threads."]),
      ...(importMaxGuilds ? [`Import was limited to ${importMaxGuilds} guilds by DISCORD_IMPORT_MAX_GUILDS.`] : []),
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
    const page = await discord.get(`/channels/${channelId}/threads/archived/public?${query}`);
    const pageThreads = Array.isArray(page.threads) ? page.threads : [];
    threads.push(...pageThreads);
    if (!page.has_more || pageThreads.length === 0) break;
    before = pageThreads[pageThreads.length - 1]?.thread_metadata?.archive_timestamp;
    if (!before) break;
  }

  return threads;
}

function normalizeBaseChannels(channelsRaw) {
  return channelsRaw.map((channel) => ({
    id: channel.id,
    type: toChannelType(channel.type),
    name: channel.name,
    parentId: channel.parent_id || null,
    position: Number.isFinite(channel.position) ? channel.position : 0,
    nsfw: Boolean(channel.nsfw),
  }));
}

function normalizeThreadChannels(threadsRaw) {
  return threadsRaw.map((thread) => ({
    id: thread.id,
    type: toChannelType(thread.type),
    name: thread.name,
    parentId: thread.parent_id || null,
    position: Number.isFinite(thread.position) ? thread.position : 0,
    archived: Boolean(thread.thread_metadata?.archived),
    locked: Boolean(thread.thread_metadata?.locked),
  }));
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

function createImportQueueLanes() {
  const laneOrder = ["channel_structure", "role_list", "thread_fetch"];
  const lanes = new Map(laneOrder.map((id) => [id, {
    id,
    jobs: [],
    cursor: 0,
    processed: 0,
  }]));

  return {
    enqueue(laneId, job) {
      const lane = lanes.get(laneId);
      if (!lane) throw new Error(`Unknown import queue lane: ${laneId}`);
      lane.jobs.push(job);
    },
    async run() {
      for (const laneId of laneOrder) {
        const lane = lanes.get(laneId);
        while (lane.cursor < lane.jobs.length) {
          const job = lane.jobs[lane.cursor];
          lane.cursor += 1;
          console.error(`Import queue lane ${lane.id} ${lane.cursor}/${lane.jobs.length} [${job.kind}]: ${job.label}`);
          await job.run();
          lane.processed += 1;
        }
      }
    },
    summary() {
      return Object.fromEntries(laneOrder.map((laneId) => {
        const lane = lanes.get(laneId);
        return [laneId, {
          jobsEnqueued: lane.jobs.length,
          jobsProcessed: lane.processed,
        }];
      }));
    },
    get enqueued() {
      return [...lanes.values()].reduce((sum, lane) => sum + lane.jobs.length, 0);
    },
    get processed() {
      return [...lanes.values()].reduce((sum, lane) => sum + lane.processed, 0);
    },
  };
}

function createQueueSummary() {
  return {
    channelGuildsAttempted: 0,
    channelGuildsFetched: 0,
    roleGuildsAttempted: 0,
    roleGuildsFetched: 0,
    activeThreadGuildsAttempted: 0,
    activeThreadGuildsFetched: 0,
    activeThreadGuildsSkipped: 0,
    activeThreads: 0,
    archivedThreadGuildsAttempted: 0,
    archivedThreadGuildsFetched: 0,
    archivedThreadGuildsSkipped: 0,
    archivedThreadChannelsAttempted: 0,
    archivedThreadChannelsFetched: 0,
    archivedThreads: 0,
  };
}

function optionalPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
