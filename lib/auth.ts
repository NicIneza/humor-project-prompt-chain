import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { ProfileSummary } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export async function getSessionContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError && !isAuthSessionMissingError(authError)) {
    throw authError;
  }

  if (!user || isAuthSessionMissingError(authError)) {
    return {
      isAdmin: false,
      profile: null,
      supabase,
      user: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_superadmin, is_matrix_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const typedProfile = (profile as ProfileSummary | null) ?? null;

  const isAdmin = Boolean(typedProfile?.is_superadmin || typedProfile?.is_matrix_admin);

  return {
    isAdmin,
    profile: typedProfile,
    supabase,
    user,
  };
}

export async function requireAdminContext() {
  const context = await getSessionContext();

  if (!context.user) {
    redirect("/login");
  }

  if (!context.isAdmin) {
    redirect("/unauthorized");
  }

  return context;
}
