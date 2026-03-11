import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300 print:ml-0 min-w-0">
        <Header title={title} description={description} />
        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
