import RegisterForm from "./RegisterForm";
export default async function RegisterPage({searchParams}:{searchParams:Promise<{role?:string}>}){
 const sp=await searchParams;return <RegisterForm initialRole={sp.role==="teacher"?"teacher":"student"}/>;
}
