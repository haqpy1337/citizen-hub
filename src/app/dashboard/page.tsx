import { getSession } from "@/lib/auth";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardOverview() {
  const session = await getSession();
  return <DashboardClient username={session!.username} />;
}
