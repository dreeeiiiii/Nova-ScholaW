import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { serverFetch } from "@/lib/api";
import Sections from "./Sections";
import { PageHeader } from "../../_components/PageHeader";
type Department={id:string|number;name:string};
export default async function DepartmentManagementPage(){
 const user=await getCurrentUser();if(!user)redirect("/login");if(user.role!=="admin")redirect("/dashboard");
 let departments:Department[]=[],error="";
 try{({departments}=await serverFetch("/api/departments") as {departments:Department[]});}catch{error="Cannot load departments. Please try again.";}
 return <div><PageHeader eyebrow="Administration" title="Department Management" description="Manage College, Senior High School, and Junior High School. Unassigned accounts await Administrator correction."/>
 {error&&<p role="alert" className="my-4 rounded-lg p-4" style={{backgroundColor:"var(--color-danger-bg)",color:"var(--color-danger)"}}>{error}</p>}
 {!error&&departments.length===0&&<p role="status" className="my-4">No departments available. Contact the Administrator.</p>}
 <Link href="/admin/users" className="tokens-btn tokens-btn-secondary">All accounts / Correct assignments</Link>
 <div className="management-grid mt-8">{departments.map((d,index)=><section key={d.id} className="management-card"><p className="eyebrow" style={{color:"var(--color-primary)"}}>Department 0{index+1}</p><h2 className="tokens-heading-3">{d.name}</h2>
 <div className="management-actions">{["student","teacher"].map(role=><Link key={role} className="tokens-btn tokens-btn-secondary" href={`/admin/users?department_id=${d.id}&role=${role}`}>{role==="student"?"Students":"Teachers"}</Link>)}
 <Link className="tokens-btn tokens-btn-primary" href={`/announcements/create?type=department&department_id=${d.id}`}>Create Department Announcement</Link></div>
 <Sections departmentId={String(d.id)} /></section>)}</div></div>;
}
