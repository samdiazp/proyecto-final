import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";

import { appRouter } from "./trpc/routers";
import { createContext } from "./trpc/context";


export const app = new Hono();

const stage = process.env.ENVIRONMENT || "dev"
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000"

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
  "*",
  cors({
    origin: frontendOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["content-type", "authorization"],
  })
)


app.use(
  `${stage}/api/trpc/*`,
  trpcServer({
    endpoint: `${stage}/api/trpc`,
    router: appRouter,
    createContext
  }),
);