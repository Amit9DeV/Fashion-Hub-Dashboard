import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { NavigationProgressBar } from "@/components/layout/NavigationProgressBar";

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#faf9f6' }}>
      <Suspense fallback={null}>
        <NavigationProgressBar />
      </Suspense>
      <AppSidebar user={user} />
      <div className="min-w-0 flex-1 flex flex-col">
        <AppTopbar user={user} />
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 lg:px-10 lg:py-8 mx-auto w-full max-w-[1400px] animate-page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
