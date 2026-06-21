import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session!.userId },
    select: { id: true, username: true, avatarUrl: true, createdAt: true },
  });

  return (
    <ProfileClient
      user={{
        ...user!,
        createdAt: user!.createdAt.toISOString(),
      }}
    />
  );
}
