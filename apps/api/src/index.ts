import { Hono } from "hono";
import { cors } from "hono/cors";
import { publicRouter } from "./routes/public";
import { healthRouter } from "./routes/health";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// CORS middleware with proper preflight handling
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "If-None-Match"],
    exposeHeaders: ["ETag", "Cache-Control"],
    maxAge: 86400,
  })
);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});
app.route("/", healthRouter);
app.route("/", publicRouter);

export default app;
