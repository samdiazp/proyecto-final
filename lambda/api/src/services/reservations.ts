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
  reservationDate: string;
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

              reservationDate:
                data.reservationDate,

              createdAt,

              status: "CONFIRMED",

              GSI1PK: `USER#${data.userId}`,
              GSI1SK:
                `DATE#${data.reservationDate}#${reservationId}`,

              GSI2PK:
                `RESOURCE#${data.resourceId}`,

              GSI2SK:
                `DATE#${data.reservationDate}#${reservationId}`,
            },

            ConditionExpression:
              "attribute_not_exists(PK)",
          },
        },
      ],
    });

    await createReservationReminder({
      reservationId,
      reservationDate: data.reservationDate,
      email: user.email,
      resourceName: resource.name,
    });

  } catch (error) {
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

  return {
    reservationId,

    userId: data.userId,
    userName: user.fullname,

    resourceId: data.resourceId,
    resourceName: resource.name,

    spots: data.spots,
    reservationDate: data.reservationDate,

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