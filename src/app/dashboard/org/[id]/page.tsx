import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OrgDashboard from "./OrgDashboard";

export default async function OrgIdPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: params.id, userId: session.userId } },
  });
  if (!membership) redirect("/dashboard/org");

  const org = await prisma.org.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { id: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      },
      groups: {
        include: {
          members: { include: { user: { select: { id: true, username: true } } } },
          _count: { select: { jobs: true } },
        },
      },
    },
  });
  if (!org) redirect("/dashboard/org");

  return (
    <OrgDashboard
      org={org as any}
      myRole={membership.role}
      myUserId={session.userId}
      myUsername={session.username}
    />
  );
}
