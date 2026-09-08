import { get, put, query } from "../db";
import { randomUUID } from "crypto";

export type Resource = {
  resourceId: string;
  name: string;
  spots: number;
  availableSpots: number;
  createdAt: string;
};

export type CreateResource = {
  name: string;
  spots: number;
  description?: string;
};

export const createResource = async (
  resourceData: CreateResource,
) => {
  if (resourceData.spots <= 0) {
    throw new Error("Spots must be greater than 0");
  }

  const resourceId = randomUUID();
  const createdAt = new Date().toISOString();

  const params = {
    Item: {
      PK: `RESOURCE#${resourceId}`,
      SK: "META",

      entity: "RESOURCE",

      resourceId,
      name: resourceData.name,
      description: resourceData.description ?? null,

      spots: resourceData.spots,
      availableSpots: resourceData.spots,

      createdAt,

      GSI1PK: "RESOURCE",
      GSI1SK: `CREATED#${createdAt}#${resourceId}`,
    },
  };

  await put(params);

  return {
    resourceId,
    name: resourceData.name,
    spots: resourceData.spots,
    availableSpots: resourceData.spots,
    description: resourceData.description ?? null,
    createdAt,
  };
};


export const getResourceById = async (
  resourceId: string,
) => {
  return get({
    Key: {
      PK: `RESOURCE#${resourceId}`,
      SK: "META",
    },
  });
};


export const getResources = async (
  order: "ASC" | "DESC" = "DESC",
) => {
  return query({
    IndexName: "GSI1",

    KeyConditionExpression:
      "GSI1PK = :resource",

    ExpressionAttributeValues: {
      ":resource": "RESOURCE",
    },

    ScanIndexForward: order === "ASC",
  });
};