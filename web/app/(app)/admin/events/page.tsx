import Link from "next/link";
import { redirect } from "next/navigation";
import { Images, ClipboardCheck, UploadCloud, Tags, ArrowUpRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "../../_components/PageHeader";
export default async function EventManagementPage() {
  const user = await getCurrentUser(); if (!user) redirect("/login"); if (user.role !== "admin") redirect("/dashboard");
  const workflows = [
    { href: "/admin/moderation", title: "Review uploads", description: "Review Pending, Approved, and Rejected images. Preview each submission before approving or rejecting it.", icon: ClipboardCheck },
    { href: "/gallery", title: "Approved gallery", description: "Explore the event images shared with the school community.", icon: Images },
    { href: "/gallery/upload", title: "Upload an image", description: "Add an approved school memory. JPEG, PNG, or WebP, up to 10 MB.", icon: UploadCloud },
    { href: "/admin/categories", title: "Manage categories", description: "Organize school events so the community can find its favorite moments.", icon: Tags },
  ];
  return <div><PageHeader eyebrow="Administration / Campus life" title="Event Management" description="A considered space for every school memory. Review, publish, and organize event images." /><div className="management-grid">{workflows.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="workflow-card"><Icon size={32} strokeWidth={1.5} aria-hidden="true" /><h2>{title}</h2><p>{description}</p><span className="mt-auto flex min-h-11 items-center gap-3 font-bold">Open <ArrowUpRight size={18} aria-hidden="true" /></span></Link>)}</div></div>;
}
