import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: '#faf9f6' }}>
      <AppSidebar />
      <div className="min-w-0 flex-1 flex flex-col">
        <AppTopbar />
        <main style={{ flex: 1, padding: '36px 40px 48px', maxWidth: 1400 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
