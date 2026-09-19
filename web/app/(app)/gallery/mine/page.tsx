import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import MyUploadsClient from "../_components/MyUploadsClient";

export default async function MyUploadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let media: unknown[] = [];
  let error: string | null = null;

  try {
    const data = (await serverFetch("/api/gallery/mine")) as { media: unknown[] };
    media = data.media ?? [];
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load uploads";
  }

  return <MyUploadsClient media={media as never[]} error={error} />;
}
