import { Hono } from "hono";
import { projectsRouter } from "./projects";
import { environmentsRouter } from "./environments";
import { flagsRouter } from "./flags";
import { configsRouter } from "./configs";

export const adminRouter = new Hono<{ Bindings: CloudflareBindings }>();

// API Key authentication middleware
adminRouter.use("*", async (c, next) => {
  const apiKey = c.req.header("Authorization")?.replace("Bearer ", "");
  const expectedKey = c.env.ADMIN_API_KEY;

  if (!expectedKey) {
    console.warn("ADMIN_API_KEY not configured in wrangler.jsonc");
    return c.json({ error: "server_configuration_error" }, 500);
  }

  if (!apiKey || apiKey !== expectedKey) {
    return c.json({ error: "unauthorized" }, 401);
  }

  await next();
});

// Mount sub-routers
adminRouter.route("/projects", projectsRouter);
adminRouter.route("/environments", environmentsRouter);
adminRouter.route("/flags", flagsRouter);
adminRouter.route("/configs", configsRouter);

