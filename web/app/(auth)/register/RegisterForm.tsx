"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { AuthShell } from "../_components/AuthShell";

type Option={id:string|number;name:string};
export default function RegisterForm({initialRole}:{initialRole:"student"|"teacher"}){
  const [role,setRole]=useState<"student"|"teacher">(initialRole);
  const [departments,setDepartments]=useState<Option[]>([]),[sections,setSections]=useState<Option[]>([]);
  const [department,setDepartment]=useState(""),[section,setSection]=useState("");
  const [fullName,setFullName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
  const [error,setError]=useState(""),[success,setSuccess]=useState(""),[pending,setPending]=useState(false),[loading,setLoading]=useState(false);
  useEffect(()=>{let cancelled=false;fetch("/api/auth/departments").then(async r=>{if(!r.ok)throw new Error("Unable to load departments.");return r.json();}).then(d=>{if(!cancelled)setDepartments(d.departments??[]);}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[]);
  useEffect(()=>{
    if(!department || role!=="student")return;
    let cancelled=false;
    fetch("/api/auth/sections?department_id="+encodeURIComponent(department)).then(async r=>{if(!r.ok)throw new Error("Unable to load sections.");return r.json();}).then(d=>{if(!cancelled)setSections(d.sections??[]);}).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[department,role]);
  function chooseDepartment(value:string){setDepartment(value);setSection("");setSections([]);setLoading(Boolean(value)&&role==="student");}
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");
    if(password!==confirm){setError("Passwords do not match.");return;}
    setPending(true);
    try{
      const response=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role,full_name:fullName.trim(),email:email.trim(),password,department_id:department,section_id:role==="student"?section:null})});
      const data=await response.json();if(!response.ok)throw new Error(data.message??"Registration failed.");
      setSuccess(data.message);
    }catch(e){setError(e instanceof Error?e.message:"Registration failed.");}finally{setPending(false);}
  }
  return <AuthShell eyebrow="Create account" statement="Join Nova Schola Hub." mobileTitle="Create account" support="Use your official Nova Schola Tanauan email.">
    <h1 className="tokens-heading-2">Create your account</h1><p className="mt-4" style={{color:"var(--color-muted)"}}>Choose your role and use your official school email.</p>
    {success?<div className="mt-6"><p role="status">{success}</p><Link href="/login" className="tokens-btn tokens-btn-primary mt-4">Log in</Link></div>:
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block"><span className="label-token">Account type</span><select aria-label="Account type" className="input-token" value={role} onChange={e=>{const next=e.target.value as "student"|"teacher";setRole(next);setSection("");setSections([]);setLoading(Boolean(department)&&next==="student");}}><option value="student">Student</option><option value="teacher">Teacher</option></select></label>
      <p className="registration-note" role="status">{role==="student"?"Student email: @my.nst.edu.ph":"Teacher email: @tr.nst.edu.ph"}</p><label className="block"><span className="label-token">Full name</span><input className="input-token" required maxLength={100} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)}/></label>
      <label className="block"><span className="label-token">Email</span><input className="input-token" type="email" required autoComplete="email" placeholder={role==="student"?"you@my.nst.edu.ph":"you@tr.nst.edu.ph"} value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="block"><span className="label-token">Department</span><select aria-label="Department" className="input-token" required value={department} onChange={e=>chooseDepartment(e.target.value)}><option value="">Select department</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      {role==="student"&&<label className="block"><span className="label-token">Section</span><select aria-label="Section" className="input-token" required disabled={!department||loading} value={section} onChange={e=>setSection(e.target.value)}><option value="">{loading?"Loading sections…":"Select section"}</option>{sections.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>{department&&!loading&&sections.length===0&&<p className="tokens-small mt-2">No sections are assigned yet. Contact the Administrator.</p>}</label>}
      <label className="block"><span className="label-token">Password</span><input className="input-token" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <label className="block"><span className="label-token">Confirm password</span><input className="input-token" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      {error&&<p role="alert" style={{color:"var(--color-danger)"}}>{error}</p>}
      <button className="tokens-btn tokens-btn-primary w-full" disabled={pending||loading}>{pending?"Creating account…":"Create account"}</button>
      <p className="tokens-small"><Link href="/login">Already registered? Log in</Link></p>
    </form>}
  </AuthShell>;
}
