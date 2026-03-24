import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

function getMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isConfigured = isSupabaseConfigured();

  if (isConfigured) {
    const { user, isAdmin } = await getSessionContext();

    if (user) {
      redirect(isAdmin ? "/dashboard" : "/unauthorized");
    }
  }

  const message = getMessage(resolvedSearchParams?.message);

  return (
    <main className="page-shell">
      <section className="page-card login-shell">
        <div className="login-panel">
          <div className="stack" style={{ gap: "0.85rem" }}>
            <p className="eyebrow">Prompt Chain Studio</p>
            <h1 className="headline">Shape humor flavors before they hit the caption pipeline.</h1>
          </div>

          <section className="login-visual-panel" aria-hidden="true">
            <div className="login-flow-board">
              <div className="login-flow-orb login-flow-orb-a" />
              <div className="login-flow-orb login-flow-orb-b" />
              <div className="login-flow-ribbon login-flow-ribbon-a">
                <span className="login-flow-label">Flavor</span>
                <p className="login-flow-copy">dry campus chaos with a deadpan finish</p>
              </div>
              <div className="login-flow-ribbon login-flow-ribbon-b">
                <span className="login-flow-label">Step</span>
                <p className="login-flow-copy">
                  celebrity recognition {"->"} association map {"->"} caption draft
                </p>
              </div>
              <div className="login-flow-ribbon login-flow-ribbon-c">
                <span className="login-flow-label">Caption</span>
                <p className="login-flow-copy">dry enough to feel deliberate, sharp enough to feel earned</p>
              </div>
              <div className="login-flow-ribbon login-flow-ribbon-d">
                <span className="login-flow-label">Test Run</span>
                <p className="login-flow-copy">study images move through the chain and come back ready for review</p>
              </div>
            </div>
          </section>

          <div className="stack" style={{ gap: "0.85rem" }}>
            {message ? (
              <div className="notice notice-error">
                <strong>Sign-in issue</strong>
                {message}
              </div>
            ) : null}

            {!isConfigured ? (
              <div className="notice notice-error">
                <strong>Missing environment variables</strong>
                Add <span className="code-block">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="code-block">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>, then restart the app.
              </div>
            ) : null}

            <GoogleSignInButton disabled={!isConfigured} />
          </div>
        </div>
      </section>
    </main>
  );
}
