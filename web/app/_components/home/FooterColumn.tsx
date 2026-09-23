type FooterColumnProps = {
  title: string;
  links: { href: string; label: string }[];
};

/** Shared footer link column — dark-tone underline links. */
export function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <nav aria-label={`Footer — ${title}`}>
      <span
        className="tokens-eyebrow mb-5 block"
        style={{ color: "rgba(255, 255, 255, 0.45)" }}
      >
        {title}
      </span>
      <ul className="flex flex-col gap-3 text-sm md:text-base">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <a
              href={link.href}
              className="group relative inline-flex min-h-[32px] items-center text-[rgba(255,255,255,0.65)] transition-colors duration-300 hover:text-[var(--color-accent)] motion-reduce:transition-none"
            >
              <span>{link.label}</span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
                style={{ backgroundColor: "var(--color-accent)" }}
              />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
