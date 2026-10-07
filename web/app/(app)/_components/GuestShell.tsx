import HomeNav from "../../_components/home/HomeNav";
export default function GuestShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full"><div data-testid="guest-header"><HomeNav /></div><main id="main-content" tabIndex={-1} className="app-main mx-auto w-full max-w-[1550px]">{children}</main></div>;
}
