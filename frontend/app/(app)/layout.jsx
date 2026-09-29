import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#faf9f6' }}>
      <AppSidebar user={user} />
      <div className="min-w-0 flex-1 flex flex-col">
        <AppTopbar user={user} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:px-10 lg:py-8 mx-auto w-full max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
