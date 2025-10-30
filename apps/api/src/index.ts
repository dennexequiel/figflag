import { Hono } from 'hono'
import { publicRouter } from './routes/public'
import { healthRouter } from './routes/health'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})
app.route('/', healthRouter)
app.route('/', publicRouter)

export default app
