import assert from "node:assert/strict";
import test from "node:test";
import { createDiscordRestClient } from "./lib/discord-rest-client.mjs";

const token = "test-token";

test("queues Discord requests sequentially", async () => {
  const events = [];
  let nowMs = 0;
  const fetchImpl = async (url) => {
    events.push(`start:${new URL(url).pathname}`);
    await sleepImpl(1);
    events.push(`end:${new URL(url).pathname}`);
    return jsonResponse(200, { ok: true });
  };
  const sleepImpl = async (ms) => {
    nowMs += ms;
  };
  const client = createDiscordRestClient({
    token,
    fetchImpl,
    sleepImpl,
    now: () => nowMs,
    minRequestDelayMs: 0,
    requestJitterMs: 0,
  });

  await Promise.all([
    client.get("/users/@me"),
    client.get("/guilds/123456789012345678/channels"),
  ]);

  assert.deepEqual(events, [
    "start:/api/v10/users/@me",
    "end:/api/v10/users/@me",
    "start:/api/v10/guilds/123456789012345678/channels",
    "end:/api/v10/guilds/123456789012345678/channels",
  ]);
});

test("waits for exhausted bucket before the next matching route request", async () => {
  const waits = [];
  let nowMs = 0;
  const responses = [
    jsonResponse(200, { ok: true }, {
      "x-ratelimit-bucket": "bucket-a",
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset-after": "0.5",
    }),
    jsonResponse(200, { ok: true }, {
      "x-ratelimit-bucket": "bucket-a",
      "x-ratelimit-remaining": "1",
      "x-ratelimit-reset-after": "0.5",
    }),
  ];
  const client = createDiscordRestClient({
    token,
    fetchImpl: async () => responses.shift(),
    sleepImpl: async (ms) => {
      waits.push(ms);
      nowMs += ms;
    },
    now: () => nowMs,
    minRequestDelayMs: 0,
    requestJitterMs: 0,
  });

  await client.get("/guilds/123456789012345678/channels");
  await client.get("/guilds/123456789012345678/channels");

  assert.ok(waits.some((ms) => ms >= 750), `expected bucket wait, got ${waits.join(",")}`);
});

test("retries 429 responses with retry-after", async () => {
  const waits = [];
  let nowMs = 0;
  const responses = [
    jsonResponse(429, { message: "rate limited", retry_after: 0.1, global: false }, {
      "retry-after": "0.1",
      "x-ratelimit-scope": "user",
    }),
    jsonResponse(200, { ok: true }),
  ];
  const client = createDiscordRestClient({
    token,
    fetchImpl: async () => responses.shift(),
    sleepImpl: async (ms) => {
      waits.push(ms);
      nowMs += ms;
    },
    now: () => nowMs,
    minRequestDelayMs: 0,
    requestJitterMs: 0,
    maxRetries: 1,
  });

  const result = await client.get("/users/@me");

  assert.deepEqual(result, { ok: true });
  assert.equal(client.getMetrics().rateLimitResponses, 1);
  assert.equal(client.getMetrics().retries, 1);
  assert.ok(waits.some((ms) => ms >= 350), `expected retry wait with safety buffer, got ${waits.join(",")}`);
});

test("throws on 429 without retry-after instead of looping", async () => {
  const client = createDiscordRestClient({
    token,
    fetchImpl: async () => jsonResponse(429, { message: "temporary global block", global: true }, {
      "x-ratelimit-global": "true",
      "x-ratelimit-scope": "global",
    }),
    sleepImpl: async () => {
      throw new Error("sleep should not be called without retry-after");
    },
    minRequestDelayMs: 0,
    requestJitterMs: 0,
  });

  await assert.rejects(
    () => client.get("/users/@me"),
    (error) => error.status === 429 && error.isRateLimit === true && error.isGlobalRateLimit === true,
  );
});

test("normalizes invalid numeric options to safe defaults", async () => {
  const waits = [];
  let nowMs = 0;
  const responses = [
    jsonResponse(429, { message: "rate limited", retry_after: 0.01, global: false }, {
      "retry-after": "0.01",
      "x-ratelimit-scope": "user",
    }),
    jsonResponse(200, { ok: true }),
  ];
  const client = createDiscordRestClient({
    token,
    fetchImpl: async () => responses.shift(),
    sleepImpl: async (ms) => {
      waits.push(ms);
      nowMs += ms;
    },
    now: () => nowMs,
    minRequestDelayMs: "not-a-number",
    requestJitterMs: -1,
    maxRetries: "not-a-number",
    invalidRequestAbortAfter: "not-a-number",
  });

  const result = await client.get("/users/@me");

  assert.deepEqual(result, { ok: true });
  assert.equal(client.getMetrics().retries, 1);
  assert.ok(waits.length > 0);
});

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}
