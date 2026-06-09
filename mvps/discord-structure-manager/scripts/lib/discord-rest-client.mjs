const defaultApiBase = "https://discord.com/api/v10";
const defaultMajorParameters = ["channels", "guilds", "webhooks"];
const snowflakePattern = /\d{17,20}/g;

export function createDiscordRestClient(options) {
  const {
    token,
    apiBase = defaultApiBase,
    requestTimeoutMs: rawRequestTimeoutMs = 15000,
    minRequestDelayMs: rawMinRequestDelayMs = 1500,
    requestJitterMs: rawRequestJitterMs = 250,
    maxRetries: rawMaxRetries = 3,
    invalidRequestAbortAfter: rawInvalidRequestAbortAfter = 25,
    fetchImpl = fetch,
    sleepImpl = sleep,
    now = () => Date.now(),
    logger = null,
  } = options || {};

  if (!token) {
    throw new Error("Discord bot token is required");
  }

  const requestTimeoutMs = positiveNumberOrDefault(rawRequestTimeoutMs, 15000);
  const minRequestDelayMs = nonNegativeNumberOrDefault(rawMinRequestDelayMs, 1500);
  const requestJitterMs = nonNegativeNumberOrDefault(rawRequestJitterMs, 250);
  const maxRetries = nonNegativeIntegerOrDefault(rawMaxRetries, 3);
  const invalidRequestAbortAfter = positiveIntegerOrDefault(rawInvalidRequestAbortAfter, 25);

  const bucketByRoute = new Map();
  const bucketState = new Map();
  const metrics = {
    requests: 0,
    retries: 0,
    rateLimitResponses: 0,
    invalidResponses: 0,
    routeWaits: 0,
    globalWaits: 0,
    delayWaits: 0,
  };

  let lastRequestAt = 0;
  let globalPauseUntil = 0;
  let queueTail = Promise.resolve();

  async function get(route) {
    return enqueue(() => request("GET", route));
  }

  function enqueue(task) {
    const next = queueTail.then(task);
    queueTail = next.catch(() => {});
    return next;
  }

  async function request(method, route, attempt = 0) {
    await waitForSafeWindow(method, route);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let response;

    try {
      metrics.requests += 1;
      response = await fetchImpl(`${apiBase}${route}`, {
        method,
        headers: {
          Authorization: `Bot ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new Error(`Discord ${method} ${routeWithoutQuery(route)} timed out after ${requestTimeoutMs}ms`);
        timeoutError.status = "timeout";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    updateRateLimitState(method, route, response.headers);

    if (response.status === 429) {
      metrics.rateLimitResponses += 1;
      metrics.invalidResponses += rateLimitCountsAsInvalid(response.headers) ? 1 : 0;
      assertInvalidRequestBudget();

      const body = await response.json().catch(() => ({}));
      const retryAfterMs = retryAfterFrom(response.headers, body);
      const isGlobal = isGlobalRateLimit(response.headers, body);

      if (!retryAfterMs) {
        const error = new Error(body.message || `Discord ${method} ${routeWithoutQuery(route)} failed with 429 and no retry_after`);
        error.status = 429;
        error.isRateLimit = true;
        error.isGlobalRateLimit = isGlobal;
        throw error;
      }

      if (isGlobal) {
        globalPauseUntil = Math.max(globalPauseUntil, now() + retryAfterMs + safetyBufferMs());
      }

      if (attempt >= maxRetries) {
        const error = new Error(body.message || `Discord ${method} ${routeWithoutQuery(route)} still rate limited after ${maxRetries} retries`);
        error.status = 429;
        error.isRateLimit = true;
        error.isGlobalRateLimit = isGlobal;
        error.retryAfterMs = retryAfterMs;
        throw error;
      }

      metrics.retries += 1;
      logWait("rate-limit", method, route, retryAfterMs);
      await sleepImpl(retryAfterMs + safetyBufferMs());
      return request(method, route, attempt + 1);
    }

    if ([401, 403].includes(response.status)) {
      metrics.invalidResponses += 1;
      assertInvalidRequestBudget();
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const error = new Error(`Discord ${method} ${routeWithoutQuery(route)} failed with ${response.status}`);
      error.status = response.status;
      error.body = text.slice(0, 300);
      throw error;
    }

    return response.json();
  }

  async function waitForSafeWindow(method, route) {
    const routeKey = canonicalRouteKey(method, route);
    const majorKey = majorParameterKey(route);
    const bucketId = bucketByRoute.get(routeKey);
    const bucketKey = bucketId ? `${bucketId}:${majorKey}` : null;
    const bucket = bucketKey ? bucketState.get(bucketKey) : null;
    const bucketWaitMs = bucket?.resetAt && bucket.resetAt > now()
      ? bucket.resetAt - now()
      : 0;
    const globalWaitMs = globalPauseUntil > now() ? globalPauseUntil - now() : 0;
    const elapsed = now() - lastRequestAt;
    const delayWaitMs = elapsed < minRequestDelayMs ? minRequestDelayMs - elapsed : 0;
    const jitterMs = requestJitterMs > 0 ? Math.floor(Math.random() * (requestJitterMs + 1)) : 0;
    const waitMs = Math.max(bucketWaitMs, globalWaitMs, delayWaitMs) + jitterMs;

    if (bucketWaitMs > 0) metrics.routeWaits += 1;
    if (globalWaitMs > 0) metrics.globalWaits += 1;
    if (delayWaitMs > 0) metrics.delayWaits += 1;
    if (waitMs > 0) {
      logWait("preflight", method, route, waitMs);
      await sleepImpl(waitMs);
    }

    lastRequestAt = now();
  }

  function updateRateLimitState(method, route, headers) {
    const bucketId = headers.get("x-ratelimit-bucket");
    if (!bucketId) return;

    const routeKey = canonicalRouteKey(method, route);
    const majorKey = majorParameterKey(route);
    const bucketKey = `${bucketId}:${majorKey}`;
    bucketByRoute.set(routeKey, bucketId);

    const remaining = numberHeader(headers, "x-ratelimit-remaining");
    const resetAfterMs = secondsHeader(headers, "x-ratelimit-reset-after");
    if (remaining === 0 && resetAfterMs > 0) {
      bucketState.set(bucketKey, {
        resetAt: now() + resetAfterMs + safetyBufferMs(),
      });
      return;
    }

    if (remaining > 0) {
      bucketState.delete(bucketKey);
    }
  }

  function assertInvalidRequestBudget() {
    if (metrics.invalidResponses >= invalidRequestAbortAfter) {
      const error = new Error(`Aborting Discord import after ${metrics.invalidResponses} invalid HTTP responses`);
      error.status = "invalid-request-budget";
      throw error;
    }
  }

  function getMetrics() {
    return { ...metrics };
  }

  function logWait(kind, method, route, waitMs) {
    if (!logger || waitMs < 1) return;
    logger(`${kind}: waiting ${Math.ceil(waitMs)}ms before Discord ${method} ${routeWithoutQuery(route)}`);
  }

  return {
    get,
    getMetrics,
  };
}

export function shouldAbortDiscordImport(error) {
  return error?.status === 401 ||
    error?.status === 429 ||
    error?.status === "invalid-request-budget" ||
    error?.isRateLimit === true;
}

function canonicalRouteKey(method, route) {
  return `${method}:${routeWithoutQuery(route).replace(snowflakePattern, "{id}")}`;
}

function routeWithoutQuery(route) {
  return String(route).split("?")[0];
}

function majorParameterKey(route) {
  const parts = routeWithoutQuery(route).split("/").filter(Boolean);
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (defaultMajorParameters.includes(parts[index]) && /^\d{17,20}$/.test(parts[index + 1])) {
      return `${parts[index]}:${parts[index + 1]}`;
    }
  }
  return "global";
}

function retryAfterFrom(headers, body) {
  return secondsHeader(headers, "retry-after") ||
    secondsHeader(headers, "x-ratelimit-reset-after") ||
    secondsToMs(body?.retry_after);
}

function isGlobalRateLimit(headers, body) {
  return headers.get("x-ratelimit-global") === "true" ||
    headers.get("x-ratelimit-scope") === "global" ||
    body?.global === true;
}

function rateLimitCountsAsInvalid(headers) {
  return headers.get("x-ratelimit-scope") !== "shared";
}

function numberHeader(headers, name) {
  const value = Number(headers.get(name));
  return Number.isFinite(value) ? value : null;
}

function secondsHeader(headers, name) {
  return secondsToMs(headers.get(name));
}

function secondsToMs(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1000) : null;
}

function positiveNumberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function positiveIntegerOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeIntegerOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function safetyBufferMs() {
  return 250;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
