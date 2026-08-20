import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <div className="flex min-h-screen"><AppSidebar user={user} /><div className="min-w-0 flex-1"><AppTopbar user={user} /><main className="p-5 sm:p-8">{children}</main></div></div>;
}
