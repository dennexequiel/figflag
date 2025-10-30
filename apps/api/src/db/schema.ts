import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
}, (t) => [
  uniqueIndex('idx_projects_slug').on(t.slug)
])

export const environments = sqliteTable('environments', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const flags = sqliteTable('flags', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  environmentId: text('environment_id').notNull(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  defaultValue: text('default_value'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const configs = sqliteTable('configs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  environmentId: text('environment_id').notNull(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  value: text('value'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})


