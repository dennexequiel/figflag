import { Hono } from 'hono'
import type { PublicFlagsResponse } from '@figflag/shared'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/public/:projectSlug/:environment', (c) => {
  const { projectSlug, environment } = c.req.param()

  const response: PublicFlagsResponse = {
    flags: {
      example_flag: true
    },
    configs: {
      example_config: 'value'
    },
    timestamp: new Date()
  }

  return c.json({
    project: projectSlug,
    environment,
    ...response
  })
})

export default app
