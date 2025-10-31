import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { projects, environments, configs } from "../../db/schema";
import { invalidatePublicCache } from "../public";

export const configsRouter = new Hono<{ Bindings: CloudflareBindings }>();

configsRouter.get("/", async (c) => {
  const environmentId = c.req.query("environmentId");
  const db = getDb({ FF_DB: c.env.FF_DB });

  let allConfigs;
  if (environmentId) {
    allConfigs = await db
      .select()
      .from(configs)
      .where(eq(configs.environmentId, environmentId))
      .all();
  } else {
    allConfigs = await db.select().from(configs).all();
  }

  return c.json({ configs: allConfigs });
});

configsRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb({ FF_DB: c.env.FF_DB });
  const config = await db.select().from(configs).where(eq(configs.id, id)).get();

  if (!config) {
    return c.json({ error: "config_not_found" }, 404);
  }

  return c.json({ config });
});

configsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { projectId, environmentId, key, name, description, value } = body;

  if (!projectId || !environmentId || !key || !name) {
    return c.json({ error: "projectId, environmentId, key, and name are required" }, 400);
  }

  const db = getDb({ FF_DB: c.env.FF_DB });

  // Verify project and environment exist
  const [project, env] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, projectId)).get(),
    db.select().from(environments).where(eq(environments.id, environmentId)).get(),
  ]);

  if (!project) {
    return c.json({ error: "project_not_found" }, 404);
  }
  if (!env || env.projectId !== projectId) {
    return c.json({ error: "environment_not_found_or_mismatch" }, 404);
  }

  // Validate value is valid JSON if provided
  let parsedValue: string | null = null;
  if (value !== undefined && value !== null) {
    try {
      parsedValue = typeof value === "string" ? value : JSON.stringify(value);
      // Validate it's valid JSON
      JSON.parse(parsedValue);
    } catch {
      return c.json({ error: "value_must_be_valid_json" }, 400);
    }
  }

  const now = new Date().toISOString();
  const id = `cfg_${key.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${env.slug}`;

  try {
    await db.insert(configs).values({
      id,
      projectId,
      environmentId,
      key,
      name,
      description: description || null,
      value: parsedValue,
      createdAt: now,
      updatedAt: now,
    });

    const config = await db.select().from(configs).where(eq(configs.id, id)).get();

    // Invalidate cache for this project/environment
    await invalidatePublicCache(c.env.FF_KV, project.slug, env.slug).catch(console.warn);

    return c.json({ config }, 201);
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "key_already_exists_for_environment" }, 409);
    }
    throw error;
  }
});

configsRouter.put("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { key, name, description, value } = body;

  const db = getDb({ FF_DB: c.env.FF_DB });
  const config = await db.select().from(configs).where(eq(configs.id, id)).get();

  if (!config) {
    return c.json({ error: "config_not_found" }, 404);
  }

  // Validate value is valid JSON if provided
  let parsedValue: string | null | undefined = undefined;
  if (value !== undefined) {
    if (value === null) {
      parsedValue = null;
    } else {
      try {
        parsedValue = typeof value === "string" ? value : JSON.stringify(value);
        // Validate it's valid JSON
        JSON.parse(parsedValue);
      } catch {
        return c.json({ error: "value_must_be_valid_json" }, 400);
      }
    }
  }

  const updates: any = {
    updatedAt: new Date().toISOString(),
  };

  if (key !== undefined) updates.key = key;
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (parsedValue !== undefined) updates.value = parsedValue;

  try {
    await db.update(configs).set(updates).where(eq(configs.id, id));

    const updated = await db.select().from(configs).where(eq(configs.id, id)).get();

    // Get project and environment for cache invalidation
    const [project, env] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, config.projectId)).get(),
      db.select().from(environments).where(eq(environments.id, config.environmentId)).get(),
    ]);

    if (project && env) {
      await invalidatePublicCache(c.env.FF_KV, project.slug, env.slug).catch(console.warn);
    }

    return c.json({ config: updated });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "key_already_exists_for_environment" }, 409);
    }
    throw error;
  }
});

configsRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb({ FF_DB: c.env.FF_DB });

  const config = await db.select().from(configs).where(eq(configs.id, id)).get();
  if (!config) {
    return c.json({ error: "config_not_found" }, 404);
  }

  // Get project and environment before deletion for cache invalidation
  const [project, env] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, config.projectId)).get(),
    db.select().from(environments).where(eq(environments.id, config.environmentId)).get(),
  ]);

  await db.delete(configs).where(eq(configs.id, id));

  // Invalidate cache
  if (project && env) {
    await invalidatePublicCache(c.env.FF_KV, project.slug, env.slug).catch(console.warn);
  }

  return c.json({ success: true });
});

