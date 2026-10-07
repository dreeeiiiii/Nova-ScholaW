import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { nstImages } from "@/lib/nst-images";
export default function Hero() {
  return <section className="home-hero tokens-container" aria-labelledby="hero-heading">
    <div className="hero-copy rise-in">
      <p className="eyebrow"><span className="status-dot" />Nova Schola Tanauan</p>
      <h1 id="hero-heading" className="hero-title">Your school.<br />Your stories.<br /><span>One hub.</span></h1>
      <p className="hero-description">Stay close to what matters. Official announcements, updates for your class, and moments from school life — together in Nova Schola Hub.</p>
      <div className="hero-actions"><Link href="/announcements" className="tokens-btn tokens-btn-brand">View Announcements <ArrowUpRight size={20} aria-hidden="true" /></Link><Link href="/register" className="tokens-btn tokens-btn-secondary">Create Account</Link></div>
      <p className="tokens-small mt-6" style={{ color: "var(--color-muted)" }}>Already part of the community? <Link href="/login" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Login</Link></p>
    </div>
    <figure className="hero-visual"><div className="hero-photo"><Image src={nstImages.hero.src} alt={nstImages.hero.alt} preload sizes="(max-width: 1023px) 100vw, 50vw" className="h-full w-full object-cover" /></div>
      <figcaption className="hero-caption"><span className="tokens-eyebrow">The Nova Schola community</span><p>A community worth connecting.</p><Link href="/gallery" aria-label="Explore the school event gallery" className="menu-trigger"><ArrowUpRight aria-hidden="true" /></Link></figcaption>
    </figure>
  </section>;
}
