import {
  get,
  query,
  transactWrite,
} from "../db";

import { randomUUID } from "crypto";

import { getUserById } from "./users";
import { getResourceById } from "./resources";
import { TRPCError } from "@trpc/server";
import { createReservationReminder } from "./scheduler";

export type CreateReservation = {
  userId: string;
  resourceId: string;
  spots: number;
};

export const createReservation = async (
  data: CreateReservation,
) => {
  if (data.spots <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Spots must be greater than 0",
    });
  }

  const [user, resource] = await Promise.all([
    getUserById(data.userId),
    getResourceById(data.resourceId),
  ]);

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found",
    });
  }

  if (!resource) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Resource not found",
    });
  }

  const reservationDate = resource.reservationDate;

  const reservationId = randomUUID();
  const createdAt = new Date().toISOString();

  try {


    await transactWrite({
      TransactItems: [
        {
          Update: {
            TableName: process.env.TABLE_NAME!,

            Key: {
              PK: `RESOURCE#${data.resourceId}`,
              SK: "META",
            },

            UpdateExpression:
              "SET availableSpots = availableSpots - :spots",

            ConditionExpression:
              "attribute_exists(PK) AND availableSpots >= :spots",

            ExpressionAttributeValues: {
              ":spots": data.spots,
            },
          },
        },

        {
          Put: {
            TableName: process.env.TABLE_NAME!,

            Item: {
              PK: `RESERVATION#${reservationId}`,
              SK: "META",

              entity: "RESERVATION",

              reservationId,

              userId: data.userId,
              userName: user.fullname,

              resourceId: data.resourceId,
              resourceName: resource.name,

              spots: data.spots,

              reservationDate,

              createdAt,

              status: "CONFIRMED",

              GSI1PK: `USER#${data.userId}`,
              GSI1SK:
                `DATE#${reservationDate}#${reservationId}`,

              GSI2PK:
                `RESOURCE#${data.resourceId}`,

              GSI2SK:
                `DATE#${reservationDate}#${reservationId}`,
            },

            ConditionExpression:
              "attribute_not_exists(PK)",
          },
        },
        {
          Put: {
            TableName: process.env.TABLE_NAME!,

            Item: {
              PK: `USER#${data.userId}`,
              SK: `RESOURCE#${data.resourceId}`,

              entity: "RESERVATION_LOCK",
              reservationId,
            },

            ConditionExpression:
              "attribute_not_exists(PK)",
          },
        },
      ],
    });

  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "TransactionCanceledException"
    ) {
      const existingReservation = await get({
        Key: {
          PK: `USER#${data.userId}`,
          SK: `RESOURCE#${data.resourceId}`,
        },
      });

      if (existingReservation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a reservation for this resource",
        });
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Not enough available spots",
      });
    }

    if (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Not enough available spots",
      });
    }
    throw error;
  }

  try {
    await createReservationReminder({
      reservationId,
      reservationDate,
      email: user.email,
      resourceName: resource.name,
    });
  } catch (error) {
    console.error("Unable to schedule reservation reminder", error);
  }

  return {
    reservationId,

    userId: data.userId,
    userName: user.fullname,

    resourceId: data.resourceId,
    resourceName: resource.name,

    spots: data.spots,
    reservationDate,

    createdAt,
    status: "CONFIRMED",
  };
};

export const getReservationById = async (
  reservationId: string,
) => {
  return get({
    Key: {
      PK: `RESERVATION#${reservationId}`,
      SK: "META",
    },
  });
};

export const getReservationsByUser = async (
  userId: string,
  order: "ASC" | "DESC" = "DESC",
) => {
  return query({
    IndexName: "GSI1",

    KeyConditionExpression:
      "GSI1PK = :user",

    ExpressionAttributeValues: {
      ":user": `USER#${userId}`,
    },

    ScanIndexForward: order === "ASC",
  });
};

export const getReservationsByResource = async (
  resourceId: string,
  order: "ASC" | "DESC" = "DESC",
) => {
  return query({
    IndexName: "GSI2",

    KeyConditionExpression:
      "GSI2PK = :resource",

    ExpressionAttributeValues: {
      ":resource": `RESOURCE#${resourceId}`,
    },

    ScanIndexForward: order === "ASC",
  });
};

export const cancelReservation = async ({
  reservationId,
  userId,
}: {
  reservationId: string;
  userId: string;
}) => {
  const reservation = await getReservationById(reservationId);

  if (!reservation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Reservation not found",
    });
  }

  if (reservation.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot cancel this reservation",
    });
  }

  if (reservation.status !== "CONFIRMED") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Reservation is already cancelled",
    });
  }

  try {
    await transactWrite({
      TransactItems: [
        {
          Update: {
            TableName: process.env.TABLE_NAME!,
            Key: {
              PK: `RESOURCE#${reservation.resourceId}`,
              SK: "META",
            },
            UpdateExpression:
              "SET availableSpots = availableSpots + :spots",
            ConditionExpression: "attribute_exists(PK)",
            ExpressionAttributeValues: {
              ":spots": reservation.spots,
            },
          },
        },
        {
          Update: {
            TableName: process.env.TABLE_NAME!,
            Key: {
              PK: `RESERVATION#${reservationId}`,
              SK: "META",
            },
            UpdateExpression: "SET #status = :cancelled",
            ConditionExpression: "#status = :confirmed",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":cancelled": "CANCELED",
              ":confirmed": "CONFIRMED",
            },
          },
        },
        {
          Delete: {
            TableName: process.env.TABLE_NAME!,
            Key: {
              PK: `USER#${userId}`,
              SK: `RESOURCE#${reservation.resourceId}`,
            },
          },
        },
      ],
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "TransactionCanceledException"
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Reservation is already cancelled",
      });
    }
    throw error;
  }

  return {
    ...reservation,
    status: "CANCELED",
  };
};
