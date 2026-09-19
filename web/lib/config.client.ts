import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid web env: ${msg}`);
}

export const config = {
  NEXT_PUBLIC_API_URL: parsed.data.NEXT_PUBLIC_API_URL.replace(/\/$/, ""),
} as const;

export type ClientConfig = typeof config;
