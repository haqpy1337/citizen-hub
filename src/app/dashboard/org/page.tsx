import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CreateOrgForm from "./CreateOrgForm";

export default async function OrgPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.orgMembership.findFirst({
    where: { userId: session.userId },
    select: { orgId: true },
  });

  if (membership) redirect(`/dashboard/org/${membership.orgId}`);

  return (
    <div className="mx-auto max-w-md py-16 px-4">
      <h1 className="font-display text-2xl font-bold mb-2">Org Dashboard</h1>
      <p className="text-muted text-sm mb-8">
        Erstelle eine Org oder tritt einer über einen Einladungslink bei.
      </p>
      <CreateOrgForm />
    </div>
  );
}
