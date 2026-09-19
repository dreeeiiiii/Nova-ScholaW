import { z } from "zod";

const envSchema = z.object({
  API_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
});

const parsed = envSchema.safeParse({
  API_URL: process.env.API_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  JWT_SECRET: process.env.JWT_SECRET,
});

if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid web env: ${msg}`);
}

export const config = {
  API_URL: parsed.data.API_URL.replace(/\/$/, ""),
  NEXT_PUBLIC_API_URL: parsed.data.NEXT_PUBLIC_API_URL.replace(/\/$/, ""),
  JWT_SECRET: parsed.data.JWT_SECRET,
} as const;

export type AppConfig = typeof config;
