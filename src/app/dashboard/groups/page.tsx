import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import GroupsClient from "./GroupsClient";

export default async function GroupsPage() {
  const session = await getSession();

  const memberships = await prisma.groupMembership.findMany({
    where: { userId: session!.userId },
    include: {
      group: {
        include: {
          creator: { select: { id: true, username: true } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { group: { createdAt: "desc" } },
  });

  const groups = memberships.map((m) => ({
    ...m.group,
    createdAt: m.group.createdAt.toISOString(),
    role: m.role,
    _count: m.group._count,
  }));

  return <GroupsClient initialGroups={groups} />;
}
