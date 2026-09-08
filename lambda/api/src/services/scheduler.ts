import {
  SchedulerClient,
  CreateScheduleCommand,
} from "@aws-sdk/client-scheduler";

const scheduler = new SchedulerClient({});

type CreateReminderParams = {
  reservationId: string;
  reservationDate: string;
  email: string;
  resourceName: string;
};

export const createReservationReminder = async ({
  reservationId,
  reservationDate,
  email,
  resourceName,
}: CreateReminderParams) => {
  const reservationTime = new Date(reservationDate);

  if (Number.isNaN(reservationTime.getTime())) {
    throw new Error("Invalid reservation date");
  }

  const reminderTime = new Date(
    reservationTime.getTime() - 60 * 60 * 1000,
  );

  if (reminderTime <= new Date()) {
    throw new Error(
      "Reservation must be more than one hour in the future",
    );
  }

  const scheduleDate = reminderTime
    .toISOString()
    .replace(/\.\d{3}Z$/, "");

  const command = new CreateScheduleCommand({
    Name: `reservation-${reservationId}-reminder`,

    GroupName:
      process.env.SCHEDULER_GROUP_NAME!,

    ScheduleExpression:
      `at(${scheduleDate})`,

    ScheduleExpressionTimezone: "UTC",

    FlexibleTimeWindow: {
      Mode: "OFF",
    },

    ActionAfterCompletion: "DELETE",

    Target: {
      Arn: process.env.REMINDER_QUEUE_ARN!,
      RoleArn: process.env.SCHEDULER_ROLE_ARN!,

      Input: JSON.stringify({
        reservationId,
        email,
        resourceName,
        reservationDate,
      }),
    },
  });

  await scheduler.send(command);

  return {
    scheduleName:
      `reservation-${reservationId}-reminder`,
    reminderDate: reminderTime.toISOString(),
  };
};