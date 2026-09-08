import type { Context } from "hono";
import { verifyToken } from "../services/auth";

export const createContext = async (
  _opts: unknown,
  c: Context,
) => {
  const authorization =
    c.req.header("Authorization");

  let user = null;

  if (authorization?.startsWith("Bearer ")) {
    const token =
      authorization.substring(7);

    user = await verifyToken(token);
  }

  return {
    user,
  };
};

export type TRPCContext =
  Awaited<ReturnType<typeof createContext>>;