import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#faf9f6' }}>
      <AppSidebar />
      <div className="min-w-0 flex-1 flex flex-col">
        <AppTopbar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:px-10 lg:py-8 mx-auto w-full max-w-[1400px]">
          {children}
        </main>
      </div>
    </div>
  );
}
