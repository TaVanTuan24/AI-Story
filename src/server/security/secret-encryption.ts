import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { env } from "@/lib/config/env";

const algorithm = "aes-256-gcm";
const version = "v1";

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [version, encode(iv), encode(tag), encode(ciphertext)].join(":");
}

export function decryptSecret(encrypted: string) {
  const [storedVersion, iv, tag, ciphertext] = encrypted.split(":");
  if (storedVersion !== version || !iv || !tag || !ciphertext) {
    throw new Error("Unsupported encrypted secret format.");
  }

  const decipher = createDecipheriv(algorithm, encryptionKey(), decode(iv));
  decipher.setAuthTag(decode(tag));

  return Buffer.concat([
    decipher.update(decode(ciphertext)),
    decipher.final(),
  ]).toString("utf8");
}

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return "****";
  }

  const prefix = trimmed.includes("-") ? `${trimmed.split("-")[0]}-` : "";
  return `${prefix}****${trimmed.slice(-4)}`;
}

function encryptionKey() {
  return createHash("sha256").update(env.AI_SETTINGS_ENCRYPTION_KEY).digest();
}

function encode(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}
