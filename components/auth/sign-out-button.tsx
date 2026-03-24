"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signOut();

      if (authError) {
        setError(authError.message);
        return;
      }

      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="stack signout-button" style={{ gap: "0.6rem" }}>
      <button className="button button-ghost" disabled={isPending} onClick={handleSignOut} type="button">
        {isPending ? "Signing out..." : "Sign out"}
      </button>

      {error ? (
        <div className="notice notice-error">
          <strong>Sign-out failed</strong>
          {error}
        </div>
      ) : null}
    </div>
  );
}
