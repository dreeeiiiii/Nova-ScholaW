import { getCurrentUser } from "@/lib/auth";
import AppShell from "./_components/AppShell";
import GuestShell from "./_components/GuestShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user) {
    return <AppShell user={user}>{children}</AppShell>;
  }

  return <GuestShell>{children}</GuestShell>;
}
