import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Monitor, Mail } from "lucide-react";
import { serverFetch } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/url";
import HomeNav from "./_components/home/HomeNav";
import Hero from "./_components/home/Hero";
import Footer from "./_components/home/Footer";
import { SectionHeader } from "./_components/ui/Primitives";
import { NstGalleryEmpty } from "./_components/ui/NstGalleryEmpty";
import { nstImages } from "@/lib/nst-images";
type Announcement = { id: string; title: string; content: string; created_at?: string; publish_at?: string };
type Media = { id: string; file_url: string; caption?: string };
export default async function HomePage() {
  const [announcements, gallery] = await Promise.all([
    serverFetch("/api/announcements/public?limit=6").catch(() => ({ announcements: [] })),
    serverFetch("/api/gallery?limit=6").catch(() => ({ media: [] })),
  ]) as [{ announcements: Announcement[] }, { media: Media[] }];
  return <div className="min-h-screen"><HomeNav /><main id="main-content" tabIndex={-1}>
    <Hero />
    <section className="home-section tokens-container" id="latest" aria-labelledby="latest-title">
      <SectionHeader id="latest-title" eyebrow="The school bulletin" title="Good to know." description="The latest General Announcements for our school community." action={<Link href="/announcements" className="tokens-btn tokens-btn-secondary">All announcements <ArrowUpRight size={18} aria-hidden="true" /></Link>} />
      {announcements.announcements.length === 0 ? <div className="empty-panel"><p className="tokens-heading-3">A little quiet here.</p><p>Published school announcements will appear here. Check back soon.</p></div> : <div className="bulletin-grid">{announcements.announcements.map((a, index) => <article key={a.id} className={`bulletin-card ${index === 0 ? "bulletin-feature" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="eyebrow">General</span>{(a.publish_at || a.created_at) && <time className="tokens-small" dateTime={a.publish_at || a.created_at}>{new Date((a.publish_at || a.created_at)!).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}</time>}</div>
        <h3>{a.title}</h3><p className="line-clamp-3 whitespace-pre-wrap">{a.content}</p><details className="bulletin-details"><summary>Read More <span aria-hidden="true">↗</span></summary><p className="whitespace-pre-wrap">{a.content}</p></details>
      </article>)}</div>}
    </section>
    <section className="home-dark home-section" id="gallery-preview" aria-labelledby="gallery-title"><div className="tokens-container">
      <SectionHeader id="gallery-title" eyebrow="Beyond the classroom" title="Our school, in moments." description="Explore approved photos from events and everyday school life." action={<Link href="/gallery" className="tokens-btn tokens-btn-accent">Explore Gallery <ArrowUpRight size={18} aria-hidden="true" /></Link>} />
      {gallery.media.length === 0 ? <NstGalleryEmpty message="Memories are on their way." /> : <div className="home-gallery">{gallery.media.map(m => <Link key={m.id} href="/gallery" className="gallery-story"><figure><img src={resolveMediaUrl(m.file_url)} alt={m.caption || "Approved school event"} loading="lazy" decoding="async" /><figcaption>{m.caption || "School life at Nova Schola"}<ArrowUpRight size={20} aria-hidden="true" /></figcaption></figure></Link>)}</div>}
    </div></section>
    <section className="home-section tokens-container" id="how-to-use" aria-labelledby="how-title">
      <SectionHeader id="how-title" eyebrow="Made for our community" title="The right update. The right people." description="School communication, with a clear place for every message." />
      <div className="nst-purpose-visual"><figure><Image src={nstImages.learning.src} alt={nstImages.learning.alt} sizes="(max-width: 767px) 100vw, 55vw" /><figcaption className="tokens-small">Learning together at Nova Schola.</figcaption></figure><div><p className="eyebrow">A place to belong</p><h3 className="tokens-heading-2">Connected in class.<br />Connected beyond it.</h3><p>From Junior High and Senior High to College, the hub keeps our school community close to the updates that matter.</p></div></div>
      <div className="purpose-grid">{[{ title: "General", copy: "School-wide updates, open to everyone on the homepage and TV display." }, { title: "Department", copy: "Relevant updates for your College, Senior High School, or Junior High School department." }, { title: "Class", copy: "Teacher announcements shared with selected sections and students." }].map((item, index) => <article className="purpose-card" key={item.title}><span className="purpose-index">0{index + 1}</span><h3 className="tokens-heading-3">{item.title}</h3><p>{item.copy}</p></article>)}</div>
      <div className="delivery-strip"><Mail size={28} aria-hidden="true" /><div><h3 className="font-bold">Connected to your NST Gmail</h3><p>Announcement notifications reach your official school email. Students use @my.nst.edu.ph; teachers use @tr.nst.edu.ph.</p></div><Link href="/register" className="tokens-btn tokens-btn-secondary">Join the hub <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
    </section>
    <section className="tv-callout nst-tv-callout" aria-labelledby="tv-title"><div className="tokens-container"><figure><Image src={nstImages.community.src} alt={nstImages.community.alt} sizes="(max-width: 1023px) 100vw, 50vw" /></figure><div className="nst-tv-copy"><Monitor size={40} strokeWidth={1.5} aria-hidden="true" /><p className="eyebrow">On the big screen</p><h2 id="tv-title" className="tokens-heading-2">Keep the whole campus in the loop.</h2><p>Published General Announcements, ready for school and classroom displays.</p><Link href="/tv" className="tokens-btn tokens-btn-accent">Open TV Announcement <ArrowUpRight size={20} aria-hidden="true" /></Link></div></div></section>
  </main><Footer /></div>;
}
