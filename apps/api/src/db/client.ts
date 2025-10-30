import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export type EnvWithD1 = { FF_DB: D1Database }

export function getDb(env: EnvWithD1) {
  return drizzle(env.FF_DB, { schema })
}

export type Db = ReturnType<typeof getDb>


