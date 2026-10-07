"use client";
import Link from "next/link";
import Image from "next/image";
import { nstImages } from "@/lib/nst-images";
import { useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { NavDrawer } from "../nav/NavDrawer";
const links = [{ href: "/announcements", label: "Announcements" }, { href: "/gallery", label: "Gallery" }, { href: "/tv", label: "TV Announcement" }];
export default function HomeNav() {
  const [open, setOpen] = useState(false);
  return <>
    <header className="public-header"><div className="tokens-container flex items-center justify-between gap-4">
      <Link href="/" className="wordmark" aria-label="Nova Schola Hub home"><Image src={nstImages.mark.src} alt={nstImages.mark.alt} width={44} height={44} sizes="44px" /><span>Nova Schola<span className="wordmark-sub">Hub · Tanauan</span></span></Link>
      <nav className="hidden items-center gap-4 lg:flex" aria-label="Public navigation">{links.map(link => <Link key={link.href} href={link.href} className="nav-text">{link.label}</Link>)}</nav>
      <div className="hidden items-center gap-4 lg:flex"><Link href="/login" className="nav-text">Login</Link><Link href="/register" className="tokens-btn tokens-btn-brand !px-5">Create Account <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
      <button type="button" className="menu-trigger lg:hidden" aria-label="Open menu" aria-expanded={open} aria-controls="public-menu" onClick={() => setOpen(true)}><Menu aria-hidden="true" /></button>
    </div></header>
    <NavDrawer open={open} onClose={() => setOpen(false)} label="School navigation">
      <div id="public-menu" className="tokens-container flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto py-6">
        <div className="flex items-center justify-between gap-4"><span className="font-heading text-xl font-bold">Nova Schola Hub</span><button type="button" className="menu-trigger" onClick={() => setOpen(false)} aria-label="Close menu"><X aria-hidden="true" /></button></div>
        <p className="tokens-eyebrow text-white/70">Your school. Connected.</p>
        <nav className="flex flex-col gap-4" aria-label="Public mobile navigation">{links.map((link, index) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="drawer-link"><span className="tokens-small text-white/60">0{index + 1}</span>{link.label}<ArrowUpRight size={24} aria-hidden="true" /></Link>)}</nav>
        <div className="mt-auto grid gap-3 pb-4"><Link href="/login" className="tokens-btn tokens-btn-accent" onClick={() => setOpen(false)}>Login</Link><Link href="/register" className="tokens-btn border border-white/30 text-white" onClick={() => setOpen(false)}>Create Account</Link></div>
      </div>
    </NavDrawer>
  </>;
}
