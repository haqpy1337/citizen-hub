import { getSession } from "@/lib/auth";
import DashboardClient from "@/components/DashboardClient";
import ActiveJobsSidebar from "@/components/ActiveJobsSidebar";

export default async function DashboardOverview() {
  const session = await getSession();
  return (
    <div className="flex gap-0 min-w-0">
      <div className="flex-1 min-w-0">
        <DashboardClient username={session!.username} />
      </div>
      <ActiveJobsSidebar userId={session!.userId} />
    </div>
  );
}
