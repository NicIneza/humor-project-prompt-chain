import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const { user, isAdmin } = await getSessionContext();

  if (!user) {
    redirect("/login");
  }

  redirect(isAdmin ? "/dashboard" : "/unauthorized");
}
