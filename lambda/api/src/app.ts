import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";

import { appRouter } from "./trpc/routers";

export const app = new Hono();

const stage = process.env.ENVIRONMENT || "dev"

app.use("*", async (c, next) => {
  console.log("REQUEST", {
    method: c.req.method,
    path: c.req.path,
    url: c.req.url,
  });

  await next();
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
  });
});



app.use(
  `${stage}/api/trpc`,
  trpcServer({
    endpoint: `${stage}/api/trpc`,
    router: appRouter,
  }),
);