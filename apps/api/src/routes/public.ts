import { Hono } from 'hono'
import type { PublicFlagsResponse } from '@figflag/shared'
import { getDb } from '../db/client'
import { projects, environments, flags, configs } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export const publicRouter = new Hono()

publicRouter.get('/public/:projectSlug/:environment', async (c) => {
  const { projectSlug, environment } = c.req.param()
  const db = getDb({ FF_DB: (c.env as any).FF_DB as D1Database }) as any

  const project = await db.select().from(projects).where(eq(projects.slug, projectSlug)).get()
  if (!project) return c.json({ error: 'project_not_found' }, 404)

  const env = await db
    .select()
    .from(environments)
    .where(and(eq(environments.projectId, project.id), eq(environments.slug, environment)))
    .get()
  if (!env) return c.json({ error: 'environment_not_found' }, 404)

  const flagRows = await db.select().from(flags).where(eq(flags.environmentId, env.id)).all()
  const configRows = await db.select().from(configs).where(eq(configs.environmentId, env.id)).all()

  const parseConfigValue = (raw: string | null) => {
    if (raw == null) return null
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }

  const response: PublicFlagsResponse = {
    flags: Object.fromEntries(
      flagRows.map((f: typeof flags.$inferSelect) => [f.key, Boolean(f.enabled)])
    ),
    configs: Object.fromEntries(
      configRows.map((r: typeof configs.$inferSelect) => [r.key, parseConfigValue(r.value)])
    ),
    timestamp: new Date()
  }

  return c.json({ project: project.slug, environment: env.slug, ...response })
})


