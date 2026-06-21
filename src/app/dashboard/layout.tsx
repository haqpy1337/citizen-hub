import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { avatarUrl: true },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar username={session.username} avatarUrl={user?.avatarUrl ?? null} />
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 px-6 py-8 max-w-5xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
