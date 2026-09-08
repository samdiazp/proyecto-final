import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  router,
  publicProcedure,
  protectedProcedure,
} from "./trpc";

import { loginUser } from "../services/auth";

import {
  registerUser,
  getUserById,
} from "../services/users";

import {
  createResource,
  getResourceById,
  getResources,
} from "../services/resources";

import {
  createReservation,
  getReservationById,
  getReservationsByResource,
  getReservationsByUser,
} from "../services/reservations";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
  })),

  // =========================
  // AUTH
  // =========================

  login: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { user, token } = await loginUser(
          input.email,
          input.password,
        );

        return {
          user,
          token,
        };
      } catch {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }
    }),

  register: publicProcedure
    .input(
      z.object({
        email: z.email(),
        password: z.string().min(6),
        fullname: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const user = await registerUser({
          email: input.email,
          pwd: input.password,
          fullname: input.fullname,
        });

        return {
          user,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "User with this email already exists"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "User with this email already exists",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to register user",
          cause: error,
        });
      }
    }),

  // =========================
  // USERS
  // =========================

  getUser: protectedProcedure.query(
    async ({ ctx }) => {
      const user = await getUserById(
        ctx.user.userId,
      );

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        user,
      };
    },
  ),

  // =========================
  // RESOURCES
  // =========================

  createResource: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        spots: z.number().int().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const resource =
        await createResource(input);

      return {
        resource,
      };
    }),

  getResource: publicProcedure
    .input(
      z.object({
        resourceId: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      const resource = await getResourceById(
        input.resourceId,
      );

      if (!resource) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Resource not found",
        });
      }

      return {
        resource,
      };
    }),

  getResources: publicProcedure.query(
    async () => {
      const resources = await getResources();

      return {
        resources,
      };
    },
  ),

  // =========================
  // RESERVATIONS
  // =========================

  createReservation: protectedProcedure
    .input(
      z.object({
        resourceId: z.string().min(1),
        reservationDate: z.string().min(1),
        spots: z.number().int().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const reservation =
          await createReservation({
            userId: ctx.user.userId,
            resourceId: input.resourceId,
            reservationDate:
              input.reservationDate,
            spots: input.spots,
          });

        return {
          reservation,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Resource not found"
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Resource not found",
          });
        }

        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Unable to create reservation. There may not be enough available spots.",
          cause: error,
        });
      }
    }),

  getReservation: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      const reservation =
        await getReservationById(
          input.reservationId,
        );

      if (!reservation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reservation not found",
        });
      }

      // Evitar consultar reservas
      // de otros usuarios
      if (
        reservation.userId !== ctx.user.userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You cannot access this reservation",
        });
      }

      return {
        reservation,
      };
    }),

  getUserReservations:
    protectedProcedure.query(
      async ({ ctx }) => {
        const reservations =
          await getReservationsByUser(
            ctx.user.userId,
          );

        return {
          reservations,
        };
      },
    ),

  getResourceReservations:
    publicProcedure
      .input(
        z.object({
          resourceId: z.string().min(1),
        }),
      )
      .query(async ({ input }) => {
        const reservations =
          await getReservationsByResource(
            input.resourceId,
          );

        return {
          reservations,
        };
      }),
});

export type AppRouter = typeof appRouter;