export default {
  schema: "./src/db/schema.ts",
  out: "./migrations",
  driver: "d1-http",
  dialect: "sqlite",
} as const;
