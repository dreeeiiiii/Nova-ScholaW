import { z } from "zod";

const envSchema = z.object({
  API_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
});

const parsed = envSchema.safeParse({
  API_URL: process.env.API_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid web env: ${msg}`);
}

export const config = {
  API_URL: parsed.data.API_URL.replace(/\/$/, ""),
  NEXT_PUBLIC_API_URL: parsed.data.NEXT_PUBLIC_API_URL.replace(/\/$/, ""),
} as const;

export type AppConfig = typeof config;
