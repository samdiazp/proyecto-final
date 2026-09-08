import { initTRPC, TRPCError } from "@trpc/server";
import { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthenticated = t.middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to access this resource",
        });
    }

    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);