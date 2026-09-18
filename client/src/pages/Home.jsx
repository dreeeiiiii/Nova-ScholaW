import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Users,
  Image,
  ShieldCheck,
  Tv,
  Search,
  GraduationCap,
  BookOpen,
  Menu,
  X,
  Check,
  XIcon,
} from 'lucide-react';

const AmbientBlobs = () => {
  const prefersReduced = useReducedMotion();
  const dur = prefersReduced ? 0 : 22;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"
        animate={
          prefersReduced
            ? {}
            : {
                x: [0, 120, -60, 80, 0],
                y: [0, -80, 60, -40, 0],
              }
        }
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-[120px]"
        animate={
          prefersReduced
            ? {}
            : {
                x: [0, -100, 80, -40, 0],
                y: [0, 60, -80, 40, 0],
              }
        }
        transition={{ duration: dur + 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll(); // sync on mount in case page loads mid-scroll
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile/tablet menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Close the menu if the viewport grows past the desktop breakpoint
  useEffect(() => {
    if (!mobileOpen) return;
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mobileOpen]);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Roles', href: '#roles' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Gallery', href: '/gallery' },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-3 sm:top-4 sm:px-4">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`pointer-events-auto w-full max-w-5xl overflow-hidden transition-all duration-300 ${
          mobileOpen ? 'rounded-clay' : 'rounded-clay-pill'
        } ${
          scrolled
            ? 'bg-surface/90 backdrop-blur-xl shadow-clay'
            : 'bg-surface/70 backdrop-blur-md shadow-clay-sm'
        }`}
      >
        <nav className="relative mx-auto flex items-center gap-2 px-3 py-2.5 sm:px-5 sm:py-3">
          {/* Left: Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-clay-sm bg-primary font-heading text-xs font-extrabold text-white sm:h-10 sm:w-10 sm:text-sm">
              NSH
            </div>
            <span className="hidden font-heading text-base font-bold text-text-main sm:block sm:text-lg">
              Nova Schola Hub
            </span>
          </Link>

          {/* Center links — only at lg+ so tablets get the drawer instead */}
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-clay-pill px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-primary/10 hover:text-primary xl:px-4"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Action buttons — only at lg+ */}
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Link
              to="/login"
              className="clay-btn-sm rounded-clay-pill bg-surface px-4 py-2.5 text-sm font-semibold text-text-main transition-all hover:shadow-clay-hover xl:px-5"
            >
              Sign In
            </Link>
            <Link
              to="/gallery"
              className="clay-btn rounded-clay-pill bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-clay-hover xl:px-5"
            >
              View Gallery
            </Link>
          </div>

          {/* Mobile + Tablet: Hamburger */}
<button
type="button"
onClick={() => setMobileOpen((v) => !v)}
className="clay-btn-sm relative ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-clay-pill bg-surface text-text-main transition-transform active:scale-95 lg:hidden"
aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
aria-expanded={mobileOpen}
aria-controls="mobile-menu"
>
<motion.span
  animate={{ rotate: mobileOpen ? 90 : 0, opacity: mobileOpen ? 0 : 1 }}
  transition={{ duration: 0.18, ease: 'easeOut' }}
  className="absolute"
>
  <Menu size={18} />
</motion.span>
<motion.span
  animate={{ rotate: mobileOpen ? 0 : -90, opacity: mobileOpen ? 1 : 0 }}
  transition={{ duration: 0.18, ease: 'easeOut' }}
  className="absolute"
>
  <X size={18} />
</motion.span>
</button>
        </nav>

<AnimatePresence>
{mobileOpen && (
  <motion.div
    id="mobile-menu"
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className="overflow-hidden lg:hidden"
  >
    {/* Inset top divider — stays inside the rounded corners */}
    <div className="mx-3 h-px bg-primary/10 sm:mx-5" />

    <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto px-3 pb-4 pt-3 sm:px-5">
      <div className="flex flex-col gap-1">
        {navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className="flex min-h-[44px] items-center rounded-clay-pill px-4 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="my-3 h-px bg-primary/10" />

      <div className="flex flex-col gap-2">
        <Link
          to="/login"
          onClick={() => setMobileOpen(false)}
          className="clay-btn-sm flex min-h-[44px] items-center justify-center rounded-clay-pill bg-surface px-4 py-2.5 text-center text-sm font-semibold text-text-main"
        >
          Sign In
        </Link>
        <Link
          to="/gallery"
          onClick={() => setMobileOpen(false)}
          className="clay-btn flex min-h-[44px] items-center justify-center rounded-clay-pill bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white"
        >
          View Gallery
        </Link>
      </div>
    </div>
  </motion.div>
)}
</AnimatePresence>
      </motion.header>
    </div>
  );
};

const features = [
  {
    icon: Megaphone,
    title: 'General Announcements',
    desc: 'School-wide updates on the website and TV screens around campus.',
  },
  {
    icon: Users,
    title: 'Class Announcements',
    desc: 'Private announcements targeted to specific sections, courses, or individual students.',
  },
  {
    icon: Image,
    title: 'Event Gallery',
    desc: 'Photos and videos from school events in one organized, searchable archive.',
  },
  {
    icon: ShieldCheck,
    title: 'Admin Moderation',
    desc: 'Every upload reviewed before publishing. Content stays professional.',
  },
  {
    icon: Tv,
    title: 'TV Display Mode',
    desc: 'Full-screen slideshow for school hallways and lobbies.',
  },
  {
    icon: Search,
    title: 'Search & Filters',
    desc: 'Find any announcement or photo by category, date, or keyword.',
  },
];

const roles = [
  {
    icon: GraduationCap,
    accent: 'bg-primary',
    border: 'border-primary/30',
    title: 'Student',
    desc: 'See only what matters to you. General announcements plus class updates for your section and course. Upload event photos. Browse the public gallery.',
  },
  {
    icon: BookOpen,
    accent: 'bg-secondary',
    border: 'border-secondary/30',
    title: 'Teacher',
    desc: 'Post general or class announcements. Target multiple sections, courses, or individual students in one go. Upload and share classroom moments.',
  },
  {
    icon: ShieldCheck,
    accent: 'bg-success',
    border: 'border-success/30',
    title: 'Admin',
    desc: 'Manage users, moderate gallery uploads, control categories, view audit logs. Full visibility and control over the platform.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Sign In with NST Email',
    desc: 'Every account is created by the school admin. No social media logins.',
  },
  {
    num: '02',
    title: 'See What\'s Relevant',
    desc: 'Students see general plus targeted class announcements. Teachers see everything.',
  },
  {
    num: '03',
    title: 'Create or Upload',
    desc: 'Post announcements with multi-target audience selection. Upload photos and videos.',
  },
  {
    num: '04',
    title: 'Moderate & Archive',
    desc: 'Admins approve content. Everything is logged for accountability.',
  },
];

const problems = [
  'Fragmented communication channels',
  'Missed announcements',
  'Lost event photos',
  'No centralized platform',
];

const solutions = [
  'One centralized hub',
  'Role-based targeting',
  'Moderated gallery',
  'Professional and searchable',
];

const SectionTitle = ({ children, sub }) => (
  <div className="mb-12 text-center">
    <h2 className="font-heading text-3xl font-extrabold text-text-main sm:text-4xl">{children}</h2>
    {sub && <p className="mx-auto mt-3 max-w-2xl text-base text-text-muted">{sub}</p>}
  </div>
);

const Home = () => {
  const { isAuthenticated } = useAuth();
  const prefersReduced = useReducedMotion();

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-base font-body text-text-main">
      <Navbar />

      {/* HERO */}
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 pt-24 pb-16 sm:px-6">
        <AmbientBlobs />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="font-heading text-4xl font-extrabold leading-tight text-text-main sm:text-5xl lg:text-6xl"
            >
              One Hub. Every Announcement. Every Memory.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="mt-5 max-w-xl text-lg leading-relaxed text-text-muted"
            >
              Nova Schola Hub replaces scattered Facebook posts, physical bulletin boards, and lost
              photos with one centralized digital bulletin board and event gallery for Nova Schola
              Tanauan.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/login"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="clay-btn rounded-clay-pill bg-primary px-7 py-3 text-sm font-bold text-white shadow-clay"
              >
                Sign In
              </Link>
              <Link
                to="/gallery"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="clay-btn rounded-clay-pill bg-surface px-7 py-3 text-sm font-bold text-text-main shadow-clay"
              >
                Browse Public Gallery
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.35, ease: 'easeOut' }}
            className="relative hidden min-w-0 lg:block"
          >
            <div className="clay-card overflow-hidden rounded-clay p-6">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-danger" />
                <div className="h-3 w-3 rounded-full bg-warning" />
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="ml-2 text-xs font-medium text-text-muted">Announcement Feed</span>
              </div>
              <div className="space-y-3">
                {[
                  { t: 'Enrollment Period Extended', d: 'The enrollment deadline has been moved to March 15.', c: 'bg-primary/10 text-primary' },
                  { t: 'Science Fair 2026', d: 'All students are invited to participate.', c: 'bg-secondary/10 text-secondary' },
                  { t: 'Midterm Schedule Released', d: 'Check your section for the updated schedule.', c: 'bg-success/10 text-success' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.12, duration: 0.4 }}
                    className="clay-card-sm rounded-clay p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-clay-pill px-2.5 py-0.5 text-[10px] font-bold uppercase ${item.c}`}>
                        General
                      </span>
                      <span className="text-[10px] text-text-muted">2h ago</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-text-main">{item.t}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{item.d}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            {/* Floating badges — contained inside overflow-hidden parent */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute -top-3 right-4 clay-badge rounded-clay-pill px-3.5 py-1.5 text-[11px] font-bold text-text-main shadow-clay-sm"
            >
              TV Display
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.95, type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute -bottom-3 left-4 clay-badge rounded-clay-pill px-3.5 py-1.5 text-[11px] font-bold text-text-main shadow-clay-sm"
            >
              Multi-target
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1, type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute top-1/2 -right-2 clay-badge rounded-clay-pill px-3.5 py-1.5 text-[11px] font-bold text-text-main shadow-clay-sm"
            >
              Moderated Gallery
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative overflow-hidden px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionTitle sub="Everything your school needs in one place.">What It Does</SectionTitle>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.08, duration: 0.45, ease: 'easeOut' }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  className="clay-card flex flex-col rounded-clay p-6 transition-shadow hover:shadow-clay-hover"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-clay-sm bg-primary/10">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-text-main">{f.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="relative overflow-hidden px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionTitle sub="A tailored experience for every member of the school.">Built for Every Role</SectionTitle>
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            {roles.map((r, i) => {
              const Icon = r.icon;
              return (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.1, duration: 0.45, ease: 'easeOut' }}
                  whileHover={{ scale: 1.02 }}
                  className={`clay-card flex flex-col overflow-hidden rounded-clay ${r.border}`}
                >
                  <div className={`h-2 ${r.accent}`} />
                  <div className="flex flex-1 flex-col p-6">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-clay-sm ${r.accent}/10`}>
                      <Icon size={24} className={r.accent === 'bg-primary' ? 'text-primary' : r.accent === 'bg-secondary' ? 'text-secondary' : 'text-success'} />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-text-main">{r.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">{r.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative overflow-hidden px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionTitle sub="From sign-in to moderation in four simple steps.">How It Works</SectionTitle>

          {/* Desktop: horizontal */}
          <div className="relative hidden md:block">
            {/* Background track */}
            <div className="absolute left-[calc(10%-8px)] right-[calc(10%-8px)] top-10 h-0.5 bg-primary/20" />
            {/* Animated fill */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ transformOrigin: 'left' }}
              className="absolute left-[calc(10%-8px)] top-10 h-0.5 w-[80%] bg-primary"
            />
            <div className="grid grid-cols-4 gap-6">
              {steps.map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.45 }}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative z-10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-clay bg-surface text-2xl font-extrabold text-primary shadow-clay">
                    {s.num}
                  </div>
                  <h3 className="font-heading text-sm font-bold text-text-main">{s.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile: vertical */}
          <div className="space-y-6 md:hidden">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex gap-4"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-clay bg-surface text-lg font-extrabold text-primary shadow-clay">
                  {s.num}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-sm font-bold text-text-main">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM vs SOLUTION */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionTitle>Why Nova Schola Hub</SectionTitle>
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col rounded-clay bg-danger/15 p-6"
            >
              <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-danger">The Problem</h3>
              <ul className="flex-1 space-y-3">
                {problems.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                    className="flex items-start gap-2.5"
                  >
                    <XIcon size={16} className="mt-0.5 shrink-0 text-danger" />
                    <span className="text-sm text-text-main">{p}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col rounded-clay bg-success/15 p-6"
            >
              <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wide text-success">The Solution</h3>
              <ul className="flex-1 space-y-3">
                {solutions.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                    className="flex items-start gap-2.5"
                  >
                    <Check size={16} className="mt-0.5 shrink-0 text-success" />
                    <span className="text-sm text-text-main">{s}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-clay bg-surface p-10 text-center shadow-clay sm:p-14"
          >
            <div className="pointer-events-none absolute inset-0 rounded-clay bg-primary/5" />
            <h2 className="relative font-heading text-2xl font-extrabold text-text-main sm:text-3xl">
              Ready to see it in action?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-text-muted">
              Sign in with your school credentials or open the TV display for a live slideshow.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="clay-btn rounded-clay-pill bg-primary px-7 py-3 text-sm font-bold text-white shadow-clay"
              >
                Sign In
              </Link>
              <Link
                to="/tv"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="clay-btn rounded-clay-pill bg-surface px-7 py-3 text-sm font-bold text-text-main shadow-clay"
              >
                Open TV Display
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-primary/10 px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h4 className="mb-3 font-heading text-sm font-bold text-text-main">About</h4>
            <p className="text-xs leading-relaxed text-text-muted">
              Nova Schola Tanauan&apos;s centralized digital bulletin board and event gallery.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm font-bold text-text-main">System</h4>
            <ul className="space-y-2 text-xs text-text-muted">
              <li><a href="#features" className="hover:text-primary">Features</a></li>
              <li><a href="#roles" className="hover:text-primary">Roles</a></li>
              <li><Link to="/tv" className="hover:text-primary">TV Display</Link></li>
              <li><Link to="/gallery" className="hover:text-primary">Gallery</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm font-bold text-text-main">Resources</h4>
            <ul className="space-y-2 text-xs text-text-muted">
              <li><span className="cursor-default">Documentation</span></li>
              <li><span className="cursor-default">GitHub</span></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-heading text-sm font-bold text-text-main">Contact</h4>
            <ul className="space-y-2 text-xs text-text-muted">
              <li><span className="cursor-default">Nova Schola Tanauan</span></li>
              <li><span className="cursor-default">support@novaschola.edu.ph</span></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-primary/10 pt-6 text-center text-xs text-text-muted">
          &copy; {new Date().getFullYear()} Nova Schola Hub. Built for Nova Schola Tanauan.
        </div>
      </footer>
    </div>
  );
};

export default Home;
