import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({});


let cachedJwtSecret: string | undefined;

export const getJwtSecret = async () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const result = await client.send(
    new GetSecretValueCommand({
      SecretId: process.env.JWT_SECRET_ARN!,
    }),
  );

  if (!result.SecretString) {
    throw new Error("JWT secret not found");
  }

  cachedJwtSecret = result.SecretString;

  return cachedJwtSecret;
};