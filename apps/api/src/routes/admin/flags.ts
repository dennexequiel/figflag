import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { projects, environments, flags } from "../../db/schema";
import { invalidatePublicCache } from "../public";

export const flagsRouter = new Hono<{ Bindings: CloudflareBindings }>();

flagsRouter.get("/", async (c) => {
  const environmentId = c.req.query("environmentId");
  const db = getDb({ FF_DB: c.env.FF_DB });

  let allFlags;
  if (environmentId) {
    allFlags = await db
      .select()
      .from(flags)
      .where(eq(flags.environmentId, environmentId))
      .all();
  } else {
    allFlags = await db.select().from(flags).all();
  }

  return c.json({ flags: allFlags });
});

flagsRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb({ FF_DB: c.env.FF_DB });
  const flag = await db.select().from(flags).where(eq(flags.id, id)).get();

  if (!flag) {
    return c.json({ error: "flag_not_found" }, 404);
  }

  return c.json({ flag });
});

flagsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { projectId, environmentId, key, name, description, enabled, defaultValue } = body;

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

  const now = new Date().toISOString();
  const id = `flag_${key.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${env.slug}`;

  try {
    await db.insert(flags).values({
      id,
      projectId,
      environmentId,
      key,
      name,
      description: description || null,
      enabled: Boolean(enabled ?? false),
      defaultValue: defaultValue || null,
      createdAt: now,
      updatedAt: now,
    });

    const flag = await db.select().from(flags).where(eq(flags.id, id)).get();

    // Invalidate cache for this project/environment
    await invalidatePublicCache(c.env.FF_KV, project.slug, env.slug).catch(console.warn);

    return c.json({ flag }, 201);
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "key_already_exists_for_environment" }, 409);
    }
    throw error;
  }
});

flagsRouter.put("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { key, name, description, enabled, defaultValue } = body;

  const db = getDb({ FF_DB: c.env.FF_DB });
  const flag = await db.select().from(flags).where(eq(flags.id, id)).get();

  if (!flag) {
    return c.json({ error: "flag_not_found" }, 404);
  }

  const updates: any = {
    updatedAt: new Date().toISOString(),
  };

  if (key !== undefined) updates.key = key;
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (enabled !== undefined) updates.enabled = Boolean(enabled);
  if (defaultValue !== undefined) updates.defaultValue = defaultValue;

  try {
    await db.update(flags).set(updates).where(eq(flags.id, id));

    const updated = await db.select().from(flags).where(eq(flags.id, id)).get();

    // Get project and environment for cache invalidation
    const [project, env] = await Promise.all([
      db.select().from(projects).where(eq(projects.id, flag.projectId)).get(),
      db.select().from(environments).where(eq(environments.id, flag.environmentId)).get(),
    ]);

    if (project && env) {
      await invalidatePublicCache(c.env.FF_KV, project.slug, env.slug).catch(console.warn);
    }

    return c.json({ flag: updated });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "key_already_exists_for_environment" }, 409);
    }
    throw error;
  }
});

flagsRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb({ FF_DB: c.env.FF_DB });

  const flag = await db.select().from(flags).where(eq(flags.id, id)).get();
  if (!flag) {
    return c.json({ error: "flag_not_found" }, 404);
  }

  // Get project and environment before deletion for cache invalidation
  const [project, env] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, flag.projectId)).get(),
    db.select().from(environments).where(eq(environments.id, flag.environmentId)).get(),
  ]);

  await db.delete(flags).where(eq(flags.id, id));

  // Invalidate cache
  if (project && env) {
    await invalidatePublicCache(c.env.FF_KV, project.slug, env.slug).catch(console.warn);
  }

  return c.json({ success: true });
});

