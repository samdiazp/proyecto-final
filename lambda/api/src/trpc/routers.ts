import { z } from "zod";
import { router, publicProcedure } from "./trpc";

export const appRouter = router({
  health: publicProcedure.query(() => {
    return {
      status: "ok",
    };
  }),

  hello: publicProcedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .query(({ input }) => {
      return {
        message: `Hello ${input.name}`,
      };
    }),
});

export type AppRouter = typeof appRouter;