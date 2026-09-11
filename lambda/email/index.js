import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});

const dynamo = DynamoDBDocumentClient.from(
  client,
  {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  },
);

export const handler = async (event) => {
  for (const record of event.Records) {
    const data = JSON.parse(record.body);

    const {
      reservationId,
      email,
      resourceName,
      reservationDate,
    } = data;

    console.log(`Email enviado a ${email}`);

    const sentAt = new Date().toISOString();

    await dynamo.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,

        Item: {
          PK: `RESERVATION#${reservationId}`,
          SK: "NOTIFICATION#REMINDER",

          entity: "NOTIFICATION",

          type: "RESERVATION_REMINDER",
          status: "SENT",
          GSI1PK: `EMAIL#${email}`,
          GSI1SK: `RESERVATION#${reservationId}`,

          reservationId,
          email,
          resourceName,
          reservationDate,

          sentAt,
        },
      }),
    );

    console.log(
      `Notification registered for reservation ${reservationId}`,
    );
  }

  return {
    statusCode: 200,
  };
};