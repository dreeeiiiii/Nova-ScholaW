import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
type Variant = "primary" | "secondary" | "brand" | "accent";
export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`tokens-btn tokens-btn-${variant} ${className}`} {...props} />;
}
export function ButtonLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: Variant; className?: string }) {
  return <Link href={href} className={`tokens-btn tokens-btn-${variant} ${className}`}>{children}</Link>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`hub-card ${className}`}>{children}</div>; }
export function Badge({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "success" | "warning" | "danger" | "info" }) { return <span className={`hub-badge hub-badge-${tone}`}>{children}</span>; }
export function SectionHeader({ id, eyebrow, title, description, action }: { id: string; eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-header"><div><p className="eyebrow">{eyebrow}</p><h2 id={id} className="tokens-heading-2">{title}</h2>{description && <p className="section-description">{description}</p>}</div>{action}</div>;
}

