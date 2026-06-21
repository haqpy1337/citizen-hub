import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar username={session.username} />
      <main className="flex-1 min-w-0 px-6 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
