import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { projects, environments } from "../../db/schema";

export const projectsRouter = new Hono<{ Bindings: CloudflareBindings }>();

projectsRouter.get("/", async (c) => {
  const db = getDb({ FF_DB: c.env.FF_DB });
  const allProjects = await db.select().from(projects).all();
  return c.json({ projects: allProjects });
});

projectsRouter.get("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb({ FF_DB: c.env.FF_DB });
  const project = await db.select().from(projects).where(eq(projects.id, id)).get();

  if (!project) {
    return c.json({ error: "project_not_found" }, 404);
  }

  return c.json({ project });
});

projectsRouter.post("/", async (c) => {
  const body = await c.req.json();
  const { name, slug, description } = body;

  if (!name || !slug) {
    return c.json({ error: "name and slug are required" }, 400);
  }

  const db = getDb({ FF_DB: c.env.FF_DB });
  const now = new Date().toISOString();
  const id = `proj_${slug.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  try {
    await db
      .insert(projects)
      .values({
        id,
        name,
        slug,
        description: description || null,
        createdAt: now,
        updatedAt: now,
      });

    const project = await db.select().from(projects).where(eq(projects.id, id)).get();
    return c.json({ project }, 201);
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "slug_already_exists" }, 409);
    }
    throw error;
  }
});

projectsRouter.put("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { name, slug, description } = body;

  const db = getDb({ FF_DB: c.env.FF_DB });
  const project = await db.select().from(projects).where(eq(projects.id, id)).get();

  if (!project) {
    return c.json({ error: "project_not_found" }, 404);
  }

  const updates: any = {
    updatedAt: new Date().toISOString(),
  };

  if (name !== undefined) updates.name = name;
  if (slug !== undefined) updates.slug = slug;
  if (description !== undefined) updates.description = description;

  try {
    await db.update(projects).set(updates).where(eq(projects.id, id));

    const updated = await db.select().from(projects).where(eq(projects.id, id)).get();
    return c.json({ project: updated });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint")) {
      return c.json({ error: "slug_already_exists" }, 409);
    }
    throw error;
  }
});

projectsRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  const db = getDb({ FF_DB: c.env.FF_DB });

  const project = await db.select().from(projects).where(eq(projects.id, id)).get();
  if (!project) {
    return c.json({ error: "project_not_found" }, 404);
  }

  // Check if project has environments
  const envs = await db
    .select()
    .from(environments)
    .where(eq(environments.projectId, id))
    .all();

  if (envs.length > 0) {
    return c.json(
      {
        error: "cannot_delete_project_with_environments",
        environments: envs.length,
      },
      409
    );
  }

  await db.delete(projects).where(eq(projects.id, id));
  return c.json({ success: true });
});

