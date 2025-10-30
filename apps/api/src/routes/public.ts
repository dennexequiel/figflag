import { Hono } from "hono";
import type { PublicFlagsResponse } from "@figflag/shared";
import { getDb } from "../db/client";
import { projects, environments, flags, configs } from "../db/schema";
import { eq, and } from "drizzle-orm";

export const publicRouter = new Hono<{ Bindings: CloudflareBindings }>();

// Cache configuration
const CACHE_TTL = 60;
const CACHE_MAX_AGE = 5;
const CACHE_STALE_WHILE_REVALIDATE = 60;

// Sanitize cache key to prevent injection
function sanitizeCacheKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// Generate ETag from response body using Web Crypto API (Cloudflare Workers compatible)
async function generateETag(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `"${hashHex.substring(0, 16)}"`;
}

publicRouter.get("/public/:projectSlug/:environment", async (c) => {
  const { projectSlug, environment } = c.req.param();
  const { FF_KV, FF_DB } = c.env;
  const safeProjectSlug = sanitizeCacheKey(projectSlug);
  const safeEnvironment = sanitizeCacheKey(environment);
  const cacheKey = `public:${safeProjectSlug}:${safeEnvironment}`;
  let cachedBody: string | null = null;

  try {
    cachedBody = await FF_KV.get(cacheKey, "text");

    if (cachedBody) {
      const etag = await generateETag(cachedBody);

      // Check If-None-Match header for 304 Not Modified
      const ifNoneMatch = c.req.header("If-None-Match");
      if (ifNoneMatch === etag) {
        return c.body(null, 304);
      }

      return c.json(JSON.parse(cachedBody), 200, {
        "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`,
        ETag: etag,
      });
    }
  } catch (error) {
    // Log cache read errors (non-blocking - continue to DB lookup)
    console.warn("KV cache read error (falling back to DB):", error);
    // Continue to DB lookup on cache miss/error
  }

  // Fetch from database
  const db = getDb({ FF_DB });

  // Validate project exists
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .get();
  if (!project) {
    return c.json({ error: "project_not_found" }, 404);
  }

  // Validate environment exists
  const env = await db
    .select()
    .from(environments)
    .where(
      and(
        eq(environments.projectId, project.id),
        eq(environments.slug, environment)
      )
    )
    .get();
  if (!env) {
    return c.json({ error: "environment_not_found" }, 404);
  }

  // Fetch flags and configs in parallel for better performance
  const [flagRows, configRows] = await Promise.all([
    db.select().from(flags).where(eq(flags.environmentId, env.id)).all(),
    db.select().from(configs).where(eq(configs.environmentId, env.id)).all(),
  ]);

  // Safe JSON parser with fallback
  const parseConfigValue = (raw: string | null): unknown => {
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Return raw string if not valid JSON (graceful degradation)
      return raw;
    }
  };

  // Build response payload
  const response: PublicFlagsResponse = {
    flags: Object.fromEntries(flagRows.map((f) => [f.key, Boolean(f.enabled)])),
    configs: Object.fromEntries(
      configRows.map((r) => [r.key, parseConfigValue(r.value)])
    ),
    timestamp: new Date(),
  };

  const payload = { project: project.slug, environment: env.slug, ...response };
  const body = JSON.stringify(payload);
  const etag = await generateETag(body);

  // Populate KV cache asynchronously (fire and forget for better latency)
  FF_KV.put(cacheKey, body, { expirationTtl: CACHE_TTL }).catch(
    (error: unknown) => {
      // Log cache write errors (non-blocking - request still succeeds)
      console.warn("KV cache write error (non-critical):", error);
    }
  );

  return c.json(payload, 200, {
    "Cache-Control": `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`,
    ETag: etag,
  });
});

// Export helper for cache invalidation (for future admin API)
export async function invalidatePublicCache(
  kv: KVNamespace,
  projectSlug: string,
  environment: string
): Promise<void> {
  const cacheKey = `public:${sanitizeCacheKey(projectSlug)}:${sanitizeCacheKey(
    environment
  )}`;
  await kv.delete(cacheKey);
}
