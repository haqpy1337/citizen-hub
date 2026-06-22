import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import { LanguageProvider } from "@/components/LanguageProvider";

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
    <LanguageProvider>
      <div className="flex flex-col lg:flex-row min-h-screen">
        <Sidebar username={session.username} avatarUrl={user?.avatarUrl ?? null} />
        <div className="flex flex-1 flex-col min-w-0">
          <main className="flex-1 px-4 py-5 sm:px-6 sm:py-8 max-w-5xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </LanguageProvider>
  );
}
