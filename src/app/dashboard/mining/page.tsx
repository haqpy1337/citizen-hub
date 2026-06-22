import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import MiningClient from "./MiningClient";

export default async function MiningPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <MiningClient />;
}
