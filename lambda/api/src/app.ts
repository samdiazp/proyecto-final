import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";

import { appRouter } from "./trpc/routers";

export const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    status: "ok",
  });
});

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
  }),
);