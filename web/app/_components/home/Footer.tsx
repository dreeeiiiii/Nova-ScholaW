import Link from "next/link";
import { FooterColumn } from "./FooterColumn";

const explore = [{href:"/#how-to-use",label:"How it works"},{href:"/announcements",label:"General Announcements"},{href:"/gallery",label:"Event Gallery"},{href:"/tv",label:"TV Announcement View"}];
const accounts = [{href:"/login",label:"Login"},{href:"/register?role=student",label:"Student Registration"},{href:"/register?role=teacher",label:"Teacher Registration"}];

export default function Footer(){
 return <footer style={{backgroundColor:"var(--color-dark)",color:"var(--color-surface)"}}>
  <div className="tokens-container tokens-section-sm">
   <div className="grid items-end gap-8 lg:grid-cols-12">
    <div className="lg:col-span-8"><span className="tokens-eyebrow block" style={{color:"var(--color-accent)"}}>Nova Schola Hub</span><p className="tokens-heading-2 mt-6 max-w-3xl text-balance text-white">Stay connected to Nova Schola Tanauan.</p></div>
    <div className="lg:col-span-4 lg:text-right"><Link href="/login" className="tokens-btn tokens-btn-accent">Sign in to your account</Link></div>
   </div>
   <div className="my-12 h-px w-full md:my-16" style={{backgroundColor:"rgba(255,255,255,0.12)"}} />
   <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-12 md:gap-12">
    <div className="sm:col-span-2 md:col-span-5"><Link href="/" className="font-heading text-2xl font-extrabold text-white">Nova Schola Hub</Link><p className="mt-6 max-w-xs text-sm leading-relaxed text-white/60">Official announcements and approved event images for Nova Schola Tanauan.</p></div>
    <div className="md:col-span-3 md:col-start-7"><FooterColumn title="Explore" links={explore}/></div>
    <div className="md:col-span-3 md:col-start-10"><FooterColumn title="Account" links={accounts}/></div>
   </div>
   <p className="mt-12 border-t border-white/10 pt-8 text-xs text-white/40">&copy; 2026 Nova Schola Hub.</p>
  </div>
 </footer>;
}
