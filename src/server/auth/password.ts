import bcrypt from "bcryptjs";

import { env } from "@/lib/config/env";

export async function hashPassword(password: string) {
  return bcrypt.hash(applyPepper(password), env.PASSWORD_BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(applyPepper(password), hash);
}

function applyPepper(password: string) {
  return `${password}${env.PASSWORD_PEPPER ?? ""}`;
}
