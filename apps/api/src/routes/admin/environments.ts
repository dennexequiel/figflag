import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { projects, environments, flags, configs } from "../../db/schema";

export const environmentsRouter = new Hono<{ Bindings: CloudflareBindings }>();

environmentsRouter.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const db = getDb({ FF_DB: c.env.FF_DB });

  let allEnvs;
  if (projectId) {
    allEnvs = await db
      .select()
      .from(environments)
      .where(eq(environments.projectId, projectId))
      .all();
  } else {
    allEnvs = await db.select().from(environments).all();
  }

  return c.json({ environments: allEnvs });
});

environmentsRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb({ FF_DB: c.env.FF_DB });
  const env = await db
    .select()
    .from(environments)
    .where(eq(environments.id, id))
    .get();

  if (!env) {
    return c.json({ error: "environment_not_found" }, 404);
  }

  return c.json({ environment: env });
});

environmentsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { projectId, name, slug, description } = body;

  if (!projectId || !name || !slug) {
    return c.json({ error: "projectId, name, and slug are required" }, 400);
  }

  const db = getDb({ FF_DB: c.env.FF_DB });

  // Verify project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) {
    return c.json({ error: "project_not_found" }, 404);
  }

  const now = new Date().toISOString();
  const id = `env_${slug.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  try {
    await db.insert(environments).values({
      id,
      projectId,
      name,
      slug,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    });

    const environment = await db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .get();
    return c.json({ environment }, 201);
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "slug_already_exists_for_project" }, 409);
    }
    throw error;
  }
});

// PUT /api/environments/:id - Update environment
environmentsRouter.put("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { name, slug, description } = body;

  const db = getDb({ FF_DB: c.env.FF_DB });
  const env = await db.select().from(environments).where(eq(environments.id, id)).get();

  if (!env) {
    return c.json({ error: "environment_not_found" }, 404);
  }

  const updates: any = {
    updatedAt: new Date().toISOString(),
  };

  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (description !== undefined) updates.description = description;

  try {
    await db.update(environments).set(updates).where(eq(environments.id, id));

    const updated = await db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .get();
    return c.json({ environment: updated });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "slug_already_exists_for_project" }, 409);
    }
    throw error;
  }
});

// DELETE /api/environments/:id - Delete environment (cascade check)
environmentsRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb({ FF_DB: c.env.FF_DB });

  const env = await db.select().from(environments).where(eq(environments.id, id)).get();
  if (!env) {
    return c.json({ error: "environment_not_found" }, 404);
  }

  // Check if environment has flags or configs
  const [flagCount, configCount] = await Promise.all([
    db.select().from(flags).where(eq(flags.environmentId, id)).all(),
    db.select().from(configs).where(eq(configs.environmentId, id)).all(),
  ]);

  if (flagCount.length > 0 || configCount.length > 0) {
    return c.json(
      {
        error: "cannot_delete_environment_with_flags_or_configs",
        flags: flagCount.length,
        configs: configCount.length,
      },
      409
    );
  }

  await db.delete(environments).where(eq(environments.id, id));
  return c.json({ success: true });
});

