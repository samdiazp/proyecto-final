import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getUserByEmail } from "./users";
import { getJwtSecret } from "../secrets";

export const loginUser = async (
  email: string,
  password: string,
) => {
  const users = await getUserByEmail(email);

  const user = users[0];

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const validPassword = await bcrypt.compare(
    password,
    user.hashedPwd,
  );

  if (!validPassword) {
    throw new Error("Invalid email or password");
  }

  const jwtSecret = await getJwtSecret();

  if (!jwtSecret) {
    throw new Error("JWT secret not found");
  }

  const token = jwt.sign(
    {
      sub: user.userId,
      email: user.email,
    },
    jwtSecret,
    {
      expiresIn: "1h",
    },
  );

  return {
    token,

    user: {
      id: user.userId,
      fullname: user.fullname,
      email: user.email,
    },
  };
};

export const verifyToken = async (token: string) => {
  const jwtSecret = await getJwtSecret();
  if (!jwtSecret) {
    throw new Error("JWT secret not found");
 }

    try {
        const decoded = jwt.verify(token, jwtSecret) as { sub: string; email: string };
        return {
            userId: decoded.sub,
            email: decoded.email
        };
    } catch (err) {
        throw new Error("Invalid token");
    }
};
