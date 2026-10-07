import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "../_components/PageHeader";
import { Badge, Card } from "../../_components/ui/Primitives";
import ChangePasswordForm from "./ChangePasswordForm";
export default async function AccountPage() {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  return <div><PageHeader eyebrow="Your profile" title="Account / Change Password" description="Your school identity and account security, in one place." />
    <div className="account-grid"><Card><UserRound size={36} aria-hidden="true" /><h2 className="tokens-heading-3 my-4">{user.full_name}</h2><Badge><span className="capitalize">{user.role}</span></Badge>
      <dl className="account-details mt-6"><div><dt>School email</dt><dd>{user.email}</dd></div>{user.department_name && <div><dt>Department</dt><dd>{user.department_name}</dd></div>}{user.section_name && <div><dt>Section</dt><dd>{user.section_name}</dd></div>}<div><dt>School</dt><dd>Nova Schola Tanauan</dd></div></dl>
    </Card><Card><h2 className="tokens-heading-3 mb-4">Change password</h2><ChangePasswordForm /></Card></div>
  </div>;
}
