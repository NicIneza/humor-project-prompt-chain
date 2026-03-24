"use client";

import { useState, useTransition } from "react";

import { getErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton({ disabled = false }: { disabled?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSignIn() {
    startTransition(async () => {
      setError(null);

      try {
        const supabase = createClient();
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });

        if (authError) {
          setError(authError.message);
        }
      } catch (caughtError) {
        setError(getErrorMessage(caughtError));
      }
    });
  }

  return (
    <div className="stack" style={{ gap: "0.7rem" }}>
      <button
        className="button google-button"
        disabled={disabled || isPending}
        onClick={handleSignIn}
        type="button"
      >
        {isPending ? "Redirecting to Google..." : "Continue with Google"}
      </button>

      {error ? (
        <div className="notice notice-error">
          <strong>OAuth request failed</strong>
          {error}
        </div>
      ) : null}
    </div>
  );
}
