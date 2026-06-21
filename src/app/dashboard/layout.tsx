import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar username={session.username} />
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 px-6 py-8 max-w-5xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
