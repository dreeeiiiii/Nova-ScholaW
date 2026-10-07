"use client";
import { useState } from "react";
import Link from "next/link";
export default function ChangePasswordForm() {
 const [error,setError]=useState(""),[success,setSuccess]=useState(false),[pending,setPending]=useState(false);
 async function submit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); setError(""); const form=e.currentTarget; const data=new FormData(form);
  const current=String(data.get("current_password")),next=String(data.get("new_password"));
  if(next!==data.get("confirm_password")){setError("New passwords do not match.");return;}
  if(next.length<8||new TextEncoder().encode(next).length>72){setError("Use at least 8 characters and at most 72 UTF-8 bytes.");return;}
  setPending(true);
  try {const r=await fetch("/api/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({current_password:current,new_password:next})});
   const result=await r.json(); if(!r.ok)throw new Error(result.message||"Password change failed."); form.reset();setSuccess(true);
  }catch(e){setError(e instanceof Error?e.message:"Password change failed.");}finally{setPending(false);}
 }
 if(success)return <div role="status"><p>Password changed. Your sessions have been invalidated.</p><Link href="/login" className="tokens-btn tokens-btn-primary mt-4">Sign in again</Link></div>;
 return <form onSubmit={submit} className="space-y-4">{error&&<p role="alert">{error}</p>}
  <label className="block">Current password<input className="input-token" name="current_password" type="password" autoComplete="current-password" required /></label>
  <label className="block">New password<input className="input-token" name="new_password" type="password" autoComplete="new-password" minLength={8} required /></label>
  <label className="block">Confirm new password<input className="input-token" name="confirm_password" type="password" autoComplete="new-password" required /></label>
  <p>Use at least 8 characters and at most 72 UTF-8 bytes. You will sign in again after changing your password.</p>
  <button className="tokens-btn tokens-btn-primary" disabled={pending}>{pending?"Saving?":"Change Password"}</button>
 </form>;
}
