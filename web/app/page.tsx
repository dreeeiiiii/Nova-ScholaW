import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import HomeNav from "./_components/home/HomeNav";
import Hero from "./_components/home/Hero";
import HowToUse from "./_components/home/HowToUse";
import Benefits from "./_components/home/Benefits";
import AboutProject from "./_components/home/AboutProject";
import CTASection from "./_components/home/CTASection";
import Footer from "./_components/home/Footer";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-background)" }}>
      <HomeNav />
      <main>
        <Hero />
        <HowToUse />
        <Benefits />
        <AboutProject />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
