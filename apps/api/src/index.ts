import { Hono } from "hono";
import { cors } from "hono/cors";
import { publicRouter } from "./routes/public";
import { healthRouter } from "./routes/health";
import { adminRouter } from "./routes/admin";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// CORS middleware with proper preflight handling (public API)
// Note: Admin routes don't use CORS (API key auth only)
app.use(
  "/public/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "If-None-Match"],
    exposeHeaders: ["ETag", "Cache-Control"],
    maxAge: 86400,
  })
);

// Public routes
app.get("/", (c) => {
  return c.text("Hello Hono!");
});
app.route("/", healthRouter);
app.route("/", publicRouter);

// Admin API routes (requires authentication)
app.route("/api", adminRouter);

export default app;
